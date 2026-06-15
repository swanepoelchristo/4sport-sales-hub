import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { StatusBadge } from "@/components/ui-bits";
import { LEAD_STATUSES, PROVINCES, SPORTS } from "@/lib/types";
import { Plus, Download, Search, Filter, Building2, MapPin, Phone, Pencil } from "lucide-react";
import { exportRowsAsCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

const statusTone = (s: string) => {
  if (["Signed", "Paid", "Active"].includes(s)) return "success" as const;
  if (["Not Interested", "Lost"].includes(s)) return "danger" as const;
  if (["Meeting Scheduled", "Pitched", "Interested"].includes(s)) return "info" as const;
  return "neutral" as const;
};

function LeadsPage() {
  const { state, user } = useStore();
  if (!user) return null;

  const isAdmin = user.role === "admin";

  const [rep, setRep] = useState("all");
  const [province, setProvince] = useState("all");
  const [sport, setSport] = useState("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");

  const leads = useMemo(() => {
    let list = isAdmin ? state.leads : state.leads.filter((l) => l.assigned_rep_id === user.id);

    if (isAdmin && rep !== "all") list = list.filter((l) => l.assigned_rep_id === rep);
    if (province !== "all") list = list.filter((l) => l.province === province);
    if (sport !== "all") list = list.filter((l) => l.sport_focus === sport);
    if (status !== "all") list = list.filter((l) => l.status === status);

    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter(
        (l) =>
          l.org_name.toLowerCase().includes(t) ||
          l.city.toLowerCase().includes(t) ||
          l.contact_person.toLowerCase().includes(t),
      );
    }

    return list;
  }, [state.leads, isAdmin, user.id, rep, province, sport, status, q]);

  const repById = (id: string) => state.reps.find((r) => r.id === id);

  return (
    <div className="relative left-1/2 w-[min(1280px,calc(100vw-2rem))] -translate-x-1/2 space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-300/80">
            4SPORT Sales Hub
          </p>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
            Leads
          </h1>

          <p className="mt-2 text-sm text-slate-300">
            {isAdmin ? "All schools, clubs and academies in the sales pipeline." : "Leads assigned to you."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => {
                exportRowsAsCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, leads);
                void audit("export.csv", `leads (${leads.length})`);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/25 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-950/30 transition hover:border-cyan-300 hover:bg-cyan-400/15"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          )}

          <Link
            to="/leads/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-950/30 transition hover:bg-cyan-300"
          >
            <Plus className="h-4 w-4" />
            New lead
          </Link>
        </div>
      </div>

      {/* Guide */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/30">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-100 bg-cyan-50 text-xl">
              💡
            </div>

            <div>
              <h2 className="text-base font-bold text-slate-950">How to use this page</h2>
              <p className="text-sm text-slate-600">
                Manage schools, clubs and academies in your pipeline.
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600">
            Leads guide
          </span>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          <InfoBox
            icon="🔎"
            title="Find the right lead"
            text="Use search and filters to quickly find a school, club, city, contact or lead status."
          />

          <InfoBox
            icon="➕"
            title="Add new opportunities"
            text="Click New lead to add a school, club or academy into the sales pipeline."
          />

          <InfoBox
            icon="📌"
            title="Keep follow-ups clean"
            text="Open a lead and set the next follow-up date so nothing falls through."
          />
        </div>
      </div>

      {/* Filters */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-cyan-950/25">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
            <Filter className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-display text-lg font-semibold text-slate-950">Filters</h2>
            <p className="text-sm text-slate-600">Narrow the lead list without changing any data.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search name, city, contact"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-10 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            />
          </label>

          {isAdmin && (
            <select
              value={rep}
              onChange={(e) => setRep(e.target.value)}
              className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
            >
              <option value="all">All reps</option>
              {state.reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.full_name}
                </option>
              ))}
            </select>
          )}

          <select
            value={province}
            onChange={(e) => setProvince(e.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">All provinces</option>
            {PROVINCES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={sport}
            onChange={(e) => setSport(e.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">All sports</option>
            {SPORTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-900 outline-none transition focus:border-cyan-300 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          >
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Leads table / cards */}
      {leads.length === 0 ? (
        <EmptyPanel icon="🧲" title="No leads match these filters." subtitle="Try changing the search or filters." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-cyan-950/25 md:block">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
                  <Building2 className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-950">Lead pipeline</h2>
                  <p className="text-sm text-slate-600">
                    Showing {leads.length} lead{leads.length === 1 ? "" : "s"}.
                  </p>
                </div>
              </div>
            </div>

            <table className="w-full text-sm text-slate-800">
              <thead className="bg-white text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 text-left">Organisation</th>
                  <th className="px-5 py-3 text-left">Type</th>
                  <th className="px-5 py-3 text-left">Location</th>
                  <th className="px-5 py-3 text-left">Sport</th>
                  <th className="px-5 py-3 text-left">Contact</th>
                  {isAdmin && <th className="px-5 py-3 text-left">Rep</th>}
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Follow-up</th>
                  <th className="px-5 py-3 text-right">Edit</th>
                </tr>
              </thead>

              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-slate-200 transition hover:bg-cyan-50/40">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-950">{l.org_name}</div>
                    </td>

                    <td className="px-5 py-4">{l.org_type}</td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-cyan-500" />
                        <span>
                          {l.city}, {l.province}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">{l.sport_focus}</td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-slate-950">{l.contact_person}</div>
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Phone className="h-3 w-3" />
                        {l.phone}
                      </div>
                    </td>

                    {isAdmin && (
                      <td className="px-5 py-4">
                        {repById(l.assigned_rep_id)?.full_name ?? "—"}
                      </td>
                    )}

                    <td className="px-5 py-4">
                      <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-slate-600">
                      {l.next_follow_up ? new Date(l.next_follow_up).toLocaleDateString("en-ZA") : "—"}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        to="/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="inline-flex items-center gap-1 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-bold uppercase text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {leads.map((l) => (
              <li key={l.id}>
                <Link
                  to="/leads/$leadId"
                  params={{ leadId: l.id }}
                  className="block rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">{l.org_name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {l.city}, {l.province} • {l.sport_focus}
                      </p>
                    </div>

                    <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                  </div>

                  <div className="mt-4 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                    <div className="font-semibold text-slate-900">{l.contact_person}</div>
                    <div className="mt-1">{l.phone}</div>
                    {l.next_follow_up && (
                      <div className="mt-2 font-medium">
                        Follow-up {new Date(l.next_follow_up).toLocaleDateString("en-ZA")}
                      </div>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
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
