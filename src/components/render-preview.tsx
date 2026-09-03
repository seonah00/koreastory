"use client";

import { Player } from "@remotion/player";

import type { ResolvedRenderManifest } from "@/domain/render-manifest";
import { KLoreComposition } from "@/remotion/k-lore-composition";

export function RenderPreview({
  manifest,
}: {
  manifest: ResolvedRenderManifest;
}) {
  return (
    <Player
      acknowledgeRemotionLicense
      className="aspect-video w-full overflow-hidden rounded-xl bg-black"
      component={KLoreComposition}
      compositionHeight={manifest.composition.height}
      compositionWidth={manifest.composition.width}
      controls
      durationInFrames={manifest.composition.durationInFrames}
      fps={manifest.composition.fps}
      inputProps={{ manifest }}
    />
  );
}
