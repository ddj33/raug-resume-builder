import { PageHeader } from "@/components/PageHeader";
import { NewJobForm } from "@/components/NewJobForm";

export default function NewJobPage() {
  return (
    <div>
      <PageHeader
        title="New job application"
        description="Paste the JD and any contact info. We'll create a workspace where you can analyze fit and generate outreach."
      />
      <NewJobForm />
    </div>
  );
}
