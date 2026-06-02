import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import { useStore } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

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

const CATEGORIES = ["General", "Match Day Ops", "Login/Auth", "Team Setup", "Communication", "Training", "Billing", "Other"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["Open", "In Progress", "Resolved"];
const STAFF_OPTIONS = ["Unassigned", "Christo", "Mariaan", "Support 1", "Game Day Ops"];

function SupportPage() {
  const { state, user } = useStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [activitiesByTicket, setActivitiesByTicket] = useState<Record<string, TicketActivity[]>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [currentStaff, setCurrentStaff] = useState("Christo");
  const [form, setForm] = useState({
    signup_id: state.signups[0]?.id ?? "",
    category: "General",
    severity: "MEDIUM",
    title: "",
    description: "",
    sla_hours: 1,
  });

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
  const highRisk = tickets.filter((t) => ["HIGH", "CRITICAL"].includes(t.severity) && t.status !== "Resolved").length;
  const overdue = useMemo(() => {
    const now = Date.now();
    return tickets.filter((t) => {
      if (t.status === "Resolved") return false;
      const due = new Date(t.opened_at).getTime() + Number(t.sla_hours || 0) * 60 * 60 * 1000;
      return now > due;
    }).length;
  }, [tickets]);

  const submit = async (e: React.FormEvent) => {
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
    <>
      <PageHeader
        title="Support Queue"
        subtitle="Track client issues, SLA promises and operational risk."
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Mini label="Open" value={openCount} />
        <Mini label="High risk" value={highRisk} />
        <Mini label="Overdue SLA" value={overdue} />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card p-4">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Current staff member
          </span>
          <select
            className={inp + " mt-1 max-w-xs"}
            value={currentStaff}
            onChange={(e) => setCurrentStaff(e.target.value)}
          >
            {STAFF_OPTIONS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-2 text-xs text-muted-foreground">
          Changes made below will be logged as updated by this staff member.
        </p>
      </div>

      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <Lbl label="Client / signup">
          <select className={inp} required value={form.signup_id} onChange={(e) => setForm({ ...form, signup_id: e.target.value })}>
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
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Lbl>

        <Lbl label="Severity">
          <select className={inp} value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
            {SEVERITIES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Lbl>

        <Lbl label="SLA hours">
          <input className={inp} type="number" min={0.25} step="0.25" value={form.sla_hours} onChange={(e) => setForm({ ...form, sla_hours: Number(e.target.value) || 1 })} />
        </Lbl>

        <Lbl label="Issue title" full>
          <input className={inp} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Cannot communicate match-day changes" />
        </Lbl>

        <Lbl label="Description" full>
          <textarea className={inp + " min-h-20"} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </Lbl>

        <div className="md:col-span-2">
          <button disabled={busy} className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
            {busy ? "Saving…" : "Open ticket"}
          </button>
        </div>
      </form>

      {tickets.length === 0 ? (
        <EmptyState>No support tickets yet.</EmptyState>
      ) : (
        <Section title="Ticket queue">
          <div className="space-y-3">
            {tickets.map((t) => {
              const signup = signupById(t.signup_id);
              const lead = leadById(signup?.lead_id ?? t.lead_id);
              const opened = new Date(t.opened_at).getTime();
              const slaMs = Number(t.sla_hours || 0) * 60 * 60 * 1000;
              const due = opened + slaMs;
              const remainingMs = due - Date.now();

              const isOverdue =
                t.status !== "Resolved" && remainingMs < 0;

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
                <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{lead?.org_name ?? "Unknown client"} · {t.category} · SLA {t.sla_hours}h</p>
                      {t.description?.startsWith("WA:") && (
                        <p className="mt-1 text-xs text-cyan-400">
                          WhatsApp origin detected · {t.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={t.severity === "CRITICAL" || t.severity === "HIGH" ? "danger" : t.severity === "MEDIUM" ? "warning" : "success"}>{t.severity}</StatusBadge>
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

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border px-2 py-1">
                      {ageLabel}
                    </span>

                    <span className={`rounded-full px-2 py-1 ${
                      isOverdue
                        ? "bg-red-500/20 text-red-300"
                        : nearingBreach
                        ? "bg-yellow-500/20 text-yellow-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    }`}>
                      {slaLabel}
                    </span>
                  </div>

                  {t.description && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      {t.description}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 rounded-lg border border-border bg-secondary/40 p-3 md:grid-cols-3">
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Assigned to
                      </span>
                      <select
                        className="mt-1 w-full rounded border border-input bg-secondary px-2 py-2 text-xs"
                        value={t.assigned_to_name ?? "Unassigned"}
                        onChange={(e) =>
                          updateTicket(
                            t.id,
                            { assigned_to_name: e.target.value } as Partial<Ticket>
                          )
                        }
                      >
                        {STAFF_OPTIONS.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Handled by
                      </span>
                      <select
                        className="mt-1 w-full rounded border border-input bg-secondary px-2 py-2 text-xs"
                        value={t.handled_by_name ?? "Unassigned"}
                        onChange={(e) =>
                          updateTicket(
                            t.id,
                            { handled_by_name: e.target.value } as Partial<Ticket>
                          )
                        }
                      >
                        {STAFF_OPTIONS.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Last updated by
                      </span>
                      <p className="mt-2 text-xs">
                        {t.last_updated_by_name ?? "System"}
                      </p>
                    </div>
                  </div>

                  <textarea
                    className="mt-3 w-full rounded border border-input bg-secondary px-3 py-2 text-sm"
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
                          { internal_notes: nextNotes } as Partial<Ticket>
                        );
                      }
                    }}
                  />

                  <div className="mt-3 flex flex-wrap gap-2">
                    <select className="rounded border border-input bg-secondary px-2 py-1 text-xs" value={t.status} onChange={(e) => updateTicket(t.id, { status: e.target.value } as Partial<Ticket>)}>
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>

                    <button type="button" onClick={() => updateTicket(t.id, { first_response_at: new Date().toISOString(), status: "In Progress" } as Partial<Ticket>)} className="rounded border border-border px-3 py-1 text-xs">
                      Mark first response
                    </button>

                    <button type="button" onClick={() => updateTicket(t.id, { resolved_at: new Date().toISOString(), status: "Resolved", customer_happy: true } as Partial<Ticket>)} className="rounded border border-border px-3 py-1 text-xs">
                      Resolve happy
                    </button>
                  </div>

                  <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      Ticket activity timeline
                    </p>

                    {(activitiesByTicket[t.id] ?? []).length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        No activity logged yet.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {(activitiesByTicket[t.id] ?? []).slice(0, 8).map((activity) => (
                          <div key={activity.id} className="rounded border border-border bg-card/50 p-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-semibold">
                                {activity.field_name ?? activity.action_type}
                              </span>
                              <span className="text-muted-foreground">
                                {new Date(activity.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="mt-1 text-muted-foreground">
                              {activity.actor_name ?? "System"} changed {activity.field_name ?? "ticket"} from{" "}
                              <span className="text-foreground">{activity.old_value ?? "blank"}</span> to{" "}
                              <span className="text-foreground">{activity.new_value ?? "blank"}</span>
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
        </Section>
      )}
    </>
  );
}

function Mini({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl text-primary">{value}</p>
    </div>
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
