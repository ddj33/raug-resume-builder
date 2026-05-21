"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewJobForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    url: "",
    roleType: "Internship",
    description: "",
    notes: "",
    contactName: "",
    contactEmail: "",
    contactRole: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create job");
      }
      const job = await res.json();
      router.push(`/jobs/${job.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-3">
      <div className="card lg:col-span-2">
        <div className="card-header">
          <div>
            <div className="h2">Job description</div>
            <p className="muted">Paste the full JD — retrieval and scoring read from this text.</p>
          </div>
        </div>
        <div className="card-body grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Job title">
              <input
                required
                className="input"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="AI Product Engineer"
              />
            </Field>
            <Field label="Company">
              <input
                required
                className="input"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="Acme AI"
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="New York, NY"
              />
            </Field>
            <Field label="Role type">
              <select
                className="select"
                value={form.roleType}
                onChange={(e) => update("roleType", e.target.value)}
              >
                <option>Internship</option>
                <option>Full-time</option>
                <option>Contract</option>
                <option>New grad</option>
              </select>
            </Field>
            <Field label="Job URL" className="sm:col-span-2">
              <input
                className="input"
                value={form.url}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
          <Field label="Job description">
            <textarea
              required
              className="textarea min-h-[220px]"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Paste the full JD here…"
            />
          </Field>
          <Field label="Notes">
            <textarea
              className="textarea min-h-[80px]"
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Where did you find it? Who referred you? Anything to remember."
            />
          </Field>
        </div>
      </div>

      <div className="card h-fit">
        <div className="card-header">
          <div>
            <div className="h2">Contact (optional)</div>
            <p className="muted">Used to personalize generated outreach.</p>
          </div>
        </div>
        <div className="card-body grid gap-4">
          <Field label="Contact name">
            <input
              className="input"
              value={form.contactName}
              onChange={(e) => update("contactName", e.target.value)}
              placeholder="Priya Mehta"
            />
          </Field>
          <Field label="Contact role">
            <input
              className="input"
              value={form.contactRole}
              onChange={(e) => update("contactRole", e.target.value)}
              placeholder="Head of Engineering"
            />
          </Field>
          <Field label="Contact email">
            <input
              type="email"
              className="input"
              value={form.contactEmail}
              onChange={(e) => update("contactEmail", e.target.value)}
              placeholder="priya@acme.ai"
            />
          </Field>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}

          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Saving…" : "Save job"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
