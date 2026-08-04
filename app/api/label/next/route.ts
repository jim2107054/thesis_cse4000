import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getVotesRequired } from "@/lib/settings";
import { requireSession } from "@/lib/session";
import { getPublicImageUrl } from "@/lib/storage";

export async function GET(request: Request) {
  const session = await requireSession();
  const url = new URL(request.url);
  const currentId = url.searchParams.get("currentId");
  const direction = url.searchParams.get("direction") ?? "next";
  const onlyUnvoted = url.searchParams.get("onlyUnvoted") !== "false";
  const jump = url.searchParams.get("filename")?.trim();
  const required = await getVotesRequired();

  const classes = await prisma.imageClass.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
  const total = await prisma.imageAsset.count();
  const labeled = await prisma.annotation.count({ where: { userId: session.user.id } });

  let image = null;
  if (jump) {
    image = await prisma.imageAsset.findFirst({ where: { filename: { contains: jump, mode: "insensitive" } }, include: includeFor(session.user.id) });
  } else if (currentId && !onlyUnvoted) {
    const current = await prisma.imageAsset.findUnique({ where: { id: currentId } });
    image = current ? await prisma.imageAsset.findFirst({
      where: { filename: direction === "prev" ? { lt: current.filename } : { gt: current.filename } },
      orderBy: { filename: direction === "prev" ? "desc" : "asc" },
      include: includeFor(session.user.id),
    }) : null;
  }

  if (!image) {
    image = await prisma.imageAsset.findFirst({
      where: onlyUnvoted ? { annotations: { none: { userId: session.user.id } } } : {},
      orderBy: { filename: "asc" },
      include: includeFor(session.user.id),
    });
  }

  return NextResponse.json({
    image: image ? serializeImage(image) : null,
    classes,
    progress: { labeled, total, required },
  });
}

function includeFor(userId: string) {
  return { annotations: { where: { userId }, include: { imageClass: true } }, labelResult: { include: { finalClass: true } } } as const;
}

function serializeImage(image: { storagePath: string } & Record<string, unknown>) {
  return { ...image, publicUrl: getPublicImageUrl(image.storagePath) };
}

