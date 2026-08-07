import { prisma } from "@/lib/db";

export const SETTING_KEYS = {
  votesRequired: "votes_required",
  countRemovedAnnotatorVotes: "count_removed_annotator_votes",
} as const;

function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: unknown; message?: unknown };
  return (
    candidate.code === "P1001" ||
    (typeof candidate.message === "string" && candidate.message.includes("Can't reach database server"))
  );
}

export async function getSetting(key: string, fallback: string) {
  try {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value ?? fallback;
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      console.warn(`Database unavailable while reading setting "${key}". Using fallback value.`);
      return fallback;
    }

    throw error;
  }
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
