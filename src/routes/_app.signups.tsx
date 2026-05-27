import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import {
  commissionAmount, commissionQualified,
  type CommissionPaymentStatus, type CommissionYear, type Signup,
} from "@/lib/types";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_app/signups")({ component: SignupsPage });

const YEARS: CommissionYear[] = ["1st year", "2nd consecutive year", "3rd consecutive year", "4th consecutive year", "5th year+"];
const STATUSES: CommissionPaymentStatus[] = ["Pending", "Approved", "Paid", "Rejected"];

function SignupsPage() {
  const { state, user, setState, addActivity, uid } = useStore();
  if (!user) return null;
  const isAdmin = user.role === "admin";
  const [showForm, setShowForm] = useState(false);

  const signups = useMemo(
    () => (isAdmin ? state.signups : state.signups.filter((s) => s.rep_id === user.id)),
    [state.signups, isAdmin, user.id],
  );

  const leadById = (id: string) => state.leads.find((l) => l.id === id);
  const repById = (id: string) => state.reps.find((r) => r.id === id);

  const totalQualified = signups.filter(commissionQualified).length;
  const totalAmount = signups.reduce((sum, s) => sum + commissionAmount(s), 0);
  const totalPaid = signups.filter((s) => s.commission_payment_status === "Paid").reduce((sum, s) => sum + commissionAmount(s), 0);

  const visibleLeads = isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === user.id);
  const initial: Omit<Signup, "id"> = {
    lead_id: visibleLeads[0]?.id ?? "",
    rep_id: user.id,
    signed_date: new Date().toISOString().slice(0, 10),
    paid: false,
    payment_date: null,
    active_teams: 0,
    paying_users_active: false,
    commission_year: "1st year",
    commission_payment_status: "Pending",
    admin_notes: "",
  };
  const [form, setForm] = useState(initial);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.lead_id) return;
    const s: Signup = {
      ...form, id: uid(),
      signed_date: new Date(form.signed_date).toISOString(),
      payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : null,
    };
    setState((st) => ({ ...st, signups: [s, ...st.signups] }));
    addActivity("Signup recorded", leadById(s.lead_id)?.org_name ?? "");
    setShowForm(false);
    setForm(initial);
  };

  const updateSignup = (id: string, patch: Partial<Signup>) => {
    setState((st) => ({ ...st, signups: st.signups.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));
  };

  return (
    <>
      <PageHeader
        title="Signups & commission"
        subtitle="Track signed schools and commission qualification."
        action={
          <button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            {showForm ? <><X className="h-4 w-4" /> Close</> : <><Plus className="h-4 w-4" /> New signup</>}
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="Signups" value={signups.length} />
        <Mini label="Qualified" value={totalQualified} />
        <Mini label="Commission" value={`R ${totalAmount.toLocaleString("en-ZA")}`} />
        <Mini label="Paid out" value={`R ${totalPaid.toLocaleString("en-ZA")}`} />
      </div>

      <div className="mb-6 rounded-xl border border-border bg-card/50 p-4 text-xs text-muted-foreground">
        <strong className="text-foreground">Qualification:</strong> R2,500 annual school licence paid · ≥ 3 active sport teams · paying athletes/users active.
        Commission per year: R500 / R300 / R200 / R100 / R50.
      </div>

      {showForm && (
        <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
          <Lbl label="School / club">
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
          <Lbl label="Signed date"><input className={inp} type="date" value={form.signed_date.slice(0, 10)} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} /></Lbl>
          <Lbl label="Payment date"><input className={inp} type="date" value={form.payment_date ? form.payment_date.slice(0, 10) : ""} onChange={(e) => setForm({ ...form, payment_date: e.target.value || null })} /></Lbl>
          <Lbl label="Active teams"><input className={inp} type="number" min={0} value={form.active_teams} onChange={(e) => setForm({ ...form, active_teams: parseInt(e.target.value) || 0 })} /></Lbl>
          <Lbl label="Commission year">
            <select className={inp} value={form.commission_year} onChange={(e) => setForm({ ...form, commission_year: e.target.value as CommissionYear })}>
              {YEARS.map((y) => <option key={y}>{y}</option>)}
            </select>
          </Lbl>
          <Lbl label="Paid">
            <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} /> R2,500 licence paid</label>
          </Lbl>
          <Lbl label="Paying users active">
            <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={form.paying_users_active} onChange={(e) => setForm({ ...form, paying_users_active: e.target.checked })} /> Athletes/users active</label>
          </Lbl>
          {isAdmin && (
            <Lbl label="Admin notes" full><textarea className={inp + " min-h-20"} value={form.admin_notes} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} /></Lbl>
          )}
          <div className="md:col-span-2">
            <button className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">Save signup</button>
          </div>
        </form>
      )}

      {signups.length === 0 ? (
        <EmptyState>No signups recorded yet.</EmptyState>
      ) : (
        <Section title="Signed schools">
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">School / Club</th>
                  {isAdmin && <th className="px-4 py-2 text-left">Rep</th>}
                  <th className="px-4 py-2 text-left">Signed</th>
                  <th className="px-4 py-2 text-left">Paid</th>
                  <th className="px-4 py-2 text-left">Teams</th>
                  <th className="px-4 py-2 text-left">Users</th>
                  <th className="px-4 py-2 text-left">Year</th>
                  <th className="px-4 py-2 text-left">Qualified</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {signups.map((s) => {
                  const q = commissionQualified(s);
                  return (
                    <tr key={s.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{leadById(s.lead_id)?.org_name ?? "—"}</td>
                      {isAdmin && <td className="px-4 py-3">{repById(s.rep_id)?.full_name ?? "—"}</td>}
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(s.signed_date).toLocaleDateString("en-ZA")}</td>
                      <td className="px-4 py-3">{s.paid ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{s.active_teams}</td>
                      <td className="px-4 py-3">{s.paying_users_active ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{s.commission_year}</td>
                      <td className="px-4 py-3"><StatusBadge tone={q ? "success" : "neutral"}>{q ? "Yes" : "No"}</StatusBadge></td>
                      <td className="px-4 py-3 text-right font-medium">R {commissionAmount(s).toLocaleString("en-ZA")}</td>
                      <td className="px-4 py-3">
                        {isAdmin ? (
                          <select
                            value={s.commission_payment_status}
                            onChange={(e) => updateSignup(s.id, { commission_payment_status: e.target.value as CommissionPaymentStatus })}
                            className="rounded border border-input bg-secondary px-2 py-1 text-xs"
                          >
                            {STATUSES.map((st) => <option key={st}>{st}</option>)}
                          </select>
                        ) : (
                          <StatusBadge tone={s.commission_payment_status === "Paid" ? "success" : "info"}>{s.commission_payment_status}</StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {signups.map((s) => {
              const q = commissionQualified(s);
              return (
                <li key={s.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{leadById(s.lead_id)?.org_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{isAdmin ? `${repById(s.rep_id)?.full_name} • ` : ""}{s.commission_year}</p>
                    </div>
                    <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Qualified" : "Not yet"}</StatusBadge>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-y-1 text-xs text-muted-foreground">
                    <span>Paid: {s.paid ? "Yes" : "No"}</span>
                    <span>Teams: {s.active_teams}</span>
                    <span>Users: {s.paying_users_active ? "Active" : "Not active"}</span>
                    <span className="font-medium text-foreground">R {commissionAmount(s).toLocaleString("en-ZA")}</span>
                  </div>
                  <div className="mt-2"><StatusBadge tone={s.commission_payment_status === "Paid" ? "success" : "info"}>{s.commission_payment_status}</StatusBadge></div>
                </li>
              );
            })}
          </ul>
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
