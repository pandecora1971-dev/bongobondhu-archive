import { ADMIN } from "@/lib/admin-path";
import type { Prisma } from "@prisma/client";
import { can, requireAdmin } from "@/lib/auth";
import { permissionForOwner } from "@/lib/access";
import { db } from "@/lib/db";
import { MediaGrid, Pager, Top } from "@/components/admin/ui";
import a from "../../admin.module.css";

const SIZE = 60;
const TYPES = ["CONTRIBUTION", "COMPLAINT", "ACCUSED", "POST", "PROJECT", "MILESTONE", "FILM", "CHAPTER", "SITE"];

export default async function Media({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, +(sp.page || 1));
  // each admin only sees files of the areas they are allowed to work on
  const allowed = TYPES.filter((t) => {
    const need = permissionForOwner(t as never);
    return need === "SUPER" ? me.super : can(me, need);
  });
  const type = sp.type && allowed.includes(sp.type) ? sp.type : undefined;
  const where: Prisma.MediaAssetWhereInput = {
    state: "READY",
    ownerType: type ? (type as never) : { in: allowed as never[] },
    ...(allowed.length ? {} : { id: "-" }),
    ...(sp.hidden === "1" ? { hidden: true } : {}),
    ...(sp.ext === "1" ? { key: null } : {}),
  };
  const [items, total] = await Promise.all([
    db.mediaAsset.findMany({ where, orderBy: { createdAt: "desc" }, take: SIZE, skip: (page - 1) * SIZE }),
    db.mediaAsset.count({ where }),
  ]);
  const qs = new URLSearchParams(Object.entries(sp).filter(([k, v]) => v && k !== "page") as [string, string][]);
  return (
    <>
      <Top title="মিডিয়া" sub="সব আপলোড করা ও সিড করা ছবি / ফাইল" />
      <form className={a.filters}>
        <select name="type" defaultValue={type ?? ""}><option value="">সব</option>{allowed.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <label className={a.muted}><input type="checkbox" name="hidden" value="1" defaultChecked={sp.hidden === "1"} /> শুধু লুকানো</label>
        <label className={a.muted}><input type="checkbox" name="ext" value="1" defaultChecked={sp.ext === "1"} /> শুধু বাইরের লিংক (ইমপোর্ট বাকি)</label>
        <button className={a.btn}>দেখান</button>
      </form>
      <MediaGrid items={items} back={`${ADMIN}/media?${qs}`} canDelete={me.super} />
      <Pager page={page} total={total} size={SIZE} base={`${ADMIN}/media?${qs}`} />
    </>
  );
}
