# TASK-001 Technical Specification

## Architecture decisions

- Next.js App Router와 TypeScript strict를 사용한다.
- Supabase Postgres, Auth와 private Storage를 사용한다.
- LLM, 이미지, 음성, 렌더는 교체 가능한 Provider Adapter로 분리한다.
- 긴 이미지 묶음 생성, TTS 병합과 Remotion 렌더는 비동기 Job으로 처리한다.
- 모든 AI 생성은 Provider 호출 전에 ID와 pending record를 만든다.
- 승인된 Story Brief, Script와 Scene Plan은 수정하지 않고 새 버전을 만든다.
- Script Segment, Scene, Asset과 Render Manifest는 생성 당시 Version을 추적한다.
- 모든 exposed table에 RLS를 활성화하고 workspace membership으로 범위를 제한한다.
- Browser에는 Supabase publishable key만 노출한다.

## Core entities

- profiles, workspaces, workspace_members
- projects, episodes
- category_presets
- story_ideas, source_documents, research_evidence
- story_brief_versions
- script_versions, script_segments
- scene_plan_versions, scenes, scene_segments
- bible_entries, bible_references
- assets
- prompt_versions, generations
- jobs, job_steps
- render_versions

## Production stages

`idea, research, brief, script, scenes, visuals, audio, render, review, ready, published, archived`

Stage 이동은 선행 결과의 승인 여부를 검사한다.

## Quality gate

- lint, typecheck, unit test와 production build 통과
- 새로고침 후 Job과 생성 상태 복구
- 실패 Step만 재시도 가능
- 승인본 불변성 검증
- RLS와 Storage 정책 테스트
- 실제 영상 한 편 E2E 제작
