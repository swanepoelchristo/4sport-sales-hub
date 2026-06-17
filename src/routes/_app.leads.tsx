import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import { LEAD_STATUSES, PROVINCES, SPORTS, type Lead } from "@/lib/types";
import {
  Plus,
  Upload,
  Search,
  PhoneCall,
  ClipboardList,
  Coins,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { exportRowsAsCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/_app/leads")({ component: LeadsPage });

type QuickFilter =
  | "my_leads"
  | "unassigned"
  | "ready_to_call"
  | "follow_up_today"
  | "interested"
  | "meeting_booked"
  | "converted"
  | "do_not_contact";

const quickFilters: { value: QuickFilter; label: string }[] = [
  { value: "my_leads", label: "My leads" },
  { value: "unassigned", label: "Unassigned" },
  { value: "ready_to_call", label: "Ready to call" },
  { value: "follow_up_today", label: "Follow-up today" },
  { value: "interested", label: "Interested" },
  { value: "meeting_booked", label: "Meeting booked" },
  { value: "converted", label: "Converted" },
  { value: "do_not_contact", label: "Do not contact" },
];

const statusTone = (s: string) => {
  if (["Signed", "Paid", "Active"].includes(s)) return "success" as const;
  if (["Not Interested", "Lost"].includes(s)) return "danger" as const;
  if (["Meeting Scheduled", "Pitched", "Interested"].includes(s)) return "info" as const;
  return "neutral" as const;
};

function sameLocalDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function isFollowUpToday(value: string | null) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return sameLocalDate(d, new Date());
}

function leadPhone(lead: Lead) {
  return lead.public_phone || lead.phone || "—";
}

function leadEmail(lead: Lead) {
  return lead.public_email || lead.email || "—";
}

function leadSource(lead: Lead) {
  return lead.source_url || lead.source_note || lead.lead_source || "Source not captured";
}

function leadHasBeenActioned(lead: Lead) {
  return Boolean(
    lead.last_contacted_at
    || lead.last_call_outcome
    || lead.last_call_note
    || lead.status !== "New Lead"
  );
}

function isReadyToCall(lead: Lead) {
  return !lead.do_not_contact && !leadHasBeenActioned(lead);
}

function LeadsPage() {
  const { state, user } = useStore();

  const [rep, setRep] = useState("all");
  const [agent, setAgent] = useState("all");
  const [province, setProvince] = useState("all");
  const [sport, setSport] = useState("all");
  const [status, setStatus] = useState("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("ready_to_call");
  const [q, setQ] = useState("");

  const isAdmin = user?.role === "admin";
  const isCallCentreAgent = user?.role === "call_center_agent";

  const visibleLeads = useMemo(() => {
    if (!user) return [];

    let list = [...state.leads];

    if (isCallCentreAgent) {
      list = list.filter((lead) => !lead.assigned_agent_id || lead.assigned_agent_id === user.id);
    } else if (!isAdmin) {
      list = list.filter((lead) => lead.assigned_rep_id === user.id);
    }

    if (isAdmin && rep !== "all") list = list.filter((lead) => lead.assigned_rep_id === rep);
    if (isAdmin && agent !== "all") list = list.filter((lead) => lead.assigned_agent_id === agent);
    if (province !== "all") list = list.filter((lead) => lead.province === province);
    if (sport !== "all") list = list.filter((lead) => lead.sport_focus === sport);
    if (status !== "all") list = list.filter((lead) => lead.status === status);

    if (quickFilter === "my_leads") {
      list = list.filter((lead) => (
        isCallCentreAgent
          ? lead.assigned_agent_id === user.id
          : lead.assigned_rep_id === user.id
      ));
    }

    if (quickFilter === "unassigned") {
      list = list.filter((lead) => !lead.assigned_agent_id && !lead.assigned_rep_id);
    }

    if (quickFilter === "ready_to_call") {
      // Once a lead has been actioned, it must disappear from the call queue.
      // It remains available under audit/status filters like Interested, Meeting booked,
      // Follow-up today, Converted, and Do not contact.
      list = list.filter(isReadyToCall);
    }

    if (quickFilter === "follow_up_today") {
      list = list.filter((lead) => isFollowUpToday(lead.next_follow_up));
    }

    if (quickFilter === "interested") {
      list = list.filter((lead) => lead.status === "Interested");
    }

    if (quickFilter === "meeting_booked") {
      list = list.filter((lead) => lead.status === "Meeting Scheduled");
    }

    if (quickFilter === "converted") {
      list = list.filter((lead) => ["Signed", "Paid", "Active"].includes(lead.status));
    }

    if (quickFilter === "do_not_contact") {
      list = list.filter((lead) => lead.do_not_contact);
    }

    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((lead) => (
        lead.org_name.toLowerCase().includes(t)
        || lead.city.toLowerCase().includes(t)
        || lead.province.toLowerCase().includes(t)
        || lead.sport_focus.toLowerCase().includes(t)
        || leadSource(lead).toLowerCase().includes(t)
        || leadPhone(lead).toLowerCase().includes(t)
        || leadEmail(lead).toLowerCase().includes(t)
      ));
    }

    return list;
  }, [state.leads, user, isAdmin, isCallCentreAgent, rep, agent, province, sport, status, quickFilter, q]);

  if (!user) return null;

  const repById = (id: string) => state.reps.find((r) => r.id === id);
  const agentById = (id: string) => state.callCenterAgents.find((a) => a.id === id);

  const nextLead = visibleLeads.find(isReadyToCall);

  return (
    <>
      <PageHeader
        title="Call Centre Lead Engine"
        subtitle="Controlled, POPIA-aware lead workspace for schools, clubs and academies."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold"
                title="Manual CSV import comes later in PR scope."
              >
                <Upload className="h-4 w-4" /> Import leads
              </button>
            )}

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold opacity-60"
              title="Public lead research/generation is intentionally later."
            >
              <Sparkles className="h-4 w-4" /> Generate/research later
            </button>

            {nextLead && (
              <Link
                to="/leads/$leadId"
                params={{ leadId: nextLead.id }}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                <PhoneCall className="h-4 w-4" /> Next lead to call
              </Link>
            )}

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold opacity-60"
              title="Commission summary comes after commission events are wired."
            >
              <Coins className="h-4 w-4" /> My commission
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    exportRowsAsCsv(`leads-${new Date().toISOString().slice(0, 10)}.csv`, visibleLeads);
                    void audit("export.csv", `leads (${visibleLeads.length})`);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold"
                >
                  Export CSV
                </button>

                <Link
                  to="/leads/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold"
                >
                  <Plus className="h-4 w-4" /> New lead
                </Link>
              </>
            )}
          </div>
        }
      />

      <HowToUse>
        <p><strong>What this page is for:</strong> call centre agents work one public organisation lead at a time.</p>
        <p className="mt-2"><strong>Compliance rule:</strong> use public school, club, academy, admin or business contact information only.</p>
        <p className="mt-2"><strong>Do not collect:</strong> child, athlete, guardian or private personal details for sales prospecting.</p>
      </HowToUse>

      <Section title="Safety guardrails">
        <div className="grid gap-3 md:grid-cols-3">
          <Guardrail
            icon={<ShieldAlert className="h-5 w-5" />}
            title="Public data only"
            text="Every lead must have a source URL or source note. No child/athlete prospecting data."
          />
          <Guardrail
            icon={<ClipboardList className="h-5 w-5" />}
            title="Notes must be logged"
            text="Call outcomes and notes are captured inside each lead workspace."
          />
          <Guardrail
            icon={<PhoneCall className="h-5 w-5" />}
            title="Respect do-not-contact"
            text="Do-not-contact leads stay visible for audit, but should not be called again."
          />
        </div>
      </Section>

      <Section title="Call centre filters">
        <div className="mb-4 flex flex-wrap gap-2">
          {quickFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setQuickFilter(filter.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                quickFilter === filter.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-6">
          <label className="relative sm:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search school, club, city, source, public phone/email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-lg border border-input bg-secondary px-9 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          {isAdmin && (
            <select value={agent} onChange={(e) => setAgent(e.target.value)} className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
              <option value="all">All agents</option>
              {state.callCenterAgents.map((a) => <option key={a.id} value={a.id}>{a.name || a.email}</option>)}
            </select>
          )}

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

      <Section title={`Lead queue (${visibleLeads.length})`}>
        {visibleLeads.length === 0 ? (
          <EmptyState>No leads match these filters.</EmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {visibleLeads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                repName={lead.assigned_rep_id ? repById(lead.assigned_rep_id)?.full_name ?? "—" : "Unassigned"}
                agentName={lead.assigned_agent_id ? agentById(lead.assigned_agent_id)?.name ?? "—" : "Unassigned"}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function Guardrail({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        {icon}
        <p className="font-semibold">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function LeadCard({
  lead,
  repName,
  agentName,
}: {
  lead: Lead;
  repName: string;
  agentName: string;
}) {
  const source = leadSource(lead);

  return (
    <Link
      to="/leads/$leadId"
      params={{ leadId: lead.id }}
      className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/60"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{lead.org_name}</h3>
            {lead.do_not_contact && <StatusBadge tone="danger">Do not contact</StatusBadge>}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {lead.org_type} • {lead.city || "City unknown"}, {lead.province || "Province unknown"} • {lead.sport_focus}
          </p>
        </div>

        <StatusBadge tone={statusTone(lead.status)}>{lead.status}</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Info label="Website" value={lead.website || "—"} />
        <Info label="Public phone" value={leadPhone(lead)} />
        <Info label="Public email" value={leadEmail(lead)} />
        <Info label="Source" value={source} />
        <Info label="Assigned agent" value={agentName} />
        <Info label="Assigned rep" value={repName} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-secondary p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Last call note</p>
        <p className="mt-1 text-sm">{lead.last_call_note || lead.notes || "No call note yet."}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Next follow-up: {lead.next_follow_up ? new Date(lead.next_follow_up).toLocaleDateString("en-ZA") : "Not set"}
        </p>
      </div>
    </Link>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  );
}
