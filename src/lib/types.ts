export type Requirement = {
  id: string;            // e.g. "req-0"
  text: string;          // raw line from the JD
  kind: "must" | "nice" | "responsibility";
  keywords: string[];    // normalized tokens for retrieval scoring
};

export type JobIntelligence = {
  roleTitle: string;
  company: string;
  roleCategory: string;        // "AI / ML Engineering", "Forward Deployed / Solutions", ...
  seniority: string;           // "Intern", "Entry / New grad", "Mid-level", "Senior", "Staff / Lead+"
  topSkills: string[];         // skill keywords detected in the JD
  responsibilities: string[];  // top responsibility-style lines
  requirements: Requirement[]; // structured must/nice items
};

export type EvidenceItem = {
  evidenceId: string;                // synthetic ID used by bullets/messages
  kind: "experience" | "project" | "skill" | "course";
  sourceId: string;
  title: string;
  subtitle?: string;
  body: string;
  tags: string[];
  highlights: string[];
  score: number;
  matchedKeywords: string[];         // keywords from the JD that this item satisfies
  matchedRequirements: string[];     // requirement ids it overlaps with
  whyItMatters: string;              // generated rationale, always grounded in matched keywords
};

export type GroundedBullet = {
  text: string;
  evidenceId: string;
  requirementId: string | null;
  matchedKeywords: string[];
};

export type ApplicationStrategy = {
  emphasize: string[];
  deemphasize: string[];
  leadEvidenceId: string | null;
  leadProject: string | null;
  recommendedChannel: "linkedin" | "email" | "both" | "linkedin-then-email";
  channelReason: string;
  nextStep: string;
};

export type AnalysisOutput = {
  fitScore: number;
  summary: string;
  strengths: string[];
  risks: string[];
  angle: string;
  bullets: GroundedBullet[];
};

export type AnalysisBundle = {
  intelligence: JobIntelligence;
  evidence: EvidenceItem[];
  analysis: AnalysisOutput;
  strategy: ApplicationStrategy;
};

export type GroundedMessage = {
  kind: MessageKind;
  subject?: string;
  body: string;
  groundedIn: string[];   // evidence ids referenced
};

export type OutreachOutput = {
  recruiterEmail: GroundedMessage;
  linkedinNote: GroundedMessage;
  linkedinDm: GroundedMessage;
  followup48h: GroundedMessage;
  followup7d: GroundedMessage;
};

export type MessageKind =
  | "recruiter_email"
  | "linkedin_note"
  | "linkedin_dm"
  | "followup_48h"
  | "followup_7d";

export const MESSAGE_LABELS: Record<MessageKind, string> = {
  recruiter_email: "Recruiter email",
  linkedin_note: "LinkedIn connection note",
  linkedin_dm: "LinkedIn DM",
  followup_48h: "48-hour follow-up",
  followup_7d: "7-day follow-up",
};

export const PIPELINE_STAGES = [
  "saved",
  "applying",
  "applied",
  "contacted",
  "interviewing",
  "rejected",
  "offer",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  saved: "Saved",
  applying: "Applying",
  applied: "Applied",
  contacted: "Contacted",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer",
};
