import { createReadStream, existsSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { PrismaClient, AnnotationAction, UserRole } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const folder = process.argv[2] ?? "./legacy-data";
const imageFolder = join(folder, "Image");
const bucket = "dataset-images";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

type VoteRow = { Image_name?: string; Annotator?: string; Label?: string; Timestamp?: string };

async function main() {
  const systemAdmin = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
  if (!systemAdmin) throw new Error("Seed an ADMIN user before importing legacy data.");

  const skipped: string[] = [];
  let imagesImported = 0;
  let votesImported = 0;
  const generatedLogins: Array<{ name: string; email: string; password: string }> = [];

  const classes = readJson<any[]>(join(folder, "classes.json"), []);
  for (const [index, item] of classes.entries()) {
    const name = typeof item === "string" ? item : item.name;
    if (!name) continue;
    await prisma.imageClass.upsert({
      where: { name },
      update: { sortOrder: index },
      create: { name, sortOrder: index, createdById: systemAdmin.id, colorHex: item.colorHex ?? null },
    });
  }

  const annotators = readJson<any[]>(join(folder, "annotators.json"), []);
  for (const item of annotators) {
    const name = typeof item === "string" ? item : item.name;
    if (!name) continue;
    const email = `${slug(name)}@legacy.import`;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      const password = crypto.randomBytes(9).toString("base64url");
      await prisma.user.create({
        data: {
          name,
          email,
          passwordHash: await bcrypt.hash(password, 10),
          role: UserRole.ANNOTATOR,
          createdById: systemAdmin.id,
        },
      });
      generatedLogins.push({ name, email, password });
    }
  }

  const imageFiles = existsSync(imageFolder)
    ? readdirSync(imageFolder).filter((file) => [".jpg", ".jpeg", ".png"].includes(extname(file).toLowerCase()))
    : [];

  for (const file of imageFiles) {
    const storagePath = `legacy-import/${file}`;
    const localPath = join(imageFolder, file);
    const existing = await prisma.imageAsset.findUnique({ where: { storagePath } });
    if (!existing) {
      const { error } = await supabase.storage.from(bucket).upload(storagePath, createReadStream(localPath), {
        contentType: contentType(file),
        upsert: true,
      });
      if (error) {
        skipped.push(`${file}: upload failed (${error.message})`);
        continue;
      }
      await prisma.imageAsset.create({
        data: { filename: file, storagePath, datasetBatch: "legacy-import", uploadedById: systemAdmin.id },
      });
      imagesImported++;
    }
  }

  const votes = readCsv<VoteRow>(join(folder, "votes.csv"));
  for (const row of votes) {
    const filename = row.Image_name?.trim();
    const annotatorName = row.Annotator?.trim();
    const label = row.Label?.trim();
    if (!filename || !annotatorName || !label) {
      skipped.push(`vote row skipped: missing Image_name, Annotator, or Label`);
      continue;
    }

    const [image, user, imageClass] = await Promise.all([
      prisma.imageAsset.findFirst({ where: { filename, datasetBatch: "legacy-import" } }),
      prisma.user.findFirst({ where: { name: annotatorName, role: UserRole.ANNOTATOR } }),
      prisma.imageClass.findUnique({ where: { name: label } }),
    ]);

    if (!image || !user || !imageClass) {
      skipped.push(`${filename}: missing ${!image ? "image" : !user ? "annotator" : "class"}`);
      continue;
    }

    const timestamp = row.Timestamp ? new Date(row.Timestamp) : new Date();
    const annotation = await prisma.annotation.upsert({
      where: { imageId_userId: { imageId: image.id, userId: user.id } },
      update: { classId: imageClass.id, createdAt: timestamp },
      create: { imageId: image.id, userId: user.id, classId: imageClass.id, createdAt: timestamp },
    });

    const existingHistory = await prisma.annotationHistory.findFirst({
      where: { annotationId: annotation.id, action: AnnotationAction.CREATED, timestamp },
    });
    if (!existingHistory) {
      await prisma.annotationHistory.create({
        data: {
          annotationId: annotation.id,
          imageId: image.id,
          userId: user.id,
          classId: imageClass.id,
          action: AnnotationAction.CREATED,
          timestamp,
        },
      });
      votesImported++;
    }
  }

  const imageIds = await prisma.imageAsset.findMany({ where: { datasetBatch: "legacy-import" }, select: { id: true } });
  for (const image of imageIds) await recompute(image.id);

  console.log(`Images imported: ${imagesImported}`);
  console.log(`Votes imported: ${votesImported}`);
  if (generatedLogins.length) console.table(generatedLogins);
  if (skipped.length) {
    console.log("Skipped rows/files:");
    skipped.forEach((item) => console.log(`- ${item}`));
  }
}

async function recompute(imageId: string) {
  const annotations = await prisma.annotation.findMany({ where: { imageId }, select: { classId: true } });
  const counts = new Map<string, number>();
  for (const vote of annotations) counts.set(vote.classId, (counts.get(vote.classId) ?? 0) + 1);
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  const isTie = Boolean(top && sorted[1] && top[1] === sorted[1][1]);
  await prisma.labelResult.upsert({
    where: { imageId },
    update: { finalClassId: top && !isTie ? top[0] : null, votesFor: top?.[1] ?? 0, totalVotes: annotations.length, isTie },
    create: { imageId, finalClassId: top && !isTie ? top[0] : null, votesFor: top?.[1] ?? 0, totalVotes: annotations.length, isTie },
  });
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  return JSON.parse(require("node:fs").readFileSync(path, "utf8"));
}

function readCsv<T>(path: string): T[] {
  if (!existsSync(path)) return [];
  const parsed = Papa.parse<T>(require("node:fs").readFileSync(path, "utf8"), { header: true, skipEmptyLines: true });
  return parsed.data;
}

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "") || crypto.randomUUID();
}

function contentType(file: string) {
  const ext = extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  return "image/jpeg";
}

main().finally(async () => prisma.$disconnect());
