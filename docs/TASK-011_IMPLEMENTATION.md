# TASK-011 — Bible Reference 이미지와 일관성 강화

## 사용자 흐름

1. `/visual-bible`에서 Character, World, Style 또는 Brand Bible 버전을 승인한다.
2. 승인된 버전에 PNG, JPEG 또는 WebP Reference(최대 7MB)와 용도 라벨을 등록한다.
3. Draft Reference를 검토한 뒤 승인·잠금한다.
4. 승인된 Scene Plan에서 이미지를 생성한다.
5. 시스템이 관련 Reference를 찾으면 OpenAI Images Edit API를, 없으면 Images Generation API를 사용한다.

## Reference 선택 규칙

- 모든 장면: 승인된 `k-lore-master-style` Reference
- 첫 장면과 마지막 장면: 승인된 `halmeoni`, `halmeoni-house` Reference
- 본문 장면: Scene 제목·설명·Visual Prompt에 slug 또는 이름이 등장하는 승인된 Character Reference
- 한 번의 편집 요청에는 최대 4개를 사용한다.

생성 기록의 `request`와 결과 Asset metadata에 사용한 Asset ID를 남겨 결과를 재현하고 비용을 추적할 수 있다.

## 안전성과 데이터 무결성

- MIME 헤더뿐 아니라 PNG/JPEG/WebP magic bytes를 확인한다.
- 승인된 Visual Bible 버전에만 Reference를 연결한다.
- Reference Asset은 별도로 승인하기 전까지 생성 입력으로 사용하지 않는다.
- Storage 경로는 workspace UUID로 시작하며 private bucket의 기존 RLS를 따른다.
- `bible_references`의 Bible·Asset 외래 키는 모두 `(id, workspace_id)` 복합 키로 묶어 다른 workspace 자산 연결을 차단한다.
- Server Action 본문은 8MB, 업로드 파일은 7MB로 제한한다.

## 운영 설정

- `OPENAI_API_KEY`: 서버 전용 OpenAI 키
- `OPENAI_IMAGE_MODEL`: 기본값 `gpt-image-2`

실제 외부 생성 호출은 키가 있는 환경에서만 수행된다. Reference 입력에는 이미지 토큰 비용이 추가되므로 꼭 필요한 승인 이미지로 제한한다.
