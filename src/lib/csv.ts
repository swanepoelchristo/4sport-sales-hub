// CSV export utility (no deps). Quotes values per RFC 4180.
function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T extends object>(rows: T[], columns?: (keyof T)[]): string {
  if (rows.length === 0) return columns ? (columns as string[]).join(",") + "\n" : "";
  const cols = (columns ?? (Object.keys(rows[0] as object) as (keyof T)[])) as string[];
  const head = cols.join(",");
  const body = rows.map((r) => cols.map((c) => esc((r as Record<string, unknown>)[c])).join(",")).join("\n");
  return head + "\n" + body + "\n";
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportRowsAsCsv<T extends object>(
  filename: string,
  rows: T[],
  columns?: (keyof T)[],
) {
  downloadCsv(filename, toCsv(rows, columns));
}
