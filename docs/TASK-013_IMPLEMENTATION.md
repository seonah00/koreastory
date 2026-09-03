# TASK-013 — Sound Library와 Audio Timeline

## 제작 흐름

1. Audio Studio에서 카테고리별 BGM·Ambience·SFX 추천 규칙을 확인한다.
2. 직접 제작했거나 사용 권리를 확인한 MP3/WAV를 Sound Library에 등록한다.
3. 음원을 재생·검토한 뒤 승인·잠금한다.
4. 승인 음원을 BGM, Ambience 또는 SFX Layer로 Timeline이나 특정 Scene에 배치한다.
5. 시작·종료 시간, 볼륨, Fade in/out, 반복 여부를 설정하고 Layer를 승인한다.

## 권리 정보

각 Sound Asset에는 다음 내용을 저장한다.

- `rights`: owned, licensed, public_domain, cc0
- `sourceUrl`: 라이선스 구매처나 원본 출처
- `attribution`: 라이선스 번호 또는 필요한 크레딧
- 원본 파일명과 SHA-256 checksum

외부 라이선스·Public domain·CC0 음원은 출처 URL이 없으면 등록되지 않는다. 저작권 상태를 서비스가 자동 보증하지 않으므로 실제 게시 전 사용 범위를 다시 확인한다.

## Audio Layer 데이터

- `layer_type`: bgm, ambience, sfx
- `start_ms`, `end_ms`
- `volume_db`: -60dB~+6dB
- `fade_in_ms`, `fade_out_ms`: 0~30초
- `loop`
- 선택적 `scene_id`
- Draft/Approved 상태

승인된 Sound Asset만 Layer에 연결할 수 있으며 승인된 Layer는 기존 immutable trigger를 이용해 잠긴다. Episode, Scene, Asset 관계는 모두 `(id, workspace_id)` 복합 외래 키로 보호한다.

## 업로드 제한

- MP3 또는 WAV만 허용
- 최대 25MB
- 요청 본문 상한 32MB
- MIME 값과 실제 파일 signature를 함께 검사
- private Supabase Storage와 기존 workspace 경로 RLS 사용

## 다음 단계

승인된 Scene 이미지, Narration Audio, Audio Layers를 하나의 Render Manifest로 고정하고 Remotion 렌더러에 전달한다.
