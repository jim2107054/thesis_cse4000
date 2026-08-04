export const dynamic = "force-dynamic";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExportPage() {
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Export</h1><p className="text-sm text-muted-foreground">Download CSV files compatible with the legacy analysis scripts.</p></div><div className="grid gap-4 md:grid-cols-2"><Card><CardHeader><CardTitle>votes.csv</CardTitle><CardDescription>Image_name, Annotator, Label, Timestamp</CardDescription></CardHeader><CardContent><Button asChild><a href="/api/admin/export/votes"><Download className="mr-2 size-4" />Download votes</a></Button></CardContent></Card><Card><CardHeader><CardTitle>labels.csv</CardTitle><CardDescription>Image_name, Label, Votes_For, Total_Votes, Overridden</CardDescription></CardHeader><CardContent><Button asChild><a href="/api/admin/export/labels"><Download className="mr-2 size-4" />Download labels</a></Button></CardContent></Card></div></main>;
}
