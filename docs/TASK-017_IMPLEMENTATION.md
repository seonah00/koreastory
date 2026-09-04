# TASK-017 — YouTube 게시 패키지

## 제작 흐름

1. MP4·VTT·SRT 검수가 끝나 Episode가 `ready`가 되면 게시 패키지를 생성한다.
2. 승인된 Render Manifest의 실제 Scene 시작 시간을 Chapter 기준으로 사용한다.
3. 카테고리별 제목 규칙을 적용해 서로 다른 영어 제목 후보 세 개를 만든다.
4. 운영자가 대표 제목을 직접 선택한다.
5. 설명문, Chapter, Tag, 썸네일 문구와 이미지 Prompt를 함께 저장한다.
6. 썸네일 시안을 생성하고 운영자가 별도로 승인한다.
7. 대표 제목과 승인된 썸네일이 모두 있어야 게시 패키지를 승인·잠금한다.
8. 승인된 패키지를 JSON·복사용 TXT·1280×720 PNG 썸네일로 내보낸다.

## 데이터 원칙

- `publish_package_versions`는 Episode별 버전을 보존한다.
- Episode, Render, AI Generation, Thumbnail Asset은 모두 복합 외래키로 Workspace 경계를 강제한다.
- 승인된 Package와 Thumbnail Asset은 기존 불변성 Trigger로 수정·삭제할 수 없다.
- 생성 Provider를 호출하기 전에 `generations` 기록을 만들고 성공·실패·사용량을 보존한다.
- YouTube 자동 업로드는 MVP 범위에서 제외하며 최종 게시 결정은 운영자가 한다.

## 썸네일 원칙

- K-Lore 수채화·민화 Master Style을 유지한다.
- 모바일에서 식별되는 단일 주제와 강한 명암을 사용한다.
- 생성 이미지에는 글자를 그리지 않고, 최종 1280×720 PNG에서 짧은 Headline을 별도 Overlay한다.
- 같은 Package에서 새 시안을 만들 수 있지만 승인된 시안은 잠긴다.

## 다음 단계

실제 YouTube 게시 URL과 시각을 기록하고, CTR·평균 시청 지속시간·Retention·구독 전환을
Episode와 Category에 연결해 다음 소재 추천 가중치를 보정한다.
