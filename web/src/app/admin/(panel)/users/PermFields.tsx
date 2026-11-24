import { PERMISSIONS } from "@/lib/labels";
import a from "../../admin.module.css";

/** Role picker + moderator permission checkboxes (permissions are ignored for super admins). */
export default function PermFields({ role = "MODERATOR", perms = ["CONTRIBUTIONS", "POSTS"] }: { role?: string; perms?: string[] }) {
  return (
    <>
      <label>
        ভূমিকা
        <select className={a.input} name="role" defaultValue={role}>
          <option value="MODERATOR">মডারেটর — শুধু নিচে টিক দেওয়া কাজ</option>
          <option value="SUPER_ADMIN">সুপার অ্যাডমিন — কোনো সীমা নেই</option>
        </select>
      </label>
      <fieldset style={{ border: "1px solid #e2ddd2", borderRadius: 6, padding: "10px 14px", display: "grid", gap: 6 }}>
        <legend className={a.muted} style={{ padding: "0 6px" }}>মডারেটরের অনুমতি (সুপার অ্যাডমিনের জন্য প্রযোজ্য নয়)</legend>
        {PERMISSIONS.list.map(([v, bn]) => (
          <label key={v} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500 }}>
            <input type="checkbox" name="permissions" value={v} defaultChecked={perms.includes(v)} /> {bn}
          </label>
        ))}
        <p className={a.muted}>মডারেটর কখনো পারবে না: ব্যবহারকারী তৈরি/মুছে ফেলা, অন্যের লগ দেখা, ফাইল স্থায়ীভাবে মুছে ফেলা, যোগাযোগসহ CSV নামানো।</p>
      </fieldset>
    </>
  );
}
