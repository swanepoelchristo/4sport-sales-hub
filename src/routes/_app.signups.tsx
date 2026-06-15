import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui-bits";
import {
  commissionAmount,
  commissionQualified,
  signupRiskLevel,
  type CommissionPaymentStatus,
  type CommissionYear,
  type Signup,
} from "@/lib/types";
import {
  Plus,
  X,
  BadgeDollarSign,
  Building2,
  CreditCard,
  ShieldAlert,
  Users,
  FileText,
  ArrowRight,
  WalletCards,
} from "lucide-react";

export const Route = createFileRoute("/_app/signups")({ component: SignupsPage });

const YEARS: CommissionYear[] = [
  "1st year",
  "2nd consecutive year",
  "3rd consecutive year",
  "4th consecutive year",
  "5th year+",
];

const STATUSES: CommissionPaymentStatus[] = ["Pending", "Approved", "Paid", "Rejected"];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-ZA");
}

function money(value: number) {
  return `R ${Number(value || 0).toLocaleString("en-ZA")}`;
}

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
  const totalPaid = signups
    .filter((s) => s.commission_payment_status === "Paid")
    .reduce((sum, s) => sum + commissionAmount(s), 0);
  const awaitingPayout = signups.filter(
    (s) => commissionQualified(s) && s.commission_payment_status !== "Paid",
  ).length;

  const visibleLeads = isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === user.id);

  const initial: Omit<Signup, "id"> = {
    lead_id: visibleLeads[0]?.id ?? "",
    rep_id: user.id,
    signed_date: new Date().toISOString().slice(0, 10),
    paid: false,
    payment_date: null,
    active_teams: 0,
    paying_users_active: false,

    deal_type: "School",

    base_price: 2500,
    quoted_price: 2500,
    final_agreed_price: 2500,

    contract_term: "12 months",
    pricing_notes: "",

    approval_required: false,
    approved_by: null,

    first_payment_received: false,

    support_package: "None",
    support_term_months: 0,
    support_response_sla: "",
    included_support_issues: 0,
    monthly_support_fee: 0,
    rep_support_commission_rate: 1.5,
    pain_point_notes: "",
    operational_risk_notes: "",

    risk_level: "LOW",
    risk_score: 0,
    support_tickets_used: 0,
    last_support_contact: null,

    commission_year: "1st year",
    commission_payment_status: "Pending",
    admin_notes: "",
  };

  const [form, setForm] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.lead_id) return;

    const s: Signup = {
      ...form,
      id: uid(),
      signed_date: new Date(form.signed_date).toISOString(),
      payment_date: form.payment_date ? new Date(form.payment_date).toISOString() : null,
    };

    setState((st) => ({ ...st, signups: [s, ...st.signups] }));
    addActivity("Signup recorded", leadById(s.lead_id)?.org_name ?? "");
    setShowForm(false);
    setForm(initial);
  };

  const updateSignup = (id: string, patch: Partial<Signup>) => {
    setState((st) => ({
      ...st,
      signups: st.signups.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
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
            Signups & commission
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Track signed schools, payments, support packages and commission qualification.
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
              New signup
            </>
          )}
        </button>
      </div>

      {/* Guide */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-xl">
              💰
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">How to use this page</h2>
              <p className="text-sm text-slate-600">
                Record signed deals and track when commission becomes payable.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Signups guide
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="🏫"
            title="Record signed schools"
            text="Use New signup when a school, club or organisation signs with 4SPORT."
          />

          <InfoBox
            icon="💳"
            title="Track payment"
            text="Mark the first payment received so the signup can move toward commission qualification."
          />

          <InfoBox
            icon="🏅"
            title="Check commission"
            text="Review qualified commission, payout status, support fees and operational risk."
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MiniStat icon={<Building2 className="h-5 w-5" />} label="Signups" value={signups.length} tone="info" />
        <MiniStat icon={<BadgeDollarSign className="h-5 w-5" />} label="Qualified" value={totalQualified} tone="success" />
        <MiniStat icon={<WalletCards className="h-5 w-5" />} label="Commission" value={money(totalAmount)} tone="warning" />
        <MiniStat icon={<CreditCard className="h-5 w-5" />} label="Paid out" value={money(totalPaid)} tone="success" />
        <MiniStat icon={<ShieldAlert className="h-5 w-5" />} label="Awaiting payout" value={awaitingPayout} tone="danger" />
      </div>

      {/* Pricing notice */}
      <div className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 shadow-xl shadow-cyan-950/20">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-sm">
            <FileText className="h-5 w-5" />
          </div>

          <div>
            <p className="font-semibold text-slate-950">Enterprise pricing enabled</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Pricing can be negotiated per school, club, federation or enterprise customer.
              Commission is based on confirmed signed deals and payment received.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={submit} className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25 md:grid-cols-2">
          <div className="md:col-span-2">
            <div className="mb-1 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <Plus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950">New signup</h2>
                <p className="text-sm text-slate-600">Create a signed-school record and commission tracker entry.</p>
              </div>
            </div>
          </div>

          <Lbl label="School / club">
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

          <Lbl label="Signed date">
            <input
              className={inp}
              type="date"
              value={form.signed_date.slice(0, 10)}
              onChange={(e) => setForm({ ...form, signed_date: e.target.value })}
            />
          </Lbl>

          <Lbl label="Payment date">
            <input
              className={inp}
              type="date"
              value={form.payment_date ? form.payment_date.slice(0, 10) : ""}
              onChange={(e) => setForm({ ...form, payment_date: e.target.value || null })}
            />
          </Lbl>

          <Lbl label="Active teams">
            <input
              className={inp}
              type="number"
              min={0}
              value={form.active_teams}
              onChange={(e) => setForm({ ...form, active_teams: Number(e.target.value) || 0 })}
              onBlur={() => setForm({ ...form, active_teams: Number(form.active_teams) || 0 })}
            />
          </Lbl>

          <Lbl label="Deal type">
            <select
              className={inp}
              value={form.deal_type}
              onChange={(e) => setForm({ ...form, deal_type: e.target.value })}
            >
              <option>School</option>
              <option>Club</option>
              <option>Academy</option>
              <option>Federation</option>
              <option>Provincial Union</option>
              <option>National Body</option>
              <option>Enterprise</option>
            </select>
          </Lbl>

          <Lbl label="Base price">
            <input
              className={inp}
              type="number"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: parseInt(e.target.value) || 0 })}
            />
          </Lbl>

          <Lbl label="Quoted price">
            <input
              className={inp}
              type="number"
              value={form.quoted_price}
              onChange={(e) => setForm({ ...form, quoted_price: parseInt(e.target.value) || 0 })}
            />
          </Lbl>

          <Lbl label="Final agreed price">
            <input
              className={inp}
              type="number"
              value={form.final_agreed_price}
              onChange={(e) =>
                setForm({
                  ...form,
                  final_agreed_price: parseInt(e.target.value) || 0,
                })
              }
            />
          </Lbl>

          <Lbl label="Contract term">
            <input
              className={inp}
              value={form.contract_term}
              onChange={(e) => setForm({ ...form, contract_term: e.target.value })}
            />
          </Lbl>

          <Lbl label="Pricing notes" full>
            <textarea
              className={`${inp} min-h-24`}
              value={form.pricing_notes}
              onChange={(e) => setForm({ ...form, pricing_notes: e.target.value })}
            />
          </Lbl>

          <Lbl label="Support package">
            <select
              className={inp}
              value={form.support_package}
              onChange={(e) => setForm({ ...form, support_package: e.target.value })}
            >
              <option>None</option>
              <option>Starter Assist</option>
              <option>Match Day Support</option>
              <option>Club Ops Support</option>
              <option>Federation Ops</option>
              <option>White Glove Ops</option>
              <option>Custom</option>
            </select>
          </Lbl>

          <Lbl label="Support term months">
            <input
              className={inp}
              type="number"
              min={0}
              value={form.support_term_months}
              onChange={(e) => setForm({ ...form, support_term_months: Number(e.target.value) || 0 })}
              onBlur={() => setForm({ ...form, support_term_months: Number(form.support_term_months) || 0 })}
            />
          </Lbl>

          <Lbl label="Response SLA">
            <input
              className={inp}
              placeholder="e.g. within 1 hour"
              value={form.support_response_sla}
              onChange={(e) => setForm({ ...form, support_response_sla: e.target.value })}
            />
          </Lbl>

          <Lbl label="Included issues">
            <input
              className={inp}
              type="number"
              min={0}
              value={form.included_support_issues}
              onChange={(e) => setForm({ ...form, included_support_issues: Number(e.target.value) || 0 })}
              onBlur={() =>
                setForm({
                  ...form,
                  included_support_issues: Number(form.included_support_issues) || 0,
                })
              }
            />
          </Lbl>

          <Lbl label="Monthly support fee">
            <input
              className={inp}
              type="number"
              min={0}
              value={form.monthly_support_fee}
              onChange={(e) => setForm({ ...form, monthly_support_fee: Number(e.target.value) || 0 })}
              onBlur={() => setForm({ ...form, monthly_support_fee: Number(form.monthly_support_fee) || 0 })}
            />
          </Lbl>

          <Lbl label="Rep support commission %">
            <input
              className={inp}
              type="number"
              min={0}
              step="0.1"
              value={form.rep_support_commission_rate}
              onChange={(e) => setForm({ ...form, rep_support_commission_rate: Number(e.target.value) || 0 })}
            />
          </Lbl>

          <Lbl label="Customer pain points" full>
            <textarea
              className={`${inp} min-h-24`}
              placeholder="What problem are we solving for this club/school?"
              value={form.pain_point_notes}
              onChange={(e) => setForm({ ...form, pain_point_notes: e.target.value })}
            />
          </Lbl>

          <Lbl label="Support tickets used">
            <input
              className={inp}
              type="number"
              min={0}
              value={form.support_tickets_used}
              onChange={(e) => setForm({ ...form, support_tickets_used: Number(e.target.value) || 0 })}
            />
          </Lbl>

          <Lbl label="Manual risk score">
            <input
              className={inp}
              type="number"
              min={0}
              max={100}
              value={form.risk_score}
              onChange={(e) => setForm({ ...form, risk_score: Number(e.target.value) || 0 })}
            />
          </Lbl>

          <Lbl label="Operational risk notes" full>
            <textarea
              className={`${inp} min-h-24`}
              placeholder="Where could they blame the app? What support must we promise?"
              value={form.operational_risk_notes}
              onChange={(e) => setForm({ ...form, operational_risk_notes: e.target.value })}
            />
          </Lbl>

          <Lbl label="Commission year">
            <select
              className={inp}
              value={form.commission_year}
              onChange={(e) => setForm({ ...form, commission_year: e.target.value as CommissionYear })}
            >
              {YEARS.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </Lbl>

          <Lbl label="Paid">
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.first_payment_received}
                onChange={(e) =>
                  setForm({
                    ...form,
                    first_payment_received: e.target.checked,
                    paid: e.target.checked,
                  })
                }
              />
              First payment received
            </label>
          </Lbl>

          <Lbl label="Paying users active">
            <label className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={form.paying_users_active}
                onChange={(e) => setForm({ ...form, paying_users_active: e.target.checked })}
              />
              Athletes/users active
            </label>
          </Lbl>

          {isAdmin && (
            <Lbl label="Admin notes" full>
              <textarea
                className={`${inp} min-h-24`}
                value={form.admin_notes}
                onChange={(e) => setForm({ ...form, admin_notes: e.target.value })}
              />
            </Lbl>
          )}

          <div className="md:col-span-2">
            <button className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/20 transition hover:bg-cyan-300">
              Save signup
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      )}

      {/* Signed schools */}
      {signups.length === 0 ? (
        <EmptyPanel icon="🏫" title="No signups recorded yet." subtitle="Click New signup to create the first record." />
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                <Building2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-slate-950">Signed schools</h2>
                <p className="text-sm text-slate-600">
                  Showing {signups.length} signup{signups.length === 1 ? "" : "s"}.
                </p>
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
            <table className="min-w-[1180px] w-full text-sm text-slate-800">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">School / Club</th>
                  {isAdmin && <th className="px-4 py-3 text-left">Rep</th>}
                  <th className="px-4 py-3 text-left">Signed</th>
                  <th className="px-4 py-3 text-left">Paid</th>
                  <th className="px-4 py-3 text-left">Teams</th>
                  <th className="px-4 py-3 text-left">Users</th>
                  <th className="px-4 py-3 text-left">Year</th>
                  <th className="px-4 py-3 text-left">Support</th>
                  <th className="px-4 py-3 text-right">Support Fee</th>
                  <th className="px-4 py-3 text-left">Risk</th>
                  <th className="px-4 py-3 text-left">Qualified</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>

              <tbody>
                {signups.map((s) => {
                  const q = commissionQualified(s);

                  return (
                    <tr key={s.id} className="border-t border-slate-200 transition hover:bg-cyan-50/40">
                      <td className="px-4 py-4 font-semibold text-slate-950">
                        {leadById(s.lead_id)?.org_name ?? "—"}
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-4">
                          {repById(s.rep_id)?.full_name ?? "—"}
                        </td>
                      )}

                      <td className="whitespace-nowrap px-4 py-4">{fmtDate(s.signed_date)}</td>
                      <td className="px-4 py-4">{s.paid ? "Yes" : "No"}</td>
                      <td className="px-4 py-4">{s.active_teams}</td>
                      <td className="px-4 py-4">{s.paying_users_active ? "Yes" : "No"}</td>
                      <td className="px-4 py-4">{s.commission_year}</td>
                      <td className="px-4 py-4">{s.support_package}</td>
                      <td className="px-4 py-4 text-right">{money(Number(s.monthly_support_fee || 0))}</td>
                      <td className="px-4 py-4">
                        <RiskBadge level={signupRiskLevel(s)} />
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Yes" : "No"}</StatusBadge>
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-slate-950">
                        {money(commissionAmount(s))}
                      </td>
                      <td className="px-4 py-4">
                        {isAdmin ? (
                          <select
                            value={s.commission_payment_status}
                            onChange={(e) =>
                              updateSignup(s.id, {
                                commission_payment_status: e.target.value as CommissionPaymentStatus,
                              })
                            }
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
                          >
                            {STATUSES.map((st) => (
                              <option key={st}>{st}</option>
                            ))}
                          </select>
                        ) : (
                          <StatusBadge tone={s.commission_payment_status === "Paid" ? "success" : "info"}>
                            {s.commission_payment_status}
                          </StatusBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 md:hidden">
            {signups.map((s) => {
              const q = commissionQualified(s);

              return (
                <li key={s.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{leadById(s.lead_id)?.org_name ?? "—"}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {isAdmin ? `${repById(s.rep_id)?.full_name} • ` : ""}
                        {s.commission_year}
                      </p>
                    </div>

                    <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Qualified" : "Not yet"}</StatusBadge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                    <span>Paid: {s.paid ? "Yes" : "No"}</span>
                    <span>Teams: {s.active_teams}</span>
                    <span>Users: {s.paying_users_active ? "Active" : "Not active"}</span>
                    <span>Support: {s.support_package}</span>
                    <span>Support fee: {money(Number(s.monthly_support_fee || 0))}</span>
                    <span className="font-semibold text-slate-950">{money(commissionAmount(s))}</span>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <RiskBadge level={signupRiskLevel(s)} />
                    <StatusBadge tone={s.commission_payment_status === "Paid" ? "success" : "info"}>
                      {s.commission_payment_status}
                    </StatusBadge>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
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
  value: string | number;
  tone?: "info" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    info: "bg-cyan-50 text-cyan-600",
    success: "bg-emerald-50 text-emerald-600",
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

function RiskBadge({ level }: { level: "LOW" | "MEDIUM" | "HIGH" }) {
  const cls =
    level === "HIGH"
      ? "border-red-200 bg-red-50 text-red-700"
      : level === "MEDIUM"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {level}
    </span>
  );
}
