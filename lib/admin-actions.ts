"use server";

import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AnnotationAction, UserRole } from "@prisma/client";
import { signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recomputeLabelResult } from "@/lib/label-results";
import { SETTING_KEYS, upsertSetting } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function createClassAction(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;
  if (!name) return;
  const count = await prisma.imageClass.count();
  await prisma.imageClass.create({ data: { name, colorHex, sortOrder: count, createdById: session.user.id } });
  revalidatePath("/admin/classes");
}

export async function updateClassAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!id || !name) return;
  await prisma.imageClass.update({ where: { id }, data: { name, colorHex, isActive } });
  revalidatePath("/admin/classes");
}

export async function deleteOrHideClassAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const used = await prisma.annotation.count({ where: { classId: id } });
  if (used > 0) await prisma.imageClass.update({ where: { id }, data: { isActive: false } });
  else await prisma.imageClass.delete({ where: { id } });
  revalidatePath("/admin/classes");
}

export async function moveClassAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  const current = await prisma.imageClass.findUnique({ where: { id } });
  if (!current) return;
  const swap = await prisma.imageClass.findFirst({
    where: { sortOrder: direction === "up" ? { lt: current.sortOrder } : { gt: current.sortOrder } },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  });
  if (!swap) return;
  await prisma.$transaction([
    prisma.imageClass.update({ where: { id: current.id }, data: { sortOrder: swap.sortOrder } }),
    prisma.imageClass.update({ where: { id: swap.id }, data: { sortOrder: current.sortOrder } }),
  ]);
  revalidatePath("/admin/classes");
}

export async function createAnnotatorAction(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!name || !email) redirect("/admin/annotators?created=0");
  const password = crypto.randomBytes(12).toString("base64url");
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ANNOTATOR,
      createdById: session.user.id,
    },
  });
  revalidatePath("/admin/annotators");
  redirect(`/admin/annotators?created=1&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`);
}

export async function toggleAnnotatorAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!id) return;
  await prisma.user.update({ where: { id }, data: { isActive } });
  const imageIds = await prisma.annotation.findMany({ where: { userId: id }, select: { imageId: true }, distinct: ["imageId"] });
  for (const image of imageIds) await recomputeLabelResult(image.imageId);
  revalidatePath("/admin/annotators");
  revalidatePath("/admin");
}

export async function updateSettingsAction(formData: FormData) {
  const session = await requireAdmin();
  const votesRequired = Math.max(1, Number.parseInt(String(formData.get("votes_required") ?? "3"), 10) || 3);
  const countRemoved = formData.get("count_removed_annotator_votes") === "on";
  await upsertSetting(SETTING_KEYS.votesRequired, String(votesRequired), session.user.id);
  await upsertSetting(SETTING_KEYS.countRemovedAnnotatorVotes, String(countRemoved), session.user.id);
  const images = await prisma.imageAsset.findMany({ select: { id: true } });
  for (const image of images) await recomputeLabelResult(image.id);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
}

export async function overrideLabelAction(formData: FormData) {
  const session = await requireAdmin();
  const imageId = String(formData.get("imageId") ?? "");
  const classId = String(formData.get("classId") ?? "");
  if (!imageId || !classId) return;
  await prisma.labelResult.upsert({
    where: { imageId },
    update: { finalClassId: classId, isTie: false, isOverridden: true, overriddenById: session.user.id, overriddenAt: new Date() },
    create: { imageId, finalClassId: classId, votesFor: 0, totalVotes: 0, isTie: false, isOverridden: true, overriddenById: session.user.id, overriddenAt: new Date() },
  });
  await prisma.annotationHistory.create({ data: { imageId, userId: session.user.id, classId, action: AnnotationAction.OVERRIDE } });
  revalidatePath("/admin/tie-review");
}

export async function undoOverrideAction(formData: FormData) {
  const session = await requireAdmin();
  const imageId = String(formData.get("imageId") ?? "");
  const result = await prisma.labelResult.findUnique({ where: { imageId } });
  if (!imageId || !result?.finalClassId) return;
  await prisma.labelResult.update({ where: { imageId }, data: { isOverridden: false, overriddenById: null, overriddenAt: null } });
  await prisma.annotationHistory.create({ data: { imageId, userId: session.user.id, classId: result.finalClassId, action: AnnotationAction.OVERRIDE_UNDONE } });
  await recomputeLabelResult(imageId);
  revalidatePath("/admin/tie-review");
}
