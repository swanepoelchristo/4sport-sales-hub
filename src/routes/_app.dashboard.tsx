import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Section, EmptyState, StatusBadge } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import { commissionQualified, commissionAmount } from "@/lib/types";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const { state, user } = useStore();
  if (!user) return null;

  const isAdmin = user.role === "admin";

  // Scope data by role — DO NOT CHANGE LOGIC
  const leads = useMemo(
    () => (isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === user.id)),
    [state.leads, isAdmin, user.id],
  );

  const meetings = useMemo(
    () => (isAdmin ? state.meetings : state.meetings.filter((m) => m.rep_id === user.id)),
    [state.meetings, isAdmin, user.id],
  );

  const signups = useMemo(
    () => (isAdmin ? state.signups : state.signups.filter((s) => s.rep_id === user.id)),
    [state.signups, isAdmin, user.id],
  );

  const repsActive = state.reps.filter((r) => r.active).length;
  const signedSchools = leads.filter((l) => ["Signed", "Paid", "Active"].includes(l.status)).length;
  const paidSchools = signups.filter((s) => s.paid).length;
  const qualified = signups.filter(commissionQualified).length;
  const scheduled = meetings.filter((m) => m.status === "Scheduled").length;
  const completed = meetings.filter((m) => m.status === "Completed").length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcoming = [...meetings]
    .filter((m) => m.status === "Scheduled" && new Date(m.meeting_at) >= today)
    .sort((a, b) => +new Date(a.meeting_at) - +new Date(b.meeting_at))
    .slice(0, 6);

  const followUps = leads
    .filter((l) => l.next_follow_up && new Date(l.next_follow_up) >= today)
    .sort((a, b) => +new Date(a.next_follow_up!) - +new Date(b.next_follow_up!))
    .slice(0, 6);

  // === Notifications ===
  const followUpsDueToday = leads.filter((l) => {
    if (!l.next_follow_up) return false;
    const d = new Date(l.next_follow_up);
    return d >= today && d < tomorrow;
  }).length;

  const overdueMeetings = meetings.filter(
    (m) => m.status === "Scheduled" && new Date(m.meeting_at) < today,
  ).length;

  const awaitingPayment = signups.filter((s) => !s.paid).length;

  const commissionAwaitingPayout = signups.filter(
    (s) => commissionQualified(s) && s.commission_payment_status !== "Paid",
  ).length;

  const leadById = (id: string) => state.leads.find((l) => l.id === id);
  const repById = (id: string) => state.reps.find((r) => r.id === id);

  const totalCommission = signups.reduce((sum, s) => sum + commissionAmount(s), 0);

  return (
    <div className="dashboard-light-workspace space-y-6 [&_.bg-card]:!bg-white [&_.bg-card\\/40]:!bg-white [&_.bg-secondary]:!bg-slate-100 [&_.border-border]:!border-slate-200 [&_.text-muted-foreground]:!text-slate-600 [&_.text-foreground]:!text-slate-900 [&_p]:!text-slate-700 [&_li]:!text-slate-700 [&_input]:!bg-white [&_textarea]:!bg-white [&_table]:!text-slate-800 [&_thead]:!bg-slate-100">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300/80">
            4SPORT Sales Hub
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-wide text-white md:text-4xl">
            {isAdmin ? "Admin Dashboard" : `Welcome back, ${user.full_name.split(" ")[0]}! 👋`}
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            {isAdmin
              ? "Full visibility across reps, leads and commissions."
              : "Here’s what’s happening with your pipeline today."}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-950/20">
          Today, {new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/25">
        <HowToUse title="How to use this page" adminOnly={isAdmin} defaultOpen>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">What this page is for</p>
              <p className="mt-2 text-sm text-slate-600">
                A quick snapshot of {isAdmin ? "the whole team's" : "your"} pipeline —
                notifications, KPIs, upcoming meetings and follow-ups.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">What to do here</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-600">
                <li>Check notification tiles for anything needing action today.</li>
                <li>Open upcoming meetings and follow-ups to plan your day.</li>
                {isAdmin && <li>Review rep activity and commission status.</li>}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Before moving on</p>
              <p className="mt-2 text-sm text-slate-600">
                Clear overdue meetings and follow-ups due today.
              </p>
            </div>
          </div>
        </HowToUse>
      </div>

      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-1">
        <HowToUse title="Getting started">
          <ol>
            <li>Add or review leads</li>
            <li>Schedule meetings</li>
            <li>Log completed visits</li>
            <li>Mark signed schools</li>
            <li>Track payment and commission status</li>
          </ol>
        </HowToUse>
      </div>

      {/* Notifications strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NotifTile to="/leads" label="Follow-ups due today" value={followUpsDueToday} tone="warning" />
        <NotifTile to="/meetings" label="Meetings overdue" value={overdueMeetings} tone="danger" />
        <NotifTile to="/signups" label="Awaiting payment" value={awaitingPayment} tone="info" />
        <NotifTile to="/signups" label="Commission to pay out" value={commissionAwaitingPayout} tone="success" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <DashboardKpi label="Total leads" value={leads.length} tone="info" />
        <DashboardKpi label="Meetings scheduled" value={scheduled} tone="accent" />
        <DashboardKpi label="Meetings completed" value={completed} tone="success" />
        <DashboardKpi label="Schools signed" value={signedSchools} tone="success" />
        <DashboardKpi label="Paid schools" value={paidSchools} tone="success" />
        <DashboardKpi
          label="Commission qualified"
          value={qualified}
          tone="warning"
          hint={`R ${totalCommission.toLocaleString("en-ZA")}`}
        />
        {isAdmin && <DashboardKpi label="Active reps" value={repsActive} tone="info" />}
        <DashboardKpi label="Follow-ups due" value={followUps.length} tone="warning" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section
          title="Upcoming meetings"
          action={<Link to="/meetings" className="text-xs font-semibold uppercase text-cyan-300">View all</Link>}
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
            {upcoming.length === 0 ? (
              <EmptyState>No upcoming meetings scheduled.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((m) => {
                  const lead = leadById(m.lead_id);
                  const rep = repById(m.rep_id);
                  return (
                    <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{lead?.org_name ?? "Unknown lead"}</p>
                          <p className="text-xs text-slate-600">
                            {fmtDT(m.meeting_at)} • {m.meeting_type}
                            {isAdmin && rep && <> • {rep.full_name}</>}
                          </p>
                        </div>
                        <StatusBadge tone="info">{m.status}</StatusBadge>
                      </div>
                      {m.next_action && (
                        <p className="mt-2 text-xs text-slate-600">Next: {m.next_action}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Section>

        <Section
          title="Follow-ups due"
          action={<Link to="/leads" className="text-xs font-semibold uppercase text-cyan-300">View leads</Link>}
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
            {followUps.length === 0 ? (
              <EmptyState>No follow-ups scheduled.</EmptyState>
            ) : (
              <ul className="space-y-2">
                {followUps.map((l) => {
                  const rep = repById(l.assigned_rep_id);
                  return (
                    <li key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-900">{l.org_name}</p>
                          <p className="text-xs text-slate-600">
                            {l.city}, {l.province} • {l.sport_focus}
                            {isAdmin && rep && <> • {rep.full_name}</>}
                          </p>
                        </div>
                        <StatusBadge tone="warning">{fmtDate(l.next_follow_up)}</StatusBadge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Section>
      </div>

      {isAdmin && (
        <Section title="Commission tracker">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-cyan-950/20">
            <div className="hidden md:block">
              <table className="w-full text-sm text-slate-800">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left">School / Club</th>
                    <th className="px-4 py-3 text-left">Rep</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Paid</th>
                    <th className="px-4 py-3 text-left">Teams</th>
                    <th className="px-4 py-3 text-left">Qualified</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => {
                    const lead = leadById(s.lead_id);
                    const rep = repById(s.rep_id);
                    const q = commissionQualified(s);
                    return (
                      <tr key={s.id} className="border-t border-slate-200">
                        <td className="px-4 py-3 font-semibold text-slate-900">{lead?.org_name ?? "—"}</td>
                        <td className="px-4 py-3">{rep?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">{s.commission_year}</td>
                        <td className="px-4 py-3">{s.paid ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{s.active_teams}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Yes" : "No"}</StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          R {commissionAmount(s).toLocaleString("en-ZA")}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={s.commission_payment_status === "Paid" ? "success" : "info"}>
                            {s.commission_payment_status}
                          </StatusBadge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-200 md:hidden">
              {signups.map((s) => {
                const lead = leadById(s.lead_id);
                const rep = repById(s.rep_id);
                const q = commissionQualified(s);
                return (
                  <li key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-slate-900">{lead?.org_name ?? "—"}</p>
                        <p className="text-xs text-slate-600">{rep?.full_name} • {s.commission_year}</p>
                      </div>
                      <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Qualified" : "Not yet"}</StatusBadge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                      <span>Teams: {s.active_teams} • Paid: {s.paid ? "Yes" : "No"}</span>
                      <span className="font-semibold text-slate-900">
                        R {commissionAmount(s).toLocaleString("en-ZA")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      )}
    </div>
  );
}

function DashboardKpi({
  label,
  value,
  hint,
  tone = "info",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "info" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    info: "text-cyan-600 bg-cyan-50 border-cyan-100",
    accent: "text-blue-600 bg-blue-50 border-blue-100",
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    danger: "text-red-600 bg-red-50 border-red-100",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-xl">
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>
        <span className="text-lg">●</span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-slate-600">{hint}</p>}
    </div>
  );
}

function NotifTile({
  to,
  label,
  value,
  tone,
}: {
  to: string;
  label: string;
  value: number;
  tone: "warning" | "danger" | "info" | "success";
}) {
  const toneClass = {
    warning: "text-amber-600 bg-amber-50 border-amber-100",
    danger: "text-red-600 bg-red-50 border-red-100",
    info: "text-cyan-600 bg-cyan-50 border-cyan-100",
    success: "text-emerald-600 bg-emerald-50 border-emerald-100",
  }[tone];

  return (
    <Link
      to={to}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-xl"
    >
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${toneClass}`}>
        <span className="text-lg">●</span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{value}</p>
    </Link>
  );
}
