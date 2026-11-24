import "server-only";
import { cookies } from "next/headers";

export type Lang = "bn" | "en";
export const LANG_COOKIE = "lang";

/** Bangla is the default. The toggle writes the `lang` cookie (see components/LangToggle). */
export async function getLang(): Promise<Lang> {
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return c === "en" ? "en" : "bn";
}

export type Dict = Record<string, readonly [string, string]>;

/** t("key") → string in the current language */
export function translator<D extends Dict>(dict: D, lang: Lang) {
  return (k: keyof D) => dict[k][lang === "en" ? 1 : 0];
}

/** pick(bn, en) for content coming from the database */
export const picker = (lang: Lang) => (bn: string | null | undefined, en: string | null | undefined) =>
  (lang === "en" ? en || bn : bn || en) ?? "";
