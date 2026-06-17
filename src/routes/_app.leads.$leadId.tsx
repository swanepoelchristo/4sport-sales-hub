import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import {
  CALL_OUTCOMES,
  type CallOutcome,
  type Lead,
  type LeadActivity,
  type LeadStatus,
} from "@/lib/types";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Mail,
  MapPin,
  Phone,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_app/leads/$leadId")({ component: LeadWorkspacePage });

const outcomeToStatus: Record<CallOutcome, LeadStatus> = {
  no_answer: "Contacted",
  interested: "Interested",
  not_interested: "Not Interested",
  call_back_later: "Contacted",
  meeting_booked: "Meeting Scheduled",
  converted: "Signed",
  do_not_contact: "Not Interested",
};

const statusTone = (s: string) => {
  if (["Signed", "Paid", "Active"].includes(s)) return "success" as const;
  if (["Not Interested", "Lost"].includes(s)) return "danger" as const;
  if (["Meeting Scheduled", "Pitched", "Interested"].includes(s)) return "info" as const;
  return "neutral" as const;
};

function LeadWorkspacePage() {
  const { leadId } = useParams({ from: "/_app/leads/$leadId" });
  const { state, user, setState } = useStore();

  const lead = useMemo(() => state.leads.find((item) => item.id === leadId), [state.leads, leadId]);
  const activities = useMemo(
    () => state.leadActivity
      .filter((activity) => activity.lead_id === leadId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [state.leadActivity, leadId],
  );

  const [notes, setNotes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [selectedRepId, setSelectedRepId] = useState(lead?.assigned_rep_id ?? "");
  const [busyOutcome, setBusyOutcome] = useState<CallOutcome | null>(null);
  const [savingRep, setSavingRep] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const isCallCentreAgent = user.role === "call_center_agent";
  const agentProfile = state.callCenterAgents.find((agent) => agent.id === user.id);
  const activeAgent = isCallCentreAgent && user.call_center_status === "active";

  if (!lead) {
    return (
      <>
        <PageHeader
          title="Lead not found"
          subtitle="This lead may have been archived or you may not have access."
          action={<Link to="/leads" className="text-sm text-muted-foreground hover:text-foreground">← Back to leads</Link>}
        />
        <EmptyState>Lead not found.</EmptyState>
      </>
    );
  }

  const assignedRep = state.reps.find((rep) => rep.id === lead.assigned_rep_id);
  const assignedAgent = state.callCenterAgents.find((agent) => agent.id === lead.assigned_agent_id);
  const canWorkLead = isAdmin || activeAgent || (!isCallCentreAgent && lead.assigned_rep_id === user.id);
  const canClaimLead = activeAgent && !lead.assigned_agent_id;
  const canAssignRep = isAdmin || activeAgent;
  const publicPhone = lead.public_phone || lead.phone || "";
  const publicEmail = lead.public_email || lead.email || "";
  const source = lead.source_url || lead.source_note || lead.lead_source || "";

  const updateLocalLead = (patch: Partial<Lead>) => {
    setState((current) => ({
      ...current,
      leads: current.leads.map((item) => item.id === lead.id ? { ...item, ...patch } : item),
    }));
  };

  const claimLead = async () => {
    if (!canClaimLead) return;
    setClaiming(true);
    setError(null);

    updateLocalLead({ assigned_agent_id: user.id });

    const { error: updateError } = await (supabase as any)
      .from("leads")
      .update({ assigned_agent_id: user.id })
      .eq("id", lead.id);

    setClaiming(false);

    if (updateError) {
      setError(updateError.message);
      updateLocalLead({ assigned_agent_id: "" });
    }
  };

  const saveRep = async () => {
    if (!canAssignRep) return;
    setSavingRep(true);
    setError(null);

    updateLocalLead({ assigned_rep_id: selectedRepId });

    const { error: updateError } = await (supabase as any)
      .from("leads")
      .update({ assigned_rep_id: selectedRepId || null })
      .eq("id", lead.id);

    setSavingRep(false);

    if (updateError) {
      setError(updateError.message);
    }
  };

  const recordOutcome = async (outcome: CallOutcome) => {
    if (!canWorkLead) return;
    setBusyOutcome(outcome);
    setError(null);

    const now = new Date().toISOString();
    const nextFollowUpIso = nextFollowUp ? new Date(nextFollowUp).toISOString() : null;
    const summaryNote = notes.trim();

    const row = {
      lead_id: lead.id,
      agent_id: isCallCentreAgent ? user.id : null,
      activity_type: "call",
      outcome,
      notes: summaryNote,
      next_follow_up_at: nextFollowUpIso,
    };

    const { data, error: insertError } = await (supabase as any)
      .from("lead_activity")
      .insert(row)
      .select()
      .single();

    if (insertError) {
      setBusyOutcome(null);
      setError(insertError.message);
      return;
    }

    const newActivity: LeadActivity = {
      id: data.id,
      lead_id: data.lead_id,
      agent_id: data.agent_id ?? null,
      activity_type: data.activity_type,
      outcome: data.outcome ?? "",
      notes: data.notes ?? "",
      next_follow_up_at: data.next_follow_up_at ?? null,
      created_at: data.created_at ?? now,
    };

    const nextStatus = outcomeToStatus[outcome];
    const patch: Partial<Lead> = {
      status: nextStatus,
      last_call_outcome: outcome,
      last_call_note: summaryNote,
      last_contacted_at: now,
      next_follow_up: nextFollowUpIso ?? lead.next_follow_up,
      do_not_contact: outcome === "do_not_contact" ? true : lead.do_not_contact,
      assigned_agent_id: lead.assigned_agent_id || (isCallCentreAgent ? user.id : ""),
    };

    setState((current) => ({
      ...current,
      leads: current.leads.map((item) => item.id === lead.id ? { ...item, ...patch } : item),
      leadActivity: [newActivity, ...current.leadActivity],
    }));

    setNotes("");
    setNextFollowUp("");
    setBusyOutcome(null);
  };

  return (
    <>
      <PageHeader
        title={lead.org_name}
        subtitle={`${lead.org_type} • ${lead.city || "City unknown"}, ${lead.province || "Province unknown"} • ${lead.sport_focus}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/leads" className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-semibold">
              ← Back to leads
            </Link>
            {canClaimLead && (
              <button
                type="button"
                onClick={claimLead}
                disabled={claiming}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <UserCheck className="h-4 w-4" />
                {claiming ? "Claiming…" : "Claim this lead"}
              </button>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isCallCentreAgent && user.call_center_status !== "active" && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
          Your call centre profile is <strong>{user.call_center_status ?? "pending"}</strong>. You can view this page, but lead calling is locked until admin approval.
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <Section title="Call script">
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                “Good day, I’m calling from 4SPORT. We help schools, clubs and academies manage sports operations,
                signups, events, communication and support in one controlled dashboard.”
              </p>
              <p>
                “I only have your public organisation contact details from the source listed on this lead.
                Is this the correct admin office/contact for sports operations?”
              </p>
              <p>
                “Would it be useful if a 4SPORT rep booked a short meeting to show how this could help your organisation?”
              </p>
            </div>
          </Section>

          <Section title="Record call outcome">
            <div className="grid gap-4">
              <label>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call notes</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Log what happened on the call. Keep it factual. No child/athlete personal details."
                  className="mt-1 min-h-28 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>

              <label>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next follow-up</span>
                <input
                  type="datetime-local"
                  value={nextFollowUp}
                  onChange={(e) => setNextFollowUp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                {CALL_OUTCOMES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => recordOutcome(item.value)}
                    disabled={!canWorkLead || !!busyOutcome || lead.do_not_contact}
                    className="rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busyOutcome === item.value ? "Saving…" : item.label}
                  </button>
                ))}
              </div>

              {lead.do_not_contact && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  This lead is marked do-not-contact. Do not call again unless admin explicitly clears it.
                </div>
              )}
            </div>
          </Section>

          <Section title="Activity history">
            {activities.length === 0 ? (
              <EmptyState>No call notes or activity logged yet.</EmptyState>
            ) : (
              <div className="space-y-3">
                {activities.map((activity) => (
                  <ActivityCard key={activity.id} activity={activity} />
                ))}
              </div>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section title="Lead status">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(lead.status)}>{lead.status}</StatusBadge>
                {lead.do_not_contact && <StatusBadge tone="danger">Do not contact</StatusBadge>}
              </div>

              <Info icon={<CalendarClock className="h-4 w-4" />} label="Next follow-up" value={lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleString("en-ZA") : "Not set"} />
              <Info icon={<CheckCircle2 className="h-4 w-4" />} label="Last outcome" value={lead.last_call_outcome || "No outcome yet"} />
              <Info icon={<ClipboardList className="h-4 w-4" />} label="Last note" value={lead.last_call_note || lead.notes || "No notes yet"} />
            </div>
          </Section>

          <Section title="Public organisation info">
            <div className="space-y-3">
              <Info icon={<MapPin className="h-4 w-4" />} label="Location" value={`${lead.city || "City unknown"}, ${lead.province || "Province unknown"}`} />
              <Info icon={<Phone className="h-4 w-4" />} label="Public phone" value={publicPhone || "—"} />
              <Info icon={<Mail className="h-4 w-4" />} label="Public email" value={publicEmail || "—"} />
              <Info icon={<ShieldAlert className="h-4 w-4" />} label="Source" value={source || "Source not captured"} />
              <Info icon={<ShieldAlert className="h-4 w-4" />} label="Website" value={lead.website || "—"} />
            </div>
          </Section>

          <Section title="Assignments">
            <div className="space-y-4">
              <Info icon={<UserCheck className="h-4 w-4" />} label="Assigned agent" value={assignedAgent?.name || assignedAgent?.email || agentProfile?.name || "Unassigned"} />
              <Info icon={<UserCheck className="h-4 w-4" />} label="Assigned rep" value={assignedRep?.full_name || "Unassigned"} />

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assign to 4SPORT rep</span>
                <select
                  value={selectedRepId}
                  onChange={(e) => setSelectedRepId(e.target.value)}
                  disabled={!canAssignRep}
                  className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:opacity-60"
                >
                  <option value="">Unassigned</option>
                  {state.reps.map((rep) => (
                    <option key={rep.id} value={rep.id}>{rep.full_name}</option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={saveRep}
                disabled={!canAssignRep || savingRep}
                className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {savingRep ? "Saving…" : "Save rep assignment"}
              </button>
            </div>
          </Section>

          <Section title="Meeting + commission">
            <div className="space-y-3 text-sm text-muted-foreground">
              <p><strong className="text-foreground">Meeting booking:</strong> foundation placeholder in PR #6. Full booking workflow comes next.</p>
              <p><strong className="text-foreground">Commission:</strong> meeting scheduled and new customer events come after the workflow foundation is stable.</p>
            </div>
          </Section>
        </div>
      </div>
    </>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="break-words text-sm">{value}</p>
    </div>
  );
}

function ActivityCard({ activity }: { activity: LeadActivity }) {
  const outcomeLabel = CALL_OUTCOMES.find((item) => item.value === activity.outcome)?.label || activity.outcome || "No outcome";

  return (
    <div className="rounded-lg border border-border bg-secondary p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">{outcomeLabel}</p>
        <p className="text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-ZA")}</p>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{activity.notes || "No note captured."}</p>
      {activity.next_follow_up_at && (
        <p className="mt-2 text-xs font-semibold text-primary">
          Follow-up: {new Date(activity.next_follow_up_at).toLocaleString("en-ZA")}
        </p>
      )}
    </div>
  );
}
