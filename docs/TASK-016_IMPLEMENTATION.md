# TASK-016 — 자막과 최종 Review/Export

## 제작 흐름

1. 새 Render Manifest를 만들 때 영어 Narration을 문장 단위 Caption Cue로 나눈다.
2. 각 Cue의 Frame 구간을 Narration 길이에 비례해 결정한다.
3. 카테고리 Preset으로 글자 크기·색상·배경 투명도·화면 위치를 고정한다.
4. Remotion Composition이 같은 Cue를 영상에 번인한다.
5. MP4 렌더 완료 후 동일 Cue에서 WebVTT와 SRT를 생성한다.
6. 두 파일을 private Storage와 승인된 Subtitle Asset으로 등록한다.
7. Review 화면에서 MP4·VTT·SRT·Manifest를 확인한 후 Episode를 `ready`로 전환한다.

## 결정성

- Caption은 승인 전 Manifest 안에 저장되며 승인 후 변경되지 않는다.
- 영상 번인, VTT, SRT가 하나의 Frame 기반 Cue 목록을 공유한다.
- 파일 경로는 `{workspace}/episodes/{episode}/subtitles/{renderVersion}.{vtt|srt}`이다.
- Render Version과 자막 형식 조합에는 하나의 Asset만 허용한다.
- 이전 Manifest는 `captions`가 선택 필드라 계속 재생할 수 있다. 자막이 필요한 기존 Episode는 새 Manifest를 생성한다.

## 카테고리 스타일

모든 카테고리는 K-Lore의 serif 자막 표현을 유지한다. `Grandma's Tales`는 따뜻한 크림색,
`Strange Tales`는 짙은 남색, `Korean Legends`는 금빛, `Stories for Sleep`은 더 작고 낮은 대비,
`Old Korean Wisdom`은 차분한 한지색을 사용한다.

## 데이터 안전장치

- `assets(render_version_id, workspace_id)`는 같은 Workspace의 Render Version만 참조한다.
- `create_subtitle_exports`는 완료·승인된 Render와 정확한 private 경로, byte 수, SHA-256을 검증한다.
- `mark_episode_ready`는 MP4와 승인된 VTT·SRT가 모두 있어야 성공한다.
- 두 RPC는 authenticated 사용자에게만 열리고 기존 Workspace RLS를 그대로 따른다.

## 다음 단계

승인된 Story·Scene·Render 데이터를 이용해 YouTube 제목 후보, 설명문, 챕터, 썸네일 제작안을
하나의 게시 패키지로 만들고 게시 이력을 저장한다.
