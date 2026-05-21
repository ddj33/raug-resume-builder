import { prisma } from "./db";

export async function getOrCreateProfile() {
  let profile = await prisma.candidateProfile.findFirst({
    include: { experiences: true, projects: true, skills: true, courses: true },
    orderBy: { createdAt: "asc" },
  });

  if (!profile) {
    profile = await prisma.candidateProfile.create({
      data: {
        fullName: "Your Name",
        headline: "M.S. student / candidate",
        location: "",
        email: "",
        school: "Cornell Tech",
        program: "Connective Media",
        degree: "M.S.",
        graduation: "May 2026",
        summary: "Add a short summary of who you are and what you're looking for.",
        preferredRoles: "AI, Product, Software, Fintech",
        preferredTypes: "Internship, Full-time",
      },
      include: { experiences: true, projects: true, skills: true, courses: true },
    });
  }

  return profile;
}
