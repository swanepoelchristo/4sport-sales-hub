import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-bits";
import { PROVINCES, SPORTS, type Rep, type Role } from "@/lib/types";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_app/reps")({ component: RepsPage });

function RepsPage() {
  const { state, user, setState, addActivity, uid } = useStore();
  if (!user) return null;
  if (user.role !== "admin") {
    return <PageHeader title="Not authorised" subtitle="Only admins can manage reps." />;
  }
  const [editing, setEditing] = useState<Rep | null>(null);
  const [showForm, setShowForm] = useState(false);

  const blank: Rep = { id: "", full_name: "", email: "", phone: "", province: "Gauteng", sport_focus: "Multi-sport", role: "sales_rep", active: true };
  const [form, setForm] = useState<Rep>(blank);

  const open = (r: Rep | null) => {
    setEditing(r);
    setForm(r ?? blank);
    setShowForm(true);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      setState((s) => ({ ...s, reps: s.reps.map((r) => (r.id === editing.id ? { ...form, id: editing.id } : r)) }));
      addActivity("Rep updated", form.full_name);
    } else {
      const newRep: Rep = { ...form, id: uid() };
      setState((s) => ({ ...s, reps: [...s.reps, newRep] }));
      addActivity("Rep added", newRep.full_name);
    }
    setShowForm(false); setEditing(null); setForm(blank);
  };

  return (
    <>
      <PageHeader
        title="Rep management"
        subtitle="Add or edit sales reps and admins."
        action={
          <button onClick={() => (showForm ? (setShowForm(false), setEditing(null)) : open(null))} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            {showForm ? <><X className="h-4 w-4" /> Close</> : <><Plus className="h-4 w-4" /> New rep</>}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
          <Lbl label="Full name"><input required className={inp} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Lbl>
          <Lbl label="Email"><input required type="email" className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Lbl>
          <Lbl label="Phone"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Lbl>
          <Lbl label="Province / region">
            <select className={inp} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Lbl>
          <Lbl label="Sport focus">
            <select className={inp} value={form.sport_focus} onChange={(e) => setForm({ ...form, sport_focus: e.target.value })}>
              {SPORTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Lbl>
          <Lbl label="Role">
            <select className={inp} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="sales_rep">Sales Rep</option>
              <option value="admin">Admin</option>
            </select>
          </Lbl>
          <Lbl label="Status">
            <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          </Lbl>
          <div className="md:col-span-2">
            <button className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{editing ? "Save changes" : "Add rep"}</button>
          </div>
        </form>
      )}

      {state.reps.length === 0 ? (
        <EmptyState>No reps yet.</EmptyState>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Province</th>
                  <th className="px-4 py-2 text-left">Sport</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right"></th>
                </tr>
              </thead>
              <tbody>
                {state.reps.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{r.full_name}</td>
                    <td className="px-4 py-3">{r.email}</td>
                    <td className="px-4 py-3">{r.phone}</td>
                    <td className="px-4 py-3">{r.province}</td>
                    <td className="px-4 py-3">{r.sport_focus}</td>
                    <td className="px-4 py-3"><StatusBadge tone={r.role === "admin" ? "info" : "neutral"}>{r.role}</StatusBadge></td>
                    <td className="px-4 py-3"><StatusBadge tone={r.active ? "success" : "danger"}>{r.active ? "Active" : "Inactive"}</StatusBadge></td>
                    <td className="px-4 py-3 text-right"><button onClick={() => open(r)} className="text-xs font-semibold uppercase text-primary">Edit</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2 md:hidden">
            {state.reps.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email} • {r.phone}</p>
                    <p className="text-xs text-muted-foreground">{r.province} • {r.sport_focus}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge tone={r.role === "admin" ? "info" : "neutral"}>{r.role}</StatusBadge>
                    <StatusBadge tone={r.active ? "success" : "danger"}>{r.active ? "Active" : "Inactive"}</StatusBadge>
                  </div>
                </div>
                <button onClick={() => open(r)} className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-semibold uppercase text-primary">Edit</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

const inp = "w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm focus:border-primary focus:outline-none";
function Lbl({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
