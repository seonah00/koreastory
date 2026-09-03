import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/(auth)/actions";

const navigation = [
  { label: "Dashboard", href: "/" },
  { label: "Discover", href: "/discover" },
  { label: "Stories", href: "/discover#saved-ideas" },
  { label: "Visuals" },
  { label: "Episodes" },
  { label: "Assets" },
  { label: "YouTube" },
] as const;

export function StudioShell({
  active,
  children,
  email,
  workspaceName,
}: {
  active: "Dashboard" | "Discover" | "Stories";
  children: ReactNode;
  email: string;
  workspaceName: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link className="flex items-center gap-3" href="/">
            <span className="grid size-10 place-items-center rounded-full bg-[var(--pine)] text-sm font-semibold text-white">
              KL
            </span>
            <span>
              <span className="block font-semibold tracking-[-0.02em]">
                {workspaceName}
              </span>
              <span className="block text-xs text-[var(--muted)]">
                Personal production studio
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-[var(--muted)] sm:inline">
              {email}
            </span>
            <form action={logoutAction}>
              <button
                className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                type="submit"
              >
                로그아웃
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[220px_1fr] lg:px-8">
        <aside className="hidden lg:block">
          <nav aria-label="스튜디오 메뉴" className="sticky top-8 space-y-1">
            {navigation.map((item) =>
              "href" in item ? (
                <Link
                  className={`block rounded-xl px-4 py-3 text-sm ${item.label === active ? "bg-[var(--pine)] font-medium text-white" : "text-[var(--muted)] hover:bg-white/60"}`}
                  href={item.href}
                  key={item.label}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="block rounded-xl px-4 py-3 text-sm text-[var(--muted)]/55"
                  key={item.label}
                >
                  {item.label}
                </span>
              ),
            )}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
