# TASK-015 — 비동기 MP4 Render Worker

## 실행 구조

1. Render Studio에서 승인된 Manifest의 `MP4 렌더 시작`을 누른다.
2. `enqueue_render_job`이 Render Version별 멱등 Job을 만든다.
3. 별도 Node Worker가 `FOR UPDATE SKIP LOCKED`로 Job 하나를 점유한다.
4. Worker가 private 이미지·음성 Asset의 4시간 서명 URL을 생성한다.
5. Remotion Bundle과 `KLoreEpisode` Composition으로 H.264 MP4를 렌더한다.
6. 진행률과 lease heartbeat를 DB에 기록한다.
7. MP4를 private Storage에 업로드하고 Video Asset으로 등록한다.
8. `render_versions.output_asset_id`를 연결하고 Episode를 Review 단계로 옮긴다.

## Worker 실행

```bash
pnpm render:worker
```

Job 하나만 처리하고 종료하려면 다음 명령을 사용한다.

```bash
pnpm render:worker -- --once
```

필수 서버 환경변수:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- 선택: `RENDER_WORKER_ID`

`SUPABASE_SECRET_KEY`는 브라우저나 `NEXT_PUBLIC_` 변수에 노출하면 안 된다. Worker는
Vercel 요청 함수가 아니라 FFmpeg와 Chromium을 실행할 수 있는 별도 장기 실행 환경에 배포한다.

## Job 안전장치

- 동일 Render Version은 하나의 멱등 Job만 갖는다.
- 15분 lease와 heartbeat를 사용한다.
- 중단된 Worker의 만료 Job은 다른 Worker가 다시 점유할 수 있다.
- 최대 세 번 자동 시도하고 이후 `failed`로 고정한다.
- 사용자는 실패한 Job을 다시 대기열에 넣어 수동 재시도할 수 있다.
- `claim`, `heartbeat`, `complete`, `fail` RPC는 `service_role`에만 허용한다.
- 일반 사용자는 승인된 Render Version을 변경할 수 없다.
- Worker만 비어 있는 `output_asset_id`를 정확히 한 번 연결할 수 있다.

## 출력

- Codec: H.264
- Container/MIME: MP4 / `video/mp4`
- CRF: 28
- Storage: `{workspace}/episodes/{episode}/renders/{renderVersion}.mp4`
- Asset metadata: 해상도, FPS, Frame 수, Worker ID, 시도 횟수
- SHA-256 checksum 저장

## 다음 단계

대본 구간을 기반으로 VTT/SRT 자막을 만들고 카테고리별 자막 스타일을 적용한 뒤,
최종 영상·썸네일·제목·설명문을 묶는 Review/Export 화면을 구축한다.
