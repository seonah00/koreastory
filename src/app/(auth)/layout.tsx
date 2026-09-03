import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen bg-[var(--canvas)] text-[var(--ink)] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-[var(--pine)] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-20 size-80 rounded-full border border-white/10" />
        <div className="absolute right-28 bottom-20 size-44 rounded-full bg-[var(--gold)]/10 blur-3xl" />
        <Link className="relative flex items-center gap-3" href="/">
          <span className="grid size-11 place-items-center rounded-full bg-white text-sm font-bold text-[var(--pine)]">
            KL
          </span>
          <span className="font-semibold tracking-[-0.02em]">
            K-Lore Content OS
          </span>
        </Link>
        <div className="relative max-w-xl">
          <p className="mb-5 text-sm font-medium text-[var(--gold)]">
            PERSONAL STORY STUDIO
          </p>
          <h1 className="text-5xl leading-[1.08] font-semibold tracking-[-0.045em]">
            오래된 한국 이야기를
            <br />
            당신만의 영상으로.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/65">
            소재 발굴부터 대본, 장면, 이미지까지 한 흐름으로 연결하는 개인 제작
            공간입니다.
          </p>
        </div>
        <p className="relative text-xs text-white/40">
          Discover · Script · Visual · Render
        </p>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <Link className="mb-12 flex items-center gap-3 lg:hidden" href="/">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--pine)] text-sm font-bold text-white">
              KL
            </span>
            <span className="font-semibold">K-Lore Content OS</span>
          </Link>
          {children}
        </div>
      </section>
    </main>
  );
}
