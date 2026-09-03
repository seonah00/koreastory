# TASK-014 — Render Manifest와 Remotion Composition

## 제작 흐름

1. 승인된 Scene Plan의 모든 Scene에 승인된 이미지가 있는지 확인한다.
2. Scene에 연결된 Script Segment마다 승인된 Halmeoni Narration을 찾는다.
3. 승인된 BGM·Ambience·SFX Audio Layer를 Timeline 단위로 변환한다.
4. 1920×1080, 30fps의 결정적 Render Manifest 새 버전을 만든다.
5. Remotion Player에서 이미지 motion, Narration, Audio Layer 조립 결과를 확인한다.
6. 사용할 Manifest를 승인하면 입력 자산과 함께 변경 불가능한 버전으로 잠긴다.

## Manifest v1

- Composition: `KLoreEpisode`, width, height, fps, durationInFrames
- Source: Episode, Scene Plan Version, Script Version ID
- Scene: 시작 Frame, 길이, 이미지 Asset, 카메라 motion, Narration clips
- Audio Layer: 시작·길이 Frame, dB, fade, loop, Sound Asset
- Asset: private Storage bucket/path, MIME, SHA-256 checksum

서명 URL은 만료되므로 Manifest에 저장하지 않는다. Preview 또는 Worker 실행 시 private
Storage 경로를 짧은 수명의 URL로 변환한다.

## 일관성 및 안전장치

- 승인된 Scene Plan만 사용할 수 있다.
- 모든 Scene 이미지와 Narration Audio가 승인되어야 한다.
- Manifest에 포함한 Audio Layer도 모두 승인되어야 한다.
- Episode, Scene Plan, 출력 Asset 관계를 `(id, workspace_id)`로 제한한다.
- Episode row lock 안에서 Version 번호를 생성해 중복 버전을 방지한다.
- 동일 Script Segment가 여러 Scene에 매핑되어도 Narration은 첫 Scene에서 한 번만 재생한다.
- 승인한 Render Version은 기존 immutable trigger로 잠긴다.

## Remotion 조립 규칙

- Scene별 `Sequence`로 이미지와 Narration을 배치한다.
- 이미지에는 static, slow push-in, slow pan 중 하나의 저자극 motion을 적용한다.
- Scene 전환에는 짧은 opacity fade를 적용한다.
- BGM·Ambience·SFX는 설정된 dB를 linear volume으로 변환한다.
- Audio Layer의 fade in/out과 loop 설정을 그대로 적용한다.

## 다음 단계

승인된 Manifest를 비동기 Job으로 전달하고 Remotion Renderer에서 MP4를 생성한 뒤,
결과 파일을 private Storage의 Video Asset과 `render_versions.output_asset_id`에 연결한다.
