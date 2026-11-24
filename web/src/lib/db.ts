import "server-only";
import { PrismaClient } from "@prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  g.prisma ??
  new PrismaClient({
    // Raw database errors can include query arguments containing personal data.
    log: [],
    errorFormat: "minimal",
  });

if (process.env.NODE_ENV !== "production") g.prisma = db;
