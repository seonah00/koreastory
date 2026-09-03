import Link from "next/link";

import { safeNextPath } from "@/domain/auth";
import { loginAction } from "../actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;
  const next = safeNextPath(
    typeof params.next === "string" ? params.next : null,
  );

  return (
    <div>
      <p className="text-sm font-medium text-[var(--rust)]">
        다시 오신 것을 환영합니다
      </p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
        스튜디오 로그인
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        오늘 만들 이야기를 이어서 완성해 보세요.
      </p>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <form action={loginAction} className="mt-8 space-y-5">
        <input name="next" type="hidden" value={next} />
        <label className="auth-field">
          <span>이메일</span>
          <input
            autoComplete="email"
            name="email"
            placeholder="story@example.com"
            required
            type="email"
          />
        </label>
        <label className="auth-field">
          <span>비밀번호</span>
          <input
            autoComplete="current-password"
            minLength={8}
            name="password"
            placeholder="8자 이상"
            required
            type="password"
          />
        </label>
        <button className="auth-submit" type="submit">
          로그인
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--muted)]">
        아직 계정이 없나요?{" "}
        <Link
          className="font-semibold text-[var(--rust)] hover:underline"
          href="/signup"
        >
          회원가입
        </Link>
      </p>
    </div>
  );
}
