"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = {
  id: string;
  fullName: string;
  headline: string;
  location: string;
  email: string;
  phone: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  school: string;
  program: string;
  degree: string;
  graduation: string;
  summary: string;
  preferredRoles: string;
  preferredTypes: string;
  workAuth: string | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Profile>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value as Profile[K] }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setSaved(true);
      router.refresh();
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <div className="card">
        <div className="card-header">
          <div className="h2">Identity</div>
        </div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="Full name">
            <input className="input" value={form.fullName} onChange={(e) => update("fullName", e.target.value)} />
          </Field>
          <Field label="Headline">
            <input className="input" value={form.headline} onChange={(e) => update("headline", e.target.value)} />
          </Field>
          <Field label="Location">
            <input className="input" value={form.location} onChange={(e) => update("location", e.target.value)} />
          </Field>
          <Field label="Email">
            <input type="email" className="input" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input className="input" value={form.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="Work authorization">
            <input className="input" value={form.workAuth ?? ""} onChange={(e) => update("workAuth", e.target.value)} />
          </Field>
          <Field label="LinkedIn URL">
            <input className="input" value={form.linkedinUrl ?? ""} onChange={(e) => update("linkedinUrl", e.target.value)} />
          </Field>
          <Field label="GitHub URL">
            <input className="input" value={form.githubUrl ?? ""} onChange={(e) => update("githubUrl", e.target.value)} />
          </Field>
          <Field label="Portfolio URL">
            <input className="input" value={form.portfolioUrl ?? ""} onChange={(e) => update("portfolioUrl", e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="h2">Education</div>
        </div>
        <div className="card-body grid gap-4 sm:grid-cols-2">
          <Field label="School">
            <input className="input" value={form.school} onChange={(e) => update("school", e.target.value)} />
          </Field>
          <Field label="Program">
            <input className="input" value={form.program} onChange={(e) => update("program", e.target.value)} />
          </Field>
          <Field label="Degree">
            <input className="input" value={form.degree} onChange={(e) => update("degree", e.target.value)} />
          </Field>
          <Field label="Graduation">
            <input className="input" value={form.graduation} onChange={(e) => update("graduation", e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="h2">Targeting</div>
        </div>
        <div className="card-body grid gap-4">
          <Field label="Summary">
            <textarea className="textarea min-h-[120px]" value={form.summary} onChange={(e) => update("summary", e.target.value)} />
          </Field>
          <Field label="Preferred roles (comma-separated)">
            <input className="input" value={form.preferredRoles} onChange={(e) => update("preferredRoles", e.target.value)} />
          </Field>
          <Field label="Preferred role types (comma-separated)">
            <input className="input" value={form.preferredTypes} onChange={(e) => update("preferredTypes", e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Saving…" : "Save profile"}
        </button>
        {saved && <span className="text-sm text-emerald-700">✓ Saved</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
