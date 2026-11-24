import { NextResponse } from "next/server";
import { adminOrNull, can } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { ACTIVITY_TYPES, CONTRIBUTION_TYPES, CRIMES, HARMS, ORGS } from "@/lib/labels";
import { divisionLabel } from "@/lib/geo";

export const runtime = "nodejs";

// RFC 4180 + formula-injection guard for spreadsheets
const cell = (v: unknown) => {
  let s = v == null ? "" : v instanceof Date ? v.toISOString() : Array.isArray(v) ? v.join(" | ") : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (head: string[], rows: unknown[][]) => "﻿" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");

/** CSV export. Complaints: ADMIN/REVIEWER only; contact details only with ?pii=1 and ADMIN role. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const type = u.searchParams.get("type");
  const status = u.searchParams.get("status") as "PENDING" | "APPROVED" | "REJECTED" | "ARCHIVED" | null;
  const where = status ? { status } : {};
  const area = type === "complaints" ? "COMPLAINTS" : type === "posts" ? "POSTS" : "CONTRIBUTIONS";
  const me = await adminOrNull();
  // needs the area permission AND the export permission (super admins have both)
  if (!me || !can(me, area) || !can(me, "EXPORT")) return new NextResponse(null, { status: me ? 403 : 401 });
  // contact details / victim names in CSV: super admins only, never moderators
  const pii = u.searchParams.get("pii") === "1" && me.super;
  let body = "";

  if (type === "contributions") {
    const r = await db.contribution.findMany({ where, orderBy: { createdAt: "desc" } });
    body = csv(
      ["ref", "status", "subject", "types", "year", "date", "place", "title", "description", "sources", "video", "attribution", "name", ...(pii ? ["contact"] : []), "created"],
      r.map((x) => [x.ref, x.status, x.subject, x.types.map((t) => CONTRIBUTION_TYPES.label(t)), x.year, x.date, x.place, x.title, x.description, x.sourceUrls, x.videoLink, x.attribution, x.name, ...(pii ? [decrypt(x.contactEnc)] : []), x.createdAt]),
    );
  } else if (type === "complaints") {
    const r = await db.complaint.findMany({ where, orderBy: { createdAt: "desc" }, include: { accused: true } });
    body = csv(
      ["code", "status", "progress", "crimes", "harms", "date", "division", "district", "thana", "description", "victims", "accused", "links", ...(pii ? ["contact", "victimName"] : []), "created"],
      r.map((x) => [
        x.code, x.status, x.progress, x.crimes.map((c) => CRIMES.label(c)), x.harms.map((h) => HARMS.label(h)), x.incidentDate, divisionLabel(x.division), x.district, x.thana,
        x.description, x.victimCount, x.accused.map((a) => [a.name, a.role, a.org].filter(Boolean).join(" / ")), x.links,
        ...(pii ? [decrypt(x.contactEnc), decrypt(x.victimNameEnc)] : []), x.createdAt,
      ]),
    );
  } else if (type === "posts") {
    const r = await db.activityPost.findMany({ where, orderBy: { createdAt: "desc" } });
    body = csv(
      ["id", "status", "organisation", "activity", "date", "division", "district", "thana", "place", "participants", "title", "description", "links", "name", "role", "anonymous", "created", "published"],
      r.map((x) => [x.id, x.status, ORGS.label(x.org), ACTIVITY_TYPES.label(x.activityType), x.date, divisionLabel(x.division), x.district, x.thana, x.place, x.participants, x.title, x.description, x.links, x.anonymous ? "" : x.name, x.anonymous ? "" : x.role, x.anonymous, x.createdAt, x.publishedAt]),
    );
  } else return new NextResponse(null, { status: 400 });

  await audit(me, "export", type, null, { status, pii });
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
