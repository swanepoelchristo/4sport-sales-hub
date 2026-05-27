import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import { LEAD_STATUSES, PROVINCES, SPORTS } from "@/lib/types";
import { Plus, Download } from "lucide-react";
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
      list = list.filter((l) => l.org_name.toLowerCase().includes(t) || l.city.toLowerCase().includes(t) || l.contact_person.toLowerCase().includes(t));
    }
    return list;
  }, [state.leads, isAdmin, user.id, rep, province, sport, status, q]);

  const repById = (id: string) => state.reps.find((r) => r.id === id);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle={isAdmin ? "All schools, clubs and academies." : "Leads assigned to you."}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  exportRowsAsCsv(`leads-${new Date().toISOString().slice(0,10)}.csv`, leads);
                  void audit("export.csv", `leads (${leads.length})`);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold"
              >
                <Download className="h-4 w-4" /> Export CSV
              </button>
            )}
            <Link to="/leads/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="h-4 w-4" /> New lead
            </Link>
          </div>
        }
      />

      <HowToUse>
        <p><strong>What this page is for:</strong> manage schools, clubs and academies in your pipeline.</p>
        <p className="mt-2"><strong>What to do here:</strong></p>
        <ul>
          <li>Use filters and search to find a lead.</li>
          <li>Click <em>New lead</em> to add one.</li>
          <li>Open a lead to update status, contacts and follow-up date.</li>
        </ul>
        <p className="mt-2"><strong>Before moving on:</strong> set a next follow-up date so nothing falls through.</p>
      </HowToUse>

      <Section title="Filters">

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <input
            placeholder="Search name, city, contact" value={q} onChange={(e) => setQ(e.target.value)}
            className="col-span-2 rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none lg:col-span-2"
          />
          {isAdmin && (
            <select value={rep} onChange={(e) => setRep(e.target.value)} className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              <option value="all">All reps</option>
              {state.reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
            </select>
          )}
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
            <option value="all">All provinces</option>
            {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={sport} onChange={(e) => setSport(e.target.value)} className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
            <option value="all">All sports</option>
            {SPORTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {LEAD_STATUSES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </Section>

      {leads.length === 0 ? (
        <EmptyState>No leads match these filters.</EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Organisation</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Location</th>
                  <th className="px-4 py-2 text-left">Sport</th>
                  <th className="px-4 py-2 text-left">Contact</th>
                  {isAdmin && <th className="px-4 py-2 text-left">Rep</th>}
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Follow-up</th>
                  <th className="px-4 py-2 text-right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{l.org_name}</td>
                    <td className="px-4 py-3">{l.org_type}</td>
                    <td className="px-4 py-3">{l.city}, {l.province}</td>
                    <td className="px-4 py-3">{l.sport_focus}</td>
                    <td className="px-4 py-3">
                      <div>{l.contact_person}</div>
                      <div className="text-xs text-muted-foreground">{l.phone}</div>
                    </td>
                    {isAdmin && <td className="px-4 py-3">{repById(l.assigned_rep_id)?.full_name ?? "—"}</td>}
                    <td className="px-4 py-3"><StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge></td>
                    <td className="px-4 py-3 text-xs">{l.next_follow_up ? new Date(l.next_follow_up).toLocaleDateString("en-ZA") : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/leads/$leadId" params={{ leadId: l.id }} className="text-xs font-semibold uppercase text-primary">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {leads.map((l) => (
              <li key={l.id}>
                <Link to="/leads/$leadId" params={{ leadId: l.id }} className="block rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{l.org_name}</p>
                      <p className="text-xs text-muted-foreground">{l.city}, {l.province} • {l.sport_focus}</p>
                    </div>
                    <StatusBadge tone={statusTone(l.status)}>{l.status}</StatusBadge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{l.contact_person} • {l.phone}</span>
                    {l.next_follow_up && <span>Follow-up {new Date(l.next_follow_up).toLocaleDateString("en-ZA")}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
