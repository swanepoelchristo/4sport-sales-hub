import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { PageHeader, Section, EmptyState } from "@/components/ui-bits";
import { HowToUse } from "@/components/HowToUse";
import { commissionQualified, commissionAmount } from "@/lib/types";
import { Download } from "lucide-react";
import { exportRowsAsCsv } from "@/lib/csv";
import { audit } from "@/lib/audit";

export const Route = createFileRoute("/_app/performance")({ component: PerformancePage });

function PerformancePage() {
  const { state, user } = useStore();
  if (!user) return null;
  if (user.role !== "admin") {
    return <PageHeader title="Not authorised" subtitle="Admin only." />;
  }

  const rows = useMemo(() => {
    return state.reps.map((r) => {
      const leads = state.leads.filter((l) => l.assigned_rep_id === r.id);
      const meetings = state.meetings.filter((m) => m.rep_id === r.id);
      const signups = state.signups.filter((s) => s.rep_id === r.id);
      const completed = meetings.filter((m) => m.status === "Completed").length;
      const signed = leads.filter((l) => ["Signed", "Paid", "Active"].includes(l.status)).length;
      const paid = signups.filter((s) => s.paid).length;
      const qualified = signups.filter(commissionQualified).length;
      const commission = signups.reduce((sum, s) => sum + commissionAmount(s), 0);
      const conversion = leads.length === 0 ? 0 : Math.round((signed / leads.length) * 100);
      return {
        rep_id: r.id,
        rep: r.full_name,
        province: r.province,
        leads: leads.length,
        meetings_completed: completed,
        signed,
        paid,
        qualified,
        commission,
        conversion_pct: conversion,
      };
    });
  }, [state]);

  // Province breakdown
  const provinceRows = useMemo(() => {
    const byProv = new Map<string, { leads: number; signed: number }>();
    for (const l of state.leads) {
      const key = l.province || "Unknown";
      const cur = byProv.get(key) ?? { leads: 0, signed: 0 };
      cur.leads += 1;
      if (["Signed", "Paid", "Active"].includes(l.status)) cur.signed += 1;
      byProv.set(key, cur);
    }
    return [...byProv.entries()]
      .map(([province, v]) => ({
        province,
        leads: v.leads,
        signed: v.signed,
        conversion_pct: v.leads ? Math.round((v.signed / v.leads) * 100) : 0,
      }))
      .sort((a, b) => b.leads - a.leads);
  }, [state.leads]);

  const exportRepCsv = () => {
    exportRowsAsCsv(`rep-performance-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    void audit("export.csv", "rep-performance");
  };

  return (
    <>
      <PageHeader
        title="Rep performance"
        subtitle="Per-rep pipeline and conversion KPIs."
        action={
          <button onClick={exportRepCsv} className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />

      <HowToUse adminOnly>
        <p><strong>What this page is for:</strong> compare reps on leads, meetings, signups and commission. <em>Admin use only.</em></p>
        <p className="mt-2"><strong>What to do here:</strong></p>
        <ul>
          <li>Scan the per-rep table for low conversion or stalled pipelines.</li>
          <li>Export to CSV for sharing or reporting.</li>
        </ul>
        <p className="mt-2"><strong>Before moving on:</strong> follow up with any rep showing red flags.</p>
      </HowToUse>

      {rows.length === 0 ? (

        <EmptyState>No reps yet.</EmptyState>
      ) : (
        <Section title="Per rep">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left">Rep</th>
                  <th className="px-4 py-2 text-left">Province</th>
                  <th className="px-4 py-2 text-right">Leads</th>
                  <th className="px-4 py-2 text-right">Meetings done</th>
                  <th className="px-4 py-2 text-right">Signed</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">Qualified</th>
                  <th className="px-4 py-2 text-right">Conversion</th>
                  <th className="px-4 py-2 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.rep_id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{r.rep}</td>
                    <td className="px-4 py-3">{r.province || "—"}</td>
                    <td className="px-4 py-3 text-right">{r.leads}</td>
                    <td className="px-4 py-3 text-right">{r.meetings_completed}</td>
                    <td className="px-4 py-3 text-right">{r.signed}</td>
                    <td className="px-4 py-3 text-right">{r.paid}</td>
                    <td className="px-4 py-3 text-right">{r.qualified}</td>
                    <td className="px-4 py-3 text-right">{r.conversion_pct}%</td>
                    <td className="px-4 py-3 text-right font-medium">R {r.commission.toLocaleString("en-ZA")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Province breakdown">
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Province</th>
                <th className="px-4 py-2 text-right">Leads</th>
                <th className="px-4 py-2 text-right">Signed</th>
                <th className="px-4 py-2 text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {provinceRows.map((p) => (
                <tr key={p.province} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{p.province}</td>
                  <td className="px-4 py-3 text-right">{p.leads}</td>
                  <td className="px-4 py-3 text-right">{p.signed}</td>
                  <td className="px-4 py-3 text-right">{p.conversion_pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </>
  );
}
