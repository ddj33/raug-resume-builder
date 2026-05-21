import { getOrCreateProfile } from "@/lib/profile";
import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { Tag } from "@/components/Badge";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getOrCreateProfile();

  return (
    <div>
      <PageHeader
        title="Candidate profile"
        description="The structured candidate record the retriever pulls from. Update this and every future generation reflects it."
      />

      <ProfileForm
        profile={{
          id: profile.id,
          fullName: profile.fullName,
          headline: profile.headline,
          location: profile.location,
          email: profile.email,
          phone: profile.phone,
          linkedinUrl: profile.linkedinUrl,
          githubUrl: profile.githubUrl,
          portfolioUrl: profile.portfolioUrl,
          school: profile.school,
          program: profile.program,
          degree: profile.degree,
          graduation: profile.graduation,
          summary: profile.summary,
          preferredRoles: profile.preferredRoles,
          preferredTypes: profile.preferredTypes,
          workAuth: profile.workAuth,
        }}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <ProfileSection title="Experience" count={profile.experiences.length}>
          {profile.experiences.length === 0 && (
            <p className="muted">No experiences yet. Seed data should populate this list.</p>
          )}
          <ul className="space-y-4">
            {profile.experiences.map((e) => (
              <li key={e.id} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{e.title}</div>
                    <div className="text-xs text-ink-500">
                      {e.company} • {e.startDate}{e.endDate ? `–${e.endDate}` : ""}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{e.description}</p>
                {e.highlights && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-700">
                    {e.highlights.split("\n").filter(Boolean).map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </ProfileSection>

        <ProfileSection title="Projects" count={profile.projects.length}>
          <ul className="space-y-4">
            {profile.projects.map((p) => (
              <li key={p.id} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
                <div className="text-sm font-semibold text-ink-900">{p.name}</div>
                {p.role && <div className="text-xs text-ink-500">{p.role}</div>}
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{p.description}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.tags.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                    <Tag key={t}>{t}</Tag>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </ProfileSection>

        <ProfileSection title="Skills" count={profile.skills.length}>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <span key={s.id} className="chip" title={s.category}>
                {s.name}
              </span>
            ))}
          </div>
        </ProfileSection>

        <ProfileSection title="Courses" count={profile.courses.length}>
          <ul className="space-y-3">
            {profile.courses.map((c) => (
              <li key={c.id} className="rounded-xl border border-ink-100 bg-ink-50/40 p-4">
                <div className="text-sm font-semibold text-ink-900">
                  {c.code ? `${c.code} — ` : ""}
                  {c.name}
                </div>
                {c.term && <div className="text-xs text-ink-500">{c.term}</div>}
                <p className="mt-1 text-sm leading-relaxed text-ink-700">{c.description}</p>
              </li>
            ))}
          </ul>
        </ProfileSection>
      </div>
    </div>
  );
}

function ProfileSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="h2">{title}</div>
        <span className="chip">{count}</span>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}
