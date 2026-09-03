# Architecture

K-Lore Content OS는 개인용 AI 유튜브 제작 스튜디오다.

## Product flow

`Discover → Research → Story Brief → Script → Scenes → Visuals → Voice & Sound → Render → Review → Publish Package`

## Engineering rules

- 승인된 Brief, Script, Scene Plan은 수정하지 않고 새 버전을 만든다.
- AI 생성 ID는 Provider 호출 전에 만들고 성공·실패·비용을 모두 저장한다.
- 긴 생성과 렌더는 요청 수명 밖의 Job으로 실행한다.
- 모든 Supabase public table은 RLS를 사용한다.
- 모든 Storage bucket은 private으로 시작한다.
- LLM, 이미지, 음성, 렌더는 Provider Adapter 뒤에 둔다.
- 브라우저에는 publishable key만 노출한다.

세부 데이터 모델은 [TASK-001 기술 명세](TASK-001_TECHNICAL_SPEC.md)를 따른다.
