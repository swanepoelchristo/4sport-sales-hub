import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ClipboardCheck, Search, ShieldAlert, Plus, CheckCircle2, XCircle, ArrowRightCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import {
  LEAD_CANDIDATE_STATUSES,
  PROVINCES,
  SPORTS,
  type LeadCandidate,
  type LeadCandidateStatus,
  type OrgType,
  type Sport,
} from "@/lib/types";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/_app/lead-candidates")({ component: LeadCandidatesPage });

const orgTypes: OrgType[] = ["School", "Club", "Academy", "Other"];

const statusTone = (s: LeadCandidateStatus) => {
  if (s === "converted" || s === "approved") return "success" as const;
  if (s === "rejected") return "danger" as const;
  if (s === "checked_twice" || s === "checked_once") return "info" as const;
  return "neutral" as const;
};

const emptyForm = {
  org_name: "",
  org_type: "School" as OrgType,
  province: "Gauteng",
  city: "",
  region: "",
  sport_focus: "Other" as Sport,
  contact_person: "",
  contact_role: "",
  public_phone: "",
  public_email: "",
  website: "",
  source_url_1: "",
  source_url_2: "",
  source_url_3: "",
  source_note: "",
};

function LeadCandidatesPage() {
  const { state, user, setState } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<LeadCandidateStatus | "all">("needs_check");
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const isAdmin = user?.role === "admin";
  const isCallCentreAgent = user?.role === "call_center_agent";

  const candidates = useMemo(() => {
    let list = [...state.leadCandidates];

    if (status !== "all") {
      list = list.filter((c) => c.verification_status === status);
    }

    if (q.trim()) {
      const t = q.toLowerCase();
      list = list.filter((c) => (
        c.org_name.toLowerCase().includes(t)
        || c.city.toLowerCase().includes(t)
        || c.province.toLowerCase().includes(t)
        || c.sport_focus.toLowerCase().includes(t)
        || c.public_phone.toLowerCase().includes(t)
        || c.public_email.toLowerCase().includes(t)
        || c.website.toLowerCase().includes(t)
        || c.source_note.toLowerCase().includes(t)
      ));
    }

    return list;
  }, [state.leadCandidates, q, status]);

  if (!user) return null;

  const addCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    setMessage(null);

    const cleanOrg = form.org_name.trim();
    const hasSource = Boolean(
      form.source_url_1.trim()
      || form.source_url_2.trim()
      || form.source_url_3.trim()
      || form.source_note.trim()
    );

    if (!cleanOrg) {
      setMessage("Organisation name is required.");
      setBusy(null);
      return;
    }

    if (!hasSource) {
      setMessage("Add at least one public source URL or source note before saving.");
      setBusy(null);
      return;
    }

    const payload = {
      ...form,
      org_name: cleanOrg,
      verification_status: "needs_check",
      created_by: user.auth_id,
    };

    const { data, error } = await (supabase as any)
      .from("lead_candidates")
      .insert(payload)
      .select("*")
      .single();

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setState((s) => ({
      ...s,
      leadCandidates: [data as LeadCandidate, ...s.leadCandidates],
    }));
    setForm(emptyForm);
    setMessage("Candidate saved to the research inbox. It is not a real lead yet.");
    void audit("lead_candidate.created", cleanOrg);
  };

  const updateCandidate = async (candidate: LeadCandidate, patch: Partial<LeadCandidate>, label: string) => {
    setBusy(`${label}-${candidate.id}`);
    setMessage(null);

    const { data, error } = await (supabase as any)
      .from("lead_candidates")
      .update(patch)
      .eq("id", candidate.id)
      .select("*")
      .single();

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setState((s) => ({
      ...s,
      leadCandidates: s.leadCandidates.map((c) => (c.id === candidate.id ? data as LeadCandidate : c)),
    }));
    setMessage(`${candidate.org_name} updated.`);
    void audit(`lead_candidate.${label}`, candidate.org_name);
  };

  const markCheckedOnce = (candidate: LeadCandidate) => updateCandidate(candidate, {
    verification_status: "checked_once",
    check_1_by: user.auth_id,
    check_1_at: new Date().toISOString(),
    check_1_note: "Checked against public organisation/admin source.",
  }, "checked_once");

  const markCheckedTwice = (candidate: LeadCandidate) => updateCandidate(candidate, {
    verification_status: "checked_twice",
    check_2_by: user.auth_id,
    check_2_at: new Date().toISOString(),
    check_2_note: "Double checked against public source details.",
  }, "checked_twice");

  const rejectCandidate = (candidate: LeadCandidate) => updateCandidate(candidate, {
    verification_status: "rejected",
    rejected_by: user.auth_id,
    rejected_at: new Date().toISOString(),
    rejected_reason: "Rejected during public-source verification.",
  }, "rejected");

  const convertToLead = async (candidate: LeadCandidate) => {
    if (!isAdmin) {
      setMessage("Only admin can convert a checked candidate into a real lead.");
      return;
    }

    if (candidate.verification_status !== "checked_twice") {
      setMessage("Candidate must be checked twice before conversion.");
      return;
    }

    setBusy(`convert-${candidate.id}`);
    setMessage(null);

    const { data: lead, error: leadError } = await (supabase as any)
      .from("leads")
      .insert({
        org_name: candidate.org_name,
        org_type: candidate.org_type,
        province: candidate.province,
        city: candidate.city,
        region: candidate.region,
        sport_focus: candidate.sport_focus,
        contact_person: candidate.contact_person,
        contact_role: candidate.contact_role,
        phone: candidate.public_phone,
        email: candidate.public_email,
        public_phone: candidate.public_phone,
        public_email: candidate.public_email,
        website: candidate.website,
        source_url: candidate.source_url_1 || candidate.source_url_2 || candidate.source_url_3 || "",
        lead_source: "Approved public-source candidate",
        source_note: candidate.source_note,
        status: "New Lead",
        notes: "Created from checked lead candidate research inbox.",
        archived: false,
        do_not_contact: false,
        last_call_outcome: "",
        last_call_note: "",
      })
      .select("*")
      .single();

    if (leadError) {
      setBusy(null);
      setMessage(leadError.message);
      return;
    }

    const { data, error } = await (supabase as any)
      .from("lead_candidates")
      .update({
        verification_status: "converted",
        approved_by: user.auth_id,
        approved_at: new Date().toISOString(),
        converted_lead_id: lead.id,
      })
      .eq("id", candidate.id)
      .select("*")
      .single();

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setState((s) => ({
      ...s,
      leadCandidates: s.leadCandidates.map((c) => (c.id === candidate.id ? data as LeadCandidate : c)),
      leads: [lead, ...s.leads],
    }));
    setMessage(`${candidate.org_name} converted to a real lead.`);
    void audit("lead_candidate.converted_to_lead", candidate.org_name);
  };

  return (
    <>
      <PageHeader
        title="Lead Candidate Research Inbox"
        subtitle="Public-source waiting room before anything enters the real call queue."
      />

      <HowToUse>
        <p><strong>What this page is for:</strong> capture public organisation candidates before they become leads.</p>
        <p className="mt-2"><strong>Rule:</strong> a candidate must be checked once, checked twice, and then approved before becoming a real lead.</p>
        <p className="mt-2"><strong>Never collect:</strong> child, athlete, guardian, private, hidden, leaked, or questionable personal information.</p>
      </HowToUse>

      <Section title="Safety gate">
        <div className="grid gap-3 md:grid-cols-3">
          <SafetyCard title="Public sources only" text="Use school, club, academy, sport body or business/admin public contact pages." />
          <SafetyCard title="Waiting room first" text="Candidates stay here. They do not appear in the call queue until converted by admin." />
          <SafetyCard title="Double check required" text="A candidate must pass two checks before it can become a lead." />
        </div>
      </Section>

      {(isAdmin || isCallCentreAgent) && (
        <Section title="Add public-source candidate">
          <form onSubmit={addCandidate} className="grid gap-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Input label="Organisation name" value={form.org_name} onChange={(v) => setForm({ ...form, org_name: v })} required />
              <Select label="Organisation type" value={form.org_type} onChange={(v) => setForm({ ...form, org_type: v as OrgType })} options={orgTypes} />
              <Select label="Province" value={form.province} onChange={(v) => setForm({ ...form, province: v })} options={PROVINCES} />
              <Input label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Input label="Region" value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
              <Select label="Sport focus" value={form.sport_focus} onChange={(v) => setForm({ ...form, sport_focus: v as Sport })} options={SPORTS} />
              <Input label="Public contact person" value={form.contact_person} onChange={(v) => setForm({ ...form, contact_person: v })} />
              <Input label="Public contact role" value={form.contact_role} onChange={(v) => setForm({ ...form, contact_role: v })} />
              <Input label="Public phone" value={form.public_phone} onChange={(v) => setForm({ ...form, public_phone: v })} />
              <Input label="Public email" value={form.public_email} onChange={(v) => setForm({ ...form, public_email: v })} />
              <Input label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} />
              <Input label="Source URL 1" value={form.source_url_1} onChange={(v) => setForm({ ...form, source_url_1: v })} />
              <Input label="Source URL 2" value={form.source_url_2} onChange={(v) => setForm({ ...form, source_url_2: v })} />
              <Input label="Source URL 3" value={form.source_url_3} onChange={(v) => setForm({ ...form, source_url_3: v })} />
            </div>

            <label>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source note / verification note</span>
              <textarea
                value={form.source_note}
                onChange={(e) => setForm({ ...form, source_note: e.target.value })}
                className="mt-1 min-h-24 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="Explain where the public information came from and why it is safe to use."
              />
            </label>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy === "create"}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                <Plus className="h-4 w-4" /> Save candidate
              </button>
              {message && <p className="text-sm text-muted-foreground">{message}</p>}
            </div>
          </form>
        </Section>
      )}

      <Section title="Candidate filters">
        <div className="grid gap-2 md:grid-cols-3">
          <label className="relative md:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidate, city, province, public contact, source"
              className="w-full rounded-lg border border-input bg-secondary px-9 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>

          <select value={status} onChange={(e) => setStatus(e.target.value as LeadCandidateStatus | "all")} className="rounded-lg border border-input bg-secondary px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            {LEAD_CANDIDATE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </Section>

      <Section title={`Candidate inbox (${candidates.length})`}>
        {candidates.length === 0 ? (
          <EmptyState>No candidates match these filters.</EmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                busy={busy}
                canAdminConvert={isAdmin}
                onCheckedOnce={markCheckedOnce}
                onCheckedTwice={markCheckedTwice}
                onReject={rejectCandidate}
                onConvert={convertToLead}
              />
            ))}
          </div>
        )}
      </Section>
    </>
  );
}

function SafetyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <ShieldAlert className="h-5 w-5" />
        <p className="font-semibold">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function CandidateCard({
  candidate,
  busy,
  canAdminConvert,
  onCheckedOnce,
  onCheckedTwice,
  onReject,
  onConvert,
}: {
  candidate: LeadCandidate;
  busy: string | null;
  canAdminConvert: boolean;
  onCheckedOnce: (c: LeadCandidate) => void;
  onCheckedTwice: (c: LeadCandidate) => void;
  onReject: (c: LeadCandidate) => void;
  onConvert: (c: LeadCandidate) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{candidate.org_name || "Unnamed candidate"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {candidate.org_type} • {candidate.city || "City unknown"}, {candidate.province || "Province unknown"} • {candidate.sport_focus}
          </p>
        </div>
        <StatusBadge tone={statusTone(candidate.verification_status)}>{candidate.verification_status.replaceAll("_", " ")}</StatusBadge>
      </div>

      <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
        <Info label="Website" value={candidate.website || "—"} />
        <Info label="Public phone" value={candidate.public_phone || "—"} />
        <Info label="Public email" value={candidate.public_email || "—"} />
        <Info label="Contact" value={[candidate.contact_person, candidate.contact_role].filter(Boolean).join(" • ") || "—"} />
        <Info label="Source URL 1" value={candidate.source_url_1 || "—"} />
        <Info label="Source URL 2" value={candidate.source_url_2 || "—"} />
        <Info label="Source URL 3" value={candidate.source_url_3 || "—"} />
        <Info label="Source note" value={candidate.source_note || "—"} />
      </div>

      <div className="mt-4 rounded-lg border border-border bg-secondary p-3 text-xs text-muted-foreground">
        <p><strong>Check 1:</strong> {candidate.check_1_at ? new Date(candidate.check_1_at).toLocaleString("en-ZA") : "Not done"}</p>
        <p className="mt-1"><strong>Check 2:</strong> {candidate.check_2_at ? new Date(candidate.check_2_at).toLocaleString("en-ZA") : "Not done"}</p>
        {candidate.rejected_reason && <p className="mt-1"><strong>Rejected:</strong> {candidate.rejected_reason}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {candidate.verification_status === "needs_check" && (
          <ActionButton disabled={busy === `checked_once-${candidate.id}`} onClick={() => onCheckedOnce(candidate)}>
            <ClipboardCheck className="h-4 w-4" /> Checked once
          </ActionButton>
        )}

        {candidate.verification_status === "checked_once" && (
          <ActionButton disabled={busy === `checked_twice-${candidate.id}`} onClick={() => onCheckedTwice(candidate)}>
            <CheckCircle2 className="h-4 w-4" /> Checked twice
          </ActionButton>
        )}

        {["needs_check", "checked_once", "checked_twice"].includes(candidate.verification_status) && (
          <ActionButton disabled={busy === `rejected-${candidate.id}`} onClick={() => onReject(candidate)}>
            <XCircle className="h-4 w-4" /> Reject
          </ActionButton>
        )}

        {canAdminConvert && candidate.verification_status === "checked_twice" && (
          <button
            type="button"
            disabled={busy === `convert-${candidate.id}`}
            onClick={() => onConvert(candidate)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            <ArrowRightCircle className="h-4 w-4" /> Convert to lead
          </button>
        )}
      </div>
    </div>
  );
}

function ActionButton({ children, disabled, onClick }: { children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold disabled:opacity-60"
    >
      {children}
    </button>
  );
}

function Input({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: readonly string[] }) {
  return (
    <label>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-input bg-secondary px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
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
