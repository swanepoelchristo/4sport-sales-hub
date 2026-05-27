import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState, StatusBadge } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import { PROVINCES, SPORTS, type Rep, type Role } from "@/lib/types";
import { Plus, X, KeyRound, Send, Power } from "lucide-react";
import {
  inviteAccount, sendPasswordReset, resendInvite, updateAccount,
} from "@/lib/accounts.functions";

export const Route = createFileRoute("/_app/reps")({ component: RepsPage });

function RepsPage() {
  const { user, state } = useStore();
  if (!user) return null;
  if (user.role !== "admin") {
    return <PageHeader title="Not authorised" subtitle="Only admins can manage reps." />;
  }
  return <AdminReps reps={state.reps} />;
}

function AdminReps({ reps: initialReps }: { reps: Rep[] }) {
  const invite = useServerFn(inviteAccount);
  const resetPw = useServerFn(sendPasswordReset);
  const resend = useServerFn(resendInvite);
  const update = useServerFn(updateAccount);

  const [reps, setReps] = useState<Rep[]>(initialReps);
  useEffect(() => setReps(initialReps), [initialReps]);

  const [editing, setEditing] = useState<Rep | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const blank: Rep = {
    id: "", full_name: "", email: "", phone: "", province: "Gauteng",
    region: "", sport_focus: "Multi-sport", role: "sales_rep", active: true,
  };
  const [form, setForm] = useState<Rep>(blank);

  const open = (r: Rep | null) => {
    setEditing(r); setForm(r ?? blank); setShowForm(true); setErr(null);
  };

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2500); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setBusyId("form");
    try {
      if (editing) {
        await update({ data: {
          repId: editing.id, fullName: form.full_name, phone: form.phone,
          role: form.role, province: form.province, region: form.region ?? "",
          sportFocus: form.sport_focus, active: form.active,
        }});
        setReps((rs) => rs.map((r) => r.id === editing.id ? { ...r, ...form } : r));
        flash("Saved.");
      } else {
        await invite({ data: {
          fullName: form.full_name, email: form.email, phone: form.phone,
          role: form.role, province: form.province, region: form.region ?? "",
          sportFocus: form.sport_focus, active: form.active,
        }});
        flash(`Invite sent to ${form.email}.`);
      }
      setShowForm(false); setEditing(null); setForm(blank);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusyId(null);
    }
  };

  const sendReset = async (r: Rep) => {
    setBusyId(r.id);
    try {
      await resetPw({ data: { email: r.email } });
      flash(`Password reset sent to ${r.email}.`);
    } catch (e: any) { setErr(e?.message ?? String(e)); } finally { setBusyId(null); }
  };

  const resendOne = async (r: Rep) => {
    setBusyId(r.id);
    try {
      await resend({ data: { email: r.email } });
      flash(`Invite re-sent to ${r.email}.`);
    } catch (e: any) { setErr(e?.message ?? String(e)); } finally { setBusyId(null); }
  };

  const toggleActive = async (r: Rep) => {
    setBusyId(r.id);
    try {
      await update({ data: { repId: r.id, active: !r.active } });
      setReps((rs) => rs.map((x) => x.id === r.id ? { ...x, active: !r.active } : x));
      flash(!r.active ? "Activated." : "Deactivated.");
    } catch (e: any) { setErr(e?.message ?? String(e)); } finally { setBusyId(null); }
  };

  return (
    <>
      <PageHeader
        title="Rep management"
        subtitle="Invite admins or sales reps, assign region/sport, reset passwords."
        action={
          <button onClick={() => (showForm ? (setShowForm(false), setEditing(null)) : open(null))}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            {showForm ? <><X className="h-4 w-4" /> Close</> : <><Plus className="h-4 w-4" /> Invite user</>}
          </button>
        }
      />

      {toast && <div className="mb-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">{toast}</div>}
      {err && <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}

      {showForm && (
        <form onSubmit={submit} className="mb-6 grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
          <Lbl label="Full name"><input required className={inp} value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></Lbl>
          <Lbl label="Email"><input required type="email" disabled={!!editing} className={inp} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Lbl>
          <Lbl label="Phone"><input className={inp} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Lbl>
          <Lbl label="Province">
            <select className={inp} value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })}>
              {PROVINCES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </Lbl>
          <Lbl label="Region"><input className={inp} value={form.region ?? ""} onChange={(e) => setForm({ ...form, region: e.target.value })} /></Lbl>
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
            <button disabled={busyId === "form"}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
              {busyId === "form" ? "Working…" : editing ? "Save changes" : "Send invite"}
            </button>
          </div>
        </form>
      )}

      {reps.length === 0 ? (
        <EmptyState>No reps yet. Invite the first user above.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="hidden w-full text-sm md:table">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Province / Region</th>
                <th className="px-4 py-2 text-left">Sport</th>
                <th className="px-4 py-2 text-left">Role</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reps.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{r.full_name}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3">{r.province}{r.region ? ` · ${r.region}` : ""}</td>
                  <td className="px-4 py-3">{r.sport_focus}</td>
                  <td className="px-4 py-3"><StatusBadge tone={r.role === "admin" ? "info" : "neutral"}>{r.role}</StatusBadge></td>
                  <td className="px-4 py-3"><StatusBadge tone={r.active ? "success" : "danger"}>{r.active ? "Active" : "Inactive"}</StatusBadge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap gap-2">
                      <button onClick={() => open(r)} className="text-xs font-semibold uppercase text-primary">Edit</button>
                      <button disabled={busyId === r.id} onClick={() => resendOne(r)} title="Resend invite"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-50"><Send className="h-3 w-3" /> Invite</button>
                      <button disabled={busyId === r.id} onClick={() => sendReset(r)} title="Send password reset"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary disabled:opacity-50"><KeyRound className="h-3 w-3" /> Reset</button>
                      <button disabled={busyId === r.id} onClick={() => toggleActive(r)} title={r.active ? "Deactivate" : "Activate"}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"><Power className="h-3 w-3" /> {r.active ? "Off" : "On"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="divide-y divide-border md:hidden">
            {reps.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email} · {r.phone}</p>
                    <p className="text-xs text-muted-foreground">{r.province}{r.region ? ` · ${r.region}` : ""} · {r.sport_focus}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge tone={r.role === "admin" ? "info" : "neutral"}>{r.role}</StatusBadge>
                    <StatusBadge tone={r.active ? "success" : "danger"}>{r.active ? "Active" : "Inactive"}</StatusBadge>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => open(r)} className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-primary">Edit</button>
                  <button disabled={busyId === r.id} onClick={() => resendOne(r)} className="rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50">Resend invite</button>
                  <button disabled={busyId === r.id} onClick={() => sendReset(r)} className="rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50">Password reset</button>
                  <button disabled={busyId === r.id} onClick={() => toggleActive(r)} className="rounded-md border border-border px-3 py-1.5 text-xs disabled:opacity-50">{r.active ? "Deactivate" : "Activate"}</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

const inp = "w-full rounded-lg border border-input bg-secondary px-3 py-2.5 text-sm focus:border-primary focus:outline-none disabled:opacity-60";
function Lbl({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
