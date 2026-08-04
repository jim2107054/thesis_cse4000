export const dynamic = "force-dynamic";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateSettingsAction } from "@/lib/admin-actions";
import { getSetting, SETTING_KEYS } from "@/lib/settings";

export default async function SettingsPage() {
  const votesRequired = await getSetting(SETTING_KEYS.votesRequired, "3");
  const countRemoved = await getSetting(SETTING_KEYS.countRemovedAnnotatorVotes, "false");
  const isEven = Number(votesRequired) % 2 === 0;
  return <main className="max-w-2xl space-y-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Settings</h1><p className="text-sm text-muted-foreground">Project-level vote counting rules.</p></div>{isEven && <Alert><AlertTitle>Even vote requirement</AlertTitle><AlertDescription>Even numbers increase the chance of ties. Ties are preserved for review and never auto-resolved.</AlertDescription></Alert>}<Card><CardHeader><CardTitle>Labeling rules</CardTitle></CardHeader><CardContent><form action={updateSettingsAction} className="space-y-4"><div className="space-y-2"><Label htmlFor="votes_required">Votes required</Label><Input id="votes_required" name="votes_required" type="number" min="1" defaultValue={votesRequired} /></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="count_removed_annotator_votes" defaultChecked={countRemoved === "true"} /> Count inactive annotator votes in majority results</label><Button type="submit">Save settings</Button></form></CardContent></Card></main>;
}
