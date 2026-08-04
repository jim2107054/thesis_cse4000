"use client";

import { useMemo, useState, useTransition } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";

type UploadRow = { name: string; progress: number; status: "queued" | "uploaded" | "skipped" | "failed" };

export function ImageUploader() {
  const [batch, setBatch] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<UploadRow[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const accept = useMemo(() => ({ accept: "image/png,image/jpeg" }), []);

  function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = Array.from(files).filter((file) => ["image/jpeg", "image/png"].includes(file.type));
    setRows(selected.map((file) => ({ name: file.name, progress: 0, status: "queued" })));
    setSummary(null);
    startTransition(async () => {
      let uploaded = 0;
      let skipped = 0;
      for (const file of selected) {
        setRows((old) => old.map((row) => row.name === file.name ? { ...row, progress: 35 } : row));
        const form = new FormData();
        form.append("file", file);
        form.append("datasetBatch", batch);
        const response = await fetch("/api/admin/images/upload", { method: "POST", body: form });
        const result = await response.json();
        if (result.uploaded) uploaded++;
        if (result.skipped) skipped++;
        setRows((old) => old.map((row) => row.name === file.name ? { ...row, progress: 100, status: result.uploaded ? "uploaded" : result.skipped ? "skipped" : "failed" } : row));
      }
      setSummary(`${uploaded} uploaded, ${skipped} skipped (duplicate filename)`);
      if (uploaded) toast.success("Upload complete");
    });
  }

  return (
    <div className="space-y-4 rounded-lg border border-dashed p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2"><label className="text-sm font-medium" htmlFor="batch">Dataset batch</label><Input id="batch" value={batch} onChange={(event) => setBatch(event.target.value)} className="max-w-xs" /></div>
        <Button asChild disabled={isPending}><label className="cursor-pointer"><UploadCloud className="mr-2 size-4" /> Upload images<input className="sr-only" type="file" multiple {...accept} onChange={(event) => onFiles(event.target.files)} /></label></Button>
      </div>
      {rows.length > 0 && <div className="space-y-2">{rows.map((row) => <div key={row.name} className="grid gap-1 text-sm"><div className="flex justify-between"><span>{row.name}</span><span className="text-muted-foreground">{row.status}</span></div><Progress value={row.progress} /></div>)}</div>}
      {summary && <p className="text-sm font-medium">{summary}</p>}
    </div>
  );
}
