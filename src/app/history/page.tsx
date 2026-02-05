"use client";

import { useEffect, useState } from "react";
import TopNav from "@/components/TopNav";
import type { Plan } from "@/lib/types";
import Link from "next/link";

const HISTORY_KEY = "planner_history";
const DRAFT_KEY = "planner_draft";

type HistoryItem = {
  id: string;
  prompt: string;
  createdAt: string;
  plan: Plan;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [promptExpanded, setPromptExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (!stored) return;
      setItems(JSON.parse(stored) as HistoryItem[]);
    } catch (err) {
      console.error(err);
    }
  }, []);

  function deleteItem(id: string) {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }

  function openInPlanner(item: HistoryItem) {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({
        id: item.id,
        prompt: item.prompt,
        plan: item.plan,
        teamMembers: (item.plan.team_members ?? [])
          .map((member) => `${member.name}${member.skills?.length ? ` — ${member.skills.join(", ")}` : ""}`)
          .join("\n")
      })
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-ink-500">History</p>
          <h1 className="text-3xl font-semibold text-ink-900">Prior prompts</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-600">
            Review your recent prompts and reopen them in the planner for edits.
          </p>
        </div>
        <TopNav />
      </header>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-ink-100 bg-white p-6 text-sm text-ink-600 shadow-sm">
          No history yet. Head back to the planner to generate a plan.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => {
            const isExpanded = expanded[item.id] ?? false;
            const isPromptExpanded = promptExpanded[item.id] ?? false;
            return (
              <div
                key={item.id}
                className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-2">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                  <h2 className="text-lg font-semibold text-ink-900">
                    {item.plan.title || "Project Plan"}
                  </h2>
                  {isPromptExpanded && (
                    <p className="text-sm text-ink-600">{item.prompt}</p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Link
                    href="/?fromHistory=1"
                    className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-xs font-semibold text-ink-700"
                    onClick={() => openInPlanner(item)}
                  >
                    Open in planner
                  </Link>
                  <button
                    type="button"
                    className="rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700"
                    onClick={() =>
                      setPromptExpanded((prev) => ({ ...prev, [item.id]: !isPromptExpanded }))
                    }
                  >
                    {isPromptExpanded ? "Hide prompt" : "View prompt"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [item.id]: !isExpanded }))
                    }
                  >
                    {isExpanded ? "Hide plan" : "View plan"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600"
                    onClick={() => deleteItem(item.id)}
                  >
                    Delete
                  </button>
                </div>

                {isExpanded && (
                  <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-ink-100 bg-ink-50/50 p-4 text-xs text-ink-700">
{JSON.stringify(item.plan, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-xs text-ink-500">
        History is stored locally in your browser. Clearing site data will remove it.
      </div>
    </main>
  );
}
