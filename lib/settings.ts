import { prisma } from "@/lib/db";

export const SETTING_KEYS = {
  votesRequired: "votes_required",
  countRemovedAnnotatorVotes: "count_removed_annotator_votes",
} as const;

export async function getSetting(key: string, fallback: string) {
  const setting = await prisma.setting.findUnique({ where: { key } });
  return setting?.value ?? fallback;
}

export async function getVotesRequired() {
  const raw = await getSetting(SETTING_KEYS.votesRequired, "3");
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

export async function shouldCountRemovedAnnotatorVotes() {
  return (await getSetting(SETTING_KEYS.countRemovedAnnotatorVotes, "false")) === "true";
}

export async function upsertSetting(key: string, value: string, updatedById: string) {
  return prisma.setting.upsert({
    where: { key },
    update: { value, updatedById },
    create: { key, value, updatedById },
  });
}
