export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db";
import { toggleAnnotatorAction } from "@/lib/admin-actions";
import { AddAnnotatorDialog } from "@/components/admin/add-annotator-dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AnnotatorsPage({ searchParams }: { searchParams: { email?: string; created?: string } }) {
  const annotators = await prisma.user.findMany({ where: { role: "ANNOTATOR" }, orderBy: { createdAt: "desc" }, include: { _count: { select: { annotations: true } } } });
  return (
    <main className="pos-page space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1>Annotators</h1>
          <p className="text-sm text-[#646B72]">Create login accounts and preserve historical votes.</p>
        </div>
        <AddAnnotatorDialog />
      </div>

      {searchParams.created === "1" && searchParams.email && <div className="pos-card border-[#198754] bg-[#198754]/10 text-sm font-semibold text-[#198754]">Annotator account created for {searchParams.email}. They can log in with the password you set.</div>}
      {searchParams.created === "0" && <div className="pos-card border-[#DC3545] bg-[#DC3545]/10 text-sm font-semibold text-[#DC3545]">Could not create annotator. Name, email, and a password of at least 6 characters are required.</div>}

      <div className="pos-table-wrap">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8F9FA]">
              <TableHead className="text-[#646B72]">Name</TableHead>
              <TableHead className="text-[#646B72]">Email</TableHead>
              <TableHead className="text-[#646B72]">Joined</TableHead>
              <TableHead className="text-[#646B72]">Votes</TableHead>
              <TableHead className="text-[#646B72]">Status</TableHead>
              <TableHead className="text-right text-[#646B72]">Toggle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {annotators.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-semibold text-[#212B36]">{user.name}</TableCell>
                <TableCell className="text-[#646B72]">{user.email}</TableCell>
                <TableCell className="text-[#646B72]">{user.createdAt.toLocaleDateString()}</TableCell>
                <TableCell className="font-semibold text-[#212B36]">{user._count.annotations}</TableCell>
                <TableCell><Badge className={`pos-badge border-0 ${user.isActive ? "bg-[#198754] text-white" : "bg-[#FE9F43] text-white"}`}>{user.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                <TableCell className="text-right">
                  <form action={toggleAnnotatorAction}>
                    <input type="hidden" name="id" value={user.id} />
                    <input type="hidden" name="isActive" value={String(!user.isActive)} />
                    <Button className={user.isActive ? "pos-button-secondary" : "pos-button-primary"}>{user.isActive ? "Deactivate" : "Activate"}</Button>
                  </form>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
