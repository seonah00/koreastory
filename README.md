# K-Lore Content OS

한국의 설화·민담·전설을 영어 롱폼 유튜브 영상으로 제작하는 개인용 AI 스튜디오입니다.

## MVP production flow

`Discover → Research → Story Brief → Script → Scenes → Visuals → Voice & Sound → Render → Review`

## Local setup

필수 환경은 Node.js 22 이상과 pnpm입니다.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

`http://localhost:3000`에서 확인합니다. Supabase 연결 값은 프로젝트의 Connect 화면에서 발급한 publishable key를 사용합니다. secret key는 서버 전용이며 브라우저 코드나 `NEXT_PUBLIC_*` 변수에 넣지 않습니다.

## Quality commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## Current scope

- TASK-001: 제품·기술 기준 확정
- TASK-002: Next.js 기반과 개발 품질 체계
- TASK-003: Supabase schema, workspace RLS, private Storage 기반
- TASK-004: 인증과 개인 workspace onboarding
- TASK-005: 카테고리별 소재 발굴과 Story Brief
- TASK-006: AI 웹 리서치와 출처·근거 저장
- TASK-007: Story Brief 기반 영어 롱폼 대본 생성·버전 관리
- TASK-008: 승인 대본 자동 Scene 분할과 Scene Plan 버전 관리
- TASK-009: Visual·Character·World Bible과 카테고리 이미지 프리셋 관리
- TASK-010: Scene Prompt 조합, 실제 AI 이미지 생성, Asset Library
- TASK-011: Halmeoni·캐릭터 Reference 등록, 승인, 이미지 편집 기반 일관성 강화
- TASK-012: Halmeoni Voice Bible 기반 Segment TTS와 Audio Asset workflow
- TASK-013: 카테고리별 BGM·SFX·Ambience Sound Library와 Timeline Layer
- TASK-014: 승인 자산 기반 Render Manifest와 Remotion 영상 자동 조립
- TASK-015: 비동기 MP4 Render Worker와 결과 Video Asset 연결
- TASK-016: 카테고리별 자막, VTT·SRT, 최종 Review/Export 패키지
- 다음 작업: YouTube 제목·설명·챕터·썸네일 게시 패키지

자세한 기술 원칙은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고합니다.

TASK-003의 데이터 구조와 검증 방법은 [docs/TASK-003_IMPLEMENTATION.md](docs/TASK-003_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-004의 인증과 온보딩 구조는 [docs/TASK-004_IMPLEMENTATION.md](docs/TASK-004_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-005의 소재 발굴과 Brief 흐름은 [docs/TASK-005_IMPLEMENTATION.md](docs/TASK-005_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-006의 AI 리서치와 근거 저장 구조는 [docs/TASK-006_IMPLEMENTATION.md](docs/TASK-006_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-007의 영어 롱폼 대본과 버전 관리 구조는 [docs/TASK-007_IMPLEMENTATION.md](docs/TASK-007_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-008의 Scene Plan 생성과 버전 관리 구조는 [docs/TASK-008_IMPLEMENTATION.md](docs/TASK-008_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-009의 Visual Bible과 이미지 프리셋 구조는 [docs/TASK-009_IMPLEMENTATION.md](docs/TASK-009_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-010의 이미지 생성과 Asset 저장 구조는 [docs/TASK-010_IMPLEMENTATION.md](docs/TASK-010_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-011의 Reference 이미지와 이미지 편집 구조는 [docs/TASK-011_IMPLEMENTATION.md](docs/TASK-011_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-012의 Halmeoni Narration과 Audio Asset 구조는 [docs/TASK-012_IMPLEMENTATION.md](docs/TASK-012_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-013의 Sound Library와 Audio Timeline 구조는 [docs/TASK-013_IMPLEMENTATION.md](docs/TASK-013_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-014의 Render Manifest와 Remotion 조립 구조는 [docs/TASK-014_IMPLEMENTATION.md](docs/TASK-014_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-015의 비동기 MP4 Worker 구조는 [docs/TASK-015_IMPLEMENTATION.md](docs/TASK-015_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-016의 자막과 Review/Export 구조는 [docs/TASK-016_IMPLEMENTATION.md](docs/TASK-016_IMPLEMENTATION.md)에 정리되어 있습니다.
