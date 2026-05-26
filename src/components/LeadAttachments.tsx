import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/lib/store";
import { audit } from "@/lib/audit";
import { Paperclip, Upload, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface Attachment {
  id: string;
  lead_id: string;
  uploaded_by: string | null;
  file_name: string;
  file_path: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

export function LeadAttachments({ leadId }: { leadId: string }) {
  const { user } = useStore();
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("lead_attachments")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });
    if (error) console.error("[attachments load]", error);
    setItems((data ?? []) as Attachment[]);
    setLoading(false);
  }, [leadId]);

  useEffect(() => { void load(); }, [load]);

  const onUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `leads/${leadId}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("lead-attachments")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      toast.error("Upload failed: " + upErr.message);
      setUploading(false);
      return;
    }
    const { error: insErr } = await supabase.from("lead_attachments").insert({
      lead_id: leadId,
      uploaded_by: user.auth_id,
      file_name: file.name,
      file_path: path,
      mime_type: file.type || "application/octet-stream",
      size_bytes: file.size,
    });
    if (insErr) {
      toast.error("Could not record attachment: " + insErr.message);
      await supabase.storage.from("lead-attachments").remove([path]);
    } else {
      void audit("attachment.upload", file.name, { entityType: "lead", entityId: leadId });
      toast.success("Uploaded");
      await load();
    }
    setUploading(false);
  };

  const onDelete = async (a: Attachment) => {
    if (!confirm(`Delete ${a.file_name}?`)) return;
    const { error: e1 } = await supabase.storage.from("lead-attachments").remove([a.file_path]);
    if (e1) toast.error(e1.message);
    const { error: e2 } = await supabase.from("lead_attachments").delete().eq("id", a.id);
    if (e2) { toast.error(e2.message); return; }
    void audit("attachment.delete", a.file_name, { entityType: "lead", entityId: leadId });
    await load();
  };

  const open = async (a: Attachment) => {
    const { data, error } = await supabase.storage
      .from("lead-attachments")
      .createSignedUrl(a.file_path, 60 * 10);
    if (error || !data) { toast.error("Could not open file"); return; }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg uppercase tracking-wider text-foreground flex items-center gap-2">
          <Paperclip className="h-4 w-4" /> Attachments
        </h2>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
          <Upload className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload file"}
          <input
            type="file" hidden disabled={uploading}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ""; }}
          />
        </label>
      </div>
      {loading ? (
        <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
          No files attached yet. PDFs, photos, agreements and quotes can be uploaded here.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {(a.size_bytes / 1024).toFixed(1)} KB · {new Date(a.created_at).toLocaleDateString("en-ZA")}
                </p>
              </div>
              <button onClick={() => open(a)} className="rounded-md border border-border p-2 text-muted-foreground hover:text-foreground" title="Open">
                <ExternalLink className="h-4 w-4" />
              </button>
              <button onClick={() => onDelete(a)} className="rounded-md border border-destructive/40 p-2 text-destructive" title="Delete">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
