"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function GeneratedPasswordNotice({ email, password }: { email?: string; password?: string }) {
  if (!email || !password) return null;
  return (
    <div className="rounded-lg border bg-muted/40 p-4 text-sm">
      <p className="font-medium">Generated login for {email}</p>
      <div className="mt-2 flex items-center gap-2">
        <code className="rounded bg-background px-2 py-1">{password}</code>
        <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(password); toast.success("Password copied"); }} aria-label="Copy password">
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}
