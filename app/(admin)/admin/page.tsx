export const dynamic = "force-dynamic";

import { format, subDays } from "date-fns";
import { prisma } from "@/lib/db";
import { getVotesRequired } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VotesChart } from "@/components/admin/votes-chart";

export default async function AdminPage() {
  const required = await getVotesRequired();
  const today = new Date();
  const weekStart = subDays(today, 7);
  const [totalImages, finalCount, inProgress, ties, annotators, votesToday, votesWeek, history] = await Promise.all([
    prisma.imageAsset.count(),
    prisma.labelResult.count({ where: { totalVotes: { gte: required }, isTie: false } }),
    prisma.labelResult.count({ where: { totalVotes: { gt: 0, lt: required } } }),
    prisma.labelResult.count({ where: { isTie: true } }),
    prisma.user.count({ where: { role: "ANNOTATOR", isActive: true } }),
    prisma.annotationHistory.count({ where: { timestamp: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } } }),
    prisma.annotationHistory.count({ where: { timestamp: { gte: weekStart } } }),
    prisma.annotationHistory.findMany({ where: { timestamp: { gte: subDays(today, 13) }, action: { in: ["CREATED", "CHANGED"] } }, select: { timestamp: true } }),
  ]);
  const chart = Array.from({ length: 14 }, (_, index) => {
    const date = subDays(today, 13 - index);
    const key = format(date, "MMM d");
    return { day: key, votes: history.filter((row) => format(row.timestamp, "MMM d") === key).length };
  });
  const cards = [
    ["Total images", totalImages], ["Fully labeled", finalCount], ["In progress", inProgress], ["Ties needing review", ties], ["Active annotators", annotators], ["Votes today", votesToday], ["Votes this week", votesWeek],
  ];
  return <main className="space-y-6 p-6"><div><h1 className="text-2xl font-semibold tracking-tight">Overview</h1><p className="text-sm text-muted-foreground">Current dataset progress and audit activity.</p></div><section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value]) => <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><div className="text-3xl font-semibold">{value}</div></CardContent></Card>)}</section><Card><CardHeader><CardTitle>Votes cast per day</CardTitle></CardHeader><CardContent><VotesChart data={chart} /></CardContent></Card></main>;
}
