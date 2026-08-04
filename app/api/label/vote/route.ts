import { NextResponse } from "next/server";
import { AnnotationAction } from "@prisma/client";
import { prisma } from "@/lib/db";
import { recomputeLabelResult } from "@/lib/label-results";
import { requireSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await requireSession();
  const { imageId, classId } = await request.json() as { imageId?: string; classId?: string };
  if (!imageId || !classId) return NextResponse.json({ error: "Missing imageId or classId" }, { status: 400 });

  const imageClass = await prisma.imageClass.findFirst({ where: { id: classId, isActive: true } });
  if (!imageClass) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  const existing = await prisma.annotation.findUnique({ where: { imageId_userId: { imageId, userId: session.user.id } } });
  const annotation = await prisma.annotation.upsert({
    where: { imageId_userId: { imageId, userId: session.user.id } },
    update: { classId },
    create: { imageId, userId: session.user.id, classId },
  });

  await prisma.annotationHistory.create({
    data: {
      annotationId: annotation.id,
      imageId,
      userId: session.user.id,
      classId,
      action: existing ? AnnotationAction.CHANGED : AnnotationAction.CREATED,
      previousClassId: existing?.classId ?? null,
    },
  });

  const result = await recomputeLabelResult(imageId);
  return NextResponse.json({ annotation, result });
}
