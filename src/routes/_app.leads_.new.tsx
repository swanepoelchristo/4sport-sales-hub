import { createFileRoute, useNavigate, useParams, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui-bits";
import { LEAD_STATUSES, PROVINCES, SPORTS, type Lead, type LeadStatus, type OrgType, type Sport } from "@/lib/types";

export const Route = createFileRoute("/_app/leads_/new")({ component: NewLead });

function blank(repId: string): Omit<Lead, "id" | "created_at"> {
  return {
    org_name: "", org_type: "School", province: "Gauteng", city: "", region: "",
    sport_focus: "Rugby", contact_person: "", contact_role: "", phone: "", email: "",
    lead_source: "",

    website: "",
    public_phone: "",
    public_email: "",
    source_url: "",
    source_note: "",
    assigned_agent_id: "",
    do_not_contact: false,
    last_call_outcome: "",
    last_call_note: "",
    last_contacted_at: null,

    assigned_rep_id: repId, status: "New Lead", notes: "", next_follow_up: null,
  };
}

function NewLead() {
  const { user, state } = useStore();
  if (!user) return null;

  const repId = user.role === "admin"
    ? state.reps[0]?.id ?? user.id
    : state.reps.find((r) => r.user_id === user.id)?.id ?? user.id;

  return <LeadForm initial={blank(repId)} mode="create" />;
}

export function LeadForm({
  initial, mode, leadId,
}: { initial: Omit<Lead, "id" | "created_at">; mode: "create" | "edit"; leadId?: string }) {
  const { state, user, setState, addActivity, uid } = useStore();
  const navigate = useNavigate();
  const [form, setForm] = useState(initial);
  if (!user) return null;
  const isAdmin = user.role === "admin";

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      const newLead: Lead = { ...form, id: uid(), created_at: new Date().toISOString() };
      setState((s) => ({ ...s, leads: [newLead, ...s.leads] }));
      addActivity("Lead created", newLead.org_name);
    } else if (leadId) {
      setState((s) => ({ ...s, leads: s.leads.map((l) => (l.id === leadId ? { ...l, ...form } : l)) }));
      addActivity("Lead updated", form.org_name);
    }
    navigate({ to: "/leads" });
  };

  const remove = () => {
    if (!leadId) return;
    if (!confirm("Archive this lead? It will be hidden but kept in the database.")) return;
    setState((s) => ({ ...s, leads: s.leads.filter((l) => l.id !== leadId) }));
    addActivity("Lead archived", form.org_name);
    navigate({ to: "/leads" });
  };

  return (
    <>
      <PageHeader
        title={mode === "create" ? "New lead" : "Edit lead"}
        subtitle="School, club, academy or other organisation."
        action={<Link to="/leads" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>}
      />
      <form onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <Field label="Organisation name" required>
          <input className={inp} required value={form.org_name} onChange={(e) => set("org_name", e.target.value)} />
        </Field>
        <Field label="Type">
          <select className={inp} value={form.org_type} onChange={(e) => set("org_type", e.target.value as OrgType)}>
            {(["School", "Club", "Academy", "Other"] as OrgType[]).map((o) => <option key={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Province">
          <select className={inp} value={form.province} onChange={(e) => set("province", e.target.value)}>
            {PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="City / town"><input className={inp} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
        <Field label="Region"><input className={inp} value={form.region} onChange={(e) => set("region", e.target.value)} /></Field>
        <Field label="Sport focus">
          <select className={inp} value={form.sport_focus} onChange={(e) => set("sport_focus", e.target.value as Sport)}>
            {SPORTS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="Contact person"><input className={inp} value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} /></Field>
        <Field label="Contact role"><input className={inp} value={form.contact_role} onChange={(e) => set("contact_role", e.target.value)} /></Field>
        <Field label="Phone"><input className={inp} type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Email"><input className={inp} type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Lead source"><input className={inp} value={form.lead_source} onChange={(e) => set("lead_source", e.target.value)} /></Field>
        <Field label="Website"><input className={inp} value={form.website} onChange={(e) => set("website", e.target.value)} /></Field>
        <Field label="Public phone"><input className={inp} type="tel" value={form.public_phone} onChange={(e) => set("public_phone", e.target.value)} /></Field>
        <Field label="Public email"><input className={inp} type="email" value={form.public_email} onChange={(e) => set("public_email", e.target.value)} /></Field>
        <Field label="Source URL"><input className={inp} value={form.source_url} onChange={(e) => set("source_url", e.target.value)} /></Field>
        <Field label="Source note"><input className={inp} value={form.source_note} onChange={(e) => set("source_note", e.target.value)} /></Field>
        <Field label="Do not contact">
          <select className={inp} value={form.do_not_contact ? "yes" : "no"} onChange={(e) => set("do_not_contact", e.target.value === "yes")}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
        <Field label="Assigned rep">
          <select className={inp} value={form.assigned_rep_id} onChange={(e) => set("assigned_rep_id", e.target.value)} disabled={!isAdmin}>
            {state.reps.map((r) => <option key={r.id} value={r.id}>{r.full_name}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select className={inp} value={form.status} onChange={(e) => set("status", e.target.value as LeadStatus)}>
            {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Next follow-up">
          <input className={inp} type="date"
            value={form.next_follow_up ? form.next_follow_up.slice(0, 10) : ""}
            onChange={(e) => set("next_follow_up", e.target.value ? new Date(e.target.value).toISOString() : null)}
          />
        </Field>
        <Field label="Notes" full>
          <textarea className={inp + " min-h-24"} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>

        <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
          <button type="submit" className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
            {mode === "create" ? "Create lead" : "Save changes"}
          </button>
          {mode === "edit" && (
            <button type="button" onClick={remove} className="rounded-lg border border-destructive/40 px-4 py-3 text-sm font-semibold text-destructive">
              Archive
            </button>
          )}
          <Link to="/leads" className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">Cancel</Link>
        </div>
      </form>
    </>
  );
}

const inp = "w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm focus:border-primary focus:outline-none";

function Field({ label, children, required, full }: { label: string; children: React.ReactNode; required?: boolean; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}{required && <span className="text-destructive"> *</span>}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

// Edit route reuses this in a separate file
export function useEditableLead() {
  const { state, user } = useStore();
  const { leadId } = useParams({ from: "/_app/leads/$leadId" });
  const lead = useMemo(() => state.leads.find((l) => l.id === leadId), [state.leads, leadId]);
  const allowed = lead && (user?.role === "admin" || lead.assigned_rep_id === user?.id);
  return { lead, leadId, allowed };
}
