import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { PageHeader, EmptyState } from "@/components/ui-bits";

export const Route = createFileRoute("/_app/activity")({ component: ActivityPage });

function ActivityPage() {
  const { state, user } = useStore();
  if (!user) return null;
  if (user.role !== "admin") {
    return <PageHeader title="Not authorised" subtitle="Only admins can view the activity log." />;
  }

  return (
    <>
      <PageHeader title="Activity log" subtitle="Audit trail of changes made by reps and admins." />
      {state.activity.length === 0 ? (
        <EmptyState>No activity recorded yet.</EmptyState>
      ) : (
        <ol className="space-y-2">
          {state.activity.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{a.action} — <span className="text-muted-foreground">{a.detail}</span></p>
                <p className="text-xs text-muted-foreground">{new Date(a.at).toLocaleString("en-ZA")}</p>
              </div>
              <p className="text-xs text-muted-foreground">by {a.actor_name}</p>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
