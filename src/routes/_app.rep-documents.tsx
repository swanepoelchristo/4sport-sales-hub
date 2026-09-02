import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/ui-bits";
import { RepDocuments } from "@/components/RepDocuments";

export const Route = createFileRoute("/_app/rep-documents")({ component: RepDocumentsPage });

function RepDocumentsPage() {
  const { user, state } = useStore();
  const [selectedRepId, setSelectedRepId] = useState("");
  if (!user) return null;

  const isAdmin = user.role === "admin";
  const repId = isAdmin ? (selectedRepId || state.reps[0]?.id || "") : user.id;

  return (
    <div className="space-y-5">
      <PageHeader title="Rep documents" subtitle="Private signed NDA, contract and compliance evidence." />
      {isAdmin && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Representative</label>
          <select className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm md:max-w-md" value={repId} onChange={(e) => setSelectedRepId(e.target.value)}>
            {state.reps.map((rep) => <option key={rep.id} value={rep.id}>{rep.full_name} · {rep.email}</option>)}
          </select>
        </div>
      )}
      {repId ? <RepDocuments repId={repId} admin={isAdmin} /> : <p className="text-sm text-slate-500">No representative is available yet.</p>}
    </div>
  );
}
