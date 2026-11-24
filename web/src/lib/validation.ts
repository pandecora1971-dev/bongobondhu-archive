// zod schemas shared by client forms and server actions.
import { z } from "zod";
import {
  ACTIVITY_TYPES, CASE_FILED, CONTRIBUTION_TYPES, CRIMES, HARMS, HOW_KNOWN, ID_MODES, LEVELS, ORGS, VICTIMS, WITNESS,
} from "./labels";
import { DIVISIONS } from "./geo";

const tup = <T extends string>(a: T[]) => a as [T, ...T[]];

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

// NOTE: zod 4 keeps running refinements after an earlier check failed, so every
// check below must be safe on ANY string (never let `new URL()` throw).
const parseUrl = (v: string): URL | null => {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u : null;
  } catch {
    return null;
  }
};

const httpUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => parseUrl(v) !== null, "invalid url");

const optUrl = z
  .union([z.literal(""), httpUrl])
  .optional()
  .transform((v) => (v ? v : undefined));

const FB_HOST = /(^|\.)(facebook\.com|fb\.com|fb\.me|m\.me)$/i;
const facebookUrl = z
  .union([
    z.literal(""),
    z.string().trim().max(1000).refine((v) => {
      const u = parseUrl(v);
      return !!u && FB_HOST.test(u.hostname);
    }, "not a facebook url"),
  ])
  .optional()
  .transform((v) => (v ? v : undefined));

/** "one link per line" textarea → validated list of http(s) URLs */
export const linkList = (max: number) =>
  z
    .string()
    .max(20000)
    .optional()
    .transform((s) =>
      Array.from(
        new Set(
          String(s || "")
            .split(/\s+/)
            .map((x) => x.trim())
            .filter((x) => /^https?:\/\/\S+$/i.test(x) && x.length <= 1000),
        ),
      ).slice(0, max),
    );

const isoDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
    const date = new Date(`${v}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === v;
  }, "invalid calendar date"), z.literal("")])
  .optional()
  .transform((v) => (v ? v : undefined));

export const uploadRef = z.object({ id: z.string().min(10).max(40), token: z.string().min(20).max(80) });

const divisionCodes = DIVISIONS.map((d) => d.code);

// ───────────────────────────── 1. contributions (BB / SH) ─────────────────────────────

export const contributionSchema = z
  .object({
    subject: z.enum(["BB", "SH"]),
    types: z.array(z.enum(tup(CONTRIBUTION_TYPES.codes))).min(1).max(7),
    year: z.coerce.number().int().min(1900).max(new Date().getFullYear()),
    date: opt(60),
    place: opt(200),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(20000),
    sourceUrl: optUrl,
    videoLink: optUrl,
    attribution: z.enum(["NAME", "ALIAS", "ANON"]),
    name: opt(120),
    contact: opt(200),
    consent: z.literal(true),
    uploads: z.array(uploadRef).max(10).default([]),
    captcha: z.string().max(4096).optional(),
  })
  .refine((d) => d.attribution === "ANON" || !!d.name, { path: ["name"], message: "name required" });

export type ContributionInput = z.input<typeof contributionSchema>;

// ───────────────────────────── 2. complaints (/report) ─────────────────────────────

export const accusedSchema = z.object({
  name: opt(200),
  role: opt(200),
  org: opt(200),
  description: opt(4000),
  how: z.enum(tup(HOW_KNOWN.codes)).optional(),
  facebookUrl,
  photoUrl: optUrl,
  photo: uploadRef.optional(),
});

export const complaintSchema = z.object({
  crimes: z.array(z.enum(tup(CRIMES.codes))).min(1).max(17),
  harms: z.array(z.enum(tup(HARMS.codes))).max(6).default([]),
  victimType: z.enum(tup(VICTIMS.codes)).optional(),
  victimCount: z.coerce.number().int().min(1).max(1_000_000).optional().catch(undefined),
  victimName: opt(300),
  date: isoDate,
  division: z.enum(tup(divisionCodes)).optional().catch(undefined),
  district: opt(80),
  thana: opt(120),
  description: z.string().trim().min(1).max(30000),
  accused: z.array(accusedSchema).max(20).default([]),
  uploads: z.array(uploadRef).max(15).default([]),
  links: linkList(30),
  witness: z.enum(tup(WITNESS.codes)).optional().catch(undefined),
  caseFiled: z.enum(tup(CASE_FILED.codes)).optional().catch(undefined),
  idMode: z.enum(tup(ID_MODES.codes)).default("ANON"),
  contact: opt(300),
  ok: z.literal(true),
  captcha: z.string().max(4096).optional(),
});

export type ComplaintInput = z.input<typeof complaintSchema>;

export const statusLookupSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{4}-?[A-Z2-9]{4}$/),
  secret: z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/),
});

export const followupSchema = statusLookupSchema.extend({
  message: z.string().trim().min(1).max(10000),
  captcha: z.string().max(4096).optional(),
});

// ───────────────────────────── 3. দুঃসময়ের গল্প posts ─────────────────────────────

export const postSchema = z.object({
  org: z.enum(tup(ORGS.codes)),
  activityType: z.enum(tup(ACTIVITY_TYPES.codes)),
  level: z.enum(tup(LEVELS.codes)).optional().catch(undefined),
  date: isoDate,
  division: z.enum(tup(divisionCodes)).optional().catch(undefined),
  district: z.string().trim().min(1).max(80),
  thana: z.string().trim().min(1).max(120),
  place: opt(200),
  participants: z.coerce.number().int().min(1).max(10_000_000).optional().catch(undefined),
  title: z.string().trim().min(1).max(300),
  description: opt(20000),
  links: linkList(20),
  name: opt(120),
  role: opt(120),
  anonymous: z.boolean().default(true),
  uploads: z.array(uploadRef).max(6).default([]),
  captcha: z.string().max(4096).optional(),
});

export type PostInput = z.input<typeof postSchema>;

// ───────────────────────────── uploads ─────────────────────────────

export const presignSchema = z.object({
  purpose: z.enum(["contribution", "complaint", "accused", "post"]),
  name: z.string().max(255),
  type: z.string().max(100),
  size: z.number().int().positive(),
});
