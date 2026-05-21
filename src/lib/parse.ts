import type { Job } from "@prisma/client";
import { tokenize } from "./retrieval";
import type { JobIntelligence, Requirement } from "./types";

/**
 * Curated vocab of role-relevant skills the parser looks for inside a JD.
 * Order doesn't matter — we just want to detect which appear.
 */
const SKILL_VOCAB: string[] = [
  // languages
  "python","typescript","javascript","go","rust","sql","r","java","swift","kotlin","ruby","c++","scala",
  // web / app
  "react","next.js","nextjs","node","node.js","express","django","flask","fastapi","graphql","rest",
  // ML / AI
  "pytorch","tensorflow","numpy","pandas","scikit-learn","langchain","llamaindex","huggingface",
  "llm","llms","rag","retrieval","embeddings","prompt","prompting","agent","agents","vector","fine-tuning","evaluation","evals",
  // data
  "postgres","postgresql","mysql","sqlite","mongodb","redis","kafka","spark","airflow","dbt","snowflake","bigquery",
  // infra / cloud
  "aws","gcp","azure","docker","kubernetes","terraform","ci/cd",
  // product / design / research
  "product","figma","prototype","prototyping","user research","usability","a/b testing","experiments","metrics","analytics",
  // hci / academic
  "hci","ethnography","mixed-methods","qualitative","quantitative",
  // domain
  "fintech","lending","underwriting","trading","capital markets","risk","payments","compliance","insurance","healthtech","edtech",
  // soft / role
  "client","client-facing","customer","stakeholder","forward deployed","solutions","cross-functional",
];

const CATEGORY_RULES: Array<{ label: string; signals: string[] }> = [
  { label: "AI / ML Engineering", signals: ["ai engineer","ml engineer","applied ai","applied ml","llm","rag","agent","retrieval-augmented","prompt"] },
  { label: "Forward Deployed / Solutions", signals: ["forward deployed","forward-deployed","solutions engineer","customer engineer","deployed engineer","field engineer","implementation engineer"] },
  { label: "Product Management", signals: ["product manager","associate product manager","apm","product owner","product lead","pm"] },
  { label: "Fintech Engineering", signals: ["fintech","lending","underwriting","capital markets","trading","payments"] },
  { label: "Data Engineering / Science", signals: ["data engineer","data scientist","analytics engineer","analyst","data platform"] },
  { label: "Research / HCI", signals: ["user researcher","ux research","hci research","research scientist"] },
  { label: "Software Engineering", signals: ["software engineer","swe","full-stack","fullstack","backend engineer","frontend engineer","platform engineer"] },
];

const SENIORITY_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "Intern", pattern: /\bintern(ship)?\b/i },
  { label: "Entry / New grad", pattern: /\bnew[-\s]?grad\b|\bjunior\b|\bentry[-\s]?level\b|\bearly career\b/i },
  { label: "Staff / Lead+", pattern: /\bstaff\b|\bprincipal\b|\blead\b/i },
  { label: "Senior", pattern: /\bsenior\b|\bsr\.\b/i },
];

export function parseJobDescription(job: Job): JobIntelligence {
  const text = job.description;
  const lower = text.toLowerCase();

  // Category — pick the rule with the most signal hits.
  let roleCategory = "Software Engineering";
  let bestCount = 0;
  for (const rule of CATEGORY_RULES) {
    const count = rule.signals.filter((s) => lower.includes(s)).length;
    if (count > bestCount) {
      bestCount = count;
      roleCategory = rule.label;
    }
  }

  // Seniority — first matching rule wins.
  let seniority = "Mid-level";
  for (const rule of SENIORITY_RULES) {
    if (rule.pattern.test(text)) {
      seniority = rule.label;
      break;
    }
  }

  // Top skills — direct vocabulary hits, deduped + preserved order of appearance.
  // Short tokens (≤2 chars like "r", "go", "ml") use a word-boundary check so
  // they don't false-positive on every text containing the letter "r" or "go".
  const seen = new Set<string>();
  const topSkills: string[] = [];
  for (const s of SKILL_VOCAB) {
    if (skillAppears(lower, s) && !seen.has(s)) {
      seen.add(s);
      topSkills.push(s);
    }
  }

  // Sentence-level split that respects bullet markers and newlines.
  const lines = text
    .split(/\n+/)
    .flatMap((line) =>
      line
        .split(/(?<=[.!?])\s+(?=[A-Z])/) // sentence break only on capitalized starts
        .map((s) => s.trim())
        .filter(Boolean)
    )
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter((s) => s.length >= 12 && s.length <= 320);

  const requirements: Requirement[] = [];
  const responsibilities: string[] = [];

  const reqSignals = /(years of experience|experience with|familiar with|proficient|comfortable|strong|must have|nice to have|bonus|preferred|required|fluent|deep understanding)/i;
  const respSignals = /(you (will|'ll)|you'll|will (build|design|ship|own|deploy|partner|work)|responsible for|partner with|design and|build and|own the|day[-\s]to[-\s]day|in this role)/i;
  const introSignals = /^(we are|we're|about |our team|our mission|the role|the team|join )/i;

  for (const line of lines) {
    if (introSignals.test(line)) continue;
    if (/^(must have|required|bonus|nice to have|stack|requirements|responsibilities)[:\s]*$/i.test(line)) continue;

    if (reqSignals.test(line)) {
      requirements.push({
        id: `req-${requirements.length}`,
        text: line,
        kind: /must have|required|years of experience/i.test(line) ? "must" : "nice",
        keywords: uniqueKeywords(line),
      });
    } else if (respSignals.test(line)) {
      responsibilities.push(line);
    }
  }

  // If parsing didn't find requirements explicitly, fall back: use sentences that
  // mention any vocab skill as "implicit" must-haves so retrieval still has structure.
  if (requirements.length === 0) {
    for (const line of lines) {
      if (topSkills.some((s) => line.toLowerCase().includes(s))) {
        requirements.push({
          id: `req-${requirements.length}`,
          text: line,
          kind: "nice",
          keywords: uniqueKeywords(line),
        });
        if (requirements.length >= 5) break;
      }
    }
  }

  return {
    roleTitle: job.title,
    company: job.company,
    roleCategory,
    seniority,
    topSkills: topSkills.slice(0, 10),
    responsibilities: responsibilities.slice(0, 6),
    requirements: requirements.slice(0, 8),
  };
}

function uniqueKeywords(s: string): string[] {
  return Array.from(new Set(tokenize(s)));
}

function skillAppears(lower: string, skill: string): boolean {
  // Word-boundary match for short tokens to avoid spurious hits on "r" / "go" / "ml".
  if (skill.length <= 3) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, "i").test(lower);
  }
  return lower.includes(skill);
}
