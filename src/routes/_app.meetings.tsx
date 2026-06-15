import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui-bits";
import type { Meeting, MeetingStatus, MeetingType } from "@/lib/types";
import { Plus, X, CalendarDays, Filter, Clock, Users, FileText, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_app/meetings")({ component: MeetingsPage });

const M_TYPES: MeetingType[] = ["Phone", "WhatsApp", "Online", "In-person"];
const M_STATUSES: MeetingStatus[] = ["Scheduled", "Completed", "Cancelled", "Rescheduled"];

const tone = (s: MeetingStatus) =>
  s === "Completed" ? "success" : s === "Cancelled" ? "danger" : s === "Rescheduled" ? "warning" : "info";

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.lead_id) return;

    const newMtg: Meeting = {
      ...form,
      id: uid(),
      meeting_at: new Date(form.meeting_at).toISOString(),
    };

    setState((s) => ({ ...s, meetings: [newMtg, ...s.meetings] }));
    addActivity("Meeting logged", leadById(newMtg.lead_id)?.org_name ?? "");
    setShowForm(false);
    setForm(initialForm);
  };

  const visibleLeads = isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === user.id);

  const scheduledCount = meetings.filter((m) => m.status === "Scheduled").length;
  const completedCount = meetings.filter((m) => m.status === "Completed").length;
  const rescheduledCount = meetings.filter((m) => m.status === "Rescheduled").length;

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            4SPORT Sales Hub
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Meetings & visits
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            {isAdmin ? "All scheduled and completed meetings." : "Your scheduled and completed visits."}
          </p>
        </div>

        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4" />
              Close
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Log meeting
            </>
          )}
        </button>
      </div>

      {/* Guide */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-xl">
              📅
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">How to use this page</h2>
              <p className="text-sm text-slate-600">
                Schedule visits, log completed meetings and keep next actions clear.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Meetings guide
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="➕"
            title="Log a meeting"
            text="Use Log meeting to schedule a new visit or record one that already happened."
          />

          <InfoBox
            icon="✅"
            title="Update the outcome"
            text="Mark meetings as completed, rescheduled or cancelled as soon as the meeting status changes."
          />

          <InfoBox
            icon="🎯"
            title="Set the next step"
            text="Add notes and a next action so the sales follow-up is clear."
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat icon={<CalendarDays className="h-5 w-5" />} label="Meetings shown" value={meetings.length} tone="info" />
        <MiniStat icon={<Clock className="h-5 w-5" />} label="Scheduled" value={scheduledCount} tone="warning" />
        <MiniStat icon={<Users className="h-5 w-5" />} label="Completed" value={completedCount} tone="success" />
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <FileText className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950">Log meeting</h2>
                <p className="text-sm text-slate-600">Create a meeting record without changing other lead data.</p>
              </div>
            </div>
          </div>

          <Lbl label="Lead">
            <select
              required
              className={inp}
              value={form.lead_id}
              onChange={(e) => setForm({ ...form, lead_id: e.target.value })}
            >
              <option value="" disabled>
                Select…
              </option>
              {visibleLeads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.org_name}
                </option>
              ))}
            </select>
          </Lbl>

          {isAdmin && (
            <Lbl label="Rep">
              <select
                className={inp}
                value={form.rep_id}
                onChange={(e) => setForm({ ...form, rep_id: e.target.value })}
              >
                {state.reps.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name}
                  </option>
                ))}
              </select>
            </Lbl>
          )}

          <Lbl label="When">
            <input
              className={inp}
              type="datetime-local"
              value={form.meeting_at.slice(0, 16)}
              onChange={(e) => setForm({ ...form, meeting_at: e.target.value })}
            />
          </Lbl>

          <Lbl label="Type">
            <select
              className={inp}
              value={form.meeting_type}
              onChange={(e) => setForm({ ...form, meeting_type: e.target.value as MeetingType })}
            >
              {M_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Lbl>

          <Lbl label="Status">
            <select
              className={inp}
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as MeetingStatus })}
            >
              {M_STATUSES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Lbl>

          <Lbl label="Next follow-up">
            <input
              className={inp}
              type="date"
              value={form.next_follow_up ? form.next_follow_up.slice(0, 10) : ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  next_follow_up: e.target.value ? new Date(e.target.value).toISOString() : null,
                })
              }
            />
          </Lbl>

          <Lbl label="Outcome notes" full>
            <textarea
              className={`${inp} min-h-24`}
              value={form.outcome_notes}
              onChange={(e) => setForm({ ...form, outcome_notes: e.target.value })}
            />
          </Lbl>

          <Lbl label="Next action" full>
            <input
              className={inp}
              value={form.next_action}
              onChange={(e) => setForm({ ...form, next_action: e.target.value })}
            />
          </Lbl>

          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Save meeting
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Filter className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-600">Narrow the meeting list by status or rep.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inp}>
            <option value="all">All statuses</option>
            {M_STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>

          {isAdmin && (
            <select value={rep} onChange={(e) => setRep(e.target.value)} className={inp}>
              <option value="all">All reps</option>
              {state.reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          )}
        </div>
      </section>

      {/* Meetings */}
      {meetings.length === 0 ? (
        <EmptyPanel icon="📅" title="No meetings logged yet." subtitle="Click Log meeting to create the first one." />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/25 md:block">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <CalendarDays className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-950">Meeting timeline</h2>
                  <p className="text-sm text-slate-600">
                    Showing {meetings.length} meeting{meetings.length === 1 ? "" : "s"}.
                    {rescheduledCount > 0 && ` ${rescheduledCount} rescheduled.`}
                  </p>
                </div>
              </div>
            </div>

            <table className="w-full text-sm text-slate-800">
              <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">When</th>
                  <th className="px-5 py-3 text-left">Lead</th>
                  {isAdmin && <th className="px-5 py-3 text-left">Rep</th>}
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Next action</th>
                </tr>
              </thead>

              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id} className="border-t border-slate-200 transition hover:bg-cyan-50/40">
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-950">
                      {fmtDateTime(m.meeting_at)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-slate-950">
                      {leadById(m.lead_id)?.org_name ?? "—"}
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-4">
                        {repById(m.rep_id)?.full_name ?? "—"}
                      </td>
                    )}

                    <td className="px-5 py-4">{m.meeting_type}</td>

                    <td className="px-5 py-4">
                      <StatusBadge tone={tone(m.status)}>{m.status}</StatusBadge>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {m.next_action || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {meetings.map((m) => (
              <li key={m.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{leadById(m.lead_id)?.org_name ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {fmtDateTime(m.meeting_at)} • {m.meeting_type}
                      {isAdmin && <> • {repById(m.rep_id)?.full_name}</>}
                    </p>
                  </div>

                  <StatusBadge tone={tone(m.status)}>{m.status}</StatusBadge>
                </div>

                {m.outcome_notes && (
                  <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                    {m.outcome_notes}
                  </p>
                )}

                {m.next_action && (
                  <p className="mt-3 rounded-2xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
                    Next: {m.next_action}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

const inp =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100";

function Lbl({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function InfoBox({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-xl">
        {icon}
      </div>

      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  tone = "info",
}: {
  icon: ReactNode;
  label: string;
  value: number;
  tone?: "info" | "success" | "warning";
}) {
  const toneClass = {
    info: "bg-cyan-50 text-cyan-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-2xl shadow-cyan-950/25">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-2xl">
        {icon}
      </div>

      <p className="font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}
