import Link from "next/link";

import { signupAction } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <div>
      <p className="text-sm font-medium text-[var(--rust)]">나만의 제작 공간</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
        K-Lore 스튜디오 시작하기
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
        가입과 동시에 개인 Workspace와 5개 제작 프리셋이 준비됩니다.
      </p>

      {error ? (
        <p className="auth-error" role="alert">
          {error}
        </p>
      ) : null}

      <form action={signupAction} className="mt-8 space-y-5">
        <label className="auth-field">
          <span>표시 이름</span>
          <input
            autoComplete="name"
            maxLength={40}
            minLength={2}
            name="displayName"
            placeholder="이야기 제작자"
            required
          />
        </label>
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
            autoComplete="new-password"
            maxLength={72}
            minLength={8}
            name="password"
            placeholder="8자 이상"
            required
            type="password"
          />
        </label>
        <button className="auth-submit" type="submit">
          개인 스튜디오 만들기
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[var(--muted)]">
        이미 계정이 있나요?{" "}
        <Link
          className="font-semibold text-[var(--rust)] hover:underline"
          href="/login"
        >
          로그인
        </Link>
      </p>
    </div>
  );
}
