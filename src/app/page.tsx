"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Plan, Subtask } from "@/lib/types";
import TopNav from "@/components/TopNav";

const examplePrompt =
  "Here is a Python file that defines an app in a larger project. Explain how to convert it to use my existing Postgres DB and Hasura GraphQL engine rather than SQLite.";

type ActiveTaskRef = {
  epicIndex: number;
  storyIndex: number;
  taskIndex: number;
};

type HistoryItem = {
  id: string;
  prompt: string;
  createdAt: string;
  plan: Plan;
};

const HISTORY_KEY = "planner_history";
const DRAFT_KEY = "planner_draft";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [expandedEpics, setExpandedEpics] = useState<Record<string, boolean>>({});
  const [expandedStories, setExpandedStories] = useState<Record<string, boolean>>({});
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const [activeTask, setActiveTask] = useState<ActiveTaskRef | null>(null);
  const [highlightItems, setHighlightItems] = useState<Record<string, boolean>>({});
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const epicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const storyRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const subtaskRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const planJson = useMemo(() => {
    if (!plan) return "";
    return JSON.stringify(plan, null, 2);
  }, [plan]);

  useEffect(() => {
    const fromHistory = searchParams.get("fromHistory");
    if (!fromHistory) return;

    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (!stored) return;
      const draft = JSON.parse(stored) as { id?: string; prompt: string; plan: Plan };
      setPrompt(draft.prompt);
      setPlan(draft.plan);
      setHistoryItemId(draft.id ?? null);
      setEditMode(false);
      localStorage.removeItem(DRAFT_KEY);
      router.replace("/");
    } catch (err) {
      console.error(err);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (!editMode || !historyItemId || !plan) return;
    const timeout = setTimeout(() => {
      try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (!stored) return;
        const parsed = JSON.parse(stored) as HistoryItem[];
        const next = parsed.map((item) =>
          item.id === historyItemId ? { ...item, plan, prompt } : item
        );
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [editMode, historyItemId, plan, prompt]);

  function storeHistoryItem(item: HistoryItem) {
    try {
      const current = localStorage.getItem(HISTORY_KEY);
      const parsed = current ? (JSON.parse(current) as HistoryItem[]) : [];
      localStorage.setItem(HISTORY_KEY, JSON.stringify([item, ...parsed]));
    } catch (err) {
      console.error(err);
    }
  }

  function triggerHighlight(key: string) {
    setHighlightItems((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setHighlightItems((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }, 2000);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPlan(null);
    setLoading(true);
    setHistoryItemId(null);

    try {
      const formData = new FormData();
      formData.append("prompt", prompt);
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

      setPlan(payload.plan);
      setEditMode(false);
      setExpandedEpics({});
      setExpandedStories({});
      setExpandedTasks({});
      storeHistoryItem({
        id: crypto.randomUUID(),
        prompt,
        createdAt: new Date().toISOString(),
        plan: payload.plan
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function updateEpic(epicIndex: number, updates: Partial<Plan["epics"][number]>) {
    if (!plan) return;
    const next = [...plan.epics];
    next[epicIndex] = { ...next[epicIndex], ...updates };
    setPlan({ ...plan, epics: next });
  }

  function addEpic() {
    if (!plan) return;
    const epicIndex = plan.epics.length;
    const epicKey = `epic-${epicIndex}`;
    setPlan({
      ...plan,
      epics: [
        ...plan.epics,
        {
          id: `EPIC-${epicIndex + 1}`,
          title: "New Epic",
          description: "",
          stories: []
        }
      ]
    });
    setExpandedEpics((prev) => ({ ...prev, [epicKey]: true }));
    triggerHighlight(epicKey);
    setTimeout(() => {
      const node = epicRefs.current[epicKey];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  function removeEpic(epicIndex: number) {
    if (!plan) return;
    const next = plan.epics.filter((_, index) => index !== epicIndex);
    setPlan({ ...plan, epics: next });
  }

  function updateStory(epicIndex: number, storyIndex: number, updates: Partial<Plan["epics"][number]["stories"][number]>) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    stories[storyIndex] = { ...stories[storyIndex], ...updates };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function addStory(epicIndex: number) {
    if (!plan) return;
    const newStoryIndex = plan.epics[epicIndex].stories.length;
    const epicKey = `epic-${epicIndex}`;
    const storyKey = `story-${epicIndex}-${newStoryIndex}`;
    const nextEpics = [...plan.epics];
    nextEpics[epicIndex] = {
      ...nextEpics[epicIndex],
      stories: [
        ...nextEpics[epicIndex].stories,
        {
          id: `STORY-${epicIndex + 1}-${newStoryIndex + 1}`,
          title: "New Story",
          description: "",
          tasks: []
        }
      ]
    };
    setPlan({ ...plan, epics: nextEpics });
    setExpandedEpics((prev) => ({ ...prev, [epicKey]: true }));
    setExpandedStories((prev) => ({ ...prev, [storyKey]: true }));
    triggerHighlight(storyKey);
    setTimeout(() => {
      const node = storyRefs.current[storyKey];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  function removeStory(epicIndex: number, storyIndex: number) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    nextEpics[epicIndex] = {
      ...nextEpics[epicIndex],
      stories: nextEpics[epicIndex].stories.filter((_, index) => index !== storyIndex)
    };
    setPlan({ ...plan, epics: nextEpics });
  }

  function updateTask(
    epicIndex: number,
    storyIndex: number,
    taskIndex: number,
    updates: Partial<Plan["epics"][number]["stories"][number]["tasks"][number]>
  ) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function addTask(epicIndex: number, storyIndex: number) {
    if (!plan) return;
    const newTaskIndex = plan.epics[epicIndex].stories[storyIndex].tasks.length;
    const epicKey = `epic-${epicIndex}`;
    const storyKey = `story-${epicIndex}-${storyIndex}`;
    const taskKey = `task-${epicIndex}-${storyIndex}-${newTaskIndex}`;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    stories[storyIndex] = {
      ...stories[storyIndex],
      tasks: [
        ...stories[storyIndex].tasks,
        {
          id: `TASK-${epicIndex + 1}-${storyIndex + 1}-${newTaskIndex + 1}`,
          title: "New Task",
          description: "",
          completion_requirements: [],
          subtasks: []
        }
      ]
    };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
    setExpandedEpics((prev) => ({ ...prev, [epicKey]: true }));
    setExpandedStories((prev) => ({ ...prev, [storyKey]: true }));
    setExpandedTasks((prev) => ({ ...prev, [taskKey]: true }));
    triggerHighlight(taskKey);
    setTimeout(() => {
      const node = taskRefs.current[taskKey];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  function removeTask(epicIndex: number, storyIndex: number, taskIndex: number) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    stories[storyIndex] = {
      ...stories[storyIndex],
      tasks: stories[storyIndex].tasks.filter((_, index) => index !== taskIndex)
    };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function updateSubtask(
    epicIndex: number,
    storyIndex: number,
    taskIndex: number,
    subtaskIndex: number,
    updates: Partial<Subtask>
  ) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    const subtasks = [...tasks[taskIndex].subtasks];
    subtasks[subtaskIndex] = { ...subtasks[subtaskIndex], ...updates };
    tasks[taskIndex] = { ...tasks[taskIndex], subtasks };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function addSubtask(epicIndex: number, storyIndex: number, taskIndex: number) {
    if (!plan) return;
    const newSubtaskIndex = plan.epics[epicIndex].stories[storyIndex].tasks[taskIndex].subtasks.length;
    const epicKey = `epic-${epicIndex}`;
    const storyKey = `story-${epicIndex}-${storyIndex}`;
    const taskKey = `task-${epicIndex}-${storyIndex}-${taskIndex}`;
    const subtaskKey = `subtask-${epicIndex}-${storyIndex}-${taskIndex}-${newSubtaskIndex}`;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      subtasks: [
        ...tasks[taskIndex].subtasks,
        { id: `SUBTASK-${tasks[taskIndex].subtasks.length + 1}`, title: "New Subtask", description: "" }
      ]
    };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
    setExpandedEpics((prev) => ({ ...prev, [epicKey]: true }));
    setExpandedStories((prev) => ({ ...prev, [storyKey]: true }));
    setExpandedTasks((prev) => ({ ...prev, [taskKey]: true }));
    triggerHighlight(subtaskKey);
    setTimeout(() => {
      const node = subtaskRefs.current[subtaskKey];
      if (node) {
        node.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  }

  function removeSubtask(
    epicIndex: number,
    storyIndex: number,
    taskIndex: number,
    subtaskIndex: number
  ) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      subtasks: tasks[taskIndex].subtasks.filter((_, index) => index !== subtaskIndex)
    };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function updateCompletionRequirement(
    epicIndex: number,
    storyIndex: number,
    taskIndex: number,
    reqIndex: number,
    value: string
  ) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    const requirements = [...(tasks[taskIndex].completion_requirements ?? [])];
    requirements[reqIndex] = value;
    tasks[taskIndex] = { ...tasks[taskIndex], completion_requirements: requirements };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function addCompletionRequirement(epicIndex: number, storyIndex: number, taskIndex: number) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      completion_requirements: [
        ...(tasks[taskIndex].completion_requirements ?? []),
        "New requirement"
      ]
    };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  function removeCompletionRequirement(
    epicIndex: number,
    storyIndex: number,
    taskIndex: number,
    reqIndex: number
  ) {
    if (!plan) return;
    const nextEpics = [...plan.epics];
    const stories = [...nextEpics[epicIndex].stories];
    const tasks = [...stories[storyIndex].tasks];
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      completion_requirements: (tasks[taskIndex].completion_requirements ?? []).filter(
        (_, index) => index !== reqIndex
      )
    };
    stories[storyIndex] = { ...stories[storyIndex], tasks };
    nextEpics[epicIndex] = { ...nextEpics[epicIndex], stories };
    setPlan({ ...plan, epics: nextEpics });
  }

  const activeTaskData = useMemo(() => {
    if (!plan || !activeTask) return null;
    const epic = plan.epics[activeTask.epicIndex];
    if (!epic) return null;
    const story = epic.stories[activeTask.storyIndex];
    if (!story) return null;
    const task = story.tasks[activeTask.taskIndex];
    if (!task) return null;
    return { epic, story, task };
  }, [plan, activeTask]);

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
            <p className="text-xs text-ink-500">
              Up to 5 files, 2MB each. Text-based files work best.
            </p>
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
                setPlan(null);
                setError(null);
              }}
            >
              Use example
            </button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {plan && (
          <div className="flex flex-col gap-6">
            <div className="rounded-3xl border border-ink-100 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Plan</p>
                <h2 className="text-2xl font-semibold text-ink-900">
                  {plan.title || "Project Plan"}
                </h2>
                {plan.summary && (
                  <p className="text-sm leading-relaxed text-ink-600">{plan.summary}</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(planJson)}`}
                  download={`${(plan.title || "project-plan")
                    .toLowerCase()
                    .replace(/\s+/g, "-")}.json`}
                  className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-xs font-semibold text-ink-700 transition hover:bg-ink-100"
                >
                  Download JSON
                </a>
                <button
                  type="button"
                  className="rounded-full border border-ink-200 bg-white px-4 py-2 text-xs font-semibold text-ink-700"
                  onClick={() => setEditMode((prev) => !prev)}
                >
                  {editMode ? "Exit edit mode" : "Edit plan"}
                </button>
                {editMode && (
                  <button
                    type="button"
                    className="rounded-full border border-ink-200 bg-ink-50 px-4 py-2 text-xs font-semibold text-ink-700"
                    onClick={addEpic}
                  >
                    Add epic
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4">
              {plan.epics.map((epic, epicIndex) => {
                const epicKey = `epic-${epicIndex}`;
                const isEpicExpanded = expandedEpics[epicKey] ?? true;

                return (
                  <div
                    key={epicKey}
                    ref={(node) => {
                      epicRefs.current[epicKey] = node;
                    }}
                    className={`rounded-3xl border border-ink-100 bg-white p-6 shadow-sm transition-colors transition-shadow duration-700 ${
                      highlightItems[epicKey]
                        ? "bg-amber-50/80 ring-2 ring-amber-200"
                        : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-4 text-left"
                      onClick={() =>
                        setExpandedEpics((prev) => ({
                          ...prev,
                          [epicKey]: !isEpicExpanded
                        }))
                      }
                    >
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                          Epic
                        </p>
                        {editMode ? (
                          <div className="mt-2 flex flex-col gap-2">
                            <input
                              className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900"
                              value={epic.title}
                              onChange={(event) => updateEpic(epicIndex, { title: event.target.value })}
                              placeholder="Epic title"
                            />
                            <textarea
                              className="min-h-[80px] w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700"
                              value={epic.description || ""}
                              onChange={(event) =>
                                updateEpic(epicIndex, { description: event.target.value })
                              }
                              placeholder="Epic description"
                            />
                          </div>
                        ) : (
                          <div>
                            <h3 className="text-xl font-semibold text-ink-900">{epic.title}</h3>
                            {epic.description && (
                              <p className="mt-2 text-sm text-ink-600">{epic.description}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                        {isEpicExpanded ? "Hide" : "Show"}
                      </span>
                    </button>
                    {editMode && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600"
                          onClick={() => addStory(epicIndex)}
                        >
                          Add story
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                          onClick={() => removeEpic(epicIndex)}
                        >
                          Delete epic
                        </button>
                      </div>
                    )}

                    {isEpicExpanded && (
                      <div className="mt-4 flex flex-col gap-4">
                        {epic.stories.map((story, storyIndex) => {
                          const storyKey = `story-${epicIndex}-${storyIndex}`;
                          const isStoryExpanded = expandedStories[storyKey] ?? true;

                          return (
                            <div
                              key={storyKey}
                              ref={(node) => {
                                storyRefs.current[storyKey] = node;
                              }}
                              className={`rounded-2xl border border-ink-100 bg-ink-50/50 p-4 transition-colors transition-shadow duration-700 ${
                                highlightItems[storyKey]
                                  ? "bg-amber-50/80 ring-2 ring-amber-200"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                className="flex w-full items-start justify-between gap-4 text-left"
                                onClick={() =>
                                  setExpandedStories((prev) => ({
                                    ...prev,
                                    [storyKey]: !isStoryExpanded
                                  }))
                                }
                              >
                                <div className="flex-1">
                                  <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                    Story
                                  </p>
                                  {editMode ? (
                                    <div className="mt-2 flex flex-col gap-2">
                                      <input
                                        className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900"
                                        value={story.title}
                                        onChange={(event) =>
                                          updateStory(epicIndex, storyIndex, {
                                            title: event.target.value
                                          })
                                        }
                                        placeholder="Story title"
                                      />
                                      <textarea
                                        className="min-h-[70px] w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700"
                                        value={story.description || ""}
                                        onChange={(event) =>
                                          updateStory(epicIndex, storyIndex, {
                                            description: event.target.value
                                          })
                                        }
                                        placeholder="Story description"
                                      />
                                    </div>
                                  ) : (
                                    <div>
                                      <h4 className="text-lg font-semibold text-ink-900">
                                        {story.title}
                                      </h4>
                                      {story.description && (
                                        <p className="mt-1 text-sm text-ink-600">
                                          {story.description}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                  {isStoryExpanded ? "Hide" : "Show"}
                                </span>
                              </button>

                              {editMode && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600"
                                    onClick={() => addTask(epicIndex, storyIndex)}
                                  >
                                    Add task
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                                    onClick={() => removeStory(epicIndex, storyIndex)}
                                  >
                                    Delete story
                                  </button>
                                </div>
                              )}

                              {isStoryExpanded && (
                                <div className="mt-3 grid gap-3">
                                  {story.tasks.map((task, taskIndex) => {
                                    const taskKey = `task-${epicIndex}-${storyIndex}-${taskIndex}`;
                                    const isTaskExpanded = expandedTasks[taskKey] ?? true;
                                    const requirements = task.completion_requirements ?? [];

                                    return (
                                      <div
                                        key={taskKey}
                                        ref={(node) => {
                                          taskRefs.current[taskKey] = node;
                                        }}
                                        className={`rounded-2xl border border-ink-100 bg-white p-3 transition-colors transition-shadow duration-700 ${
                                          highlightItems[taskKey]
                                            ? "bg-amber-50/80 ring-2 ring-amber-200"
                                            : ""
                                        }`}
                                      >
                                        <button
                                          type="button"
                                          className="flex w-full items-start justify-between gap-4 text-left"
                                          onClick={() =>
                                            setExpandedTasks((prev) => ({
                                              ...prev,
                                              [taskKey]: !isTaskExpanded
                                            }))
                                          }
                                        >
                                          <div className="flex-1">
                                            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                              Task
                                            </p>
                                            {editMode ? (
                                              <div className="mt-2 flex flex-col gap-2">
                                                <input
                                                  className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900"
                                                  value={task.title}
                                                  onChange={(event) =>
                                                    updateTask(epicIndex, storyIndex, taskIndex, {
                                                      title: event.target.value
                                                    })
                                                  }
                                                  placeholder="Task title"
                                                />
                                                <textarea
                                                  className="min-h-[60px] w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700"
                                                  value={task.description || ""}
                                                  onChange={(event) =>
                                                    updateTask(epicIndex, storyIndex, taskIndex, {
                                                      description: event.target.value
                                                    })
                                                  }
                                                  placeholder="Task description"
                                                />
                                              </div>
                                            ) : (
                                              <div>
                                                <h5 className="text-sm font-semibold text-ink-900">
                                                  {task.title}
                                                </h5>
                                                {task.description && (
                                                  <p className="mt-1 text-sm text-ink-600">
                                                    {task.description}
                                                  </p>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-500">
                                            {isTaskExpanded ? "Hide" : "Show"}
                                          </span>
                                        </button>

                                        {!editMode && (
                                          <button
                                            type="button"
                                            className="mt-2 text-xs font-semibold text-ink-500 underline-offset-4 hover:underline"
                                            onClick={() =>
                                              setActiveTask({ epicIndex, storyIndex, taskIndex })
                                            }
                                          >
                                            View details
                                          </button>
                                        )}

                                        {editMode && (
                                          <div className="mt-3 flex flex-wrap gap-2">
                                            <button
                                              type="button"
                                              className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600"
                                              onClick={() => addSubtask(epicIndex, storyIndex, taskIndex)}
                                            >
                                              Add subtask
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-ink-200 bg-white px-3 py-1 text-xs font-semibold text-ink-600"
                                              onClick={() =>
                                                addCompletionRequirement(epicIndex, storyIndex, taskIndex)
                                              }
                                            >
                                              Add requirement
                                            </button>
                                            <button
                                              type="button"
                                              className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                                              onClick={() => removeTask(epicIndex, storyIndex, taskIndex)}
                                            >
                                              Delete task
                                            </button>
                                          </div>
                                        )}

                                        {isTaskExpanded && (
                                          <div className="mt-3 grid gap-3">
                                            <div className="rounded-xl border border-ink-100 bg-ink-50/40 p-3">
                                              <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                                Completion requirements
                                              </p>
                                              {editMode ? (
                                                <div className="mt-2 flex flex-col gap-2">
                                                  {requirements.map((req, reqIndex) => (
                                                    <div
                                                      key={`req-${reqIndex}`}
                                                      className="flex items-center gap-2"
                                                    >
                                                      <input
                                                        className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700"
                                                        value={req}
                                                        onChange={(event) =>
                                                          updateCompletionRequirement(
                                                            epicIndex,
                                                            storyIndex,
                                                            taskIndex,
                                                            reqIndex,
                                                            event.target.value
                                                          )
                                                        }
                                                      />
                                                      <button
                                                        type="button"
                                                        className="text-xs font-semibold text-red-500"
                                                        onClick={() =>
                                                          removeCompletionRequirement(
                                                            epicIndex,
                                                            storyIndex,
                                                            taskIndex,
                                                            reqIndex
                                                          )
                                                        }
                                                      >
                                                        Remove
                                                      </button>
                                                    </div>
                                                  ))}
                                                  {requirements.length === 0 && (
                                                    <p className="text-xs text-ink-500">
                                                      No requirements yet.
                                                    </p>
                                                  )}
                                                </div>
                                              ) : (
                                                <ul className="mt-2 list-disc pl-5 text-sm text-ink-600">
                                                  {requirements.length > 0 ? (
                                                    requirements.map((req, reqIndex) => (
                                                      <li key={`req-${reqIndex}`}>{req}</li>
                                                    ))
                                                  ) : (
                                                    <li>No requirements listed.</li>
                                                  )}
                                                </ul>
                                              )}
                                            </div>

                                            <div className="rounded-xl border border-ink-100 bg-white p-3">
                                              <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                                                Subtasks
                                              </p>
                                              {editMode ? (
                                                <div className="mt-2 flex flex-col gap-2">
                                                  {task.subtasks.map((subtask, subtaskIndex) => (
                                                    <div
                                                      key={`sub-${subtaskIndex}`}
                                                      ref={(node) => {
                                                        subtaskRefs.current[
                                                          `subtask-${epicIndex}-${storyIndex}-${taskIndex}-${subtaskIndex}`
                                                        ] = node;
                                                      }}
                                                      className={`rounded-xl border border-ink-100 bg-ink-50/40 p-3 transition-colors transition-shadow duration-700 ${
                                                        highlightItems[
                                                          `subtask-${epicIndex}-${storyIndex}-${taskIndex}-${subtaskIndex}`
                                                        ]
                                                          ? "bg-amber-50/80 ring-2 ring-amber-200"
                                                          : ""
                                                      }`}
                                                    >
                                                      <input
                                                        className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-900"
                                                        value={subtask.title}
                                                        onChange={(event) =>
                                                          updateSubtask(
                                                            epicIndex,
                                                            storyIndex,
                                                            taskIndex,
                                                            subtaskIndex,
                                                            { title: event.target.value }
                                                          )
                                                        }
                                                        placeholder="Subtask title"
                                                      />
                                                      <textarea
                                                        className="mt-2 min-h-[50px] w-full rounded-xl border border-ink-200 px-3 py-2 text-sm text-ink-700"
                                                        value={subtask.description || ""}
                                                        onChange={(event) =>
                                                          updateSubtask(
                                                            epicIndex,
                                                            storyIndex,
                                                            taskIndex,
                                                            subtaskIndex,
                                                            { description: event.target.value }
                                                          )
                                                        }
                                                        placeholder="Subtask description"
                                                      />
                                                      <button
                                                        type="button"
                                                        className="mt-2 text-xs font-semibold text-red-500"
                                                        onClick={() =>
                                                          removeSubtask(
                                                            epicIndex,
                                                            storyIndex,
                                                            taskIndex,
                                                            subtaskIndex
                                                          )
                                                        }
                                                      >
                                                        Remove subtask
                                                      </button>
                                                    </div>
                                                  ))}
                                                  {task.subtasks.length === 0 && (
                                                    <p className="text-xs text-ink-500">
                                                      No subtasks yet.
                                                    </p>
                                                  )}
                                                </div>
                                              ) : (
                                                <ul className="mt-2 list-disc pl-5 text-sm text-ink-600">
                                                  {task.subtasks.length > 0 ? (
                                                    task.subtasks.map((subtask, subtaskIndex) => (
                                                      <li key={`sub-${subtaskIndex}`}>
                                                        <span className="font-medium text-ink-700">
                                                          {subtask.title}
                                                        </span>
                                                        {subtask.description ? ` — ${subtask.description}` : ""}
                                                      </li>
                                                    ))
                                                  ) : (
                                                    <li>No subtasks listed.</li>
                                                  )}
                                                </ul>
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {(plan.assumptions?.length || plan.risks?.length) && (
              <div className="grid gap-4 md:grid-cols-2">
                {plan.assumptions && plan.assumptions.length > 0 && (
                  <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-ink-900">Assumptions</h3>
                    <ul className="mt-3 list-disc pl-5 text-sm text-ink-600">
                      {plan.assumptions.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {plan.risks && plan.risks.length > 0 && (
                  <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-ink-900">Risks</h3>
                    <ul className="mt-3 list-disc pl-5 text-sm text-ink-600">
                      {plan.risks.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {activeTaskData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-6 py-10">
          <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                  {activeTaskData.epic.title} • {activeTaskData.story.title}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-ink-900">
                  {activeTaskData.task.title}
                </h3>
              </div>
              <button
                type="button"
                className="rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600"
                onClick={() => setActiveTask(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-ink-100 bg-ink-50/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                  Task Description
                </p>
                <p className="mt-2 text-sm text-ink-700">
                  {activeTaskData.task.description || "No description provided."}
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
                  Completion Requirements
                </p>
                {(activeTaskData.task.completion_requirements ?? []).length > 0 ? (
                  <ul className="mt-3 list-disc pl-5 text-sm text-ink-700">
                    {(activeTaskData.task.completion_requirements ?? []).map((item, index) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-600">No requirements listed.</p>
                )}
              </div>

              <div className="rounded-2xl border border-ink-100 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">Subtasks</p>
                {activeTaskData.task.subtasks.length > 0 ? (
                  <ul className="mt-3 list-disc pl-5 text-sm text-ink-700">
                    {activeTaskData.task.subtasks.map((subtask, index) => (
                      <li key={`${subtask.title}-${index}`}>
                        <span className="font-medium text-ink-800">{subtask.title}</span>
                        {subtask.description ? ` — ${subtask.description}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-ink-600">No subtasks listed.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
