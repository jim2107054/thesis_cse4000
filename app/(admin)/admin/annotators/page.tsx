export const dynamic = "force-dynamic";

import { UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { createAnnotatorAction, toggleAnnotatorAction } from "@/lib/admin-actions";
import { GeneratedPasswordNotice } from "@/components/admin/generated-password-notice";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default async function AnnotatorsPage({ searchParams }: { searchParams: { email?: string; password?: string } }) {
  const annotators = await prisma.user.findMany({ where: { role: "ANNOTATOR" }, orderBy: { createdAt: "desc" }, include: { _count: { select: { annotations: true } } } });
  return <main className="space-y-6 p-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Annotators</h1><p className="text-sm text-muted-foreground">Create accounts and preserve historical votes.</p></div><Dialog><DialogTrigger asChild><Button><UserPlus className="mr-2 size-4" />Add annotator</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Add annotator</DialogTitle></DialogHeader><form action={createAnnotatorAction} className="space-y-4"><div className="space-y-2"><Label>Name</Label><Input name="name" required /></div><div className="space-y-2"><Label>Email</Label><Input name="email" type="email" required /></div><Button type="submit">Create account</Button></form></DialogContent></Dialog></div><GeneratedPasswordNotice email={searchParams.email} password={searchParams.password} /><div className="rounded-lg border"><Table><TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Joined</TableHead><TableHead>Votes</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Toggle</TableHead></TableRow></TableHeader><TableBody>{annotators.map((user) => <TableRow key={user.id}><TableCell>{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.createdAt.toLocaleDateString()}</TableCell><TableCell>{user._count.annotations}</TableCell><TableCell><Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Active" : "Inactive"}</Badge></TableCell><TableCell className="text-right"><form action={toggleAnnotatorAction}><input type="hidden" name="id" value={user.id} /><input type="hidden" name="isActive" value={String(!user.isActive)} /><Button variant="outline">{user.isActive ? "Deactivate" : "Activate"}</Button></form></TableCell></TableRow>)}</TableBody></Table></div></main>;
}
