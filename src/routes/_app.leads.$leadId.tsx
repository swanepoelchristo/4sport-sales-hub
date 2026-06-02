import { createFileRoute, Link } from "@tanstack/react-router";
import { LeadForm, useEditableLead } from "./_app.leads_.new";
import { PageHeader } from "@/components/ui-bits";
import { LeadAttachments } from "@/components/LeadAttachments";
import { LeadTimeline } from "@/components/LeadTimeline";

export const Route = createFileRoute("/_app/leads/$leadId")({ component: EditLead });

function EditLead() {
  const { lead, leadId, allowed } = useEditableLead();
  if (!lead) {
    return (
      <>
        <PageHeader title="Lead not found" action={<Link to="/leads" className="text-sm text-muted-foreground">← Back</Link>} />
      </>
    );
  }
  if (!allowed) {
    return <PageHeader title="Not authorised" subtitle="You can only edit leads assigned to you." />;
  }
  const { id: _id, created_at: _ca, ...rest } = lead;
  return (
    <>
      <LeadForm initial={rest} mode="edit" leadId={leadId} />
      <LeadAttachments leadId={leadId} />
      <LeadTimeline leadId={leadId} />
    </>
  );
}
