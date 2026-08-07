import { type Prisma, type PrismaClient, type UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

type Db = PrismaClient | Prisma.TransactionClient;

type Actor = {
  id?: string | null;
  email?: string | null;
  role?: UserRole | "ADMIN" | "ANNOTATOR" | null;
};

type AuditInput = {
  action: string;
  actor?: Actor | null;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

type DbWithAuditLog = Db & {
  auditLog?: {
    create: (args: {
      data: {
        action: string;
        entityType: string | null;
        entityId: string | null;
        actorId: string | null;
        actorEmail: string | null;
        actorRole: UserRole | null;
        ipAddress: string | null;
        userAgent: string | null;
        metadata?: Prisma.InputJsonValue;
      };
    }) => Promise<unknown>;
  };
};

export function requestInfo(headers?: Headers | null) {
  return {
    ipAddress:
      headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers?.get("x-real-ip") ??
      null,
    userAgent: headers?.get("user-agent") ?? null,
  };
}

export async function logAudit(input: AuditInput, db: Db = prisma) {
  try {
    const auditDb = db as DbWithAuditLog;
    if (!auditDb.auditLog) {
      console.warn(`Audit log skipped for "${input.action}" because Prisma client is stale. Restart the dev server.`);
      return null;
    }

    return await auditDb.auditLog.create({
      data: {
        action: input.action,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        actorId: input.actor?.id ?? null,
        actorEmail: input.actor?.email ?? null,
        actorRole: input.actor?.role ? input.actor.role as UserRole : null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch (error) {
    console.error(`Audit log failed for "${input.action}"`, error);
    return null;
  }
}
