import { NextResponse } from "next/server";
import Papa from "papaparse";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export async function GET() {
  await requireAdmin();
  const rows = await prisma.labelResult.findMany({ include: { image: true, finalClass: true }, orderBy: { image: { filename: "asc" } } });
  const csv = Papa.unparse(rows.map((row) => ({ Image_name: row.image.filename, Label: row.isTie && !row.isOverridden ? "TIE - Needs Review" : row.finalClass?.name ?? "", Votes_For: row.votesFor, Total_Votes: row.totalVotes, Overridden: row.isOverridden ? "TRUE" : "FALSE" })));
  return new NextResponse(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="labels.csv"' } });
}
