"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopNav from "@/components/TopNav";
import type { Plan } from "@/lib/types";

const examplePrompt =
  "Here is a Python file that defines an app in a larger project. Explain how to convert it to use my existing Postgres DB and Hasura GraphQL engine rather than SQLite.";

type HistoryItem = {
  id: string;
  prompt: string;
  createdAt: string;
  plan: Plan;
};

const HISTORY_KEY = "planner_history";

export default function Home() {
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const [teamMembers, setTeamMembers] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function storeHistoryItem(item: HistoryItem) {
    try {
      const current = localStorage.getItem(HISTORY_KEY);
      const parsed = current ? (JSON.parse(current) as HistoryItem[]) : [];
      localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...parsed]));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
      formData.append("teamMembers", teamMembers);
      if (files) {
        Array.from(files).forEach((file) => formData.append("files", file));
      }

      const response = await fetch("/api/plan", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Something went wrong.");
      }

      const id = crypto.randomUUID();
      storeHistoryItem({
        id,
        prompt,
        createdAt: new Date().toISOString(),
        plan: payload.plan
      });

      router.push(`/plan/${id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-ink-500">Project Planner</p>
            <h1 className="text-3xl font-semibold text-ink-900">
              Turn a prompt into epics, stories, and tasks.
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-ink-600">
              Paste a description or upload supporting files. The planner will return a structured
              JSON plan and render it into a clean, readable checklist.
            </p>
          </div>
          <TopNav />
        </div>
      </header>

      <section className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="text-sm font-medium text-ink-700" htmlFor="prompt">
            Project prompt
          </label>
          <textarea
            id="prompt"
            name="prompt"
            className="min-h-[160px] w-full rounded-2xl border border-ink-200 bg-ink-50/40 p-4 text-sm text-ink-900 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
            placeholder={examplePrompt}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            required
          />

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="teamMembers">
              Team members (name — skills)
            </label>
            <textarea
              id="teamMembers"
              name="teamMembers"
              className="min-h-[110px] w-full rounded-2xl border border-ink-200 bg-ink-50/40 p-4 text-sm text-ink-900 focus:border-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-100"
              placeholder={"Avery — frontend, UI\nJordan — backend, APIs\nSam — QA, testing"}
              value={teamMembers}
              onChange={(event) => setTeamMembers(event.target.value)}
            />
            <p className="text-xs text-ink-500">One per line. Use a dash to separate name and skills.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-ink-700" htmlFor="files">
              Attach files (optional)
            </label>
            <input
              id="files"
              name="files"
              type="file"
              multiple
              className="text-sm text-ink-600 file:mr-4 file:rounded-full file:border-0 file:bg-ink-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-ink-700 hover:file:bg-ink-200"
              onChange={(event) => setFiles(event.target.files)}
            />
            <p className="text-xs text-ink-500">Up to 5 files, 2MB each. Text-based files work best.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-ink-900 px-6 py-2 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-ink-400"
            >
              {loading ? "Planning..." : "Generate plan"}
            </button>
            <button
              type="button"
              className="text-sm text-ink-500 underline-offset-4 hover:underline"
              onClick={() => {
                setPrompt(examplePrompt);
                setFiles(null);
                setError(null);
                setTeamMembers("");
              }}
            >
              Use example
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </main>
  );
}
