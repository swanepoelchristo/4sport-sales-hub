import { useMemo } from "react";
import { useStore } from "@/lib/store";
import { Clock, Calendar, Banknote, FileText, Activity } from "lucide-react";

type Item = {
  at: string;
  kind: "note" | "meeting" | "signup" | "activity";
  title: string;
  detail?: string;
};

export function LeadTimeline({ leadId }: { leadId: string }) {
  const { state } = useStore();

  const items = useMemo<Item[]>(() => {
    const lead = state.leads.find((l) => l.id === leadId);
    const result: Item[] = [];
    if (lead) {
      result.push({
        at: lead.created_at,
        kind: "note",
        title: "Lead created",
        detail: `${lead.org_name} (${lead.status})`,
      });
      if (lead.notes?.trim()) {
        result.push({ at: lead.created_at, kind: "note", title: "Notes", detail: lead.notes });
      }
    }
    for (const m of state.meetings.filter((x) => x.lead_id === leadId)) {
      result.push({
        at: m.meeting_at,
        kind: "meeting",
        title: `${m.meeting_type} meeting — ${m.status}`,
        detail: m.outcome_notes || m.next_action || undefined,
      });
    }
    for (const s of state.signups.filter((x) => x.lead_id === leadId)) {
      result.push({
        at: s.signed_date,
        kind: "signup",
        title: `Signup recorded — ${s.commission_year}`,
        detail: `Paid: ${s.paid ? "Yes" : "No"} · Teams: ${s.active_teams} · Commission: ${s.commission_payment_status}`,
      });
    }
    for (const a of state.activity.filter((x) => x.detail?.toLowerCase().includes((state.leads.find((l) => l.id === leadId)?.org_name ?? "").toLowerCase()) && (state.leads.find((l) => l.id === leadId)?.org_name?.length ?? 0) > 0)) {
      result.push({ at: a.at, kind: "activity", title: a.action, detail: a.detail });
    }
    return result.sort((a, b) => +new Date(b.at) - +new Date(a.at));
  }, [state, leadId]);

  const icon = (k: Item["kind"]) => {
    const m = { note: FileText, meeting: Calendar, signup: Banknote, activity: Activity } as const;
    const C = m[k];
    return <C className="h-3.5 w-3.5" />;
  };

  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg uppercase tracking-wider text-foreground">
        <Clock className="h-4 w-4" /> Timeline
      </h2>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          Nothing logged yet.
        </div>
      ) : (
        <ol className="relative space-y-3 rounded-xl border border-border bg-card p-4">
          {items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                {icon(it.kind)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <p className="text-sm font-medium">{it.title}</p>
                  <p className="text-xs text-muted-foreground">{new Date(it.at).toLocaleString("en-ZA")}</p>
                </div>
                {it.detail && <p className="mt-0.5 text-xs text-muted-foreground whitespace-pre-wrap">{it.detail}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
