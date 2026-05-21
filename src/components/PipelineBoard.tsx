"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { PIPELINE_STAGES, STAGE_LABELS, type PipelineStage } from "@/lib/types";

type JobLite = {
  id: string;
  title: string;
  company: string;
  status: string;
  location: string | null;
  roleType: string | null;
  analysis: { fitScore: number } | null;
};

export function PipelineBoard({ jobs }: { jobs: JobLite[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState(jobs);

  async function setStatus(jobId: string, status: PipelineStage) {
    setBusy(jobId);
    setLocal((arr) => arr.map((j) => (j.id === jobId ? { ...j, status } : j)));
    try {
      await fetch(`/api/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${PIPELINE_STAGES.length}, minmax(240px, 1fr))` }}>
      {PIPELINE_STAGES.map((stage) => {
        const inStage = local.filter((j) => j.status === stage);
        return (
          <div key={stage} className="flex flex-col gap-3 rounded-2xl bg-ink-100/60 p-3">
            <div className="flex items-center justify-between px-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-600">
                {STAGE_LABELS[stage]}
              </div>
              <span className="chip">{inStage.length}</span>
            </div>
            <div className="flex flex-col gap-3">
              {inStage.length === 0 && (
                <div className="rounded-lg border border-dashed border-ink-300 px-3 py-6 text-center text-xs text-ink-500">
                  No jobs here yet
                </div>
              )}
              {inStage.map((job) => (
                <div key={job.id} className="card !rounded-xl">
                  <div className="card-body !py-3">
                    <Link href={`/jobs/${job.id}`} className="text-sm font-semibold text-ink-900 hover:text-brand-700">
                      {job.title}
                    </Link>
                    <div className="text-xs text-ink-500">{job.company}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {job.roleType && <span className="chip">{job.roleType}</span>}
                        {job.analysis && (
                          <span className="chip">fit {job.analysis.fitScore}</span>
                        )}
                      </div>
                      <select
                        className="select !py-1 !text-xs !shadow-none"
                        value={job.status}
                        disabled={busy === job.id}
                        onChange={(e) => setStatus(job.id, e.target.value as PipelineStage)}
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
