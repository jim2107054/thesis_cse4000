import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
import { shouldCountRemovedAnnotatorVotes } from "@/lib/settings";

type Db = PrismaClient | Prisma.TransactionClient;

export async function recomputeLabelResult(imageId: string, db: Db = prisma) {
  const countRemoved = await shouldCountRemovedAnnotatorVotes();
  const annotations = await db.annotation.findMany({
    where: {
      imageId,
      ...(countRemoved ? {} : { user: { isActive: true } }),
    },
    select: { classId: true },
  });

  const totals = new Map<string, number>();
  for (const annotation of annotations) {
    totals.set(annotation.classId, (totals.get(annotation.classId) ?? 0) + 1);
  }

  const sorted = Array.from(totals.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const runnerUp = sorted[1];
  const totalVotes = annotations.length;
  const isTie = Boolean(top && runnerUp && top[1] === runnerUp[1]);
  const finalClassId = top && !isTie ? top[0] : null;
  const votesFor = top?.[1] ?? 0;

  const existing = await db.labelResult.findUnique({ where: { imageId } });

  if (existing?.isOverridden) {
    return db.labelResult.update({
      where: { imageId },
      data: { votesFor, totalVotes, isTie, updatedAt: new Date() },
    });
  }

  return db.labelResult.upsert({
    where: { imageId },
    update: { finalClassId, votesFor, totalVotes, isTie },
    create: { imageId, finalClassId, votesFor, totalVotes, isTie },
  });
}

export async function recomputeAllLabelResults(imageIds: string[]) {
  for (const imageId of imageIds) {
    await recomputeLabelResult(imageId);
  }
}
