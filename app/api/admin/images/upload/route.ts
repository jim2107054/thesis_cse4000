import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAudit, requestInfo } from "@/lib/audit-log";
import { requireAdmin } from "@/lib/session";
import { DATASET_BUCKET, requireSupabaseAdmin } from "@/lib/storage";

export async function POST(request: Request) {
  const session = await requireAdmin();
  const formData = await request.formData();
  const file = formData.get("file");
  const datasetBatch = String(formData.get("datasetBatch") ?? new Date().toISOString().slice(0, 10));

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const existing = await prisma.imageAsset.findFirst({ where: { filename: file.name, datasetBatch } });
  if (existing) {
    return NextResponse.json({ skipped: true, reason: "duplicate filename in batch" });
  }

  const storagePath = `${datasetBatch}/${file.name}`;
  const supabase = requireSupabaseAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(DATASET_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const image = await prisma.imageAsset.create({
    data: { filename: file.name, storagePath, datasetBatch, uploadedById: session.user.id },
  });

  await logAudit({
    action: "image.uploaded",
    actor: session.user,
    entityType: "ImageAsset",
    entityId: image.id,
    ...requestInfo(request.headers),
    metadata: {
      filename: image.filename,
      storagePath,
      datasetBatch,
      contentType: file.type,
      size: file.size,
    },
  });

  return NextResponse.json({ uploaded: true, image });
}
