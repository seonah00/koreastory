import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";

import type { ResolvedRenderManifest } from "../domain/render-manifest";
import { dbToLinearVolume } from "../domain/render-manifest";

function SceneVisual({
  durationInFrames,
  manifestScene,
}: {
  durationInFrames: number;
  manifestScene: ResolvedRenderManifest["scenes"][number];
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(
    frame,
    [0, 12, Math.max(13, durationInFrames - 12), durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const transform =
    manifestScene.cameraMotion === "slow_push_in"
      ? `scale(${1 + progress * 0.06})`
      : manifestScene.cameraMotion === "slow_pan"
        ? `scale(1.06) translateX(${3 - progress * 6}%)`
        : "scale(1.02)";

  return (
    <AbsoluteFill style={{ backgroundColor: "#141712", opacity }}>
      <Img
        src={manifestScene.image.url}
        style={{ height: "100%", objectFit: "cover", transform, width: "100%" }}
      />
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(9,12,10,.04), rgba(9,12,10,.16))",
        }}
      />
      {manifestScene.narration.map((clip) => (
        <Sequence
          durationInFrames={clip.durationInFrames}
          from={clip.startFrame}
          key={clip.asset.id}
        >
          <Audio src={clip.asset.url} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}

export function KLoreComposition({
  manifest,
}: {
  manifest: ResolvedRenderManifest;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#141712" }}>
      {manifest.scenes.map((scene) => (
        <Sequence
          durationInFrames={scene.durationInFrames}
          from={scene.startFrame}
          key={scene.id}
        >
          <SceneVisual
            durationInFrames={scene.durationInFrames}
            manifestScene={scene}
          />
        </Sequence>
      ))}
      {manifest.audioLayers.map((layer) => {
        const baseVolume = dbToLinearVolume(layer.volumeDb);
        return (
          <Sequence
            durationInFrames={layer.durationInFrames}
            from={layer.startFrame}
            key={layer.id}
          >
            <Audio
              loop={layer.loop}
              src={layer.asset.url}
              volume={(frame) => {
                const fadeIn = layer.fadeInFrames
                  ? Math.min(1, frame / layer.fadeInFrames)
                  : 1;
                const remaining = layer.durationInFrames - frame;
                const fadeOut = layer.fadeOutFrames
                  ? Math.min(1, remaining / layer.fadeOutFrames)
                  : 1;
                return baseVolume * Math.max(0, Math.min(fadeIn, fadeOut));
              }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
