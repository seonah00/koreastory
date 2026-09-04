# TASK-018 — YouTube 게시 이력과 성과 분석

## 운영 흐름

1. 승인된 게시 패키지를 YouTube에 수동 업로드한다.
2. 패키지 화면에서 실제 영상 URL과 게시 시각(KST)을 기록한다.
3. Episode 상태와 기존 `published_url`, `published_at`도 한 트랜잭션에서 갱신한다.
4. YouTube Studio의 누적 성과를 원하는 시점마다 Snapshot으로 저장한다.
5. `/youtube`에서 영상별 최신 수치와 카테고리별 가중 평균을 확인한다.
6. CTR·평균 시청률·구독 전환 패턴을 다음 제작 판단 문장으로 변환한다.

## 저장 지표

- Views / Impressions / CTR
- Average View Duration / Average Percentage Viewed
- Likes / Comments / Subscribers Gained

Snapshot은 누적 수치이며 `(publication_id, captured_at)`을 유일하게 유지한다. 같은 측정 시각을 다시 저장하면 기존 Snapshot을 보정한다.

## 집계 원칙

- 카테고리 CTR은 영상별 최신 Snapshot을 Impressions로 가중 평균한다.
- 평균 시청률은 Views로 가중 평균한다.
- 구독 전환은 `Subscribers Gained / Views × 1,000`으로 비교한다.
- 아직 데이터가 적으므로 자동 제작량 변경 대신 운영자에게 판단 근거만 제시한다.

## 데이터 안전장치

- Publication, Episode, Publish Package, Metric Snapshot의 Workspace 경계를 복합 외래키로 강제한다.
- 두 테이블 모두 RLS를 사용하며 owner/editor만 기록하고 Workspace member만 조회한다.
- 기록 RPC는 `security invoker`이며 `anon`과 `public` 실행 권한을 제거한다.
- 게시 기록은 승인된 Publish Package만 허용한다.

## 다음 단계

YouTube Data/Analytics API로 Snapshot 수집을 자동화하고, 충분한 표본이 쌓인 뒤 카테고리별 소재 추천 점수를 실제 성과로 보정한다.
