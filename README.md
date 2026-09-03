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
- 다음 작업: 카테고리별 소재 발굴과 Story Brief

자세한 기술 원칙은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고합니다.

TASK-003의 데이터 구조와 검증 방법은 [docs/TASK-003_IMPLEMENTATION.md](docs/TASK-003_IMPLEMENTATION.md)에 정리되어 있습니다.

TASK-004의 인증과 온보딩 구조는 [docs/TASK-004_IMPLEMENTATION.md](docs/TASK-004_IMPLEMENTATION.md)에 정리되어 있습니다.
