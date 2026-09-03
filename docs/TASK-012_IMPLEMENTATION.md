# TASK-012 — Halmeoni Narration과 Audio Asset

## 제작 흐름

1. 승인된 영어 Script의 Segment를 불러온다.
2. 최신 승인 `halmeoni-voice` Bible에서 voice, 속도, 톤, 감정 및 연기 규칙을 읽는다.
3. `/stories/[ideaId]/audio`에서 Segment별 음성을 생성한다.
4. MP3를 private Storage에 보존하고 Generation 원장과 Script Segment에 연결한다.
5. 브라우저에서 재생·비교한 뒤 사용할 Audio Asset만 승인·잠금한다.

## OpenAI Speech API

- 기본 모델: `gpt-4o-mini-tts`
- 기본 내장 음성: `sage`
- 포맷: MP3
- Segment 입력 제한: 4,096자
- Voice Bible의 `speakingRate`, `tone`, `acting`, `bedtimeSoftness`, `whisper`, `paragraphPauseSeconds`를 요청에 반영한다.

각 요청과 결과는 `generations`에 저장한다. 재생성하더라도 이전 Asset은 보존되며 최신 생성본이 Audio Studio에 표시된다.

## 무결성과 실패 처리

- 승인된 Script Version의 Segment만 생성할 수 있다.
- Audio Asset과 Script Segment는 `(id, workspace_id)` 복합 외래 키로 연결한다.
- 외부 API 호출 전에 pending Generation을 생성하고 running, succeeded 또는 failed 상태를 기록한다.
- Storage 업로드 이후 DB 저장이 실패하면 아직 Asset이 되지 않은 파일을 제거한다.
- 오디오와 API 키는 브라우저에 노출하지 않고 Server Action에서 처리한다.

## 환경변수

```bash
OPENAI_API_KEY=...
OPENAI_TTS_MODEL=gpt-4o-mini-tts
```

공개 콘텐츠에서는 최종 사용자가 듣는 음성이 AI로 생성되었다는 사실을 명확히 고지해야 한다.
