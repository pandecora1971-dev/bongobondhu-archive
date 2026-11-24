import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { ATTRIBUTION, CONTRIBUTION_TYPES, SUBJECTS } from "@/lib/labels";
import { MediaGrid, Pill, Saved, StatusButtons, Top } from "@/components/admin/ui";
import { redactContribution, updateContribution } from "../../../actions";
import a from "../../../admin.module.css";

export default async function Contribution({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("CONTRIBUTIONS");
  const { id } = await params;
  const c = await db.contribution.findUnique({ where: { id } });
  if (!c) notFound();
  const [media, log] = await Promise.all([
    db.mediaAsset.findMany({ where: { ownerType: "CONTRIBUTION", ownerId: c.id }, orderBy: { sort: "asc" } }),
    db.auditLog.findMany({ where: { entityType: "contribution", entityId: c.id }, orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } }),
  ]);
  const contact = can(me, "COMPLAINT_PII") ? decrypt(c.contactEnc) : null;
  if (contact) await audit(me, "view:pii", "contribution", c.id);
  const back = `/admin/contributions/${c.id}`;
  return (
    <>
      <Top title={c.title} sub={`${c.ref} · ${SUBJECTS.label(c.subject)} · ${c.createdAt.toLocaleString("en-GB")}`}>
        <Pill s={c.status} />
      </Top>
      <Saved on={(await searchParams).saved} />
      <div className={a.grid2}>
        <div>
          <div className={`${a.card} ${a.section}`}>
            <dl className={a.dl}>
              <dt>ধরন</dt><dd>{c.types.map((t) => CONTRIBUTION_TYPES.label(t)).join(", ")}</dd>
              <dt>সাল / তারিখ</dt><dd>{c.year} {c.date && `· ${c.date}`}</dd>
              <dt>স্থান</dt><dd>{c.place || "—"}</dd>
              <dt>বিবরণ</dt><dd>{c.description}</dd>
              <dt>উৎস</dt><dd>{c.sourceUrls.map((u) => <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow">{u}</a>)}{!c.sourceUrls.length && "—"}</dd>
              <dt>ভিডিও লিংক</dt><dd>{c.videoLink ? <a href={c.videoLink} target="_blank" rel="noopener noreferrer nofollow">{c.videoLink}</a> : "—"}</dd>
              <dt>কৃতিত্ব</dt><dd>{ATTRIBUTION.label(c.attribution)} {c.name && `· ${c.name}`}</dd>
              <dt>যোগাযোগ</dt><dd>{contact ? <>{contact} <em className={a.muted}>(কখনো প্রকাশিত হয় না)</em></> : c.contactEnc ? <em className={a.muted}>আছে — দেখার অনুমতি নেই</em> : "—"}</dd>
            </dl>
          </div>
          <div className={`${a.card} ${a.section}`}>
            <h2>ফাইল ({media.length})</h2>
            <div className={a.warn}>ছবির EXIF/GPS সার্ভারে মুছে ফেলা হয়েছে। ভিডিও ও PDF-এর মেটাডেটা মোছা হয়নি — প্রকাশের আগে যাচাই করুন।</div>
            <MediaGrid items={media} back={back} canDelete={me.super} />
          </div>
        </div>
        <div>
          <div className={`${a.card} ${a.section}`}>
            <h2>সিদ্ধান্ত</h2>
            <StatusButtons kind="contribution" id={c.id} current={c.status} back={back} />
            <div className={a.actions}>
              {contact && <form action={redactContribution}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="what" value="contact" /><button className={`${a.btn} ${a.ghost} ${a.sm}`}>যোগাযোগ মুছুন</button></form>}
              {c.name && <form action={redactContribution}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="what" value="name" /><button className={`${a.btn} ${a.ghost} ${a.sm}`}>নাম সরান (বেনামে)</button></form>}
            </div>
          </div>
          <form action={updateContribution} className={`${a.card} ${a.form}`}>
            <h2 style={{ fontSize: 18 }}>সম্পাদনা</h2>
            <input type="hidden" name="id" value={c.id} />
            <label>শিরোনাম<input className={a.input} name="title" defaultValue={c.title} required maxLength={300} /></label>
            <label>বিবরণ<textarea className={a.textarea} name="description" defaultValue={c.description} required /></label>
            <div className={a.row}>
              <label>সাল<input className={a.input} name="year" type="number" defaultValue={c.year} /></label>
              <label>তারিখ<input className={a.input} name="date" defaultValue={c.date ?? ""} /></label>
              <label>স্থান<input className={a.input} name="place" defaultValue={c.place ?? ""} /></label>
            </div>
            <label>প্রকাশিত নাম<input className={a.input} name="name" defaultValue={c.name ?? ""} /></label>
            <label>পর্যালোচনার নোট (অভ্যন্তরীণ)<textarea className={a.textarea} name="reviewNote" defaultValue={c.reviewNote ?? ""} /></label>
            <button className={a.btn}>সংরক্ষণ</button>
          </form>
          <div className={`${a.card} ${a.section}`} style={{ marginTop: 18 }}>
            <h2>ইতিহাস</h2>
            <ul className={a.timeline}>{log.map((l) => <li key={l.id}><b>{l.action}</b> · {l.admin?.name} <span className={a.muted}>{l.createdAt.toLocaleString("en-GB")}</span></li>)}</ul>
          </div>
        </div>
      </div>
    </>
  );
}
