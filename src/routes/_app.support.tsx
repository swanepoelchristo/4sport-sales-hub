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
};

const CATEGORIES = ["General", "Match Day Ops", "Login/Auth", "Team Setup", "Communication", "Training", "Billing", "Other"];
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const STATUSES = ["Open", "In Progress", "Resolved"];

function SupportPage() {
  const { state, user } = useStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [busy, setBusy] = useState(false);
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

    if (error) console.error("[support tickets load]", error);
    else setTickets((data ?? []) as Ticket[]);
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
    const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
    if (error) {
      console.error("[support ticket update]", error);
      alert(error.message);
      return;
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
              const isOverdue = t.status !== "Resolved" && Date.now() > new Date(t.opened_at).getTime() + Number(t.sla_hours || 0) * 60 * 60 * 1000;

              return (
                <div key={t.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{lead?.org_name ?? "Unknown client"} · {t.category} · SLA {t.sla_hours}h</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge tone={t.severity === "CRITICAL" || t.severity === "HIGH" ? "danger" : t.severity === "MEDIUM" ? "warning" : "success"}>{t.severity}</StatusBadge>
                      <StatusBadge tone={isOverdue ? "danger" : t.status === "Resolved" ? "success" : "info"}>{isOverdue ? "SLA OVERDUE" : t.status}</StatusBadge>
                    </div>
                  </div>

                  {t.description && <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>}

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
