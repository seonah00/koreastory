import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email =
    typeof params.email === "string" ? params.email : "입력한 이메일";

  return (
    <div className="text-center">
      <span
        aria-hidden="true"
        className="mx-auto grid size-16 place-items-center rounded-full bg-[#ebe2ca] text-3xl"
      >
        ✉
      </span>
      <p className="mt-7 text-sm font-medium text-[var(--rust)]">이메일 확인</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">
        인증 링크를 보냈습니다
      </h2>
      <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
        <strong className="font-medium text-[var(--ink)]">{email}</strong>에서
        링크를 열면 개인 K-Lore 스튜디오가 준비됩니다.
      </p>
      <Link
        className="mt-8 inline-flex h-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] px-6 text-sm font-semibold"
        href="/login"
      >
        로그인으로 돌아가기
      </Link>
    </div>
  );
}
