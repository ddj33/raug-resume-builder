import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * One-shot seeder for production. Runs on Vercel where DATABASE_URL is
 * natively available — local CLIs cannot read Marketplace-integration
 * env vars, so we seed by hitting this endpoint instead.
 *
 * Protected by the SEED_TOKEN env var. Wipes the candidate profile
 * (cascades to experiences/projects/skills/courses) and any seeded jobs,
 * then recreates the demo dataset.
 */
export async function POST(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!process.env.SEED_TOKEN || token !== process.env.SEED_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  await prisma.candidateProfile.deleteMany();
  await prisma.job.deleteMany();
  await prisma.chatSession.deleteMany();

  const profile = await prisma.candidateProfile.create({
    data: {
      fullName: "Dylan Johnson-Restrepo",
      headline: "Cornell Tech Connective Media M.S. — AI, product, and human-centered software",
      location: "New York, NY",
      email: "neilfjohnsonw@gmail.com",
      phone: null,
      linkedinUrl: "https://www.linkedin.com/in/dylan-johnson-restrepo",
      githubUrl: "https://github.com/ddj33",
      portfolioUrl: null,
      school: "Cornell Tech",
      program: "Connective Media",
      degree: "M.S.",
      graduation: "May 2026",
      summary:
        "Connective Media M.S. candidate at Cornell Tech focused on building AI-powered, human-centered products. Background spans full-stack engineering, applied ML, HCI research, and client-facing technical work. Looking for AI, product, software, fintech, and technical client-facing roles where I can ship.",
      preferredRoles:
        "AI Engineer, Product Manager, Software Engineer, Solutions Engineer, Fintech Engineer, Forward Deployed Engineer",
      preferredTypes: "Internship, Full-time",
      workAuth: "U.S. work authorized",
      experiences: {
        create: [
          {
            company: "Cornell Tech — Connective Media Studio",
            title: "Graduate Researcher & Builder",
            location: "New York, NY",
            startDate: "Aug 2025",
            endDate: "Present",
            description:
              "Designing and shipping AI-augmented prototypes inside the Connective Media studio with a focus on retrieval-augmented generation, HCI evaluation, and rapid product iteration.",
            highlights: [
              "Built a retrieval-augmented application assistant that grounds resume bullets and outreach messages in a structured candidate profile rather than free-form generation.",
              "Ran weekly user studies (n=8) with classmates and external recruiters to validate UX flows and refine LLM prompt structure.",
              "Shipped 3 end-to-end Next.js prototypes covering AI tooling, fintech UX, and HCI research playgrounds.",
            ].join("\n"),
            tags: "AI, RAG, LLM, Next.js, HCI, product, research, prototyping",
          },
          {
            company: "Fintech Startup (Client Engagement)",
            title: "Software Engineering Intern",
            location: "Remote",
            startDate: "May 2025",
            endDate: "Aug 2025",
            description:
              "Worked across product, engineering, and client success on a B2B fintech platform serving small business lenders. Helped translate customer requirements into shipped features and integrations.",
            highlights: [
              "Built an internal Python + TypeScript pipeline that classified inbound loan applications and surfaced fraud signals, reducing manual review time by ~30%.",
              "Owned 4 client integrations end-to-end: scoping calls, API design, implementation, and post-launch support.",
              "Partnered with PM and design to redesign the underwriting dashboard, improving task completion rate in usability tests from 62% to 88%.",
            ].join("\n"),
            tags: "fintech, Python, TypeScript, APIs, client-facing, product, dashboards, fraud, underwriting",
          },
          {
            company: "Undergraduate Research Lab (HCI)",
            title: "Undergraduate Research Assistant",
            location: "Hybrid",
            startDate: "Sep 2023",
            endDate: "May 2025",
            description:
              "Investigated how people calibrate trust in AI assistants, with a focus on explanation interfaces and confidence signals.",
            highlights: [
              "Co-authored a workshop paper on confidence display patterns for LLM outputs in consumer apps.",
              "Designed and ran two mixed-methods studies (n=24 and n=40) on AI explanation UIs using Figma prototypes and Qualtrics.",
              "Built a React testbed to run within-subjects comparisons of three explanation styles for a recommender system.",
            ].join("\n"),
            tags: "HCI, research, AI, trust, explanations, React, Figma, mixed-methods",
          },
        ],
      },
      projects: {
        create: [
          {
            name: "RAUG Application Assistant",
            role: "Solo build",
            description:
              "Retrieval-augmented resume and outreach assistant. Grounds every tailored bullet, fit reason, and message in retrieved profile facts so nothing is invented.",
            highlights: [
              "Implemented a keyword-overlap retriever over experiences, projects, classes, and skills.",
              "Designed a deterministic fallback generator so the product still demos without an API key.",
              "Polished dashboard UI in Next.js + Tailwind with fit score visualization and kanban pipeline.",
            ].join("\n"),
            tags: "RAG, retrieval, LLM, Next.js, TypeScript, Prisma, Tailwind, product, AI",
          },
          {
            name: "Realtime EEG Classifier",
            role: "ML + signal processing",
            description:
              "Built a PyTorch pipeline that classified motor-imagery EEG signals in near-realtime for a brain-computer interface coursework project.",
            highlights: [
              "Implemented a CNN + spectrogram pipeline reaching 78% subject-specific accuracy on a 4-class task.",
              "Wrote a streaming inference loop with sub-200ms latency on an M-series Mac.",
              "Visualized confusion matrices and per-subject performance for analysis writeup.",
            ].join("\n"),
            tags: "ML, PyTorch, BCI, signals, Python, classification, realtime",
          },
          {
            name: "Recommender Explanation Playground",
            role: "Research engineer",
            description:
              "An HCI testbed comparing three styles of LLM-generated explanations for movie recommendations.",
            highlights: [
              "Built a React + Express app with within-subjects randomization and event logging.",
              "Integrated an LLM endpoint and templated three explanation styles with retrieval-grounded facts.",
              "Analyzed 40 participants in R using linear mixed models.",
            ].join("\n"),
            tags: "HCI, React, LLM, explanations, study design, recommenders, AI",
          },
        ],
      },
      skills: {
        create: [
          { name: "TypeScript", category: "Languages", level: "Proficient" },
          { name: "Python", category: "Languages", level: "Proficient" },
          { name: "SQL", category: "Languages", level: "Proficient" },
          { name: "React / Next.js", category: "Frontend", level: "Proficient" },
          { name: "Tailwind CSS", category: "Frontend", level: "Proficient" },
          { name: "Node.js", category: "Backend", level: "Proficient" },
          { name: "Prisma", category: "Backend", level: "Proficient" },
          { name: "Postgres / SQLite", category: "Data", level: "Proficient" },
          { name: "PyTorch", category: "AI/ML", level: "Proficient" },
          { name: "LLM prompting", category: "AI/ML", level: "Proficient" },
          { name: "Retrieval-Augmented Generation", category: "AI/ML", level: "Proficient" },
          { name: "Embeddings & vector search", category: "AI/ML", level: "Familiar" },
          { name: "Product discovery", category: "Product", level: "Proficient" },
          { name: "User research / usability testing", category: "HCI", level: "Proficient" },
          { name: "Figma", category: "Design", level: "Proficient" },
          { name: "A/B testing & experimentation", category: "Product", level: "Familiar" },
          { name: "Client-facing communication", category: "Soft", level: "Proficient" },
          { name: "Technical writing", category: "Soft", level: "Proficient" },
          { name: "Fintech domain (lending, underwriting)", category: "Domain", level: "Familiar" },
        ],
      },
      courses: {
        create: [
          { code: "INFO 5310", name: "Building Connected Devices", term: "Fall 2025", description: "Hands-on course on connected hardware/software systems, ML on edge devices, and HCI prototyping.", tags: "IoT, embedded, HCI, hardware, prototyping" },
          { code: "TECH 5900", name: "Product Studio", term: "Fall 2025", description: "Year-long client-driven product studio. Teams partner with a startup or enterprise to discover, design, and ship a product over two semesters.", tags: "product, discovery, client, design, startup, shipping" },
          { code: "INFO 6120", name: "Designing Technology for Social Impact", term: "Spring 2026", description: "Design and evaluate technology with attention to equity, accessibility, and downstream social impact.", tags: "HCI, design, ethics, social impact, accessibility" },
          { code: "CS 5780", name: "Machine Learning for Intelligent Systems", term: "Spring 2026", description: "Foundations of supervised and unsupervised learning, model evaluation, and applied projects.", tags: "ML, AI, supervised learning, evaluation, projects" },
          { code: "INFO 5340", name: "Virtual & Augmented Reality", term: "Fall 2025", description: "Immersive UX, 3D interaction, and AR/VR prototyping.", tags: "AR, VR, immersive, 3D, UX, prototyping" },
          { code: "TECH 5210", name: "Conversations in the Studio (Fintech track)", term: "Spring 2026", description: "Industry-led sessions on fintech, capital markets, and applied AI in financial services.", tags: "fintech, financial services, AI, industry" },
        ],
      },
    },
  });

  const job1 = await prisma.job.create({
    data: {
      title: "AI Product Engineer (Intern)",
      company: "Northwind AI",
      location: "New York, NY",
      url: "https://example.com/northwind-ai-intern",
      roleType: "Internship",
      description: [
        "We are looking for an AI Product Engineer intern to help us build LLM-powered features in our consumer product.",
        "You will work across the stack in TypeScript/Next.js, prototype retrieval-augmented generation flows, design product experiments, and collaborate closely with design and PM.",
        "Bonus: experience with prompt engineering, evaluation harnesses, RAG systems, and HCI / user research.",
        "Must have: strong product instincts, ability to ship end-to-end, comfort working with ambiguity and customers.",
      ].join("\n\n"),
      notes: "Heard about this from a Cornell Tech alum on LinkedIn.",
      contactName: "Priya Mehta",
      contactEmail: "priya@northwind.ai",
      contactRole: "Head of Engineering",
      status: "saved",
    },
  });

  const job2 = await prisma.job.create({
    data: {
      title: "Forward Deployed Engineer",
      company: "Lattice Capital",
      location: "New York, NY",
      url: "https://example.com/lattice-fde",
      roleType: "Full-time",
      description: [
        "Forward Deployed Engineer working with our fintech customers (lenders, asset managers) to deploy and customize our underwriting and risk platform.",
        "You will be on customer calls, write code, design integrations, and own outcomes end-to-end.",
        "Stack: Python, TypeScript, Postgres, internal data pipelines.",
        "We value engineers who are comfortable in front of customers and can translate ambiguous needs into shipped software.",
      ].join("\n\n"),
      notes: "Spoke with someone on the team at a fintech mixer.",
      contactName: "Marcus Lin",
      contactEmail: "marcus@latticecapital.com",
      contactRole: "Engineering Manager",
      status: "saved",
    },
  });

  return NextResponse.json({
    ok: true,
    profileId: profile.id,
    jobs: [
      { id: job1.id, title: job1.title },
      { id: job2.id, title: job2.title },
    ],
  });
}
