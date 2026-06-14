import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { EmptyState, StatusBadge } from "@/components/ui-bits";
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

function displayFirstName(fullName: string) {
  const clean = String(fullName || "").trim();

  if (!clean) return "Christo";
  if (clean.toLowerCase().includes("swanepoelchristo")) return "Christo";
  if (clean.includes("@")) return "Christo";

  return clean.split(" ")[0] || "Christo";
}

function Dashboard() {
  const { state, user } = useStore();
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const firstName = displayFirstName(user.full_name);

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

  const supportTickets = useMemo(
    () =>
      isAdmin
        ? (state.supportTickets ?? [])
        : (state.supportTickets ?? []).filter((t) => t.rep_id === user.id),
    [state.supportTickets, isAdmin, user.id],
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

  const openSupportTickets = supportTickets.filter((t) => t.status !== "Resolved").length;

  const highRiskTickets = supportTickets.filter(
    (t) => t.severity === "HIGH" || t.severity === "CRITICAL",
  ).length;

  const overdueSlaTickets = supportTickets.filter((t) => {
    if (t.status === "Resolved") return false;
    const created = new Date(t.created_at).getTime();
    const sla = Number(t.sla_hours || 0) * 60 * 60 * 1000;
    return Date.now() > created + sla;
  }).length;

  const leadById = (id: string) => state.leads.find((l) => l.id === id);
  const repById = (id: string) => state.reps.find((r) => r.id === id);

  const totalCommission = signups.reduce((sum, s) => sum + commissionAmount(s), 0);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-2 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            4SPORT Sales Hub
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {isAdmin ? "Admin Dashboard" : `Welcome back, ${firstName}! 👋`}
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            {isAdmin
              ? "Full visibility across reps, leads, tickets and commissions."
              : "Here’s what’s happening with your pipeline today."}
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-950/30">
          Today,{" "}
          {new Date().toLocaleDateString("en-ZA", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </div>
      </div>

      {/* How-to card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-xl">
              💡
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-950">How to use this page</h2>
              <p className="text-sm text-slate-600">
                Your quick snapshot of pipeline, activity and what needs attention.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Dashboard guide
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="📋"
            title="What this page is for"
            text={`A quick snapshot of ${isAdmin ? "the whole team's" : "your"} pipeline — notifications, KPIs, upcoming meetings and follow-ups.`}
          />

          <InfoBox
            icon="🔔"
            title="What to do here"
            text="Check the tiles for anything that needs action today, then open meetings and follow-ups to plan your day."
          />

          <InfoBox
            icon="🎯"
            title="Before moving on"
            text="Clear overdue meetings, follow-ups and urgent support items before starting new work."
          />
        </div>
      </div>

      {/* Alert / notification tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <NotifTile icon="📅" to="/leads" label="Follow-ups due today" value={followUpsDueToday} tone="warning" />
        <NotifTile icon="⏰" to="/meetings" label="Meetings overdue" value={overdueMeetings} tone="danger" />
        <NotifTile icon="💳" to="/signups" label="Awaiting payment" value={awaitingPayment} tone="info" />
        <NotifTile icon="👥" to="/signups" label="Commission to pay out" value={commissionAwaitingPayout} tone="success" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpi icon="🎧" label="Open support" value={openSupportTickets} tone="info" hint="Clients awaiting response" />
        <DashboardKpi icon="⚠️" label="High risk tickets" value={highRiskTickets} tone="warning" hint="At risk of SLA breach" />
        <DashboardKpi icon="🔒" label="SLA breaches" value={overdueSlaTickets} tone="danger" hint="Past due SLA promises" />
        <DashboardKpi icon="🧲" label="Total leads" value={leads.length} tone="info" hint="Active pipeline" />

        <DashboardKpi icon="🗓️" label="Meetings scheduled" value={scheduled} tone="accent" />
        <DashboardKpi icon="✅" label="Meetings completed" value={completed} tone="success" />
        <DashboardKpi icon="🏫" label="Schools signed" value={signedSchools} tone="success" />
        <DashboardKpi icon="💰" label="Paid schools" value={paidSchools} tone="success" />

        <DashboardKpi
          icon="🏅"
          label="Commission qualified"
          value={qualified}
          tone="warning"
          hint={`R ${totalCommission.toLocaleString("en-ZA")}`}
        />

        <DashboardKpi icon="📌" label="Follow-ups due" value={followUps.length} tone="warning" />
        {isAdmin && <DashboardKpi icon="🧑‍💼" label="Active reps" value={repsActive} tone="accent" />}
      </div>

      {/* Work panels */}
      <div className="grid gap-6 lg:grid-cols-2">
        <WorkPanel
          title="Upcoming Meetings"
          icon="🗓️"
          action={<Link to="/meetings" className="text-xs font-bold uppercase tracking-wider text-cyan-600">View all</Link>}
        >
          {upcoming.length === 0 ? (
            <EmptyState>No upcoming meetings scheduled.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((m) => {
                const lead = leadById(m.lead_id);
                const rep = repById(m.rep_id);

                return (
                  <li key={m.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{lead?.org_name ?? "Unknown lead"}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {fmtDT(m.meeting_at)} • {m.meeting_type}
                          {isAdmin && rep && <> • {rep.full_name}</>}
                        </p>
                      </div>

                      <StatusBadge tone="info">{m.status}</StatusBadge>
                    </div>

                    {m.next_action && (
                      <p className="mt-3 rounded-xl bg-cyan-50 px-3 py-2 text-xs font-medium text-cyan-700">
                        Next: {m.next_action}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </WorkPanel>

        <WorkPanel
          title="Follow-ups Due"
          icon="✉️"
          action={<Link to="/leads" className="text-xs font-bold uppercase tracking-wider text-cyan-600">View leads</Link>}
        >
          {followUps.length === 0 ? (
            <EmptyState>No follow-ups scheduled.</EmptyState>
          ) : (
            <ul className="space-y-3">
              {followUps.map((l) => {
                const rep = repById(l.assigned_rep_id);

                return (
                  <li key={l.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{l.org_name}</p>
                        <p className="mt-1 text-xs text-slate-600">
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
        </WorkPanel>
      </div>

      {/* Admin commission tracker */}
      {isAdmin && (
        <WorkPanel title="Commission tracker" icon="💼">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
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
                        <td className="px-4 py-3 font-semibold text-slate-950">{lead?.org_name ?? "—"}</td>
                        <td className="px-4 py-3">{rep?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">{s.commission_year}</td>
                        <td className="px-4 py-3">{s.paid ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{s.active_teams}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Yes" : "No"}</StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-950">
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{lead?.org_name ?? "—"}</p>
                        <p className="mt-1 text-xs text-slate-600">{rep?.full_name} • {s.commission_year}</p>
                      </div>

                      <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Qualified" : "Not yet"}</StatusBadge>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                      <span>Teams: {s.active_teams} • Paid: {s.paid ? "Yes" : "No"}</span>
                      <span className="font-semibold text-slate-950">
                        R {commissionAmount(s).toLocaleString("en-ZA")}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </WorkPanel>
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

function WorkPanel({
  title,
  icon,
  action,
  children,
}: {
  title: string;
  icon: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-xl">
            {icon}
          </div>

          <h2 className="font-display text-lg font-semibold text-slate-950">{title}</h2>
        </div>

        {action}
      </div>

      {children}
    </section>
  );
}

function DashboardKpi({
  icon,
  label,
  value,
  hint,
  tone = "info",
}: {
  icon: string;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "info" | "accent" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    info: "bg-cyan-50 text-cyan-600",
    accent: "bg-blue-50 text-blue-600",
    success: "bg-emerald-50 text-emerald-600",
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-2xl">
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${toneClass}`}>
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-slate-500">{hint}</p>}
    </div>
  );
}

function NotifTile({
  icon,
  to,
  label,
  value,
  tone,
}: {
  icon: string;
  to: string;
  label: string;
  value: number;
  tone: "warning" | "danger" | "info" | "success";
}) {
  const toneClass = {
    warning: "bg-amber-50 text-amber-600",
    danger: "bg-red-50 text-red-600",
    info: "bg-cyan-50 text-cyan-600",
    success: "bg-emerald-50 text-emerald-600",
  }[tone];

  return (
    <Link
      to={to}
      className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300 hover:shadow-2xl"
    >
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${toneClass}`}>
        {icon}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 font-display text-3xl font-semibold text-slate-950">{value}</p>
    </Link>
  );
}
