import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getOrCreateProfile();
  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const profile = await getOrCreateProfile();

  const updated = await prisma.candidateProfile.update({
    where: { id: profile.id },
    data: {
      fullName: body.fullName ?? profile.fullName,
      headline: body.headline ?? profile.headline,
      location: body.location ?? profile.location,
      email: body.email ?? profile.email,
      phone: body.phone ?? profile.phone,
      linkedinUrl: body.linkedinUrl ?? profile.linkedinUrl,
      githubUrl: body.githubUrl ?? profile.githubUrl,
      portfolioUrl: body.portfolioUrl ?? profile.portfolioUrl,
      school: body.school ?? profile.school,
      program: body.program ?? profile.program,
      degree: body.degree ?? profile.degree,
      graduation: body.graduation ?? profile.graduation,
      summary: body.summary ?? profile.summary,
      preferredRoles: body.preferredRoles ?? profile.preferredRoles,
      preferredTypes: body.preferredTypes ?? profile.preferredTypes,
      workAuth: body.workAuth ?? profile.workAuth,
    },
    include: { experiences: true, projects: true, skills: true, courses: true },
  });
  return NextResponse.json(updated);
}
