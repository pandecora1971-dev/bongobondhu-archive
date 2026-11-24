// Bangla numerals & dates — safe on both server and client.
const BD = "০১২৩৪৫৬৭৮৯";

export const bnd = (s: string | number) => String(s).replace(/\d/g, (d) => BD[+d]);
export const end = (s: string | number) => String(s).replace(/[০-৯]/g, (d) => String(BD.indexOf(d)));
export const num = (n: string | number, lang: "bn" | "en") => (lang === "en" ? end(n) : bnd(n));
export const pad2 = (n: number) => String(n).padStart(2, "0");

export const MONTHS_BN = ["জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর"];
export const MONTHS_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** 2026-03-07 → ৭ মার্চ ২০২৬ / 7 March 2026 */
export function fmtDate(d: Date | string | null | undefined, lang: "bn" | "en" = "bn"): string {
  if (!d) return "";
  const x = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(x.getTime())) return "";
  const day = x.getUTCDate(), m = x.getUTCMonth(), y = x.getUTCFullYear();
  return lang === "en" ? `${day} ${MONTHS_EN[m]} ${y}` : `${bnd(day)} ${MONTHS_BN[m]} ${bnd(y)}`;
}
