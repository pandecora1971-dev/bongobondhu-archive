import { notFound } from "next/navigation";
import { can, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt, unseal } from "@/lib/crypto";
import { audit } from "@/lib/audit";
import { CASE_FILED, CRIMES, HARMS, HOW_KNOWN, ID_MODES, PROGRESS, VICTIMS, WITNESS } from "@/lib/labels";
import { divisionLabel } from "@/lib/geo";
import { mediaUrl } from "@/lib/media";
import { MediaGrid, Pill, Saved, StatusButtons, Top } from "@/components/admin/ui";
import { complaintNote, complaintUpdate, redactComplaint } from "../../../actions";
import a from "../../../admin.module.css";

export default async function Complaint({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const me = await requireAdmin("COMPLAINTS");
  const { id } = await params;
  const raw = await db.complaint.findUnique({ where: { id }, include: { accused: { orderBy: { order: "asc" } }, updates: { orderBy: { createdAt: "asc" } } } });
  if (!raw) notFound();
  // complaint text is stored encrypted; decrypt only for this permitted viewer
  const c = {
    ...raw,
    description: unseal(raw.description) ?? "",
    links: raw.links.map((l) => unseal(l) ?? ""),
    internalNote: unseal(raw.internalNote),
    accused: raw.accused.map((x) => ({ ...x, name: unseal(x.name), role: unseal(x.role), org: unseal(x.org), description: unseal(x.description), facebookUrl: unseal(x.facebookUrl), photoUrl: unseal(x.photoUrl) })),
    updates: raw.updates.map((u) => ({ ...u, message: unseal(u.message) ?? "" })),
  };
  const media = await db.mediaAsset.findMany({ where: { OR: [{ ownerType: "COMPLAINT", ownerId: c.id }, { ownerType: "ACCUSED", ownerId: { in: c.accused.map((x) => x.id) } }] }, orderBy: { sort: "asc" } });
  // viewing decrypted personal data is itself audited
  // contact details / victim name: super admins, or moderators holding COMPLAINT_PII
  const pii = can(me, "COMPLAINT_PII");
  const contact = pii ? decrypt(c.contactEnc) : null, victimName = pii ? decrypt(c.victimNameEnc) : null;
  const hiddenPii = !pii && (!!c.contactEnc || !!c.victimNameEnc);
  if (contact || victimName) await audit(me, "view:pii", "complaint", c.id);
  else await audit(me, "view", "complaint", c.id);
  const evidence = media.filter((m) => m.ownerType === "COMPLAINT");
  const back = `/admin/complaints/${c.id}`;
  const R = (what: string, label: string, extra?: Record<string, string>) => (
    <form action={redactComplaint}>
      <input type="hidden" name="id" value={c.id} />
      <input type="hidden" name="what" value={what} />
      {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className={`${a.btn} ${a.ghost} ${a.sm}`}>{label}</button>
    </form>
  );
  return (
    <>
      <Top title={`অভিযোগ ${c.code}`} sub={`${c.createdAt.toLocaleString("en-GB")} · ${PROGRESS.label(c.progress)}`}>
        <Pill s={c.status} />
      </Top>
      <Saved on={(await searchParams).saved} />
      <div className={a.warn}>অভিযোগ মানেই রায় নয়। এই তথ্য কখনো প্রকাশ্য সাইটে দেখানো হয় না।</div>
      <div className={a.grid2}>
        <div>
          <div className={`${a.card} ${a.section}`}>
            <dl className={a.dl}>
              <dt>অপরাধ</dt><dd>{c.crimes.map((x) => CRIMES.label(x)).join(", ")}</dd>
              <dt>তারিখ</dt><dd>{c.incidentDate?.toISOString().slice(0, 10) ?? "—"}</dd>
              <dt>এলাকা</dt><dd>{[c.thana, c.district, divisionLabel(c.division)].filter(Boolean).join(", ") || "—"}</dd>
              <dt>বিবরণ</dt><dd>{c.description}</dd>
              <dt>ভুক্তভোগী</dt><dd>{VICTIMS.label(c.victimType) || "—"} {c.victimCount && `· ${c.victimCount} জন`}</dd>
              <dt>ভুক্তভোগীর নাম</dt><dd>{victimName ?? (hiddenPii && c.victimNameEnc ? <em className={a.muted}>লুকানো — অনুমতি নেই</em> : "—")}</dd>
              <dt>ক্ষতি</dt><dd>{c.harms.map((h) => HARMS.label(h)).join(", ") || "—"}</dd>
              <dt>সাক্ষী / মামলা</dt><dd>{WITNESS.label(c.witness as never) || "—"} · {CASE_FILED.label(c.caseFiled as never) || "—"}</dd>
              <dt>লিংক</dt><dd>{c.links.map((l) => <div key={l}><a href={l} target="_blank" rel="noopener noreferrer nofollow">{l}</a></div>)}{!c.links.length && "—"}</dd>
              <dt>পরিচয়</dt><dd>{ID_MODES.label(c.idMode)}{contact && <> · <b>{contact}</b></>}{hiddenPii && c.contactEnc && <em className={a.muted}> · যোগাযোগ লুকানো — অনুমতি নেই</em>}</dd>
            </dl>
            <div className={a.actions}>
              {contact && R("contact", "যোগাযোগ মুছুন")}
              {victimName && R("victimName", "ভুক্তভোগীর নাম মুছুন")}
            </div>
          </div>

          <div className={`${a.card} ${a.section}`}>
            <h2>অভিযুক্ত ({c.accused.length})</h2>
            {c.accused.map((x, i) => {
              const ph = media.find((m) => m.ownerType === "ACCUSED" && m.ownerId === x.id);
              return (
                <div key={x.id} className={a.acc}>
                  <div className={a.ph}>{ph ? <a href={mediaUrl(ph)} target="_blank" rel="noopener noreferrer"><img src={mediaUrl(ph, "thumb")} alt="" /></a> : null}</div>
                  <dl className={a.dl} style={{ gridTemplateColumns: "120px 1fr" }}>
                    <dt>#{i + 1} নাম</dt><dd>{x.name || "—"}</dd>
                    <dt>পদ / সংগঠন</dt><dd>{[x.role, x.org].filter(Boolean).join(" · ") || "—"}</dd>
                    {x.description && <><dt>বিবরণ</dt><dd>{x.description}</dd></>}
                    <dt>কীভাবে জানেন</dt><dd>{HOW_KNOWN.label(x.how) || "—"}</dd>
                    <dt>ফেসবুক</dt><dd>{x.facebookUrl ? <a href={x.facebookUrl} target="_blank" rel="noopener noreferrer nofollow">{x.facebookUrl}</a> : "—"}</dd>
                    <dt>ছবির লিংক</dt><dd>{x.photoUrl ? <><a href={x.photoUrl} target="_blank" rel="noopener noreferrer nofollow">{x.photoUrl}</a> <em className={a.muted}>(বাইরের লিংক — খুললে সেই সাইট আপনার IP দেখবে)</em></> : "—"}</dd>
                  </dl>
                  {(x.facebookUrl || x.photoUrl) && <div style={{ gridColumn: "1/-1" }}>{R("accused", "লিংক মুছুন", { accusedId: x.id })}</div>}
                </div>
              );
            })}
            {!!media.filter((m) => m.ownerType === "ACCUSED").length && <MediaGrid items={media.filter((m) => m.ownerType === "ACCUSED")} back={back} canDelete={me.super} />}
          </div>

          <div className={`${a.card} ${a.section}`}>
            <h2>প্রমাণ ({evidence.length})</h2>
            <MediaGrid items={evidence} back={back} canDelete={me.super} />
          </div>
        </div>

        <div>
          <div className={`${a.card} ${a.section}`}>
            <h2>অভ্যন্তরীণ অবস্থা</h2>
            <StatusButtons kind="complaint" id={c.id} current={c.status} back={back} />
          </div>
          <form action={complaintUpdate} className={`${a.card} ${a.form}`}>
            <h2 style={{ fontSize: 18 }}>জমাদাতার জন্য হালনাগাদ</h2>
            <p className={a.muted}>এটি /report/status পাতায় জমাদাতা দেখবেন (যদি “প্রকাশ্য” টিক থাকে)।</p>
            <input type="hidden" name="id" value={c.id} />
            <label>ধাপ<select className={a.input} name="progress" defaultValue={c.progress}>{PROGRESS.list.map(([v, bn]) => <option key={v} value={v}>{bn}</option>)}</select></label>
            <label>বার্তা<textarea className={a.textarea} name="message" placeholder="যেমন: আরও তথ্য দরকার — ঘটনার সময়টি নিশ্চিত করুন।" /></label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="public" defaultChecked /> জমাদাতাকে দেখান</label>
            <button className={a.btn}>হালনাগাদ যোগ করুন</button>
          </form>
          <div className={`${a.card} ${a.section}`} style={{ marginTop: 18 }}>
            <h2>সময়রেখা</h2>
            <ul className={a.timeline}>
              {c.updates.map((u) => (
                <li key={u.id} className={u.fromPublic ? a.sub : u.public ? a.pub : ""}>
                  <span className={a.muted}>{u.createdAt.toLocaleString("en-GB")} · {u.fromPublic ? "জমাদাতা" : u.public ? "প্রকাশ্য হালনাগাদ" : "অভ্যন্তরীণ"}{u.progress && ` · ${PROGRESS.label(u.progress)}`}</span>
                  <div style={{ whiteSpace: "pre-wrap" }}>{u.message}</div>
                </li>
              ))}
            </ul>
          </div>
          <form action={complaintNote} className={`${a.card} ${a.form}`} style={{ marginTop: 18 }}>
            <h2 style={{ fontSize: 18 }}>অভ্যন্তরীণ নোট</h2>
            <input type="hidden" name="id" value={c.id} />
            <textarea className={a.textarea} name="internalNote" defaultValue={c.internalNote ?? ""} />
            <button className={`${a.btn} ${a.ghost}`}>নোট সংরক্ষণ</button>
          </form>
        </div>
      </div>
    </>
  );
}
