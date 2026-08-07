import { NextResponse } from "next/server";
import { AnnotationAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { logAudit, requestInfo } from "@/lib/audit-log";
import { recomputeLabelResult } from "@/lib/label-results";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireSession();
  const { imageId, classId } = await request.json() as { imageId?: string; classId?: string };
  if (!imageId || !classId) return NextResponse.json({ error: "Missing imageId or classId" }, { status: 400 });

  const imageClass = await prisma.imageClass.findFirst({ where: { id: classId, isActive: true } });
  if (!imageClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const existing = await prisma.annotation.findUnique({ where: { imageId_userId: { imageId, userId: session.user.id } } });
  const action = existing ? AnnotationAction.CHANGED : AnnotationAction.CREATED;
  const annotation = await prisma.$transaction(async (tx) => {
    const saved = await tx.annotation.upsert({
      where: { imageId_userId: { imageId, userId: session.user.id } },
      update: { classId },
      create: { imageId, userId: session.user.id, classId },
    });

    await tx.annotationHistory.create({
      data: {
        annotationId: saved.id,
        imageId,
        userId: session.user.id,
        classId,
        action,
        previousClassId: existing?.classId ?? null,
      },
    });

    await logAudit({
      action: existing ? "annotation.changed" : "annotation.created",
      actor: session.user,
      entityType: "Annotation",
      entityId: saved.id,
      ...requestInfo(request.headers),
      metadata: {
        imageId,
        classId,
        className: imageClass.name,
        previousClassId: existing?.classId ?? null,
      },
    }, tx);

    return saved;
  });

  const result = await recomputeLabelResult(imageId);
  return NextResponse.json({ annotation, result });
}
