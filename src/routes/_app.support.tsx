import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { StatusBadge } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Clock,
  Filter,
  Headphones,
  History,
  Inbox,
  Plus,
  ShieldAlert,
  UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/_app/support")({ component: SupportPage });

type Ticket = {
  id: string;
  signup_id: string | null;
  lead_id: string | null;
  category: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  sla_hours: number;
  opened_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  resolution_notes: string;
  customer_happy: boolean;
  internal_notes: string | null;
  assigned_to_name: string | null;
  handled_by_name: string | null;
  last_updated_by_name: string | null;
  queue_type: string | null;
};

type TicketActivity = {
  id: string;
  ticket_id: string;
  action_type: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_name: string | null;
  created_at: string;
};

const CATEGORIES = [
  "General",
  "Match Day Ops",
  "Login/Auth",
  "Team Setup",
  "Communication",
  "Training",
  "Billing",
  "Other",
];

const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["Open", "In Progress", "Resolved"];
const STAFF_OPTIONS = ["Unassigned", "Christo", "Mariaan", "Support 1", "Game Day Ops"];
const QUEUE_TYPES = ["All", "Support", "Sales", "Game Day Ops", "Billing", "General"];

const nowIso = () => new Date().toISOString();

function parseTimeMs(value: string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatDateTime(value: string | null | undefined) {
  const ms = parseTimeMs(value);
  if (ms === null) return "Not set";

  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDurationMs(ms: number) {
  if (!Number.isFinite(ms)) return "unknown";
  if (ms < 0) return "invalid time";

  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "under 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours}h ${minutes}m` : `${hours}h`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getFirstResponseLabel(ticket: Ticket) {
  const opened = parseTimeMs(ticket.opened_at);
  const firstResponse = parseTimeMs(ticket.first_response_at);

  if (opened === null) return "Opened time invalid";
  if (firstResponse === null) return "First response: not marked yet";

  return `First response: ${formatDurationMs(firstResponse - opened)} after open`;
}

function severityTone(severity: string) {
  if (severity === "CRITICAL" || severity === "HIGH") return "danger" as const;
  if (severity === "MEDIUM") return "warning" as const;
  return "success" as const;
}

function SupportPage() {
  const { state, user } = useStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activitiesByTicket, setActivitiesByTicket] = useState<Record<string, TicketActivity[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [currentStaff, setCurrentStaff] = useState("Christo");
  const [queueFilter, setQueueFilter] = useState("All");
  const [form, setForm] = useState({
    signup_id: state.signups[0]?.id ?? "",
    category: "General",
    severity: "MEDIUM",
    title: "",
    description: "",
    sla_hours: 1,
  });

  if (!user) return null;

  const signupById = (id: string | null) => state.signups.find((s) => s.id === id);
  const leadById = (id: string | null) => state.leads.find((l) => l.id === id);

  const loadTickets = async () => {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("opened_at", { ascending: false });

    if (error) {
      console.error("[support tickets load]", error);
      return;
    }

    const loadedTickets = (data ?? []) as Ticket[];
    setTickets(loadedTickets);

    setNoteDrafts((prev) => {
      const next = { ...prev };
      for (const ticket of loadedTickets) {
        if (next[ticket.id] === undefined) {
          next[ticket.id] = ticket.internal_notes ?? "";
        }
      }
      return next;
    });

    const ticketIds = loadedTickets.map((ticket) => ticket.id);
    if (ticketIds.length === 0) {
      setActivitiesByTicket({});
      return;
    }

    const { data: activityData, error: activityError } = await supabase
      .from("support_ticket_activity")
      .select("*")
      .in("ticket_id", ticketIds)
      .order("created_at", { ascending: false });

    if (activityError) {
      console.error("[support ticket activity load]", activityError);
      return;
    }

    const grouped: Record<string, TicketActivity[]> = {};
    for (const item of (activityData ?? []) as TicketActivity[]) {
      grouped[item.ticket_id] = grouped[item.ticket_id] ?? [];
      grouped[item.ticket_id].push(item);
    }
    setActivitiesByTicket(grouped);
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const openCount = tickets.filter((t) => t.status !== "Resolved").length;

  const highRisk = tickets.filter(
    (t) => ["HIGH", "CRITICAL"].includes(t.severity) && t.status !== "Resolved",
  ).length;

  const overdue = useMemo(() => {
    const now = Date.now();
    return tickets.filter((t) => {
      if (t.status === "Resolved") return false;
      const due = new Date(t.opened_at).getTime() + Number(t.sla_hours || 0) * 60 * 60 * 1000;
      return now > due;
    }).length;
  }, [tickets]);

  const visibleTickets = useMemo(() => {
    if (queueFilter === "All") return tickets;
    return tickets.filter((ticket) => (ticket.queue_type ?? "Support") === queueFilter);
  }, [tickets, queueFilter]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.signup_id || !form.title.trim()) return;

    setBusy(true);
    const signup = signupById(form.signup_id);

    const { error } = await supabase.from("support_tickets").insert({
      signup_id: form.signup_id,
      lead_id: signup?.lead_id ?? null,
      category: form.category,
      severity: form.severity,
      title: form.title.trim(),
      description: form.description.trim(),
      sla_hours: Number(form.sla_hours || 1),
      assigned_to_name: "Unassigned",
      handled_by_name: "Unassigned",
      last_updated_by_name: currentStaff,
      queue_type: "Support",
    });

    setBusy(false);

    if (error) {
      console.error("[support ticket insert]", error);
      alert(error.message);
      return;
    }

    setForm({ ...form, title: "", description: "" });
    await loadTickets();
  };

  const updateTicket = async (id: string, patch: Partial<Ticket>) => {
    const currentTicket = tickets.find((ticket) => ticket.id === id);

    const accountabilityPatch = {
      ...patch,
      last_updated_by_name: currentStaff,
    };

    const { error } = await supabase.from("support_tickets").update(accountabilityPatch).eq("id", id);
    if (error) {
      console.error("[support ticket update]", error);
      alert(error.message);
      return;
    }

    const activityRows = Object.entries(patch)
      .filter(([fieldName]) => fieldName !== "last_updated_by_name")
      .map(([fieldName, newValue]) => {
        const oldValue = currentTicket?.[fieldName as keyof Ticket];

        return {
          ticket_id: id,
          action_type: "field_updated",
          field_name: fieldName,
          old_value: oldValue === null || oldValue === undefined ? null : String(oldValue),
          new_value: newValue === null || newValue === undefined ? null : String(newValue),
          actor_name: currentStaff,
        };
      })
      .filter((row) => row.old_value !== row.new_value);

    if (activityRows.length > 0) {
      const { error: activityError } = await supabase
        .from("support_ticket_activity")
        .insert(activityRows);

      if (activityError) {
        console.error("[support ticket activity insert]", activityError);
      }
    }

    await loadTickets();
  };

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            4SPORT Sales Hub
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Support Queue
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Track client issues, SLA promises, staff ownership and operational risk.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-950/30">
          {visibleTickets.length} ticket{visibleTickets.length === 1 ? "" : "s"} shown
        </div>
      </div>

      {/* Guide */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-xl">
              🎧
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">How to use this page</h2>
              <p className="text-sm text-slate-600">
                Manage support tickets, SLA risk, queue ownership and handover notes.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Support guide
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="🚦"
            title="Watch SLA risk"
            text="Check open, high-risk and overdue tickets before starting new work."
          />

          <InfoBox
            icon="👤"
            title="Assign ownership"
            text="Set the queue, assigned staff and handled-by person so nobody loses the ticket."
          />

          <InfoBox
            icon="📝"
            title="Leave handover notes"
            text="Use internal notes and the activity timeline to keep staff aligned."
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStat icon={<Inbox className="h-5 w-5" />} label="Open" value={openCount} tone="info" />
        <MiniStat icon={<ShieldAlert className="h-5 w-5" />} label="High risk" value={highRisk} tone="danger" />
        <MiniStat icon={<Clock className="h-5 w-5" />} label="Overdue SLA" value={overdue} tone="warning" />
      </div>

      {/* Staff selector */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <UserCheck className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Current staff member</h2>
            <p className="text-sm text-slate-600">
              Changes below will be logged as updated by this staff member.
            </p>
          </div>
        </div>

        <select
          className={`${inp} max-w-xs`}
          value={currentStaff}
          onChange={(e) => setCurrentStaff(e.target.value)}
        >
          {STAFF_OPTIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </section>

      {/* Queue filter */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Filter className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Queue filter</h2>
            <p className="text-sm text-slate-600">
              Separate support, sales, billing and game-day operations.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUEUE_TYPES.map((queue) => (
            <button
              key={queue}
              type="button"
              onClick={() => setQueueFilter(queue)}
              className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                queueFilter === queue
                  ? "border-cyan-300 bg-cyan-400 text-slate-950 shadow-md shadow-cyan-950/20"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-cyan-200 hover:bg-cyan-50"
              }`}
            >
              {queue}
            </button>
          ))}
        </div>
      </section>

      {/* New support ticket */}
      <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25 md:grid-cols-2">
        <div className="md:col-span-2">
          <div className="mb-1 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
              <Plus className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Open support ticket</h2>
              <p className="text-sm text-slate-600">
                Create a manual ticket for a signed client or support package.
              </p>
            </div>
          </div>
        </div>

        <Lbl label="Client / signup">
          <select
            className={inp}
            required
            value={form.signup_id}
            onChange={(e) => setForm({ ...form, signup_id: e.target.value })}
          >
            <option value="">Select…</option>
            {state.signups.map((s) => (
              <option key={s.id} value={s.id}>
                {leadById(s.lead_id)?.org_name ?? "Unknown client"} · {s.support_package}
              </option>
            ))}
          </select>
        </Lbl>

        <Lbl label="Category">
          <select className={inp} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Lbl>

        <Lbl label="Severity">
          <select className={inp} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Lbl>

        <Lbl label="SLA hours">
          <input
            className={inp}
            type="number"
            min={0.25}
            step="0.25"
            value={form.sla_hours}
            onChange={(e) => setForm({ ...form, sla_hours: Number(e.target.value) || 1 })}
          />
        </Lbl>

        <Lbl label="Issue title" full>
          <input
            className={inp}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Cannot communicate match-day changes"
          />
        </Lbl>

        <Lbl label="Description" full>
          <textarea
            className={`${inp} min-h-24`}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Lbl>

        <div className="md:col-span-2">
          <button
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Open ticket"}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* Ticket queue */}
      {visibleTickets.length === 0 ? (
        <EmptyPanel icon="🎧" title="No support tickets in this queue." subtitle="Use the queue filter or open a new ticket." />
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <Headphones className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950">Ticket queue</h2>
                <p className="text-sm text-slate-600">
                  Showing {visibleTickets.length} ticket{visibleTickets.length === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {visibleTickets.map((t) => {
              const signup = signupById(t.signup_id);
              const lead = leadById(signup?.lead_id ?? t.lead_id);
              const opened = new Date(t.opened_at).getTime();
              const slaMs = Number(t.sla_hours || 0) * 60 * 60 * 1000;
              const due = opened + slaMs;
              const remainingMs = due - Date.now();

              const isOverdue = t.status !== "Resolved" && remainingMs < 0;

              const nearingBreach =
                t.status !== "Resolved" &&
                remainingMs > 0 &&
                remainingMs < 30 * 60 * 1000;

              const ageMinutes = Math.floor((Date.now() - opened) / 60000);

              let ageLabel = "";
              if (ageMinutes < 60) {
                ageLabel = `${ageMinutes} min open`;
              } else if (ageMinutes < 1440) {
                ageLabel = `${Math.floor(ageMinutes / 60)}h open`;
              } else {
                ageLabel = `${Math.floor(ageMinutes / 1440)}d open`;
              }

              let slaLabel = "";
              if (isOverdue) {
                slaLabel = "SLA BREACHED";
              } else if (nearingBreach) {
                slaLabel = "NEAR SLA LIMIT";
              } else {
                slaLabel = "WITHIN SLA";
              }

              return (
                <div key={t.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/15">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{t.title}</p>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Queue: {t.queue_type ?? "Support"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-600">
                        {lead?.org_name ?? "Unknown client"} · {t.category} · SLA {t.sla_hours}h
                      </p>

                      {t.description?.startsWith("WA:") && (
                        <p className="mt-2 rounded-2xl bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700">
                          WhatsApp origin detected · {t.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={severityTone(t.severity)}>{t.severity}</StatusBadge>
                      <StatusBadge
                        tone={
                          isOverdue
                            ? "danger"
                            : nearingBreach
                              ? "warning"
                              : t.status === "Resolved"
                                ? "success"
                                : "info"
                        }
                      >
                        {slaLabel}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-600">
                      {ageLabel}
                    </span>

                    <span
                      className={`rounded-full px-3 py-1 font-bold ${
                        isOverdue
                          ? "bg-red-50 text-red-700"
                          : nearingBreach
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {slaLabel}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs md:grid-cols-3">
                    <InfoLine label="Opened" value={formatDateTime(t.opened_at)} />
                    <InfoLine label="First response" value={formatDateTime(t.first_response_at)} />
                    <InfoLine label="Response time" value={getFirstResponseLabel(t)} />
                  </div>

                  {t.description && !t.description.startsWith("WA:") && (
                    <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
                      {t.description}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                    <TicketSelect
                      label="Queue"
                      value={t.queue_type ?? "Support"}
                      onChange={(value) => updateTicket(t.id, { queue_type: value } as Partial<Ticket>)}
                      options={QUEUE_TYPES.filter((queue) => queue !== "All")}
                    />

                    <TicketSelect
                      label="Assigned to"
                      value={t.assigned_to_name ?? "Unassigned"}
                      onChange={(value) => updateTicket(t.id, { assigned_to_name: value } as Partial<Ticket>)}
                      options={STAFF_OPTIONS}
                    />

                    <TicketSelect
                      label="Handled by"
                      value={t.handled_by_name ?? "Unassigned"}
                      onChange={(value) => updateTicket(t.id, { handled_by_name: value } as Partial<Ticket>)}
                      options={STAFF_OPTIONS}
                    />

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Last updated by
                      </span>
                      <p className="mt-2 text-xs font-semibold text-slate-950">
                        {t.last_updated_by_name ?? "System"}
                      </p>
                    </div>
                  </div>

                  <textarea
                    className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
                    placeholder="Internal notes / handover notes"
                    value={noteDrafts[t.id] ?? t.internal_notes ?? ""}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({
                        ...prev,
                        [t.id]: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      const nextNotes = noteDrafts[t.id] ?? "";
                      if (nextNotes !== (t.internal_notes ?? "")) {
                        void updateTicket(
                          t.id,
                          { internal_notes: nextNotes } as Partial<Ticket>,
                        );
                      }
                    }}
                  />

                  <div className="mt-4 flex flex-wrap gap-2">
                    <select
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                      value={t.status}
                      onChange={(e) => updateTicket(t.id, { status: e.target.value } as Partial<Ticket>)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        const patch: Partial<Ticket> = { status: "In Progress" };
                        if (!t.first_response_at) {
                          patch.first_response_at = nowIso();
                        }
                        void updateTicket(t.id, patch);
                      }}
                      className="rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700 transition hover:bg-cyan-100"
                    >
                      Mark first response
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateTicket(t.id, {
                          resolved_at: nowIso(),
                          status: "Resolved",
                          customer_happy: true,
                        } as Partial<Ticket>)
                      }
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      Resolve happy
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-cyan-600" />
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Ticket activity timeline
                      </p>
                    </div>

                    {(activitiesByTicket[t.id] ?? []).length === 0 ? (
                      <p className="text-xs text-slate-500">
                        No activity logged yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {(activitiesByTicket[t.id] ?? []).slice(0, 8).map((activity) => (
                          <div key={activity.id} className="rounded-2xl border border-slate-200 bg-white p-3 text-xs shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold text-slate-950">
                                {activity.field_name ?? activity.action_type}
                              </span>
                              <span className="text-slate-500">
                                {formatDateTime(activity.created_at)}
                              </span>
                            </div>
                            <p className="mt-1 text-slate-600">
                              {activity.actor_name ?? "System"} changed {activity.field_name ?? "ticket"} from{" "}
                              <span className="font-semibold text-slate-950">{activity.old_value ?? "blank"}</span> to{" "}
                              <span className="font-semibold text-slate-950">{activity.new_value ?? "blank"}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

const inp =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100";

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
  value: string | number;
  tone?: "info" | "warning" | "danger";
}) {
  const toneClass = {
    info: "bg-cyan-50 text-cyan-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
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

function Lbl({ label, children, full }: { label: string; children: ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <p className="mt-1 font-medium text-slate-950">{value}</p>
    </div>
  );
}

function TicketSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <select
        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

