# RAUG Resume & Outreach Assistant

A **retrieval-augmented** resume builder and job application assistant. Paste a
job description and the app:

1. Retrieves the most relevant items from your **structured candidate profile**
   (experiences, projects, courses, skills).
2. Generates a **grounded** fit analysis (score, summary, strengths, risks,
   best angle).
3. Generates **tailored resume bullets** that reference real profile items.
4. Generates **ready-to-send outreach**: recruiter email, LinkedIn connection
   note (<300 chars), LinkedIn DM, 48-hour follow-up, 7-day follow-up.
5. Tracks every job through a Kanban-style pipeline.

Built with **Next.js (App Router) + TypeScript + Tailwind + Prisma (SQLite)**.

The "AI" layer ships with a deterministic fallback generator so the product
demos perfectly **without any API key**. Set `OPENAI_API_KEY` or
`ANTHROPIC_API_KEY` in `.env` to swap in a real model later (the helper is
already wired for it).

## Run it

```bash
cd ~/raug-resume-builder
npm install
npx prisma db push     # create dev.db from schema.prisma
npm run db:seed        # seed the Cornell Tech candidate profile + 2 demo jobs
npm run dev            # http://localhost:3000
```

To rebuild from a clean slate:

```bash
npm run db:reset
```

## Production build

```bash
npm run build
npm start
```

## What's inside

- `prisma/schema.prisma` — `CandidateProfile`, `Experience`, `Project`,
  `Skill`, `Course`, `Job`, `JobAnalysis`, `GeneratedMessage`.
- `src/lib/retrieval.ts` — keyword-overlap retriever with stopword filtering
  and a small synonym table (ai/ml/llm/rag, frontend/backend, etc.).
- `src/lib/ai.ts` — `analyzeJob()` and `generateOutreach()`. Always grounded
  in retrieval. Deterministic fallback today; swap in OpenAI/Anthropic later.
- `src/app/(pages)` — Home, Candidate Profile, Jobs, Job Detail, Messages,
  Pipeline.
- `src/components/` — Sidebar, FitScoreRing, StatusBadge, CopyButton, etc.

## Important: retrieval is the source of truth

Every generated bullet, fit reason, and message is built from items the
retriever surfaced for that JD. The fallback generator will refuse to invent
experience that isn't in your profile — if a JD asks for something you don't
have, it shows up in **Risks & gaps**, not in your bullets.
