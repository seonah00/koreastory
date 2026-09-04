import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { createClient } from "@supabase/supabase-js";

import {
  renderManifestSchema,
  type RenderAsset,
  type ResolvedRenderManifest,
} from "../src/domain/render-manifest";
import type { Database, Json } from "../src/server/supabase/database.types";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Production workers receive environment variables from their runtime.
  }
}

const workerId = process.env.RENDER_WORKER_ID ?? `render-${randomUUID()}`;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
const once = process.argv.includes("--once");
const pollMilliseconds = 5_000;
const leaseSeconds = 900;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required.",
  );
}

const supabase = createClient<Database>(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
let serveUrlPromise: Promise<string> | null = null;

function getServeUrl() {
  serveUrlPromise ??= bundle({
    entryPoint: join(projectRoot, "src/remotion/root.tsx"),
  });
  return serveUrlPromise;
}

async function resolveManifest(
  manifest: ReturnType<typeof renderManifestSchema.parse>,
) {
  const assets = [
    ...manifest.scenes.flatMap((scene) => [
      scene.image,
      ...scene.narration.map((clip) => clip.asset),
    ]),
    ...manifest.audioLayers.map((layer) => layer.asset),
  ];
  const unique = new Map(assets.map((asset) => [asset.id, asset]));
  const urls = new Map<string, string>();
  await Promise.all(
    [...unique.values()].map(async (asset) => {
      const { data, error } = await supabase.storage
        .from(asset.bucket)
        .createSignedUrl(asset.path, 14_400);
      if (error || !data?.signedUrl)
        throw new Error(`Unable to sign render asset ${asset.id}.`);
      urls.set(asset.id, data.signedUrl);
    }),
  );
  const resolveAsset = (asset: RenderAsset) => ({
    ...asset,
    url: urls.get(asset.id)!,
  });
  return {
    ...manifest,
    scenes: manifest.scenes.map((scene) => ({
      ...scene,
      image: resolveAsset(scene.image),
      narration: scene.narration.map((clip) => ({
        ...clip,
        asset: resolveAsset(clip.asset),
      })),
    })),
    audioLayers: manifest.audioLayers.map((layer) => ({
      ...layer,
      asset: resolveAsset(layer.asset),
    })),
  } satisfies ResolvedRenderManifest;
}

async function claimJob() {
  const { data, error } = await supabase.rpc("claim_render_job", {
    p_worker_id: workerId,
    p_lease_seconds: leaseSeconds,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

async function processJob(
  job: NonNullable<Awaited<ReturnType<typeof claimJob>>>,
) {
  const tempDirectory = await mkdtemp(join(tmpdir(), "k-lore-render-"));
  const outputPath = join(tempDirectory, `${job.render_version_id}.mp4`);
  let storagePath: string | null = null;
  try {
    const manifest = renderManifestSchema.parse(job.manifest);
    const resolvedManifest = await resolveManifest(manifest);
    const serveUrl = await getServeUrl();
    const composition = await selectComposition({
      id: "KLoreEpisode",
      inputProps: { manifest: resolvedManifest },
      serveUrl,
    });
    let lastHeartbeat = 0;
    await renderMedia({
      codec: "h264",
      composition,
      crf: 28,
      imageFormat: "jpeg",
      inputProps: { manifest: resolvedManifest },
      onProgress: ({ progress }) => {
        const now = Date.now();
        if (now - lastHeartbeat < 5_000 && progress < 1) return;
        lastHeartbeat = now;
        void supabase.rpc("heartbeat_render_job", {
          p_job_id: job.job_id,
          p_worker_id: workerId,
          p_progress: Math.round(progress * 10000) / 100,
          p_lease_seconds: leaseSeconds,
        });
      },
      outputLocation: outputPath,
      serveUrl,
    });

    const file = await readFile(outputPath);
    const fileStats = await stat(outputPath);
    const checksum = createHash("sha256").update(file).digest("hex");
    storagePath = `${job.workspace_id}/episodes/${job.episode_id}/renders/${job.render_version_id}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("k-lore-assets")
      .upload(storagePath, file, {
        cacheControl: "31536000",
        contentType: "video/mp4",
        upsert: false,
      });
    if (uploadError) throw uploadError;

    const { error: completeError } = await supabase.rpc("complete_render_job", {
      p_job_id: job.job_id,
      p_worker_id: workerId,
      p_storage_bucket: "k-lore-assets",
      p_storage_path: storagePath,
      p_bytes: fileStats.size,
      p_checksum_sha256: checksum,
      p_metadata: {
        codec: "h264",
        container: "mp4",
        fps: composition.fps,
        width: composition.width,
        height: composition.height,
        durationInFrames: composition.durationInFrames,
        workerId,
        attempt: job.attempt,
      } satisfies Json,
    });
    if (completeError) throw completeError;
    process.stdout.write(`Rendered ${job.job_id} -> ${storagePath}\n`);
  } catch (error) {
    if (storagePath) {
      await supabase.storage.from("k-lore-assets").remove([storagePath]);
    }
    const message =
      error instanceof Error ? error.message : "Unknown render error";
    await supabase.rpc("fail_render_job", {
      p_job_id: job.job_id,
      p_worker_id: workerId,
      p_error: { message: message.slice(0, 2_000) },
    });
    process.stderr.write(`Render failed ${job.job_id}: ${message}\n`);
  } finally {
    await rm(tempDirectory, { force: true, recursive: true });
  }
}

async function main() {
  do {
    const job = await claimJob();
    if (job) await processJob(job);
    if (once) break;
    if (!job)
      await new Promise((resolve) => setTimeout(resolve, pollMilliseconds));
  } while (true);
}

await main();
