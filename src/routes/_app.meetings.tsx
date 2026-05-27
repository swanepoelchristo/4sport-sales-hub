import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import type { Meeting, MeetingStatus, MeetingType } from "@/lib/types";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_app/meetings")({ component: MeetingsPage });

const M_TYPES: MeetingType[] = ["Phone", "WhatsApp", "Online", "In-person"];
const M_STATUSES: MeetingStatus[] = ["Scheduled", "Completed", "Cancelled", "Rescheduled"];

const tone = (s: MeetingStatus) =>
  s === "Completed" ? "success" : s === "Cancelled" ? "danger" : s === "Rescheduled" ? "warning" : "info";

function MeetingsPage() {
  const { state, user, setState, addActivity, uid } = useStore();
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [status, setStatus] = useState("all");
  const [rep, setRep] = useState("all");

  const meetings = useMemo(() => {
    let list = isAdmin ? state.meetings : state.meetings.filter((m) => m.rep_id === user.id);
    if (status !== "all") list = list.filter((m) => m.status === status);
    if (isAdmin && rep !== "all") list = list.filter((m) => m.rep_id === rep);
    return [...list].sort((a, b) => +new Date(b.meeting_at) - +new Date(a.meeting_at));
  }, [state.meetings, isAdmin, user.id, status, rep]);

  const leadById = (id: string) => state.leads.find((l) => l.id === id);
  const repById = (id: string) => state.reps.find((r) => r.id === id);

  // Form state
  const initialForm: Omit<Meeting, "id"> = {
    lead_id: (isAdmin ? state.leads[0]?.id : state.leads.find((l) => l.assigned_rep_id === user.id)?.id) ?? "",
    rep_id: user.id,
    meeting_at: new Date().toISOString().slice(0, 16),
    meeting_type: "In-person",
    status: "Scheduled",
    outcome_notes: "",
    next_action: "",
    next_follow_up: null,
  };
  const [form, setForm] = useState(initialForm);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lead_id) return;
    const newMtg: Meeting = {
      ...form, id: uid(),
      meeting_at: new Date(form.meeting_at).toISOString(),
    };
    setState((s) => ({ ...s, meetings: [newMtg, ...s.meetings] }));
    addActivity("Meeting logged", leadById(newMtg.lead_id)?.org_name ?? "");
    setShowForm(false);
    setForm(initialForm);
  };

  const visibleLeads = isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === user.id);

  return (
    <>
      <PageHeader
        title="Meetings & visits"
        subtitle={isAdmin ? "All scheduled and completed meetings." : "Your scheduled and completed visits."}
        action={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            {showForm ? <><X className="h-4 w-4" /> Close</> : <><Plus className="h-4 w-4" /> Log meeting</>}
          </button>
        }
      />

      <HowToUse>
        <p><strong>What this page is for:</strong> schedule new visits and log completed ones.</p>
        <p className="mt-2"><strong>What to do here:</strong></p>
        <ul>
          <li>Click <em>Log meeting</em> to schedule a visit or record one you've done.</li>
          <li>Mark meetings as Completed, Rescheduled or No-show as soon as they happen.</li>
          <li>Add quick notes so the next step is clear.</li>
        </ul>
        <p className="mt-2"><strong>Before moving on:</strong> no scheduled meetings should be left in the past.</p>
      </HowToUse>

      {showForm && (

        <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
          <Lbl label="Lead">
            <select required className={inp} value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
              <option value="" disabled>Select…</option>
              {visibleLeads.map((l) => <option key={l.id} value={l.id}>{l.org_name}</option>)}
            </select>
          </Lbl>
          {isAdmin && (
            <Lbl label="Rep">
              <select className={inp} value={form.rep_id} onChange={(e) => setForm({ ...form, rep_id: e.target.value })}>
                {state.reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
              </select>
            </Lbl>
          )}
          <Lbl label="When">
            <input className={inp} type="datetime-local" value={form.meeting_at.slice(0, 16)} onChange={(e) => setForm({ ...form, meeting_at: e.target.value })} />
          </Lbl>
          <Lbl label="Type">
            <select className={inp} value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value as MeetingType })}>
              {M_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Lbl>
          <Lbl label="Status">
            <select className={inp} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MeetingStatus })}>
              {M_STATUSES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Lbl>
          <Lbl label="Next follow-up">
            <input className={inp} type="date"
              value={form.next_follow_up ? form.next_follow_up.slice(0, 10) : ""}
              onChange={(e) => setForm({ ...form, next_follow_up: e.target.value ? new Date(e.target.value).toISOString() : null })}
            />
          </Lbl>
          <Lbl label="Outcome notes" full><textarea className={inp + " min-h-20"} value={form.outcome_notes} onChange={(e) => setForm({ ...form, outcome_notes: e.target.value })} /></Lbl>
          <Lbl label="Next action" full><input className={inp} value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })} /></Lbl>
          <div className="md:col-span-2">
            <button className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Save meeting</button>
          </div>
        </form>
      )}

      <Section title="Filters">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>
            <option value="all">All statuses</option>
            {M_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {isAdmin && (
            <select value={rep} onChange={(e) => setRep(e.target.value)} className={inp}>
              <option value="all">All reps</option>
              {state.reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          )}
        </div>
      </Section>

      {meetings.length === 0 ? (
        <EmptyState>No meetings logged yet.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">When</th>
                  <th className="px-4 py-2 text-left">Lead</th>
                  {isAdmin && <th className="px-4 py-2 text-left">Rep</th>}
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Next action</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(m.meeting_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-3 font-medium">{leadById(m.lead_id)?.org_name ?? "—"}</td>
                    {isAdmin && <td className="px-4 py-3">{repById(m.rep_id)?.full_name ?? "—"}</td>}
                    <td className="px-4 py-3">{m.meeting_type}</td>
                    <td className="px-4 py-3"><StatusBadge tone={tone(m.status)}>{m.status}</StatusBadge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{m.next_action || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {meetings.map((m) => (
              <li key={m.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{leadById(m.lead_id)?.org_name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.meeting_at).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" })} • {m.meeting_type}
                      {isAdmin && <> • {repById(m.rep_id)?.full_name}</>}
                    </p>
                  </div>
                  <StatusBadge tone={tone(m.status)}>{m.status}</StatusBadge>
                </div>
                {m.outcome_notes && <p className="mt-2 text-xs text-muted-foreground">{m.outcome_notes}</p>}
                {m.next_action && <p className="mt-1 text-xs text-foreground">Next: {m.next_action}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

const inp = "w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm focus:border-primary focus:outline-none";
function Lbl({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
