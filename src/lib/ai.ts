import type { CandidateProfile, Course, Experience, Job, Project, Skill } from "@prisma/client";
import { parseJobDescription } from "./parse";
import { retrieveEvidence } from "./retrieval";
import type {
  AnalysisBundle,
  ApplicationStrategy,
  EvidenceItem,
  GroundedBullet,
  GroundedMessage,
  JobIntelligence,
  OutreachOutput,
} from "./types";

type ProfileBundle = CandidateProfile & {
  experiences: Experience[];
  projects: Project[];
  skills: Skill[];
  courses: Course[];
};

/**
 * Public surface:
 *   analyzeJob(profile, job)       → intelligence + ranked evidence + fit analysis + bullets + strategy
 *   generateOutreach(profile, job, bundle) → 5 grounded messages, each carrying the evidence ids used
 *
 * Everything below is the deterministic fallback. If OPENAI_API_KEY or
 * ANTHROPIC_API_KEY is set we expose `generationMode === "live"` so the UI
 * can label outputs accordingly. A future live-model branch would plug in
 * here while keeping the *exact same input contract* — JD intelligence
 * + retrieved evidence — so generation can never drift off-evidence.
 */

const hasLiveModel =
  Boolean(process.env.OPENAI_API_KEY) || Boolean(process.env.ANTHROPIC_API_KEY);

export function generationMode(): "live" | "fallback" {
  return hasLiveModel ? "live" : "fallback";
}

/* ----------------------------- Analysis ------------------------------- */

export function analyzeJob(profile: ProfileBundle, job: Job): AnalysisBundle {
  const intelligence = parseJobDescription(job);
  const evidence = retrieveEvidence(profile, intelligence, 10);

  const fitScore = computeFitScore(intelligence, evidence);
  const summary = buildSummary(profile, intelligence, evidence);
  const strengths = buildStrengths(intelligence, evidence);
  const risks = buildRisks(intelligence, evidence);
  const angle = buildAngle(profile, intelligence, evidence);
  const bullets = buildGroundedBullets(intelligence, evidence);
  const strategy = buildStrategy(intelligence, evidence, job);

  return {
    intelligence,
    evidence,
    analysis: { fitScore, summary, strengths, risks, angle, bullets },
    strategy,
  };
}

function computeFitScore(intelligence: JobIntelligence, evidence: EvidenceItem[]): number {
  const totalReqs = Math.max(intelligence.requirements.length, 1);
  const covered = new Set<string>();
  for (const ev of evidence) for (const rid of ev.matchedRequirements) covered.add(rid);

  const reqCoverage = covered.size / totalReqs;
  const totalSkills = Math.max(intelligence.topSkills.length, 1);
  const skillMatches = new Set<string>();
  for (const ev of evidence) for (const k of ev.matchedKeywords) skillMatches.add(k);
  const skillCoverage = Math.min(skillMatches.size / Math.max(totalSkills, 6), 1);

  const raw = reqCoverage * 0.6 + skillCoverage * 0.4;
  const scaled = Math.round(40 + raw * 55); // floor ~40 so a thin overlap still registers
  return Math.max(15, Math.min(96, scaled));
}

function buildSummary(profile: ProfileBundle, intel: JobIntelligence, evidence: EvidenceItem[]): string {
  const themes = uniqLower(evidence.flatMap((e) => e.matchedKeywords)).slice(0, 4);
  const themeStr = themes.length > 0 ? themes.join(", ") : "AI, product, and software";
  return `${profile.program} M.S. candidate at ${profile.school} (grad ${profile.graduation}) with grounded work in ${themeStr}. Targeting ${intel.roleTitle} at ${intel.company} (${intel.roleCategory} • ${intel.seniority}): I have shipped end-to-end products, partnered with PMs/designers/clients, and built retrieval-grounded AI features.`;
}

function buildStrengths(intel: JobIntelligence, evidence: EvidenceItem[]): string[] {
  const real = evidence.filter((e) => e.kind !== "skill").slice(0, 3);
  const out = real.map((e) => {
    const kws = e.matchedKeywords.slice(0, 2).join(" + ");
    return `${labelForKind(e.kind)} — ${e.title}: hits ${kws || "the role's themes"}.`;
  });
  const skill = evidence.find((e) => e.kind === "skill");
  if (skill && skill.highlights.length > 0) {
    out.push(`Skills — ${skill.highlights.slice(0, 5).join(", ")} all appear in the JD.`);
  }
  if (out.length === 0) {
    out.push(`Cornell Tech program emphasis on AI + product is broadly aligned with ${intel.company}'s focus.`);
  }
  return out;
}

function buildRisks(intel: JobIntelligence, evidence: EvidenceItem[]): string[] {
  const covered = new Set<string>();
  for (const e of evidence) for (const k of e.matchedKeywords) covered.add(k.toLowerCase());

  const risks: string[] = [];
  const watch: Array<{ term: string; label: string }> = [
    { term: "go", label: "Go" },
    { term: "rust", label: "Rust" },
    { term: "kubernetes", label: "Kubernetes / production infra" },
    { term: "kafka", label: "Kafka / streaming pipelines" },
    { term: "spark", label: "Spark / large-scale data" },
    { term: "swift", label: "Swift / native iOS" },
    { term: "android", label: "Native Android" },
    { term: "terraform", label: "Terraform / IaC" },
    { term: "trading", label: "Trading / market microstructure" },
    { term: "compliance", label: "Regulated-finance compliance" },
    { term: "salesforce", label: "Salesforce ecosystem" },
    { term: "sap", label: "SAP ecosystem" },
  ];
  for (const w of watch) {
    if (intel.topSkills.includes(w.term) && !covered.has(w.term)) {
      risks.push(`${w.label} is listed in the JD but isn't strongly evidenced in your profile — prepare a story.`);
    }
  }

  if (intel.seniority === "Senior" || intel.seniority === "Staff / Lead+") {
    risks.push(`Seniority is ${intel.seniority}; lead with shipped impact and ownership, not classwork.`);
  }
  if (/\bphd\b/i.test(intel.requirements.map((r) => r.text).join(" "))) {
    risks.push("JD mentions PhD-level research; lean on the HCI research arc and publications-in-progress.");
  }

  // Specific uncovered requirements become risks too.
  const uncovered = intel.requirements.filter((r) => !evidence.some((e) => e.matchedRequirements.includes(r.id)));
  for (const r of uncovered.slice(0, 2)) {
    risks.push(`Requirement not directly covered: "${truncate(r.text, 110)}". Prepare a tangential example.`);
  }

  if (risks.length === 0) {
    risks.push("No obvious gaps from retrieval. Ask in interviews which 1-2 areas the team most wants the new hire to grow into.");
  }
  return risks;
}

function buildAngle(profile: ProfileBundle, intel: JobIntelligence, evidence: EvidenceItem[]): string {
  const themes = uniqLower(evidence.flatMap((e) => e.matchedKeywords)).slice(0, 3);
  const themeStr = themes.length > 0 ? themes.join(" + ") : "AI + product";
  const lead = evidence.find((e) => e.kind === "project") ?? evidence[0];
  const leadName = lead?.title ?? `${profile.program} portfolio`;
  return `Lead with the ${themeStr} thread anchored on ${leadName}. Position yourself as a Cornell Tech builder who ships grounded AI product features and can step into a ${intel.roleCategory} role at ${intel.company} on day one.`;
}

function buildGroundedBullets(intel: JobIntelligence, evidence: EvidenceItem[]): GroundedBullet[] {
  const bullets: GroundedBullet[] = [];

  // Prefer evidence that covers a requirement. Cycle through evidence picking
  // 1-2 highlights from each until we reach 6 bullets.
  const ordered = evidence
    .filter((e) => e.kind !== "skill")
    .sort((a, b) => {
      // weight reqs covered + score
      const ra = a.matchedRequirements.length * 5 + a.score;
      const rb = b.matchedRequirements.length * 5 + b.score;
      return rb - ra;
    });

  for (const ev of ordered) {
    const reqId = ev.matchedRequirements[0] ?? null;
    for (const raw of ev.highlights.slice(0, 2)) {
      bullets.push({
        text: tailorBullet(raw, ev, intel, reqId),
        evidenceId: ev.evidenceId,
        requirementId: reqId,
        matchedKeywords: ev.matchedKeywords.slice(0, 3),
      });
      if (bullets.length >= 6) break;
    }
    if (bullets.length >= 6) break;
  }

  if (bullets.length === 0) {
    bullets.push({
      text: `Open to walk through how my ${intel.roleTitle}-relevant work at Cornell Tech maps to ${intel.company}'s priorities.`,
      evidenceId: evidence[0]?.evidenceId ?? "ev-none",
      requirementId: null,
      matchedKeywords: [],
    });
  }

  return bullets;
}

function tailorBullet(raw: string, ev: EvidenceItem, intel: JobIntelligence, reqId: string | null): string {
  let b = raw.replace(/^[-•\s]+/, "").trim();
  const kws = ev.matchedKeywords.slice(0, 2);
  if (reqId && kws.length > 0) {
    b = b.replace(/\.$/, "") + ` — directly supports ${intel.company}'s ${kws.join(" / ")} requirement.`;
  } else if (kws.length > 0) {
    b = b.replace(/\.$/, "") + ` — overlaps with ${intel.company}'s ${kws.join(" / ")} focus.`;
  } else {
    b = b.replace(/\.$/, "") + ".";
  }
  return b;
}

function buildStrategy(intel: JobIntelligence, evidence: EvidenceItem[], job: Job): ApplicationStrategy {
  const real = evidence.filter((e) => e.kind !== "skill");
  const leadProject = real.find((e) => e.kind === "project") ?? real[0] ?? null;

  const emphasize: string[] = real.slice(0, 3).map((e) => {
    const kw = e.matchedKeywords.slice(0, 2).join(", ");
    return `${e.title}${kw ? ` (lead with ${kw})` : ""}`;
  });
  if (emphasize.length === 0) emphasize.push("Cornell Tech Connective Media program — frame as builder-first.");

  const deemphasize: string[] = [];
  if (intel.roleCategory.startsWith("AI")) {
    deemphasize.push("Generic SWE side-projects with no AI/product hook.");
  } else if (intel.roleCategory.startsWith("Forward")) {
    deemphasize.push("Pure research / coursework with no client-facing component.");
  } else if (intel.roleCategory.startsWith("Fintech")) {
    deemphasize.push("Unrelated consumer experiments — anchor on the fintech internship and risk/underwriting work.");
  } else if (intel.roleCategory.startsWith("Product")) {
    deemphasize.push("Tech-heavy plumbing work without a user/business outcome.");
  } else {
    deemphasize.push("Bullets that describe activity but not shipped impact.");
  }
  if (intel.seniority === "Intern") {
    deemphasize.push("Don't over-position as senior — be clear about what you've owned vs. supported.");
  }

  // Channel decision: contact email present → both, with linkedin first if seniority is Intern/Entry.
  let recommendedChannel: ApplicationStrategy["recommendedChannel"] = "linkedin-then-email";
  let channelReason =
    "Open with a LinkedIn connection note (low friction) and follow up by email 48h later if no response.";
  if (!job.contactEmail && !job.contactName) {
    recommendedChannel = "linkedin";
    channelReason =
      "No contact email captured — use LinkedIn to identify and reach the hiring manager or a recent hire on the team.";
  } else if (job.contactEmail && intel.seniority !== "Intern" && intel.seniority !== "Entry / New grad") {
    recommendedChannel = "email";
    channelReason =
      "You have a direct email and the role is mid+ — a tailored email outperforms a LinkedIn note for senior roles.";
  } else if (job.contactEmail) {
    recommendedChannel = "both";
    channelReason =
      "You have both LinkedIn and an email; lead with LinkedIn (faster to be seen) and reinforce with the recruiter email same day.";
  }

  const nextStep = leadProject
    ? `Open the recruiter email with the "${leadProject.title}" hook. Attach a 1-page tailored resume that leads with the bullets generated below.`
    : `Send the LinkedIn note today, then prepare a 1-page tailored resume using the bullets below.`;

  return {
    emphasize,
    deemphasize,
    leadEvidenceId: leadProject?.evidenceId ?? null,
    leadProject: leadProject?.title ?? null,
    recommendedChannel,
    channelReason,
    nextStep,
  };
}

/* ----------------------------- Outreach ------------------------------- */

export function generateOutreach(profile: ProfileBundle, job: Job, bundle: AnalysisBundle): OutreachOutput {
  return buildOutreachFallback(profile, job, bundle);
}

function buildOutreachFallback(
  profile: ProfileBundle,
  job: Job,
  bundle: AnalysisBundle
): OutreachOutput {
  const { intelligence, evidence, analysis, strategy } = bundle;
  const recruiter = job.contactName?.split(" ")[0] ?? "there";
  const firstName = profile.fullName.split(" ")[0];

  const leadEv = evidence.find((e) => e.evidenceId === strategy.leadEvidenceId) ?? evidence[0];
  const secondEv = evidence.filter((e) => e.kind !== "skill" && e.evidenceId !== leadEv?.evidenceId)[0];

  const groundIds = (...ids: Array<string | undefined>) => ids.filter(Boolean) as string[];

  const leadHook = leadEv?.title ?? `${profile.program} work at ${profile.school}`;
  const leadBullet = analysis.bullets[0]?.text ?? leadHook;
  const secondBullet = analysis.bullets[1]?.text ?? secondEv?.title ?? "client-facing engineering work";

  const recruiterEmail: GroundedMessage = {
    kind: "recruiter_email",
    subject: `${profile.school} M.S. — ${intelligence.roleTitle} at ${intelligence.company}`,
    body:
      `Hi ${recruiter},\n\n` +
      `I came across the ${intelligence.roleTitle} role at ${intelligence.company} and wanted to reach out directly. ` +
      `I'm a ${profile.program} M.S. candidate at ${profile.school} (graduating ${profile.graduation}), focused on ${truncate(intelligence.roleCategory, 80)} work.\n\n` +
      `Two points on fit, grounded in real work — not generic claims:\n` +
      `• ${truncate(leadBullet, 220)}\n` +
      `• ${truncate(secondBullet, 220)}\n\n` +
      `Would you be open to a 20-minute conversation in the next two weeks? Happy to send a tailored resume or short writeups of either project in the meantime.\n\n` +
      `Thanks,\n${profile.fullName}\n${profile.email}${profile.linkedinUrl ? `\n${profile.linkedinUrl}` : ""}`,
    groundedIn: groundIds(leadEv?.evidenceId, secondEv?.evidenceId),
  };

  const linkedinNoteRaw =
    `Hi ${recruiter} — ${profile.program} M.S. at ${profile.school} (grad ${profile.graduation}). ` +
    `Saw the ${intelligence.roleTitle} role at ${intelligence.company}. ` +
    `Most relevant: ${truncate(leadHook, 80)}. Would love to connect.`;
  const linkedinNote: GroundedMessage = {
    kind: "linkedin_note",
    body: clampChars(linkedinNoteRaw, 295),
    groundedIn: groundIds(leadEv?.evidenceId),
  };

  const linkedinDm: GroundedMessage = {
    kind: "linkedin_dm",
    body:
      `Hi ${recruiter}, thanks for connecting. Quick context: I'm a ${profile.program} M.S. at ${profile.school} (grad ${profile.graduation}), and I'm looking at ${intelligence.roleTitle} roles. ` +
      `What's most relevant for ${intelligence.company}: ${truncate(leadBullet, 220)} ` +
      `If it's useful, I can send a 1-page tailored resume — or we could grab 15 minutes when your calendar opens up. Whichever is easier on your end.`,
    groundedIn: groundIds(leadEv?.evidenceId, evidence[1]?.evidenceId),
  };

  const followup48h: GroundedMessage = {
    kind: "followup_48h",
    subject: `Re: ${intelligence.roleTitle} at ${intelligence.company}`,
    body:
      `Hi ${recruiter},\n\n` +
      `Bumping my note from earlier this week on the ${intelligence.roleTitle} role.\n\n` +
      `One concrete thing I'd bring: ${truncate(leadBullet, 220)}\n\n` +
      `Happy to share a tailored resume or jump on a quick call — Thursday or Friday this week?\n\n` +
      `Thanks,\n${firstName}`,
    groundedIn: groundIds(leadEv?.evidenceId),
  };

  const followup7d: GroundedMessage = {
    kind: "followup_7d",
    subject: `Checking back on ${intelligence.roleTitle}`,
    body:
      `Hi ${recruiter},\n\n` +
      `Circling back one more time on the ${intelligence.roleTitle} role at ${intelligence.company}. ` +
      `Totally understand if timing isn't right — happy to stay loosely in touch either way.\n\n` +
      `Two recent things grounded in the JD's requirements:\n` +
      `• ${truncate(leadBullet, 220)}\n` +
      `• ${truncate(secondBullet, 220)}\n\n` +
      `Would still love a 20-minute conversation if there's any interest on your side.\n\n` +
      `Thanks for your time,\n${firstName}`,
    groundedIn: groundIds(leadEv?.evidenceId, secondEv?.evidenceId),
  };

  return {
    recruiterEmail,
    linkedinNote,
    linkedinDm,
    followup48h,
    followup7d,
  };
}

/* ------------------------------ helpers ------------------------------- */

function labelForKind(kind: EvidenceItem["kind"]): string {
  return kind === "experience"
    ? "Experience"
    : kind === "project"
    ? "Project"
    : kind === "course"
    ? "Course"
    : "Skills";
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function clampChars(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function uniqLower(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of arr) {
    const k = v.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  }
  return out;
}
