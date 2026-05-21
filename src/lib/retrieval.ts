import type { CandidateProfile, Course, Experience, Project, Skill } from "@prisma/client";
import type { EvidenceItem, JobIntelligence } from "./types";

const STOPWORDS = new Set([
  "a","an","the","and","or","of","to","in","on","for","with","by","at","from","as","is","are","be","being","been","this","that","these","those","it","its","into","over","across","up","down","out","we","you","your","our","their","them","they","i","my","me","will","would","should","can","could","may","might","do","does","did","done","not","no","yes","but","if","then","than","so","such","very","more","most","much","many","any","all","each","every","including","include","includes","skill","skills","work","working","worked","experience","experiences","strong","good","great","excellent","preferred","required","require","requires","plus","bonus","etc","using","use","used","build","building","built","ship","shipped","shipping","across","also","both","one","two","three","four","five","year","years","level","strong","ability","abilities",
]);

const SYNONYMS: Record<string, string[]> = {
  ai: ["ml","llm","genai","ai/ml","rag","agent","agents"],
  ml: ["ai","machine","learning","model","models"],
  llm: ["ai","gpt","claude","anthropic","openai","rag","llms"],
  llms: ["llm","ai","rag"],
  rag: ["retrieval","retriever","vector","embedding","embeddings","retrieval-augmented"],
  product: ["pm","product-management","discovery","roadmap"],
  frontend: ["react","next.js","nextjs","tailwind","ui","ux"],
  backend: ["node","node.js","api","apis","server"],
  fintech: ["finance","lending","underwriting","risk","capital","payments"],
  research: ["hci","study","studies","user","qualitative","quantitative","mixed-methods"],
  customer: ["client","clients","stakeholder","stakeholders","client-facing"],
  client: ["customer","stakeholder","client-facing"],
  "client-facing": ["customer","client","stakeholder","forward","deployed"],
  forward: ["deployed","customer","client"],
  prototype: ["prototyping","mvp","prototypes"],
};

function expandTerm(term: string): string[] {
  const t = term.toLowerCase();
  const out = [t];
  if (SYNONYMS[t]) out.push(...SYNONYMS[t]);
  return out;
}

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#./\-\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function tokenSet(text: string): Set<string> {
  return new Set(tokenize(text));
}

type ProfileBundle = CandidateProfile & {
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  courses: Course[];
};

/**
 * Score one piece of source text against the JD's intelligence.
 * Tracks which keywords and which requirement ids each hit comes from.
 */
function scoreAgainstIntelligence(
  text: string,
  intel: JobIntelligence
): { score: number; matchedKeywords: string[]; matchedRequirements: string[] } {
  const tokens = tokenSet(text);
  const matchedKeywords = new Set<string>();
  const matchedRequirements: string[] = [];

  let score = 0;

  // 1. Per-requirement scoring — heaviest weight, since requirements are the
  //    structured asks the recruiter actually cares about.
  for (const req of intel.requirements) {
    let reqHit = false;
    for (const kw of req.keywords) {
      for (const v of expandTerm(kw)) {
        if (tokens.has(v)) {
          matchedKeywords.add(kw);
          reqHit = true;
          score += 2;
          break;
        }
      }
    }
    if (reqHit) matchedRequirements.push(req.id);
  }

  // 2. Top-skill vocabulary — moderate weight.
  for (const skill of intel.topSkills) {
    for (const v of expandTerm(skill)) {
      if (tokens.has(v)) {
        matchedKeywords.add(skill);
        score += 1;
        break;
      }
    }
  }

  // 3. Responsibility line tokens — light weight, captures softer signals like
  //    "ship", "partner with", "design and build" etc.
  for (const r of intel.responsibilities) {
    for (const t of tokenize(r)) {
      if (tokens.has(t)) {
        matchedKeywords.add(t);
        score += 0.25;
      }
    }
  }

  return {
    score: Math.round(score * 10) / 10,
    matchedKeywords: Array.from(matchedKeywords),
    matchedRequirements: Array.from(new Set(matchedRequirements)),
  };
}

function buildWhyItMatters(
  evidence: { kind: EvidenceItem["kind"]; title: string },
  matchedKeywords: string[],
  matchedRequirementTexts: string[],
  company: string
): string {
  const kw = matchedKeywords.slice(0, 3).join(", ");
  const kindLabel = labelForKind(evidence.kind);
  if (matchedRequirementTexts.length > 0) {
    const req = truncate(matchedRequirementTexts[0], 120);
    return `${kindLabel} maps to ${kw || "the listed requirements"} — directly addresses ${company}'s ask: "${req}"`;
  }
  if (kw) {
    return `${kindLabel} overlaps with ${company}'s ${kw} focus.`;
  }
  return `${kindLabel} is broadly aligned with the role's themes.`;
}

function labelForKind(kind: EvidenceItem["kind"]): string {
  return kind === "experience" ? "This experience" : kind === "project" ? "This project" : kind === "course" ? "This course" : "These skills";
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

export function retrieveEvidence(
  profile: ProfileBundle,
  intelligence: JobIntelligence,
  limit = 10
): EvidenceItem[] {
  const requirementText = new Map<string, string>();
  for (const r of intelligence.requirements) requirementText.set(r.id, r.text);

  const items: EvidenceItem[] = [];

  for (const e of profile.experiences) {
    const text = [e.title, e.company, e.description, e.highlights, e.tags].join(" ");
    const { score, matchedKeywords, matchedRequirements } = scoreAgainstIntelligence(text, intelligence);
    const reqTexts = matchedRequirements.map((rid) => requirementText.get(rid)!).filter(Boolean);
    items.push({
      evidenceId: `ev-exp-${e.id}`,
      kind: "experience",
      sourceId: e.id,
      title: e.title,
      subtitle: `${e.company} • ${e.startDate}${e.endDate ? `–${e.endDate}` : ""}`,
      body: e.description,
      tags: e.tags.split(",").map((t) => t.trim()).filter(Boolean),
      highlights: e.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      score,
      matchedKeywords,
      matchedRequirements,
      whyItMatters: buildWhyItMatters({ kind: "experience", title: e.title }, matchedKeywords, reqTexts, intelligence.company),
    });
  }

  for (const p of profile.projects) {
    const text = [p.name, p.role ?? "", p.description, p.highlights, p.tags].join(" ");
    const { score, matchedKeywords, matchedRequirements } = scoreAgainstIntelligence(text, intelligence);
    const reqTexts = matchedRequirements.map((rid) => requirementText.get(rid)!).filter(Boolean);
    items.push({
      evidenceId: `ev-prj-${p.id}`,
      kind: "project",
      sourceId: p.id,
      title: p.name,
      subtitle: p.role ?? undefined,
      body: p.description,
      tags: p.tags.split(",").map((t) => t.trim()).filter(Boolean),
      highlights: p.highlights.split("\n").map((h) => h.trim()).filter(Boolean),
      score,
      matchedKeywords,
      matchedRequirements,
      whyItMatters: buildWhyItMatters({ kind: "project", title: p.name }, matchedKeywords, reqTexts, intelligence.company),
    });
  }

  for (const c of profile.courses) {
    const text = [c.name, c.code ?? "", c.description, c.tags].join(" ");
    const { score, matchedKeywords, matchedRequirements } = scoreAgainstIntelligence(text, intelligence);
    const reqTexts = matchedRequirements.map((rid) => requirementText.get(rid)!).filter(Boolean);
    if (score === 0) continue;
    items.push({
      evidenceId: `ev-crs-${c.id}`,
      kind: "course",
      sourceId: c.id,
      title: c.name,
      subtitle: c.code ?? undefined,
      body: c.description,
      tags: c.tags.split(",").map((t) => t.trim()).filter(Boolean),
      highlights: [],
      score,
      matchedKeywords,
      matchedRequirements,
      whyItMatters: buildWhyItMatters({ kind: "course", title: c.name }, matchedKeywords, reqTexts, intelligence.company),
    });
  }

  // Skills are aggregated into a single evidence card so they show up as supporting context
  // without drowning out experiences/projects in the ranking.
  const matchedSkills: { name: string; category: string }[] = [];
  const skillKeywords = new Set<string>();
  for (const s of profile.skills) {
    const text = `${s.name} ${s.category}`;
    const { matchedKeywords, score } = scoreAgainstIntelligence(text, intelligence);
    if (score > 0) {
      matchedSkills.push({ name: s.name, category: s.category });
      matchedKeywords.forEach((k) => skillKeywords.add(k));
    }
  }
  if (matchedSkills.length > 0) {
    const score = Math.min(matchedSkills.length * 1.5, 12);
    items.push({
      evidenceId: `ev-skl-aggregate`,
      kind: "skill",
      sourceId: "skills-aggregate",
      title: "Matching skills",
      subtitle: `${matchedSkills.length} profile skills overlap with the JD`,
      body: matchedSkills.map((s) => `${s.name} (${s.category})`).join(", "),
      tags: Array.from(new Set(matchedSkills.map((s) => s.category))),
      highlights: matchedSkills.map((s) => s.name),
      score,
      matchedKeywords: Array.from(skillKeywords),
      matchedRequirements: [],
      whyItMatters: `${matchedSkills.length} skills (${matchedSkills.slice(0, 4).map((s) => s.name).join(", ")}${matchedSkills.length > 4 ? ", …" : ""}) directly match what ${intelligence.company} listed in the JD.`,
    });
  }

  return items
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
