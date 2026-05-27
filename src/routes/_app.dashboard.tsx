import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, KpiCard, Section, EmptyState, StatusBadge } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import { commissionQualified, commissionAmount } from "@/lib/types";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}
function fmtDT(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Dashboard() {
  const { state, user } = useStore();
  if (!user) return null;
  const isAdmin = user.role === "admin";

  // Scope data by role
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

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

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
    <>
      <PageHeader
        title={isAdmin ? "Admin Dashboard" : `Welcome, ${user.full_name.split(" ")[0]}`}
        subtitle={isAdmin ? "Full visibility across reps, leads and commissions." : "Your pipeline at a glance."}
      />

      <HowToUse title="How to use this page" adminOnly={isAdmin} defaultOpen>
        <p><strong>What this page is for:</strong> A quick snapshot of {isAdmin ? "the whole team's" : "your"} pipeline — notifications, KPIs, upcoming meetings and follow-ups.</p>
        <p className="mt-2"><strong>What to do here:</strong></p>
        <ul>
          <li>Check the notification tiles for anything that needs action today.</li>
          <li>Open upcoming meetings and follow-ups to plan your day.</li>
          {isAdmin && <li>Review rep activity and commission status across the team.</li>}
        </ul>
        <p className="mt-2"><strong>Before moving on:</strong> clear any overdue meetings and follow-ups due today.</p>
      </HowToUse>

      <HowToUse title="Getting started">
        <ol>
          <li>Add or review leads</li>
          <li>Schedule meetings</li>
          <li>Log completed visits</li>
          <li>Mark signed schools</li>
          <li>Track payment and commission status</li>
        </ol>
      </HowToUse>



      {/* Notifications strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <NotifTile to="/leads" label="Follow-ups due today" value={followUpsDueToday} tone="warning" />
        <NotifTile to="/meetings" label="Meetings overdue" value={overdueMeetings} tone="danger" />
        <NotifTile to="/signups" label="Awaiting payment" value={awaitingPayment} tone="info" />
        <NotifTile to="/signups" label="Commission to pay out" value={commissionAwaitingPayout} tone="success" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Total leads" value={leads.length} />
        <KpiCard label="Meetings scheduled" value={scheduled} accent="accent" />
        <KpiCard label="Meetings completed" value={completed} accent="accent" />
        <KpiCard label="Schools signed" value={signedSchools} accent="success" />
        <KpiCard label="Paid schools" value={paidSchools} accent="success" />
        <KpiCard label="Commission qualified" value={qualified} accent="warning" hint={`R ${totalCommission.toLocaleString("en-ZA")}`} />
        {isAdmin && <KpiCard label="Active reps" value={repsActive} />}
        <KpiCard label="Follow-ups due" value={followUps.length} accent="warning" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section
          title="Upcoming meetings"
          action={<Link to="/meetings" className="text-xs font-semibold uppercase text-primary">View all</Link>}
        >
          {upcoming.length === 0 ? (
            <EmptyState>No upcoming meetings scheduled.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((m) => {
                const lead = leadById(m.lead_id);
                const rep = repById(m.rep_id);
                return (
                  <li key={m.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{lead?.org_name ?? "Unknown lead"}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDT(m.meeting_at)} • {m.meeting_type}
                          {isAdmin && rep && <> • {rep.full_name}</>}
                        </p>
                      </div>
                      <StatusBadge tone="info">{m.status}</StatusBadge>
                    </div>
                    {m.next_action && (
                      <p className="mt-2 text-xs text-muted-foreground">Next: {m.next_action}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section
          title="Follow-ups due"
          action={<Link to="/leads" className="text-xs font-semibold uppercase text-primary">View leads</Link>}
        >
          {followUps.length === 0 ? (
            <EmptyState>No follow-ups scheduled.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {followUps.map((l) => {
                const rep = repById(l.assigned_rep_id);
                return (
                  <li key={l.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{l.org_name}</p>
                        <p className="text-xs text-muted-foreground">
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
        </Section>
      </div>

      {isAdmin && (
        <Section title="Commission tracker">
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="hidden md:block">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">School / Club</th>
                    <th className="px-4 py-2 text-left">Rep</th>
                    <th className="px-4 py-2 text-left">Year</th>
                    <th className="px-4 py-2 text-left">Paid</th>
                    <th className="px-4 py-2 text-left">Teams</th>
                    <th className="px-4 py-2 text-left">Qualified</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signups.map((s) => {
                    const lead = leadById(s.lead_id);
                    const rep = repById(s.rep_id);
                    const q = commissionQualified(s);
                    return (
                      <tr key={s.id} className="border-t border-border">
                        <td className="px-4 py-3 font-medium">{lead?.org_name ?? "—"}</td>
                        <td className="px-4 py-3">{rep?.full_name ?? "—"}</td>
                        <td className="px-4 py-3">{s.commission_year}</td>
                        <td className="px-4 py-3">{s.paid ? "Yes" : "No"}</td>
                        <td className="px-4 py-3">{s.active_teams}</td>
                        <td className="px-4 py-3">
                          <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Yes" : "No"}</StatusBadge>
                        </td>
                        <td className="px-4 py-3 text-right font-medium">R {commissionAmount(s).toLocaleString("en-ZA")}</td>
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
            <ul className="divide-y divide-border md:hidden">
              {signups.map((s) => {
                const lead = leadById(s.lead_id);
                const rep = repById(s.rep_id);
                const q = commissionQualified(s);
                return (
                  <li key={s.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{lead?.org_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{rep?.full_name} • {s.commission_year}</p>
                      </div>
                      <StatusBadge tone={q ? "success" : "neutral"}>{q ? "Qualified" : "Not yet"}</StatusBadge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Teams: {s.active_teams} • Paid: {s.paid ? "Yes" : "No"}</span>
                      <span className="font-medium text-foreground">R {commissionAmount(s).toLocaleString("en-ZA")}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      )}
    </>
  );
}

function NotifTile({
  to, label, value, tone,
}: { to: string; label: string; value: number; tone: "warning" | "danger" | "info" | "success" }) {
  const toneClass = {
    warning: "text-warning",
    danger: "text-destructive",
    info: "text-primary",
    success: "text-success",
  }[tone];
  return (
    <Link
      to={to}
      className="block rounded-xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/40"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl ${toneClass}`}>{value}</p>
    </Link>
  );
}
