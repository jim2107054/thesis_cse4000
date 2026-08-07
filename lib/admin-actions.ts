"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AnnotationAction, UserRole } from "@prisma/client";
import { signOut } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { prisma } from "@/lib/db";
import { recomputeLabelResult } from "@/lib/label-results";
import { SETTING_KEYS, upsertSetting } from "@/lib/settings";
import { requireAdmin, requireSession } from "@/lib/session";

export async function signOutAction() {
  const session = await requireSession();
  await logAudit({
    action: "auth.logout",
    actor: session.user,
    entityType: "User",
    entityId: session.user.id,
    metadata: { email: session.user.email, role: session.user.role },
  });
  await signOut({ redirectTo: "/login" });
}

export async function createClassAction(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;
  if (!name) return;
  const count = await prisma.imageClass.count();
  const imageClass = await prisma.imageClass.create({ data: { name, colorHex, sortOrder: count, createdById: session.user.id } });
  await logAudit({
    action: "class.created",
    actor: session.user,
    entityType: "ImageClass",
    entityId: imageClass.id,
    metadata: { name, colorHex, sortOrder: count },
  });
  revalidatePath("/admin/classes");
}

export async function updateClassAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const colorHex = String(formData.get("colorHex") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";
  if (!id || !name) return;
  const before = await prisma.imageClass.findUnique({ where: { id } });
  const imageClass = await prisma.imageClass.update({ where: { id }, data: { name, colorHex, isActive } });
  await logAudit({
    action: "class.updated",
    actor: session.user,
    entityType: "ImageClass",
    entityId: id,
    metadata: {
      before: before ? { name: before.name, colorHex: before.colorHex, isActive: before.isActive } : null,
      after: { name: imageClass.name, colorHex: imageClass.colorHex, isActive: imageClass.isActive },
    },
  });
  revalidatePath("/admin/classes");
}

export async function deleteOrHideClassAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const imageClass = await prisma.imageClass.findUnique({ where: { id } });
  const used = await prisma.annotation.count({ where: { classId: id } });
  if (used > 0) await prisma.imageClass.update({ where: { id }, data: { isActive: false } });
  else await prisma.imageClass.delete({ where: { id } });
  await logAudit({
    action: used > 0 ? "class.hidden" : "class.deleted",
    actor: session.user,
    entityType: "ImageClass",
    entityId: id,
    metadata: { name: imageClass?.name ?? null, votes: used },
  });
  revalidatePath("/admin/classes");
}

export async function moveClassAction(formData: FormData) {
  const session = await requireAdmin();
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
  await logAudit({
    action: "class.reordered",
    actor: session.user,
    entityType: "ImageClass",
    entityId: current.id,
    metadata: {
      direction,
      className: current.name,
      previousSortOrder: current.sortOrder,
      newSortOrder: swap.sortOrder,
      swappedWith: { id: swap.id, name: swap.name },
    },
  });
  revalidatePath("/admin/classes");
}

export async function createAnnotatorAction(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || password.length < 6) redirect("/admin/annotators?created=0");
  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: UserRole.ANNOTATOR,
      createdById: session.user.id,
    },
  });
  await logAudit({
    action: "annotator.created",
    actor: session.user,
    entityType: "User",
    entityId: user.id,
    metadata: { name, email, role: UserRole.ANNOTATOR },
  });
  revalidatePath("/admin/annotators");
  redirect(`/admin/annotators?created=1&email=${encodeURIComponent(email)}`);
}

export async function toggleAnnotatorAction(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = formData.get("isActive") === "true";
  if (!id) return;
  const user = await prisma.user.update({ where: { id }, data: { isActive } });
  const imageIds = await prisma.annotation.findMany({ where: { userId: id }, select: { imageId: true }, distinct: ["imageId"] });
  for (const image of imageIds) await recomputeLabelResult(image.imageId);
  await logAudit({
    action: isActive ? "annotator.activated" : "annotator.deactivated",
    actor: session.user,
    entityType: "User",
    entityId: id,
    metadata: { name: user.name, email: user.email, recomputedImages: imageIds.length },
  });
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
  await logAudit({
    action: "settings.updated",
    actor: session.user,
    entityType: "Setting",
    metadata: { votesRequired, countRemovedAnnotatorVotes: countRemoved, recomputedImages: images.length },
  });
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
  await logAudit({
    action: "label.override",
    actor: session.user,
    entityType: "ImageAsset",
    entityId: imageId,
    metadata: { imageId, classId },
  });
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
  await logAudit({
    action: "label.override_undone",
    actor: session.user,
    entityType: "ImageAsset",
    entityId: imageId,
    metadata: { imageId, restoredClassId: result.finalClassId },
  });
  revalidatePath("/admin/tie-review");
}
