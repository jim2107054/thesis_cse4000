export const dynamic = "force-dynamic";

import { ArrowDown, ArrowUp, Palette, Save, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { ColorPickerField } from "@/components/admin/color-picker-field";
import { createClassAction, deleteOrHideClassAction, moveClassAction, updateClassAction } from "@/lib/admin-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ClassesPage() {
  const classes = await prisma.imageClass.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { annotations: true } } } });
  return (
    <main className="pos-page space-y-6">
      <div>
        <h1>Classes</h1>
        <p className="text-sm text-[#646B72]">Manage labels, color coding, and display order.</p>
      </div>

      <form action={createClassAction} className="pos-card grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
        <Input name="name" placeholder="Class name" required className="pos-input" />
        <ColorPickerField label="Pick new class color" defaultValue="#0D6EFD" />
        <Button type="submit" className="pos-button-primary"><Palette className="size-4" />Add</Button>
      </form>

      <div className="pos-table-wrap">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8F9FA]">
              <TableHead className="text-[#646B72]">Order</TableHead>
              <TableHead className="text-[#646B72]">Name</TableHead>
              <TableHead className="text-[#646B72]">Color</TableHead>
              <TableHead className="text-[#646B72]">Status</TableHead>
              <TableHead className="text-[#646B72]">Votes</TableHead>
              <TableHead className="text-right text-[#646B72]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classes.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="w-28">
                  <div className="flex gap-1">
                    <form action={moveClassAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="direction" value="up" /><Button size="icon" variant="ghost" className="pos-icon-button" title="Move up"><ArrowUp className="size-4" /></Button></form>
                    <form action={moveClassAction}><input type="hidden" name="id" value={item.id} /><input type="hidden" name="direction" value="down" /><Button size="icon" variant="ghost" className="pos-icon-button" title="Move down"><ArrowDown className="size-4" /></Button></form>
                  </div>
                </TableCell>
                <TableCell>
                  <form id={`class-${item.id}`} action={updateClassAction} className="flex gap-2">
                    <input type="hidden" name="id" value={item.id} />
                    <Input name="name" defaultValue={item.name} className="pos-input min-w-48" />
                  </form>
                </TableCell>
                <TableCell>
                  <ColorPickerField form={`class-${item.id}`} label={`Pick color for ${item.name}`} defaultValue={item.colorHex} />
                </TableCell>
                <TableCell>
                  <label className="flex items-center gap-2 text-sm text-[#212B36]"><input form={`class-${item.id}`} type="checkbox" name="isActive" defaultChecked={item.isActive} />{item.isActive ? "Active" : "Hidden"}</label>
                </TableCell>
                <TableCell className="font-semibold text-[#212B36]">{item._count.annotations}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button form={`class-${item.id}`} type="submit" className="pos-button-primary"><Save className="size-4" />Save</Button>
                    <form action={deleteOrHideClassAction}><input type="hidden" name="id" value={item.id} /><Button size="icon" variant="ghost" className="pos-icon-button text-[#DC3545]" title={item._count.annotations ? "Hide class because votes exist" : "Delete class"}><Trash2 className="size-4" /></Button></form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}

