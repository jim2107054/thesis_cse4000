export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { format, subDays } from "date-fns";
import { ArrowRight, CheckCircle2, Clock3, ImageIcon, ListChecks, Tags } from "lucide-react";
import { prisma } from "@/lib/db";
import { getVotesRequired } from "@/lib/settings";
import { requireSession } from "@/lib/session";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default async function AnnotatorDashboardPage() {
  const session = await requireSession();
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const today = new Date();
  const weekStart = subDays(today, 7);
  const [totalImages, labeled, required, activeClasses, votesToday, votesWeek, recentVotes, classVotes, nextImage] = await Promise.all([
    prisma.imageAsset.count(),
    prisma.annotation.count({ where: { userId: session.user.id } }),
    getVotesRequired(),
    prisma.imageClass.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.annotationHistory.count({ where: { userId: session.user.id, timestamp: { gte: new Date(today.getFullYear(), today.getMonth(), today.getDate()) }, action: { in: ["CREATED", "CHANGED"] } } }),
    prisma.annotationHistory.count({ where: { userId: session.user.id, timestamp: { gte: weekStart }, action: { in: ["CREATED", "CHANGED"] } } }),
    prisma.annotation.findMany({ where: { userId: session.user.id }, include: { image: true, imageClass: true }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.annotation.groupBy({ by: ["classId"], where: { userId: session.user.id }, _count: { classId: true } }),
    prisma.imageAsset.findFirst({ where: { annotations: { none: { userId: session.user.id } } }, orderBy: { filename: "asc" } }),
  ]);

  const remaining = Math.max(0, totalImages - labeled);
  const progress = totalImages ? Math.round((labeled / totalImages) * 100) : 0;
  const classVoteMap = new Map(classVotes.map((item) => [item.classId, item._count.classId]));
  const topClasses = activeClasses
    .map((item) => ({ ...item, votes: classVoteMap.get(item.id) ?? 0 }))
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 5);

  const cards = [
    { label: "Labeled Images", value: labeled, icon: CheckCircle2, color: "#198754" },
    { label: "Remaining", value: remaining, icon: Clock3, color: "#FE9F43" },
    { label: "Votes Today", value: votesToday, icon: ListChecks, color: "#0D6EFD" },
    { label: "Votes This Week", value: votesWeek, icon: ImageIcon, color: "#092C4C" },
  ];

  return (
    <main className="admin-pos min-h-[calc(100vh-60px)] bg-[#F9FAFB]">
      <div className="pos-page space-y-6">
        <header className="flex flex-col gap-4 border-b border-[#E6EAED] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <h1>Annotator Dashboard</h1>
            <p className="text-sm text-[#646B72]">Welcome, {session.user.name ?? session.user.email}. Track your labeling progress and continue the next image.</p>
          </div>
          <Button asChild className="pos-button-primary">
            <Link href="/label">Start labeling <ArrowRight className="size-4" /></Link>
          </Button>
        </header>

        <section className="pos-card">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-[20px] leading-6">Your Progress</h2>
              <p className="text-sm text-[#646B72]">{labeled} of {totalImages} images labeled</p>
            </div>
            <span className="text-[24px] font-bold text-[#212B36]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3 bg-[#E6EAED]" />
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#646B72]">
            <span className="pos-badge bg-[#0DCAF0] text-[#092C4C]">Required votes: {required}</span>
            <span className="pos-badge bg-[#F8F9FA] text-[#212B36]">Next: {nextImage?.filename ?? "All caught up"}</span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div className="pos-card" key={card.label}>
              <div className="flex items-start justify-between">
                <div className="flex size-9 items-center justify-center rounded-[8px]" style={{ backgroundColor: card.color }}>
                  <card.icon className="size-5 text-white" />
                </div>
                <span className="pos-badge bg-[#F8F9FA] text-[#212B36]">Mine</span>
              </div>
              <div className="mt-5 text-[24px] font-bold leading-[28.8px] text-[#212B36]">{card.value}</div>
              <div className="text-sm text-[#646B72]">{card.label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="pos-card">
            <div className="mb-4 flex items-center gap-2">
              <Tags className="size-5 text-[#FE9F43]" />
              <h2 className="text-[20px] leading-6">Your Label Mix</h2>
            </div>
            <div className="space-y-3">
              {topClasses.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                  <span className="flex items-center gap-2 text-[#212B36]"><span className="size-3 rounded-full" style={{ backgroundColor: item.colorHex ?? "#0D6EFD" }} />{item.name}</span>
                  <span className="font-bold text-[#212B36]">{item.votes}</span>
                </div>
              ))}
              {topClasses.length === 0 && <p className="text-sm text-[#646B72]">No votes yet.</p>}
            </div>
          </div>

          <div className="pos-card">
            <div className="mb-4 flex items-center gap-2">
              <ListChecks className="size-5 text-[#FE9F43]" />
              <h2 className="text-[20px] leading-6">Recent Work</h2>
            </div>
            <div className="space-y-3">
              {recentVotes.map((vote) => (
                <div key={vote.id} className="flex items-center justify-between gap-4 border-b border-[#E6EAED] pb-3 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#212B36]">{vote.image.filename}</p>
                    <p className="text-xs text-[#646B72]">{format(vote.updatedAt, "MMM d, yyyy h:mm a")}</p>
                  </div>
                  <span className="pos-badge bg-[#198754] text-white">{vote.imageClass.name}</span>
                </div>
              ))}
              {recentVotes.length === 0 && <p className="text-sm text-[#646B72]">Your recent labels will appear here.</p>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
