import { Composition, registerRoot } from "remotion";

import type { ResolvedRenderManifest } from "../domain/render-manifest";
import { KLoreComposition } from "./k-lore-composition";

const placeholderManifest: ResolvedRenderManifest = {
  schemaVersion: 1,
  composition: {
    id: "KLoreEpisode",
    width: 1920,
    height: 1080,
    fps: 30,
    durationInFrames: 1,
  },
  source: {
    episodeId: "00000000-0000-4000-8000-000000000000",
    scenePlanVersionId: "00000000-0000-4000-8000-000000000000",
    scriptVersionId: "00000000-0000-4000-8000-000000000000",
  },
  scenes: [],
  audioLayers: [],
};

function RemotionRoot() {
  return (
    <Composition
      calculateMetadata={({ props }) => ({
        durationInFrames: props.manifest.composition.durationInFrames,
        fps: props.manifest.composition.fps,
        height: props.manifest.composition.height,
        width: props.manifest.composition.width,
      })}
      component={KLoreComposition}
      defaultProps={{ manifest: placeholderManifest }}
      durationInFrames={1}
      fps={30}
      height={1080}
      id="KLoreEpisode"
      width={1920}
    />
  );
}

registerRoot(RemotionRoot);
