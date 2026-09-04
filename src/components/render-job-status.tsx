"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RenderJobStatus({
  attempt,
  maxAttempts,
  progress,
  status,
}: {
  attempt: number;
  maxAttempts: number;
  progress: number;
  status: string;
}) {
  const router = useRouter();
  const active = status === "pending" || status === "running";
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => router.refresh(), 5_000);
    return () => window.clearInterval(timer);
  }, [active, router]);

  const safeProgress = Math.max(0, Math.min(100, progress));
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="capitalize" role="status">
          {status}
        </span>
        <span className="text-[var(--muted)]">
          Attempt {attempt}/{maxAttempts}
        </span>
      </div>
      <div
        aria-label={`렌더 진행률 ${Math.round(safeProgress)}%`}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={safeProgress}
        className="mt-2 h-2 overflow-hidden rounded-full bg-white"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-[var(--pine)] transition-[width]"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
    </div>
  );
}
