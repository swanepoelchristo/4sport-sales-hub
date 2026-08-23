import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";

type RepDocument = {
  id: string;
  rep_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  effective_date: string | null;
  expiry_date: string | null;
  uploaded_by: string | null;
  created_at: string;
};

type DocumentDb = {
  public: {
    Tables: {
      rep_documents: {
        Row: RepDocument;
        Insert: Omit<RepDocument, "id" | "created_at"> & { id?: string; created_at?: string };
        Update: Partial<RepDocument>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

const db = supabase as unknown as SupabaseClient<DocumentDb>;
const TYPES = ["NDA", "Sales Representative Agreement", "Addendum", "Compliance", "Other"];

export function RepDocuments({ repId, admin = false }: { repId: string; admin?: boolean }) {
  const { user, addActivity } = useStore();
  const [documents, setDocuments] = useState<RepDocument[]>([]);
  const [documentType, setDocumentType] = useState("NDA");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!repId) return;
    const { data, error: loadError } = await db
      .from("rep_documents")
      .select("*")
      .eq("rep_id", repId)
      .order("created_at", { ascending: false });
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setDocuments(data ?? []);
  }, [repId]);

  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File) => {
    if (!admin || !user || !repId) return;
    if (file.type && file.type !== "application/pdf") {
      setError("Rep evidence must be uploaded as a PDF.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${repId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("rep-documents")
        .upload(path, file, { contentType: file.type || "application/pdf", upsert: false });
      if (uploadError) throw uploadError;

      const { error: rowError } = await db.from("rep_documents").insert({
        rep_id: repId,
        document_type: documentType,
        file_name: file.name,
        file_path: path,
        mime_type: file.type || "application/pdf",
        size_bytes: file.size,
        effective_date: null,
        expiry_date: null,
        uploaded_by: user.auth_id,
      });
      if (rowError) {
        await supabase.storage.from("rep-documents").remove([path]);
        throw rowError;
      }
      addActivity("Rep document uploaded", `${documentType}: ${file.name}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const openDocument = async (doc: RepDocument) => {
    setError(null);
    const { data, error: signedError } = await supabase.storage
      .from("rep-documents")
      .createSignedUrl(doc.file_path, 60);
    if (signedError) {
      setError(signedError.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-cyan-950/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-slate-950">Signed documents</h2>
          <p className="mt-1 text-sm text-slate-600">Private soft-copy evidence for this representative.</p>
        </div>
        {admin && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
              {TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
            <label className="cursor-pointer rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">
              {busy ? "Uploading…" : "Upload PDF"}
              <input type="file" accept="application/pdf,.pdf" disabled={busy} className="hidden" onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
                e.currentTarget.value = "";
              }} />
            </label>
          </div>
        )}
      </div>
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {documents.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No signed documents stored yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">{doc.document_type}</p>
                <p className="text-xs text-slate-500">{doc.file_name} · {new Date(doc.created_at).toLocaleDateString("en-ZA")}</p>
              </div>
              <button type="button" onClick={() => void openDocument(doc)} className="text-xs font-bold uppercase tracking-wider text-cyan-700">Open secure copy</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
