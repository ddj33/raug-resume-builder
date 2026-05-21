import { prisma } from "./db";
import { tokenize } from "./retrieval";
import { analyzeJob } from "./ai";
import { STAGE_LABELS, type PipelineStage } from "./types";

/**
 * Retrieval-grounded chatbot. Same RAUG pattern as the rest of the app:
 *   1. Classify intent
 *   2. Retrieve relevant facts from the local DB
 *   3. Generate a templated, deterministic answer that cites the evidence
 *
 * Live-LLM mode would slot in at step 3 — same retrieved evidence becomes
 * the system context, with a strict "answer only from these facts" prompt.
 */

export type ChatIntent =
  | "greeting"
  | "help"
  | "profile_summary"
  | "list_projects"
  | "list_experiences"
  | "list_skills"
  | "list_courses"
  | "list_jobs"
  | "pipeline_status"
  | "jobs_in_stage"
  | "fit_for_job"
  | "explain_match"
  | "find_evidence"
  | "general_search";

export const INTENT_LABELS: Record<ChatIntent, string> = {
  greeting: "Greeting",
  help: "Help",
  profile_summary: "Profile summary",
  list_projects: "List projects",
  list_experiences: "List experiences",
  list_skills: "List skills",
  list_courses: "List courses",
  list_jobs: "List jobs",
  pipeline_status: "Pipeline status",
  jobs_in_stage: "Jobs in stage",
  fit_for_job: "Fit for a specific role",
  explain_match: "Explain a match",
  find_evidence: "Find evidence",
  general_search: "Keyword search",
};

export type ChatEvidence = {
  kind: "profile" | "experience" | "project" | "course" | "skill" | "job" | "analysis" | "message";
  id: string;
  href?: string;
  title: string;
  subtitle?: string;
  body: string;
  matchedKeywords?: string[];
  meta?: Record<string, string | number>;
};

export type ChatAnswer = {
  intent: ChatIntent;
  content: string;
  evidence: ChatEvidence[];
  followups?: string[];
};

/* ------------------------------ public -------------------------------- */

export async function answerQuestion(userMessage: string): Promise<ChatAnswer> {
  const cls = await classify(userMessage);
  switch (cls.intent) {
    case "greeting":
      return greeting();
    case "help":
      return help();
    case "profile_summary":
      return profileSummary();
    case "list_projects":
      return listProjects();
    case "list_experiences":
      return listExperiences();
    case "list_skills":
      return listSkills();
    case "list_courses":
      return listCourses();
    case "list_jobs":
      return listJobs();
    case "pipeline_status":
      return pipelineStatus();
    case "jobs_in_stage":
      return jobsInStage(cls.entities?.stage);
    case "fit_for_job":
      return fitForJob(cls.entities?.jobId);
    case "explain_match":
      return explainMatch(cls.entities?.jobId);
    case "find_evidence":
      return findEvidence(cls.entities?.keywords ?? []);
    default:
      return generalSearch(userMessage);
  }
}

/* ----------------------------- classifier ----------------------------- */

type Classified = {
  intent: ChatIntent;
  entities?: { jobId?: string; stage?: PipelineStage; keywords?: string[] };
};

async function classify(message: string): Promise<Classified> {
  const m = message.toLowerCase().trim();

  if (m.length === 0) return { intent: "help" };
  if (/^(hi|hello|hey|yo|sup|hiya)\b/.test(m)) return { intent: "greeting" };
  if (/^(help|what can you|capabilities|commands|how do i use|what do you do)/.test(m)) {
    return { intent: "help" };
  }

  // Stage-scoped pipeline queries take priority over generic list_jobs.
  const stage = detectStage(m);
  if (stage && /(jobs?|positions?|roles?|in|at|stage)/.test(m)) {
    return { intent: "jobs_in_stage", entities: { stage } };
  }
  if (/(pipeline|kanban|tracking|application status|where am i in)/.test(m)) {
    return { intent: "pipeline_status" };
  }

  // Per-job questions — try to attach a jobId entity from company / title hits.
  const jobMatch = await detectJob(m);
  if (jobMatch && /\b(why|how come|reason|explain)/.test(m)) {
    return { intent: "explain_match", entities: { jobId: jobMatch } };
  }
  if (jobMatch && /\b(fit|match|score|suited|qualified|good for|right for)/.test(m)) {
    return { intent: "fit_for_job", entities: { jobId: jobMatch } };
  }
  if (jobMatch) {
    // Generic job-named question with no other intent → treat as fit query.
    return { intent: "fit_for_job", entities: { jobId: jobMatch } };
  }

  if (/(who am i|tell me about myself|profile summary|summarize my profile|about me)/.test(m)) {
    return { intent: "profile_summary" };
  }

  if (/\bproject(s)?\b/.test(m)) return { intent: "list_projects" };
  if (/(internship|work history|previous role|experience.*(at|with|in)|where have i worked)/.test(m)) {
    return { intent: "list_experiences" };
  }
  if (/\bexperience(s)?\b/.test(m) && !/years of/.test(m)) {
    return { intent: "list_experiences" };
  }
  if (/(skill|stack|languages? do i|what (do|can) i use|tools? do i)/.test(m)) {
    return { intent: "list_skills" };
  }
  if (/(class|classes|course|coursework|curriculum|what am i taking|what have i taken)/.test(m)) {
    return { intent: "list_courses" };
  }
  if (/(evidence|examples?|projects? about|things? about|show me anything about|do i have anything)/.test(m)) {
    return { intent: "find_evidence", entities: { keywords: extractContentKeywords(m) } };
  }
  if (/(jobs?|positions?|roles?|companies|applications?)/.test(m)) {
    return { intent: "list_jobs" };
  }

  return { intent: "general_search", entities: { keywords: extractContentKeywords(m) } };
}

function detectStage(m: string): PipelineStage | undefined {
  const stages: PipelineStage[] = [
    "saved",
    "applying",
    "applied",
    "contacted",
    "interviewing",
    "rejected",
    "offer",
  ];
  for (const s of stages) if (m.includes(s)) return s;
  if (/interview/.test(m)) return "interviewing";
  if (/offer/.test(m)) return "offer";
  if (/applied/.test(m)) return "applied";
  return undefined;
}

async function detectJob(m: string): Promise<string | undefined> {
  const jobs = await prisma.job.findMany({ select: { id: true, company: true, title: true } });
  // Company name match first (more specific), then title fragment.
  for (const j of jobs) {
    if (j.company && m.includes(j.company.toLowerCase())) return j.id;
  }
  for (const j of jobs) {
    const tparts = j.title.toLowerCase().split(/\s+/).filter((p) => p.length > 3);
    if (tparts.some((p) => m.includes(p))) return j.id;
  }
  return undefined;
}

function extractContentKeywords(m: string): string[] {
  // Drop generic question framing words before tokenizing.
  const cleaned = m.replace(
    /^(what|who|when|where|why|how|tell me|show me|find me|do i have|can you|please|list|all|the|my|i)\b\s*/g,
    " "
  );
  return tokenize(cleaned).slice(0, 8);
}

/* ----------------------------- handlers ------------------------------- */

function greeting(): ChatAnswer {
  return {
    intent: "greeting",
    content:
      "Hi — I'm your RAUG assistant. I answer questions by retrieving facts from your candidate profile and saved jobs, then citing the evidence I used.",
    evidence: [],
    followups: [
      "What projects do I have related to AI?",
      "What's in my application pipeline?",
      "What's my fit for Northwind AI?",
      "Help",
    ],
  };
}

function help(): ChatAnswer {
  return {
    intent: "help",
    content: [
      "Here's what I can answer, all grounded in your local data:",
      "",
      "• Profile — projects, experiences, skills, courses, summary",
      "• Jobs — list saved jobs, pipeline stage, what's in interviewing/offer",
      "• Per-job — fit score, why a job matches, evidence used",
      "• Search — \"do I have anything about RAG\" / \"projects about fintech\"",
      "",
      "Every answer shows the retrieved evidence it was built from — no inventing.",
    ].join("\n"),
    evidence: [],
    followups: [
      "Summarize my profile",
      "What projects do I have?",
      "Why am I a good fit for Lattice Capital?",
      "What jobs are in interviewing?",
    ],
  };
}

async function profileSummary(): Promise<ChatAnswer> {
  const p = await prisma.candidateProfile.findFirst({
    include: { experiences: true, projects: true, skills: true, courses: true },
  });
  if (!p) return { intent: "profile_summary", content: "No profile found.", evidence: [] };

  const lines = [
    `${p.fullName} — ${p.headline}.`,
    `${p.program} ${p.degree} at ${p.school} (grad ${p.graduation}). Based in ${p.location}.`,
    "",
    p.summary,
    "",
    `Targeting: ${p.preferredRoles}.`,
    `Open to: ${p.preferredTypes}.`,
    "",
    `${p.experiences.length} experiences · ${p.projects.length} projects · ${p.skills.length} skills · ${p.courses.length} courses on file.`,
  ];

  return {
    intent: "profile_summary",
    content: lines.join("\n"),
    evidence: [
      {
        kind: "profile",
        id: p.id,
        href: "/profile",
        title: p.fullName,
        subtitle: `${p.program} · ${p.school}`,
        body: p.summary,
      },
    ],
    followups: ["What projects do I have?", "What skills do I have?", "What's in my pipeline?"],
  };
}

async function listProjects(): Promise<ChatAnswer> {
  const projects = await prisma.project.findMany({ orderBy: { createdAt: "asc" } });
  if (projects.length === 0) {
    return { intent: "list_projects", content: "You have no projects on file yet.", evidence: [] };
  }
  return {
    intent: "list_projects",
    content: `You have ${projects.length} project${projects.length === 1 ? "" : "s"} on file. Each one below is a real record from your profile.`,
    evidence: projects.map((p) => ({
      kind: "project",
      id: p.id,
      href: "/profile",
      title: p.name,
      subtitle: p.role ?? undefined,
      body: p.description,
      matchedKeywords: p.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
    })),
    followups: ["Which of these is most relevant for AI roles?", "Show me my work experience"],
  };
}

async function listExperiences(): Promise<ChatAnswer> {
  const exps = await prisma.experience.findMany({ orderBy: { createdAt: "asc" } });
  if (exps.length === 0) {
    return { intent: "list_experiences", content: "No experience records on file.", evidence: [] };
  }
  return {
    intent: "list_experiences",
    content: `You have ${exps.length} experience record${exps.length === 1 ? "" : "s"}:`,
    evidence: exps.map((e) => ({
      kind: "experience",
      id: e.id,
      href: "/profile",
      title: e.title,
      subtitle: `${e.company} • ${e.startDate}${e.endDate ? `–${e.endDate}` : ""}`,
      body: e.description,
      matchedKeywords: e.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
    })),
  };
}

async function listSkills(): Promise<ChatAnswer> {
  const skills = await prisma.skill.findMany({ orderBy: { name: "asc" } });
  if (skills.length === 0) return { intent: "list_skills", content: "No skills on file.", evidence: [] };
  // Group by category for the prose answer.
  const byCat = new Map<string, string[]>();
  for (const s of skills) {
    const arr = byCat.get(s.category) ?? [];
    arr.push(s.name);
    byCat.set(s.category, arr);
  }
  const groups = Array.from(byCat.entries()).map(([cat, names]) => `${cat}: ${names.join(", ")}`);
  return {
    intent: "list_skills",
    content:
      `You have ${skills.length} skills across ${byCat.size} categories:\n\n` + groups.map((g) => `• ${g}`).join("\n"),
    evidence: skills.slice(0, 12).map((s) => ({
      kind: "skill",
      id: s.id,
      href: "/profile",
      title: s.name,
      subtitle: s.category,
      body: s.level ?? "",
    })),
  };
}

async function listCourses(): Promise<ChatAnswer> {
  const courses = await prisma.course.findMany({ orderBy: { term: "asc" } });
  if (courses.length === 0) return { intent: "list_courses", content: "No courses on file.", evidence: [] };
  return {
    intent: "list_courses",
    content: `You have ${courses.length} courses on file (mostly Cornell Tech):`,
    evidence: courses.map((c) => ({
      kind: "course",
      id: c.id,
      href: "/profile",
      title: `${c.code ? `${c.code} — ` : ""}${c.name}`,
      subtitle: c.term ?? undefined,
      body: c.description,
      matchedKeywords: c.tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 4),
    })),
  };
}

async function listJobs(): Promise<ChatAnswer> {
  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    include: { analysis: true, messages: true },
  });
  if (jobs.length === 0) return { intent: "list_jobs", content: "No saved jobs yet.", evidence: [] };
  return {
    intent: "list_jobs",
    content: `You're tracking ${jobs.length} job${jobs.length === 1 ? "" : "s"} right now:`,
    evidence: jobs.map((j) => ({
      kind: "job",
      id: j.id,
      href: `/jobs/${j.id}`,
      title: j.title,
      subtitle: `${j.company}${j.location ? ` • ${j.location}` : ""}`,
      body: j.description.slice(0, 220) + (j.description.length > 220 ? "…" : ""),
      meta: {
        stage: STAGE_LABELS[(j.status as PipelineStage) ?? "saved"],
        ...(j.analysis ? { fit: j.analysis.fitScore } : {}),
        outreach: j.messages.length,
      },
    })),
    followups: ["What's in my pipeline?", "Why am I a good fit for the first one?"],
  };
}

async function pipelineStatus(): Promise<ChatAnswer> {
  const jobs = await prisma.job.findMany({ orderBy: { createdAt: "desc" } });
  const byStage = new Map<string, number>();
  for (const j of jobs) byStage.set(j.status, (byStage.get(j.status) ?? 0) + 1);
  const lines = Array.from(byStage.entries()).map(([s, n]) => `• ${STAGE_LABELS[s as PipelineStage] ?? s}: ${n}`);
  return {
    intent: "pipeline_status",
    content:
      `You have ${jobs.length} jobs across ${byStage.size} stage${byStage.size === 1 ? "" : "s"}:\n\n` +
      (lines.join("\n") || "—"),
    evidence: jobs.slice(0, 5).map((j) => ({
      kind: "job",
      id: j.id,
      href: `/jobs/${j.id}`,
      title: j.title,
      subtitle: `${j.company} · ${STAGE_LABELS[(j.status as PipelineStage) ?? "saved"]}`,
      body: j.description.slice(0, 160) + (j.description.length > 160 ? "…" : ""),
    })),
    followups: ["What jobs are in interviewing?", "Show me jobs in saved"],
  };
}

async function jobsInStage(stage: PipelineStage | undefined): Promise<ChatAnswer> {
  if (!stage) return { intent: "jobs_in_stage", content: "I couldn't tell which stage you meant.", evidence: [] };
  const jobs = await prisma.job.findMany({ where: { status: stage }, orderBy: { createdAt: "desc" } });
  if (jobs.length === 0) {
    return {
      intent: "jobs_in_stage",
      content: `Nothing is currently in **${STAGE_LABELS[stage]}**.`,
      evidence: [],
    };
  }
  return {
    intent: "jobs_in_stage",
    content: `You have ${jobs.length} job${jobs.length === 1 ? "" : "s"} in **${STAGE_LABELS[stage]}**:`,
    evidence: jobs.map((j) => ({
      kind: "job",
      id: j.id,
      href: `/jobs/${j.id}`,
      title: j.title,
      subtitle: j.company,
      body: j.description.slice(0, 160) + (j.description.length > 160 ? "…" : ""),
    })),
  };
}

async function fitForJob(jobId: string | undefined): Promise<ChatAnswer> {
  if (!jobId) {
    return { intent: "fit_for_job", content: "I couldn't tell which job you meant. Try \"fit for <company name>\".", evidence: [] };
  }
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { analysis: true } });
  if (!job) return { intent: "fit_for_job", content: "Job not found.", evidence: [] };

  // If we have a stored analysis use it; otherwise compute fresh (but don't persist — that's the analyze button's job).
  let fitScore: number;
  let summary: string;
  let strengths: string[];
  if (job.analysis) {
    fitScore = job.analysis.fitScore;
    summary = job.analysis.summary;
    strengths = safeArr<string>(job.analysis.strengths);
  } else {
    const profile = await prisma.candidateProfile.findFirst({
      include: { experiences: true, projects: true, skills: true, courses: true },
    });
    if (!profile) return { intent: "fit_for_job", content: "No profile found.", evidence: [] };
    const bundle = analyzeJob(profile, job);
    fitScore = bundle.analysis.fitScore;
    summary = bundle.analysis.summary;
    strengths = bundle.analysis.strengths;
  }

  return {
    intent: "fit_for_job",
    content:
      `For **${job.title} at ${job.company}** your fit score is **${fitScore}/100**.\n\n` +
      summary +
      "\n\nTop matches:\n" +
      strengths.slice(0, 3).map((s) => `• ${s}`).join("\n"),
    evidence: [
      {
        kind: "job",
        id: job.id,
        href: `/jobs/${job.id}`,
        title: job.title,
        subtitle: job.company,
        body: job.description.slice(0, 240) + (job.description.length > 240 ? "…" : ""),
        meta: { fit: fitScore, stage: STAGE_LABELS[(job.status as PipelineStage) ?? "saved"] },
      },
    ],
    followups: [`Why am I a good fit for ${job.company}?`, "What's in my pipeline?"],
  };
}

async function explainMatch(jobId: string | undefined): Promise<ChatAnswer> {
  if (!jobId) {
    return { intent: "explain_match", content: "Tell me which company so I can explain the match.", evidence: [] };
  }
  const job = await prisma.job.findUnique({ where: { id: jobId }, include: { analysis: true } });
  if (!job) return { intent: "explain_match", content: "Job not found.", evidence: [] };

  const profile = await prisma.candidateProfile.findFirst({
    include: { experiences: true, projects: true, skills: true, courses: true },
  });
  if (!profile) return { intent: "explain_match", content: "No profile found.", evidence: [] };

  const bundle = analyzeJob(profile, job);
  const top = bundle.evidence.filter((e) => e.kind !== "skill").slice(0, 3);

  return {
    intent: "explain_match",
    content:
      `Here's why you map to **${job.title} at ${job.company}**:\n\n` +
      bundle.analysis.angle +
      "\n\nTop evidence retrieved from your profile:\n" +
      top
        .map(
          (e, i) =>
            `${i + 1}. **${e.title}** — ${e.whyItMatters}`
        )
        .join("\n"),
    evidence: top.map((e) => ({
      kind: e.kind === "skill" ? "skill" : e.kind,
      id: e.sourceId,
      href: "/profile",
      title: e.title,
      subtitle: e.subtitle,
      body: e.whyItMatters,
      matchedKeywords: e.matchedKeywords.slice(0, 6),
    })),
    followups: [`What's my fit score for ${job.company}?`, "Show me my projects"],
  };
}

async function findEvidence(keywords: string[]): Promise<ChatAnswer> {
  return generalSearchForKeywords(keywords, "find_evidence");
}

async function generalSearch(userMessage: string): Promise<ChatAnswer> {
  return generalSearchForKeywords(extractContentKeywords(userMessage), "general_search");
}

async function generalSearchForKeywords(keywords: string[], intent: ChatIntent): Promise<ChatAnswer> {
  if (keywords.length === 0) {
    return {
      intent,
      content: "I couldn't extract any keywords from that. Try \"projects about AI\" or \"show evidence for fintech\".",
      evidence: [],
    };
  }
  const kwSet = new Set(keywords);

  const [exps, projects, courses, skills, jobs] = await Promise.all([
    prisma.experience.findMany(),
    prisma.project.findMany(),
    prisma.course.findMany(),
    prisma.skill.findMany(),
    prisma.job.findMany({ include: { analysis: true } }),
  ]);

  type Scored = { score: number; matched: string[]; ev: ChatEvidence };
  const out: Scored[] = [];

  function scoreText(text: string): { score: number; matched: string[] } {
    const tokens = new Set(tokenize(text));
    const matched: string[] = [];
    let score = 0;
    for (const kw of kwSet) {
      if (tokens.has(kw)) {
        matched.push(kw);
        score += 1;
      }
    }
    return { score, matched };
  }

  for (const e of exps) {
    const { score, matched } = scoreText([e.title, e.company, e.description, e.highlights, e.tags].join(" "));
    if (score > 0)
      out.push({
        score,
        matched,
        ev: {
          kind: "experience",
          id: e.id,
          href: "/profile",
          title: e.title,
          subtitle: e.company,
          body: e.description,
          matchedKeywords: matched,
        },
      });
  }
  for (const p of projects) {
    const { score, matched } = scoreText([p.name, p.role ?? "", p.description, p.highlights, p.tags].join(" "));
    if (score > 0)
      out.push({
        score,
        matched,
        ev: {
          kind: "project",
          id: p.id,
          href: "/profile",
          title: p.name,
          subtitle: p.role ?? undefined,
          body: p.description,
          matchedKeywords: matched,
        },
      });
  }
  for (const c of courses) {
    const { score, matched } = scoreText([c.name, c.code ?? "", c.description, c.tags].join(" "));
    if (score > 0)
      out.push({
        score,
        matched,
        ev: {
          kind: "course",
          id: c.id,
          href: "/profile",
          title: `${c.code ? `${c.code} — ` : ""}${c.name}`,
          subtitle: c.term ?? undefined,
          body: c.description,
          matchedKeywords: matched,
        },
      });
  }
  for (const s of skills) {
    const { score, matched } = scoreText(`${s.name} ${s.category}`);
    if (score > 0)
      out.push({
        score,
        matched,
        ev: {
          kind: "skill",
          id: s.id,
          href: "/profile",
          title: s.name,
          subtitle: s.category,
          body: s.level ?? "",
          matchedKeywords: matched,
        },
      });
  }
  for (const j of jobs) {
    const { score, matched } = scoreText([j.title, j.company, j.description, j.notes ?? ""].join(" "));
    if (score > 0)
      out.push({
        score,
        matched,
        ev: {
          kind: "job",
          id: j.id,
          href: `/jobs/${j.id}`,
          title: j.title,
          subtitle: j.company,
          body: j.description.slice(0, 200) + (j.description.length > 200 ? "…" : ""),
          matchedKeywords: matched,
          meta: j.analysis ? { fit: j.analysis.fitScore } : undefined,
        },
      });
  }

  out.sort((a, b) => b.score - a.score);

  if (out.length === 0) {
    return {
      intent,
      content: `Nothing in your local data matched ${keywords.join(", ")}. I won't invent facts — try different keywords or add more to your profile.`,
      evidence: [],
    };
  }

  const top = out.slice(0, 6);
  const kindCounts = new Map<string, number>();
  for (const t of top) kindCounts.set(t.ev.kind, (kindCounts.get(t.ev.kind) ?? 0) + 1);
  const kindSummary = Array.from(kindCounts.entries())
    .map(([k, n]) => `${n} ${k}${n === 1 ? "" : "s"}`)
    .join(", ");

  return {
    intent,
    content: `Found ${out.length} match${out.length === 1 ? "" : "es"} for *${keywords.join(", ")}* — ${kindSummary} (top ${top.length} shown).`,
    evidence: top.map((s) => s.ev),
  };
}

/* ------------------------------ helpers ------------------------------- */

function safeArr<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}
