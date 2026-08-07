export const dynamic = "force-dynamic";

import { format, subDays } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock3, ImageIcon, Tags, Users, Vote } from "lucide-react";
import { prisma } from "@/lib/db";
import { getVotesRequired } from "@/lib/settings";
import { VotesChart } from "@/components/admin/votes-chart";

export default async function AdminPage() {
  const required = await getVotesRequired();
  const today = new Date();
  const weekStart = subDays(today, 7);
  const [totalImages, finalCount, inProgress, ties, annotators, votesToday, votesWeek, history, labelResults, classes] = await Promise.all([
    prisma.imageAsset.count(),
    prisma.labelResult.count({ where: { totalVotes: { gte: required }, isTie: false } }),
    prisma.labelResult.count({ where: { totalVotes: { gt: 0, lt: required } } }),
    prisma.labelResult.count({ where: { isTie: true } }),
    prisma.user.count({ where: { role: "ANNOTATOR", isActive: true } }),
    prisma.annotationHistory.count({ where: { timestamp: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) } } }),
    prisma.annotationHistory.count({ where: { timestamp: { gte: weekStart } } }),
    prisma.annotationHistory.findMany({ where: { timestamp: { gte: subDays(today, 13) }, action: { in: ["CREATED", "CHANGED"] } }, select: { timestamp: true } }),
    prisma.labelResult.findMany({ where: { finalClassId: { not: null }, isTie: false }, include: { finalClass: true } }),
    prisma.imageClass.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, take: 4 }),
  ]);
  const chart = Array.from({ length: 14 }, (_, index) => {
    const date = subDays(today, 13 - index);
    const key = format(date, "MMM d");
    return { day: key, votes: history.filter((row) => format(row.timestamp, "MMM d") === key).length };
  });

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(today, 6 - index);
    const key = format(date, "EEE");
    return { day: key.slice(0, 1), votes: history.filter((row) => format(row.timestamp, "yyyy-MM-dd") === format(date, "yyyy-MM-dd")).length };
  });
  const maxWeekly = Math.max(1, ...weekly.map((item) => item.votes));
  const classTotals = new Map<string, { name: string; color: string; count: number }>();
  for (const result of labelResults) {
    const key = result.finalClassId ?? "unknown";
    const current = classTotals.get(key);
    classTotals.set(key, {
      name: result.finalClass?.name ?? "Unassigned",
      color: result.finalClass?.colorHex ?? "#FE9F43",
      count: (current?.count ?? 0) + 1,
    });
  }
  const distribution = Array.from(classTotals.values()).sort((a, b) => b.count - a.count).slice(0, 4);
  const distributionTotal = Math.max(1, distribution.reduce((sum, item) => sum + item.count, 0));
  let offset = 0;
  const donutStops = distribution.map((item) => {
    const start = offset;
    offset += (item.count / distributionTotal) * 100;
    return `${item.color} ${start}% ${offset}%`;
  }).join(", ");
  const completionRate = totalImages ? Math.round((finalCount / totalImages) * 100) : 0;

  const cards = [
    { label: "Total Images", value: totalImages, icon: ImageIcon, color: "#092C4C", trend: `${completionRate}% final` },
    { label: "Fully Labeled", value: finalCount, icon: CheckCircle2, color: "#10B981", trend: `${required} votes rule` },
    { label: "In Progress", value: inProgress, icon: Clock3, color: "#0D6EFD", trend: `${votesToday} today` },
    { label: "Ties Needing Review", value: ties, icon: AlertTriangle, color: "#FE9F43", trend: `${votesWeek} this week` },
  ];

  return (
    <main className="pos-page space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1>Dashboard</h1>
          <p className="text-sm text-[#646B72]">Current dataset progress and audit activity.</p>
        </div>
        <div className="pos-badge bg-[#0DCAF0] text-[#092C4C]">Votes required: {required}</div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div className="pos-card min-h-[140px]" key={card.label}>
            <div className="flex items-start justify-between">
              <div className="flex size-8 items-center justify-center rounded-[4px]" style={{ backgroundColor: card.color }}>
                <card.icon className="size-4 text-white" />
              </div>
              <span className="pos-badge bg-[#198754] text-white">{card.trend}</span>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4">
              <div>
                <div className="text-[24px] font-bold leading-[28.8px] text-[#212B36]">{card.value}</div>
                <div className="text-sm text-[#646B72]">{card.label}</div>
              </div>
              <div className="flex h-10 items-end gap-1">
                {[35, 58, 76, 50, 88, 64].map((height, index) => (
                  <span key={index} className="w-1.5 rounded-t-sm" style={{ height: `${height}%`, backgroundColor: card.color }} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_2fr_1fr]">
        <div className="pos-card">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[18px] font-bold text-[#212B36]">Weekly Votes</h3>
            <span className="pos-badge bg-[#F8F9FA] text-[#212B36]">This Week</span>
          </div>
          <div className="flex h-56 items-end justify-between gap-2 border-b border-[#E6EAED] px-1">
            {weekly.map((item, index) => (
              <div key={`${item.day}-${index}`} className="flex flex-1 flex-col items-center gap-3">
                <div className="w-full max-w-10 rounded-t-[8px] bg-[#212B36]" style={{ height: `${Math.max(18, (item.votes / maxWeekly) * 170)}px` }} />
                <span className="text-xs text-[#646B72]">{item.day}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 text-sm text-[#646B72]"><span className="pos-badge mr-2 bg-[#198754] text-white">+{votesWeek}</span>Votes in the last 7 days</div>
        </div>

        <div className="pos-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-[#212B36]">Activity</h3>
              <p className="text-sm text-[#646B72]"><span className="font-bold text-[#212B36]">{votesWeek}</span> votes this week</p>
            </div>
            <span className="pos-badge bg-[#F8F9FA] text-[#212B36]">{format(today, "yyyy")}</span>
          </div>
          <VotesChart data={chart} />
        </div>

        <div className="pos-card">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-[18px] font-bold text-[#212B36]">Top Labels</h3>
            <span className="pos-badge bg-[#F8F9FA] text-[#212B36]">Final</span>
          </div>
          <div className="mx-auto size-48 rounded-full" style={{ background: `conic-gradient(${donutStops || "#E6EAED 0% 100%"})` }}>
            <div className="grid size-full place-items-center rounded-full p-10">
              <div className="grid size-full place-items-center rounded-full bg-white text-center">
                <Tags className="mb-1 size-5 text-[#FE9F43]" />
                <div className="text-[20px] font-bold text-[#212B36]">{labelResults.length}</div>
              </div>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {(distribution.length ? distribution : classes.map((item) => ({ name: item.name, color: item.colorHex ?? "#0D6EFD", count: 0 }))).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-[#646B72]"><span className="size-3 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                <span className="font-semibold text-[#212B36]">{Math.round((item.count / distributionTotal) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[{ label: "Active Annotators", value: annotators, icon: Users }, { label: "Votes Today", value: votesToday, icon: Vote }, { label: "Completion Rate", value: `${completionRate}%`, icon: CheckCircle2 }].map((item) => (
          <div className="pos-card flex items-center gap-4" key={item.label}>
            <div className="flex size-10 items-center justify-center rounded-[8px] bg-[#F7F7F7] text-[#092C4C]"><item.icon className="size-5" /></div>
            <div><div className="text-[24px] font-bold text-[#212B36]">{item.value}</div><div className="text-sm text-[#646B72]">{item.label}</div></div>
          </div>
        ))}
      </section>
    </main>
  );
}
