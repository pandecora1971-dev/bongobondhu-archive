import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";

type Actor = { id: string; name: string; email: string; role: string } | null;

/** Append to the log book. The actor is copied in so the entry survives account deletion. */
export async function audit(actor: Actor, action: string, entityType: string, entityId?: string | null, detail?: Prisma.InputJsonValue) {
  await db.auditLog.create({
    data: {
      adminId: actor?.id ?? null,
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      detail,
    },
  });
}
