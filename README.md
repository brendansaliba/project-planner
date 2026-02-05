# Project Planner

[![Built with Codex](https://img.shields.io/badge/Built%20with-Codex-1f2937?style=for-the-badge&labelColor=0f172a&color=22c55e)](https://openai.com/codex)

Turn a single prompt into a structured plan with epics, stories, tasks, subtasks, and completion requirements.  
The planner renders a clean, editable checklist, keeps history locally in your browser, and lets you reopen prior projects.

## Highlights
- Generate a full project plan from a prompt or supporting files
- Edit epics, stories, tasks, subtasks, and requirements in-place
- Auto-scroll to new items with a soft highlight
- History page with expandable prompts and JSON previews
- Export plans as JSON

## Getting Started
1. Clone the repo and install dependencies:
```bash
npm install
```

2. Add your OpenAI API key:
```bash
cp .env.example .env.local
```
Then set `OPENAI_API_KEY` in `.env.local`.

3. Run the dev server:
```bash
npm run dev
```

4. Open the app:
```
http://localhost:3000
```

## Tech
- Next.js (App Router)
- React + TypeScript
- Tailwind CSS

## Credits
Built with help from Codex (OpenAI) as AI pair programmer.
