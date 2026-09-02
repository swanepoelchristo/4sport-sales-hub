import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { useStore } from "@/lib/store";
import type { Meeting, MeetingStatus, MeetingType } from "@/lib/types";

export const Route = createFileRoute("/_app/meetings")({ component: MeetingsPage });

const M_TYPES: MeetingType[] = ["Phone", "WhatsApp", "Online", "In-person"];
const M_STATUSES: MeetingStatus[] = ["Scheduled", "Completed", "Cancelled", "Rescheduled"];
const inp = "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-300 focus:bg-white";

function localInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function MeetingsPage() {
  const { state, user, setState, addActivity, uid } = useStore();
  const userId = user?.id ?? "";
  const isAdmin = user?.role === "admin";
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [repFilter, setRepFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Meeting | null>(null);

  const visibleLeads = isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === userId);
  const makeInitial = (): Omit<Meeting, "id"> => ({
    lead_id: visibleLeads[0]?.id ?? "",
    rep_id: isAdmin ? (state.reps[0]?.id ?? userId) : userId,
    meeting_at: localInputValue(new Date().toISOString()),
    meeting_type: "In-person",
    status: "Scheduled",
    outcome_notes: "",
    next_action: "",
    next_follow_up: null,
  });
  const [form, setForm] = useState<Omit<Meeting, "id">>(makeInitial);

  const meetings = useMemo(() => {
    let list = isAdmin ? state.meetings : state.meetings.filter((m) => m.rep_id === userId);
    if (statusFilter !== "all") list = list.filter((m) => m.status === statusFilter);
    if (isAdmin && repFilter !== "all") list = list.filter((m) => m.rep_id === repFilter);
    return [...list].sort((a, b) => +new Date(b.meeting_at) - +new Date(a.meeting_at));
  }, [state.meetings, isAdmin, userId, statusFilter, repFilter]);

  if (!user) return null;
  const leadById = (id: string) => state.leads.find((l) => l.id === id);
  const repById = (id: string) => state.reps.find((r) => r.id === id);

  const updateMeeting = (id: string, patch: Partial<Meeting>) => {
    setState((current) => ({ ...current, meetings: current.meetings.map((m) => m.id === id ? { ...m, ...patch } : m) }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.lead_id) return;
    const newMeeting: Meeting = { ...form, id: uid(), meeting_at: new Date(form.meeting_at).toISOString() };
    setState((s) => ({ ...s, meetings: [newMeeting, ...s.meetings] }));
    addActivity("Meeting logged", leadById(newMeeting.lead_id)?.org_name ?? "");
    setShowForm(false);
    setForm(makeInitial());
  };

  const beginEdit = (meeting: Meeting) => {
    setEditingId(meeting.id);
    setEditForm({ ...meeting, meeting_at: localInputValue(meeting.meeting_at) });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm(null); };

  const saveEdit = () => {
    if (!editingId || !editForm) return;
    const oldMeeting = state.meetings.find((m) => m.id === editingId);
    const newIso = new Date(editForm.meeting_at).toISOString();
    const dateChanged = !!oldMeeting && oldMeeting.meeting_at !== newIso;
    updateMeeting(editingId, { ...editForm, meeting_at: newIso, status: dateChanged && editForm.status === "Scheduled" ? "Rescheduled" : editForm.status });
    addActivity(dateChanged ? "Meeting rescheduled" : "Meeting updated", leadById(editForm.lead_id)?.org_name ?? "");
    cancelEdit();
  };

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-5 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.28em] text-blue-700">4SPORT Sales Hub</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Meetings & visits</h1><p className="mt-1 text-sm text-slate-600">Schedule visits, correct meeting details and keep next actions clear.</p></div>
        <button onClick={() => setShowForm((v) => !v)} className="rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">{showForm ? "Close" : "+ Log meeting"}</button>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <h2 className="font-semibold text-slate-950">How to use this page</h2>
        <p className="mt-1 text-sm text-slate-600">Create meetings, use Edit / reschedule when a date or time changes, then update the outcome and next action.</p>
      </section>

      {showForm && <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl md:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">LEAD<select required className={`${inp} mt-1`} value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}><option value="" disabled>Select...</option>{visibleLeads.map((l) => <option key={l.id} value={l.id}>{l.org_name}</option>)}</select></label>
        {isAdmin && <label className="text-xs font-bold text-slate-600">REP<select className={`${inp} mt-1`} value={form.rep_id} onChange={(e) => setForm({ ...form, rep_id: e.target.value })}>{state.reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select></label>}
        <label className="text-xs font-bold text-slate-600">WHEN<input required className={`${inp} mt-1`} type="datetime-local" value={form.meeting_at.slice(0,16)} onChange={(e) => setForm({ ...form, meeting_at: e.target.value })}/></label>
        <label className="text-xs font-bold text-slate-600">TYPE<select className={`${inp} mt-1`} value={form.meeting_type} onChange={(e) => setForm({ ...form, meeting_type: e.target.value as MeetingType })}>{M_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">STATUS<select className={`${inp} mt-1`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as MeetingStatus })}>{M_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="text-xs font-bold text-slate-600">NEXT FOLLOW-UP<input className={`${inp} mt-1`} type="date" value={form.next_follow_up?.slice(0,10) ?? ""} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null })}/></label>
        <label className="text-xs font-bold text-slate-600 md:col-span-2">OUTCOME NOTES<textarea className={`${inp} mt-1 min-h-20`} value={form.outcome_notes} onChange={(e) => setForm({ ...form, outcome_notes: e.target.value })}/></label>
        <label className="text-xs font-bold text-slate-600 md:col-span-2">NEXT ACTION<input className={`${inp} mt-1`} value={form.next_action} onChange={(e) => setForm({ ...form, next_action: e.target.value })}/></label>
        <button className="w-fit rounded-xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950">Save meeting</button>
      </form>}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><select className={inp} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All statuses</option>{M_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>{isAdmin && <select className={inp} value={repFilter} onChange={(e) => setRepFilter(e.target.value)}><option value="all">All reps</option>{state.reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}</select>}</div>
      </section>

      <div className="space-y-3">
        {meetings.length === 0 && <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">No meetings logged yet.</div>}
        {meetings.map((m) => {
          const editing = editingId === m.id && editForm;
          return <section key={m.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            {editing ? <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2"><p className="font-semibold text-slate-950">Edit / reschedule — {leadById(m.lead_id)?.org_name ?? "Meeting"}</p><p className="text-xs text-slate-500">Changing the date/time automatically records this as Rescheduled when it was Scheduled.</p></div>
              <label className="text-xs font-bold text-slate-600">WHEN<input className={`${inp} mt-1`} type="datetime-local" value={editForm.meeting_at.slice(0,16)} onChange={(e) => setEditForm({ ...editForm, meeting_at: e.target.value })}/></label>
              <label className="text-xs font-bold text-slate-600">TYPE<select className={`${inp} mt-1`} value={editForm.meeting_type} onChange={(e) => setEditForm({ ...editForm, meeting_type: e.target.value as MeetingType })}>{M_TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">STATUS<select className={`${inp} mt-1`} value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as MeetingStatus })}>{M_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="text-xs font-bold text-slate-600">NEXT FOLLOW-UP<input className={`${inp} mt-1`} type="date" value={editForm.next_follow_up?.slice(0,10) ?? ""} onChange={(e) => setEditForm({ ...editForm, next_follow_up: e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null })}/></label>
              <label className="text-xs font-bold text-slate-600 md:col-span-2">OUTCOME NOTES<textarea className={`${inp} mt-1 min-h-20`} value={editForm.outcome_notes} onChange={(e) => setEditForm({ ...editForm, outcome_notes: e.target.value })}/></label>
              <label className="text-xs font-bold text-slate-600 md:col-span-2">NEXT ACTION<input className={`${inp} mt-1`} value={editForm.next_action} onChange={(e) => setEditForm({ ...editForm, next_action: e.target.value })}/></label>
              <div className="flex gap-2 md:col-span-2"><button type="button" onClick={saveEdit} className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">Save changes</button><button type="button" onClick={cancelEdit} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Cancel</button></div>
            </div> : <div className="grid items-center gap-3 md:grid-cols-[1.1fr_1.5fr_1fr_1fr_1.5fr_auto]">
              <div><p className="text-xs font-bold text-slate-500">WHEN</p><p className="mt-1 font-medium text-slate-950">{fmtDateTime(m.meeting_at)}</p></div>
              <div><p className="text-xs font-bold text-slate-500">LEAD</p><p className="mt-1 font-semibold text-slate-950">{leadById(m.lead_id)?.org_name ?? "—"}</p>{isAdmin && <p className="text-xs text-slate-500">{repById(m.rep_id)?.full_name ?? "—"}</p>}</div>
              <div><p className="text-xs font-bold text-slate-500">TYPE</p><p className="mt-1">{m.meeting_type}</p></div>
              <select aria-label="Meeting status" className={inp} value={m.status} onChange={(e) => updateMeeting(m.id, { status: e.target.value as MeetingStatus })}>{M_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
              <input aria-label="Next action" className={inp} defaultValue={m.next_action} placeholder="Next action" onBlur={(e) => updateMeeting(m.id, { next_action: e.target.value.trim() })}/>
              <button type="button" onClick={() => beginEdit(m)} className="rounded-xl border border-cyan-300 bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-800">Edit / reschedule</button>
            </div>}
          </section>;
        })}
      </div>
    </div>
  );
}
