"use client";

import Image from "next/image";
import { useCallback, useEffect, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Search, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

type ImageClass = { id: string; name: string; colorHex: string | null; sortOrder: number };
type LabelImage = {
  id: string;
  filename: string;
  publicUrl: string | null;
  annotations: Array<{ classId: string; imageClass: { name: string } }>;
  labelResult: { finalClass: { name: string } | null; votesFor: number; totalVotes: number; isTie: boolean } | null;
};
type Payload = { image: LabelImage | null; classes: ImageClass[]; progress: { labeled: number; total: number; required: number } };

export function LabelingClient({ initial }: { initial: Payload }) {
  const [data, setData] = useState(initial);
  const [onlyUnvoted, setOnlyUnvoted] = useState(true);
  const [jump, setJump] = useState("");
  const [isPending, startTransition] = useTransition();
  const selectedClassId = data.image?.annotations[0]?.classId;
  const percent = data.progress.total ? (data.progress.labeled / data.progress.total) * 100 : 0;

  const load = useCallback((direction = "next", filename?: string) => {
    startTransition(async () => {
      const params = new URLSearchParams({ onlyUnvoted: String(onlyUnvoted), direction });
      if (data.image?.id) params.set("currentId", data.image.id);
      if (filename) params.set("filename", filename);
      const response = await fetch(`/api/label/next?${params}`);
      setData(await response.json());
    });
  }, [data.image?.id, onlyUnvoted]);

  const vote = useCallback((classId: string) => {
    const previous = data;
    load("next");
    fetch("/api/label/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageId: previous.image?.id, classId }) }).catch(() => setData(previous));
  }, [data, load]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const index = Number.parseInt(event.key, 10) - 1;
      if (index >= 0 && index < Math.min(data.classes.length, 9)) vote(data.classes[index].id);
      if (event.key === "ArrowRight") load("next");
      if (event.key === "ArrowLeft") load("prev");
      if (event.key.toLowerCase() === "s") load("next");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data.classes, load, vote]);

  return (
    <main className="mx-auto grid min-h-screen w-full max-w-6xl grid-rows-[auto_1fr_auto] gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Label Images</h1>
          <p className="text-sm text-muted-foreground">{data.progress.labeled} / {data.progress.total} labeled</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Required: {data.progress.required}</Badge>
          <label className="flex items-center gap-2 text-sm"><Switch checked={onlyUnvoted} onCheckedChange={setOnlyUnvoted} /> Only unvoted</label>
        </div>
      </header>

      <section className="grid min-h-0 gap-4 lg:grid-cols-[1fr_18rem]">
        <div className="flex min-h-[420px] items-center justify-center rounded-lg border bg-muted/30 p-3">
          {data.image?.publicUrl ? (
            <Image src={data.image.publicUrl} alt={data.image.filename} width={1100} height={800} className="max-h-[70vh] w-auto max-w-full object-contain" unoptimized />
          ) : (
            <div className="text-center text-sm text-muted-foreground">No image available</div>
          )}
        </div>
        <aside className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-sm font-medium">{data.image?.filename ?? "Complete"}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Majority so far: {data.image?.labelResult?.isTie ? "Tie" : data.image?.labelResult?.finalClass?.name ?? "None"} ({data.image?.labelResult?.votesFor ?? 0}/{data.progress.required})
            </p>
          </div>
          <div className="grid gap-2">
            {data.classes.map((item, index) => (
              <Button key={item.id} variant={selectedClassId === item.id ? "default" : "outline"} onClick={() => vote(item.id)} disabled={!data.image || isPending} className="justify-start">
                <span className="mr-2 inline-flex size-6 items-center justify-center rounded border text-xs">{index + 1}</span>{item.name}
              </Button>
            ))}
          </div>
        </aside>
      </section>

      <footer className="space-y-3 border-t pt-4">
        <Progress value={percent} />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => load("prev")}><ArrowLeft className="mr-2 size-4" />Prev</Button>
            <Button variant="outline" onClick={() => load("next")}><ArrowRight className="mr-2 size-4" />Next</Button>
            <Button variant="outline" onClick={() => load("next")}><SkipForward className="mr-2 size-4" />Skip</Button>
          </div>
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); load("next", jump); }}>
            <Input value={jump} onChange={(event) => setJump(event.target.value)} placeholder="Jump to filename" />
            <Button type="submit" variant="outline"><Search className="size-4" /></Button>
          </form>
        </div>
      </footer>
    </main>
  );
}
