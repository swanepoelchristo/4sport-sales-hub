import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

type DashboardSupportTicket = {
  status?: string | null;
  severity?: string | null;
  rep_id?: string | null;
  assigned_rep_id?: string | null;
  created_at?: string | null;
  opened_at?: string | null;
  sla_hours?: number | string | null;
};

function displayFirstName(fullName: string | null | undefined) {
  const clean = String(fullName || "").trim();

  if (!clean) return "Adele";
  if (clean.toLowerCase().includes("swanepoelchristo")) return "Adele";
  if (clean.includes("@")) return "Adele";

  return clean.split(" ")[0] || "Adele";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Dashboard() {
  const { state, user } = useStore();
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const firstName = displayFirstName(user.full_name);

  // Keep the existing data model for now. We are only changing the business meaning in the UI.
  const clients = useMemo(
    () => (isAdmin ? state.leads : state.leads.filter((client) => client.assigned_rep_id === user.id)),
    [state.leads, isAdmin, user.id],
  );

  const appointments = useMemo(
    () => (isAdmin ? state.meetings : state.meetings.filter((appointment) => appointment.rep_id === user.id)),
    [state.meetings, isAdmin, user.id],
  );

  const payments = useMemo(
    () => (isAdmin ? state.signups : state.signups.filter((payment) => payment.rep_id === user.id)),
    [state.signups, isAdmin, user.id],
  );

  const stateWithOptionalTickets = state as typeof state & {
    supportTickets?: DashboardSupportTicket[];
  };

  const bookingRequests = useMemo(() => {
    const allTickets = stateWithOptionalTickets.supportTickets ?? [];

    if (isAdmin) return allTickets;

    return allTickets.filter(
      (ticket) => ticket.rep_id === user.id || ticket.assigned_rep_id === user.id,
    );
  }, [stateWithOptionalTickets.supportTickets, isAdmin, user.id]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppointments = appointments.filter((appointment) => {
    const appointmentDate = new Date(appointment.meeting_at);
    return appointment.status === "Scheduled" && appointmentDate >= today && appointmentDate < tomorrow;
  });

  const upcomingAppointments = [...appointments]
    .filter((appointment) => appointment.status === "Scheduled" && new Date(appointment.meeting_at) >= today)
    .sort((a, b) => +new Date(a.meeting_at) - +new Date(b.meeting_at))
    .slice(0, 6);

  const clientsNeedingFollowUp = clients
    .filter((client) => client.next_follow_up && new Date(client.next_follow_up) >= today)
    .sort((a, b) => +new Date(a.next_follow_up!) - +new Date(b.next_follow_up!))
    .slice(0, 6);

  const paidCount = payments.filter((payment) => payment.paid).length;
  const pendingPayments = payments.filter((payment) => !payment.paid).length;
  const openBookingRequests = bookingRequests.filter((request) => request.status !== "Resolved").length;
  const estimatedRevenue = payments.reduce((sum, payment) => sum + Number(payment.final_agreed_price || 0), 0);

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            Adele Salon AI
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            {isAdmin ? "Salon Dashboard" : `Welcome back, ${firstName}! 👋`}
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            Your daily salon cockpit: appointments, client follow-ups, WhatsApp enquiries and payments.
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-950/30">
          Today, {new Date().toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat icon="📅" label="Today’s appointments" value={todayAppointments.length} hint="Booked for today" />
        <MiniStat icon="👩" label="Clients" value={clients.length} hint="Client records" />
        <MiniStat icon="💬" label="Open booking requests" value={openBookingRequests} hint="Needs attention" />
        <MiniStat icon="💳" label="Pending payments" value={pendingPayments} hint={`${paidCount} marked paid`} />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-950">How this salon dashboard works</h2>
            <p className="text-sm text-slate-600">
              This is the first Adele Salon layer on top of the existing Sales Hub engine. The database is still stable; we are changing the workflow screen by screen.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">MVP cockpit</span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="🤖"
            title="AI receptionist"
            text="Incoming WhatsApp messages will become booking enquiries that the assistant can help triage."
          />
          <InfoBox
            icon="✂️"
            title="Salon workflow"
            text="Clients, services, appointments and payments replace the old sales pipeline language."
          />
          <InfoBox
            icon="🔌"
            title="MilkBox Connect"
            text="WhatsApp stays separate so the same connector can later serve salons, 4SPORT and other businesses."
          />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Upcoming appointments</h2>
              <p className="text-sm text-slate-600">Next booked appointments from the existing meetings engine.</p>
            </div>
            <Link to="/meetings" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              Open
            </Link>
          </div>

          <div className="space-y-3">
            {upcomingAppointments.length ? (
              upcomingAppointments.map((appointment) => {
                const client = clients.find((item) => item.id === appointment.lead_id);
                return (
                  <div key={appointment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">{client?.org_name || "Client appointment"}</p>
                    <p className="mt-1 text-sm text-slate-600">{fmtTime(appointment.meeting_at)} · {appointment.meeting_type}</p>
                    {appointment.next_action ? <p className="mt-2 text-xs text-slate-500">Next: {appointment.next_action}</p> : null}
                  </div>
                );
              })
            ) : (
              <EmptyState text="No upcoming appointments loaded yet." />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-950">Client follow-ups</h2>
              <p className="text-sm text-slate-600">People who need a call, WhatsApp reply or rebooking nudge.</p>
            </div>
            <Link to="/leads" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
              Clients
            </Link>
          </div>

          <div className="space-y-3">
            {clientsNeedingFollowUp.length ? (
              clientsNeedingFollowUp.map((client) => (
                <div key={client.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-950">{client.org_name}</p>
                  <p className="mt-1 text-sm text-slate-600">{client.contact_person || "No contact name"} · {client.phone || client.public_phone || "No phone"}</p>
                  <p className="mt-2 text-xs text-slate-500">Follow-up: {client.next_follow_up}</p>
                </div>
              ))
            ) : (
              <EmptyState text="No follow-ups due yet." />
            )}
          </div>
        </section>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Revenue snapshot</h2>
            <p className="text-sm text-slate-600">Temporary estimate from the existing signup/payment records.</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 px-5 py-3 text-right">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Estimated total</p>
            <p className="text-2xl font-black text-emerald-950">R {estimatedRevenue.toLocaleString("en-ZA")}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MiniStat({ icon, label, value, hint }: { icon: string; label: string; value: number; hint: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-50 text-xl">{icon}</div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">Live</span>
      </div>
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </div>
  );
}

function InfoBox({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-3 text-2xl">{icon}</div>
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm text-slate-500">
      {text}
    </div>
  );
}
