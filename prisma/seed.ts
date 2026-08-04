import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD before running the seed script.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: UserRole.ADMIN, isActive: true },
    create: {
      email,
      name: "System Admin",
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  await prisma.setting.upsert({
    where: { key: "votes_required" },
    update: {},
    create: { key: "votes_required", value: "3", updatedById: admin.id },
  });

  await prisma.setting.upsert({
    where: { key: "count_removed_annotator_votes" },
    update: {},
    create: { key: "count_removed_annotator_votes", value: "false", updatedById: admin.id },
  });

  console.log(`Seeded admin: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
