export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { Filter, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function formatMetadata(value: unknown) {
  if (!value) return "";
  const text = JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}...` : text;
}

export default async function AuditPage({ searchParams }: { searchParams: { action?: string; actor?: string; entity?: string } }) {
  const action = String(searchParams.action ?? "all");
  const actor = String(searchParams.actor ?? "").trim();
  const entity = String(searchParams.entity ?? "all");
  const where: Prisma.AuditLogWhereInput = {
    ...(action !== "all" ? { action } : {}),
    ...(entity !== "all" ? { entityType: entity } : {}),
    ...(actor ? { OR: [{ actorEmail: { contains: actor, mode: "insensitive" } }, { actor: { name: { contains: actor, mode: "insensitive" } } }] } : {}),
  };

  const [logs, actions, entities] = await Promise.all([
    prisma.auditLog.findMany({ where, include: { actor: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.auditLog.findMany({ select: { action: true }, distinct: ["action"], orderBy: { action: "asc" } }),
    prisma.auditLog.findMany({ where: { entityType: { not: null } }, select: { entityType: true }, distinct: ["entityType"], orderBy: { entityType: "asc" } }),
  ]);

  return (
    <main className="pos-page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Audit Log</h1>
          <p className="text-sm text-[#646B72]">Track logins, annotations, admin changes, uploads, and overrides.</p>
        </div>
        <span className="pos-badge bg-[#0DCAF0] text-[#092C4C]">Latest {logs.length} records</span>
      </div>

      <form className="pos-card grid gap-4 md:grid-cols-[1fr_1fr_1.2fr_auto]" action="/admin/audit">
        <select className="pos-input w-full" name="action" defaultValue={action}>
          <option value="all">All actions</option>
          {actions.map((item) => <option key={item.action} value={item.action}>{item.action}</option>)}
        </select>
        <select className="pos-input w-full" name="entity" defaultValue={entity}>
          <option value="all">All entities</option>
          {entities.map((item) => item.entityType && <option key={item.entityType} value={item.entityType}>{item.entityType}</option>)}
        </select>
        <input className="pos-input w-full" name="actor" defaultValue={actor} placeholder="Search actor name or email" />
        <Button className="pos-button-primary" type="submit"><Filter className="size-4" />Apply</Button>
      </form>

      <div className="pos-table-wrap">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8F9FA]">
              <TableHead className="text-[#646B72]">Time</TableHead>
              <TableHead className="text-[#646B72]">Action</TableHead>
              <TableHead className="text-[#646B72]">Actor</TableHead>
              <TableHead className="text-[#646B72]">Entity</TableHead>
              <TableHead className="text-[#646B72]">Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="whitespace-nowrap text-[#646B72]">{log.createdAt.toLocaleString()}</TableCell>
                <TableCell><Badge className="pos-badge border-0 bg-[#092C4C] text-white"><ShieldCheck className="mr-1 size-3" />{log.action}</Badge></TableCell>
                <TableCell className="text-[#212B36]">
                  <div className="font-semibold">{log.actor?.name ?? log.actorEmail ?? "System"}</div>
                  <div className="text-xs text-[#646B72]">{log.actorEmail ?? log.actor?.email ?? ""}</div>
                </TableCell>
                <TableCell className="text-[#646B72]">{log.entityType ?? "-"}{log.entityId ? ` / ${log.entityId}` : ""}</TableCell>
                <TableCell className="max-w-xl text-xs text-[#646B72]">{formatMetadata(log.metadata)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {logs.length === 0 && <div className="pos-card text-sm text-[#646B72]">No audit records match these filters.</div>}
    </main>
  );
}
