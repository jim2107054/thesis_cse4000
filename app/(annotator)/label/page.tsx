export const dynamic = "force-dynamic";

import { LabelingClient } from "@/components/label/labeling-client";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { getVotesRequired } from "@/lib/settings";
import { requireSession } from "@/lib/session";
import { getPublicImageUrl } from "@/lib/storage";

export default async function LabelPage() {
  const session = await requireSession();
  const [image, classes, required, total, labeled] = await Promise.all([
    prisma.imageAsset.findFirst({ where: { annotations: { none: { userId: session.user.id } } }, orderBy: { filename: "asc" }, include: { annotations: { where: { userId: session.user.id }, include: { imageClass: true } }, labelResult: { include: { finalClass: true } } } }),
    prisma.imageClass.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    getVotesRequired(),
    prisma.imageAsset.count(),
    prisma.annotation.count({ where: { userId: session.user.id } }),
  ]);

  await logAudit({
    action: "label.workspace_opened",
    actor: session.user,
    entityType: "User",
    entityId: session.user.id,
    metadata: { initialImageId: image?.id ?? null, totalImages: total, labeledImages: labeled },
  });

  return <LabelingClient initial={{ image: image ? { ...image, publicUrl: getPublicImageUrl(image.storagePath) } : null, classes, progress: { labeled, total, required } }} />;
}
