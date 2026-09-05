import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Mail, Search, Send, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { EmptyState, PageHeader, Section, StatusBadge } from "@/components/ui-bits";
import type { Lead, LeadActivity } from "@/lib/types";

export const Route = createFileRoute("/_app/prepared-leads")({ component: PreparedLeadsPage });

function subjectFor(lead: Lead) {
  return `4SPORT for ${lead.org_name}`;
}

function bodyFor(lead: Lead, sender: string) {
  const greeting = lead.contact_person?.trim() ? `Good day ${lead.contact_person.trim()},` : "Good day,";
  const sport = lead.sport_focus && lead.sport_focus !== "Other" ? `, including ${lead.sport_focus}` : "";
  return `${greeting}\n\nMy name is ${sender} from 4SPORT. We help schools simplify sports administration${sport} by bringing teams, athletes, fixtures, communication and day-to-day sports operations into one controlled platform.\n\nI would like to introduce 4SPORT to ${lead.org_name} and see whether it could help your sports department. Would you be available for a short introduction or demonstration?\n\nKind regards,\n${sender}\n4SPORT`;
}

function PreparedLeadsPage() {
  const { state, user, setState } = useStore();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const leads = useMemo(() => {
    if (!user) return [];
    const list = state.leads.filter((lead) => {
      if (lead.archived || lead.do_not_contact) return false;
      if (!lead.public_email && !lead.email) return false;
      if (user.role === "sales_rep" && lead.assigned_rep_id !== user.id) return false;
      return lead.status === "New Lead" && !lead.last_contacted_at;
    });
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter((lead) => [lead.org_name, lead.city, lead.contact_person, lead.public_email, lead.email]
      .some((value) => (value || "").toLowerCase().includes(term)));
  }, [state.leads, user, q]);

  if (!user) return null;

  const markEmailSent = async (lead: Lead, subject: string, body: string) => {
    setBusy(lead.id);
    setMessage(null);
    const now = new Date().toISOString();
    const followUp = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const recipient = lead.public_email || lead.email;
    const notes = `Initial 4SPORT email sent to ${recipient}. Subject: ${subject}\n\n${body}`;

    const { data: activity, error: activityError } = await supabase
      .from("lead_activity")
      .insert({
        lead_id: lead.id,
        agent_id: null,
        activity_type: "email",
        outcome: "sent",
        notes,
        next_follow_up_at: followUp,
      })
      .select("*")
      .single();

    if (activityError) {
      setBusy(null);
      setMessage(activityError.message);
      return;
    }

    const { error: leadError } = await supabase
      .from("leads")
      .update({
        status: "Contacted",
        last_contacted_at: now,
        next_follow_up_at: followUp,
        notes: `Initial email sent to ${recipient}. Follow-up scheduled in 3 days.`,
      })
      .eq("id", lead.id);

    setBusy(null);
    if (leadError) {
      setMessage(`Email activity was recorded, but the lead update failed: ${leadError.message}`);
      return;
    }

    const newActivity = activity as LeadActivity;
    setState((current) => ({
      ...current,
      leads: current.leads.map((item) => item.id === lead.id
        ? {
            ...item,
            status: "Contacted",
            last_contacted_at: now,
            next_follow_up_at: followUp,
            notes: `Initial email sent to ${recipient}. Follow-up scheduled in 3 days.`,
          }
        : item),
      leadActivity: [newActivity, ...current.leadActivity],
    }));
    setMessage(`${lead.org_name}: sent email recorded, removed from Prepared Leads, and a 3-day follow-up was scheduled for the shared Sales Hub.`);
  };

  return (
    <>
      <PageHeader title="Prepared Leads" subtitle="Your ready-to-contact queue. Review the prepared email, send it, then record the send so the school moves into the shared follow-up workflow." />
      {message && <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm">{message}</div>}
      <Section title={`Ready to contact (${leads.length})`}>
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-input bg-secondary px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search school, city, contact or email" className="w-full bg-transparent text-sm outline-none" />
        </div>
        {leads.length === 0 ? <EmptyState>No unsent prepared email leads are ready for you right now.</EmptyState> : (
          <div className="space-y-4">
            {leads.map((lead) => <PreparedLeadCard key={lead.id} lead={lead} sender={user.full_name} reps={state.reps} busy={busy === lead.id} onSent={markEmailSent} />)}
          </div>
        )}
      </Section>
    </>
  );
}

function PreparedLeadCard({ lead, sender, reps, busy, onSent }: {
  lead: Lead;
  sender: string;
  reps: { id: string; full_name: string }[];
  busy: boolean;
  onSent: (lead: Lead, subject: string, body: string) => Promise<void>;
}) {
  const [subject, setSubject] = useState(subjectFor(lead));
  const [body, setBody] = useState(bodyFor(lead, sender));
  const email = lead.public_email || lead.email;
  const assignedRep = reps.find((rep) => rep.id === lead.assigned_rep_id);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{lead.org_name}</h3><StatusBadge tone="info">Ready</StatusBadge></div>
          <p className="text-sm text-muted-foreground">{lead.city || "City unknown"}, {lead.province || "Province unknown"} • {lead.sport_focus}</p>
        </div>
        <Link to="/leads/$leadId" params={{ leadId: lead.id }} className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold">Open full lead</Link>
      </div>
      <div className="mb-4 grid gap-2 text-sm md:grid-cols-2">
        <p><Mail className="mr-2 inline h-4 w-4" /><strong>To:</strong> {email}</p>
        <p><UserCheck className="mr-2 inline h-4 w-4" /><strong>Contact:</strong> {lead.contact_person || lead.contact_role || "School administration"}</p>
        <p><strong>Assigned rep:</strong> {assignedRep?.full_name || "Unassigned"}</p>
        <p><strong>Source:</strong> {lead.website || lead.source_url || lead.lead_source || "Public organisation source"}</p>
      </div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subject</label>
      <input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm" />
      <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prepared email</label>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} className="mt-1 min-h-64 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm leading-relaxed" />
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={mailto} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Send className="h-4 w-4" />Open email to send</a>
        <button type="button" disabled={busy} onClick={() => void onSent(lead, subject, body)} className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold disabled:opacity-60">{busy ? "Recording…" : "I sent this email"}</button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">After sending, click “I sent this email”. The school leaves this queue, becomes Contacted, the email is added to its shared history, and Sales Hub schedules a follow-up for three days later.</p>
    </div>
  );
}
