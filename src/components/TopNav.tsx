"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="relative">
      <button
        type="button"
        className="flex items-center gap-2 rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-700 shadow-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        Menu
        <span className="text-ink-400">▾</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-2 w-40 rounded-2xl border border-ink-100 bg-white p-2 text-sm shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          <Link
            href="/"
            className={`block rounded-xl px-3 py-2 hover:bg-ink-50 ${
              pathname === "/" ? "bg-emerald-50 text-emerald-700" : "text-ink-700"
            }`}
            onClick={() => setOpen(false)}
          >
            Planner
          </Link>
          <Link
            href="/history"
            className={`block rounded-xl px-3 py-2 hover:bg-ink-50 ${
              pathname === "/history" ? "bg-emerald-50 text-emerald-700" : "text-ink-700"
            }`}
            onClick={() => setOpen(false)}
          >
            History
          </Link>
        </div>
      )}
    </div>
  );
}
