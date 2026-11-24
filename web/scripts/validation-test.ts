import { complaintSchema, contributionSchema, postSchema } from "../src/lib/validation";
import assert from "node:assert/strict";
import { pageNumber } from "../src/lib/pagination";

// Assertion failures must fail the command, not merely print a message.
const report = { crimes: ["OTHER"], description: "regression", ok: true };
for (const [date, expected] of [["2026-99-99", false], ["2026-04-31", false], ["2025-02-29", false], ["2024-02-29", true], ["", true], ["bad", false]] as const) {
  assert.equal(complaintSchema.safeParse({ ...report, date }).success, expected, `complaint date=${date}`);
  assert.equal(postSchema.safeParse({ org: "OTHER", activityType: "OTHER", district: "Dhaka", thana: "x", title: "t", date }).success, expected, `post date=${date}`);
}
for (const [value, expected] of [[undefined, 1], ["1.1", 1], ["-1", 1], ["2.9", 2], ["Infinity", 1], ["NaN", 1], ["501", 500], ["3", 3]] as const) {
  const page = pageNumber(value);
  assert.equal(page, expected, `page=${String(value)}`);
  assert.ok(Number.isSafeInteger((page - 1) * 24), "Prisma offset must be an integer");
}
assert.equal(complaintSchema.safeParse({ ...report, accused: [{ facebookUrl: "" }] }).success, true);
assert.equal(complaintSchema.safeParse({ ...report, accused: [{ facebookUrl: "https://www.facebook.com/x" }] }).success, true);
assert.equal(complaintSchema.safeParse({ ...report, accused: [{ facebookUrl: "https://facebook.com.evil.com/x" }] }).success, false);
assert.equal(complaintSchema.safeParse({ ...report, accused: [{ photoUrl: "javascript:alert(1)" }] }).success, false);
assert.deepEqual(complaintSchema.parse({ ...report, links: "javascript:x https://ok.com/a https://ok.com/a ftp://x" }).links, ["https://ok.com/a"]);
const validContribution = { subject: "BB", types: ["EVENT"], year: 1971, title: "t", description: "d", sourceUrl: "", attribution: "ANON", consent: true };
assert.equal(contributionSchema.safeParse(validContribution).success, true);
assert.equal(contributionSchema.safeParse({ ...validContribution, sourceUrl: "nope" }).success, false);
assert.equal(contributionSchema.safeParse({ ...validContribution, consent: false }).success, false);
console.log("28 validation and pagination regression cases passed.");
const base = { crimes: ["OTHER"], description: "x", ok: true as const };
const cases: [string, unknown][] = [
  ["no fb, no photoUrl", { ...base, accused: [{ name: "a", facebookUrl: "", photoUrl: "" }] }],
  ["fb missing key", { ...base, accused: [{ name: "a" }] }],
  ["valid fb", { ...base, accused: [{ facebookUrl: "https://www.facebook.com/x" }] }],
  ["non-fb url as fb", { ...base, accused: [{ facebookUrl: "https://evil.com/x" }] }],
  ["garbage fb", { ...base, accused: [{ facebookUrl: "not a url" }] }],
  ["javascript: url", { ...base, accused: [{ photoUrl: "javascript:alert(1)" }] }],
  ["links junk", { ...base, links: "javascript:x https://ok.com/a  ftp://x" }],
];
for (const [n, v] of cases) {
  try { const r = complaintSchema.safeParse(v); console.log(n.padEnd(22), r.success ? "valid" + (r.success && n === "links junk" ? " " + JSON.stringify(r.data.links) : "") : "invalid"); }
  catch (e) { console.log(n.padEnd(22), "THREW", (e as Error).message); }
}
for (const [n, v] of [["contrib empty src", { subject: "BB", types: ["EVENT"], year: 1971, title: "t", description: "d", sourceUrl: "", videoLink: "", attribution: "ANON", consent: true }], ["contrib bad src", { subject: "BB", types: ["EVENT"], year: 1971, title: "t", description: "d", sourceUrl: "nope", attribution: "ANON", consent: true }]] as [string, unknown][])
  try { console.log(n.padEnd(22), contributionSchema.safeParse(v).success ? "valid" : "invalid"); } catch (e) { console.log(n, "THREW", (e as Error).message); }
try { console.log("post minimal".padEnd(22), postSchema.safeParse({ org: "OTHER", activityType: "OTHER", district: "ঢাকা", thana: "x", title: "t", links: "" }).success ? "valid" : "invalid"); } catch (e) { console.log("post THREW", (e as Error).message); }
