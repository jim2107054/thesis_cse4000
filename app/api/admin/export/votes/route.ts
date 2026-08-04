import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const rows = await prisma.annotation.findMany({ include: { image: true, user: true, imageClass: true }, orderBy: { updatedAt: "asc" } });
  const csv = Papa.unparse(rows.map((row) => ({ Image_name: row.image.filename, Annotator: row.user.name ?? row.user.email, Label: row.imageClass.name, Timestamp: row.updatedAt.toISOString() })));
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="votes.csv"' } });
}
