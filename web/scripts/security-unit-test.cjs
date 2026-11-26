/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS harness with isolated server adapters. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

// Execute the real TypeScript modules with isolated DB/network adapters. No live
// database, credentials, visitor records or external requests are used.
function load(file, mocks = {}) {
  const filename = path.join(__dirname, "..", file);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  const mod = { exports: {} };
  new Function("require", "module", "exports", output)((name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name === "server-only") return {};
    throw new Error(`Unexpected import ${name} in ${file}`);
  }, mod, mod.exports);
  return mod.exports;
}

class TestResponse extends Response {
  static next(options) {
    const res = new TestResponse(null);
    res.requestHeaders = options.request.headers;
    return res;
  }
  static redirect(url, status = 307) { return new TestResponse(null, { status, headers: { Location: String(url) } }); }
}

async function main() {
  const policy = load("src/lib/security.ts");
  const nextConfig = load("next.config.ts").default;
  assert.equal(nextConfig.images.unoptimized, true, "revocable media must not enter the independent image optimizer cache");
  const { readLimitedBody, BodyTooLarge } = load("src/lib/request-body.ts");
  const site = "https://archive.example";
  const request = (headers = {}) => new Request(site + "/api/uploads/presign", { method: "POST", headers });
  assert.equal(policy.requestIsSameOrigin(request({ origin: site }), site, true), true);
  for (const headers of [
    {}, { origin: "null" }, { origin: "http://archive.example" }, { origin: site + ":8443" },
    { origin: "https://evil.example", host: "evil.example", "x-forwarded-host": "evil.example" },
    { origin: site, "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" }, { origin: "https://archive.example.evil.test" },
  ]) assert.equal(policy.requestIsSameOrigin(request(headers), site, true), false);
  assert.equal(policy.requestIsSameOrigin(request({ "sec-fetch-site": "same-origin" }), site, true), true);
  assert.equal(policy.requestIsSameOrigin(request(), site, false), true);
  // the host may redirect bare domain <-> www; both are the same site, look-alikes are not
  assert.equal(policy.requestIsSameOrigin(request({ origin: "https://www.archive.example" }), site, true), true);
  assert.equal(policy.requestIsSameOrigin(request({ origin: site }), "https://www.archive.example", true), true);
  for (const origin of ["http://www.archive.example", "https://www.archive.example:8443", "https://wwwarchive.example", "https://www.www.archive.example", "https://evil.www.archive.example"])
    assert.equal(policy.requestIsSameOrigin(request({ origin }), site, true), false, origin);

  const spoof = new Headers({ "cf-connecting-ip": "attacker", "x-real-ip": "attacker", "x-forwarded-for": "attacker", "x-vercel-forwarded-for": "203.0.113.1" });
  assert.equal(policy.requestClientIp(spoof, true), "203.0.113.1");
  assert.equal(policy.requestClientIp(spoof, false), "0.0.0.0");
  spoof.delete("x-vercel-forwarded-for");
  assert.equal(policy.requestClientIp(spoof, true), "0.0.0.0");
  assert.equal(policy.requestClientIp(new Headers({ "x-trusted-client": "203.0.113.2" }), false, "x-trusted-client"), "203.0.113.2");

  for (const prefix of ["1", "2", "3"]) {
    assert.equal(policy.captchaConfigIsSafe(prefix + "x0000000000000000000000000000000AA", "real-site-key", false), false);
    assert.equal(policy.captchaConfigIsSafe("real-secret", prefix + "x00000000000000000000AA", false), false);
  }
  assert.equal(policy.captchaConfigIsSafe("real-secret", "real-site-key", false), true);
  assert.equal(policy.captchaConfigIsSafe("real-secret", "real-site-key", true), false);
  assert.equal(policy.captchaConfigIsSafe("", "real-site-key", false), false);
  for (const result of [null, {}, { success: true }, { success: true, hostname: "evil.example" }, { success: "true", hostname: "archive.example" }])
    assert.equal(policy.captchaResultIsValid(result, site), false);
  assert.equal(policy.captchaResultIsValid({ success: true, hostname: "archive.example" }, site), true);
  assert.equal(policy.captchaResultIsValid({ success: true, hostname: "www.archive.example" }, site), true);
  assert.equal(policy.captchaResultIsValid({ success: true, hostname: "www.evil.example" }, site), false);

  const captchaEnv = { isProd: true, siteUrl: site, captchaDisabled: false, turnstileSecret: "real-secret" };
  const savedKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const originalFetch = global.fetch;
  let verified = { success: true, hostname: "archive.example" }, verificationCalls = 0;
  try {
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "real-site-key";
    global.fetch = async (_url, options) => {
      verificationCalls++;
      assert.equal(options.body.has("remoteip"), false, "visitor IP must not be sent to the CAPTCHA service");
      return Response.json(verified);
    };
    const { verifyCaptcha } = load("src/lib/captcha.ts", { "./env": { env: captchaEnv }, "./security": policy });
    assert.equal(await verifyCaptcha("valid-token"), true);
    verified = { success: true, hostname: "evil.example" };
    assert.equal(await verifyCaptcha("other-site-token"), false);
    const calls = verificationCalls;
    captchaEnv.turnstileSecret = "1x0000000000000000000000000000000AA";
    assert.equal(await verifyCaptcha("anything"), false);
    assert.equal(verificationCalls, calls, "test credentials must fail before contacting the verifier");
    captchaEnv.turnstileSecret = "real-secret";
    assert.equal(await verifyCaptcha("x".repeat(2049)), false);
    assert.equal(await verifyCaptcha(null), false);
    global.fetch = async () => { throw new Error("network unavailable"); };
    assert.equal(await verifyCaptcha("token"), false, "verification failure must fail closed");
  } finally {
    global.fetch = originalFetch;
    if (savedKey === undefined) delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
    else process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = savedKey;
  }

  assert.deepEqual(await readLimitedBody(new Request(site, { method: "POST", body: "1234" }), 4), new TextEncoder().encode("1234"));
  await assert.rejects(() => readLimitedBody(new Request(site, { method: "POST", body: "12345" }), 4), BodyTooLarge);
  await assert.rejects(() => readLimitedBody(new Request(site, { method: "POST", headers: { "content-length": "999" }, body: "x" }), 4), BodyTooLarge);
  let cancelled = false;
  const stream = new ReadableStream({ pull(c) { c.enqueue(new Uint8Array(5)); }, cancel() { cancelled = true; } });
  await assert.rejects(() => readLimitedBody(new Request(site, { method: "POST", body: stream, duplex: "half" }), 4), BodyTooLarge);
  assert.equal(cancelled, true, "oversized chunked request must stop reading");

  const saved = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_SITE_URL = site;
    delete process.env.S3_ENDPOINT;
    const { middleware } = load("src/middleware.ts", { "next/server": { NextResponse: TestResponse }, "./lib/security": policy });
    const nextReq = (url, method = "GET", headers = {}, hasCookie = false) => Object.assign(new Request(url, { method, headers }), {
      nextUrl: { pathname: new URL(url).pathname, clone: () => new URL(url) }, cookies: { has: () => hasCookie },
    });
    const admin = middleware(nextReq(site + "/admin"));
    assert.equal(admin.status, 307);
    assert.match(admin.headers.get("cache-control"), /no-store/);
    assert.match(admin.headers.get("x-robots-tag"), /noindex/);
    const prefetched = middleware(nextReq(site + "/admin/users", "GET", { "next-router-prefetch": "1" }));
    assert.equal(prefetched.status, 307, "prefetch header must not bypass the admin gate");
    assert.equal(middleware(nextReq(site + "/admin", "POST", { origin: "https://evil.example", "x-forwarded-host": "evil.example" }, true)).status, 403);
    const allowed = middleware(nextReq(site + "/admin", "POST", { origin: site }, true));
    assert.equal(allowed.status, 200);
    assert.match(allowed.headers.get("content-security-policy"), /nonce-/);
    assert.equal(allowed.headers.get("content-security-policy"), allowed.requestHeaders.get("Content-Security-Policy"));
    assert.equal(allowed.headers.get("content-security-policy").includes("unsafe-eval"), false);

    for (const key of ["AUTH_SECRET", "RATE_LIMIT_SALT", "UPLOAD_SIGNING_SECRET"]) {
      process.env[key] = "short";
      const { env } = load("src/lib/env.ts");
      const getter = { AUTH_SECRET: "authSecret", RATE_LIMIT_SALT: "rateLimitSalt", UPLOAD_SIGNING_SECRET: "uploadSecret" }[key];
      assert.throws(() => env[getter]);
      process.env[key] = "a".repeat(44);
      assert.equal(env[getter], "a".repeat(44));
    }
    process.env.ENCRYPTION_KEY = "ZGV2LWVuY3J5cHRpb24ta2V5LTMyLWJ5dGVzLWxvbmch";
    assert.throws(() => load("src/lib/env.ts").env.encryptionKey, /development key/);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }

  let asset = { id: "test-media", state: "READY", ownerType: "POST", ownerId: "test-post", kind: "IMAGE", hidden: false, key: "test.webp", mime: "image/webp" };
  let approved = true, admin = false, storageReads = 0;
  const { GET } = load("src/app/api/media/[id]/route.ts", {
    "next/server": { NextResponse: TestResponse },
    "@/lib/db": { db: { mediaAsset: { findUnique: async () => asset }, activityPost: { findFirst: async () => approved ? { id: "test-post" } : null }, contribution: { findFirst: async () => approved ? { id: "test-contribution" } : null } } },
    "@/lib/storage": { storage: { stream: async () => { storageReads++; return { body: "image", size: 5, status: 200 }; } } },
    "@/lib/auth": { adminOrNull: async () => admin ? {} : null },
    "@/lib/access": { permissionForOwner: () => "POSTS" },
    "@/lib/security": policy,
  });
  const getMedia = () => GET(new Request(site + "/api/media/test-media"), { params: Promise.resolve({ id: "test-media" }) });
  const publicImage = await getMedia();
  assert.equal(publicImage.status, 200);
  assert.match(publicImage.headers.get("cache-control"), /no-store/);
  assert.equal(publicImage.headers.get("vary"), "Cookie");
  approved = false;
  assert.equal((await getMedia()).status, 404, "revoked approval must block the same URL immediately");
  assert.equal(storageReads, 1, "unauthorized request must not read storage");
  approved = true;
  asset.hidden = true;
  assert.equal((await getMedia()).status, 404);
  asset.hidden = false;
  asset.ownerType = "COMPLAINT";
  assert.equal((await getMedia()).status, 404);
  admin = true;
  const privateImage = await getMedia();
  assert.equal(privateImage.status, 200);
  assert.match(privateImage.headers.get("cache-control"), /no-store/);
  admin = false;
  asset.ownerType = "CONTRIBUTION";
  for (const kind of ["PDF", "AUDIO", "VIDEO"]) {
    asset.kind = kind;
    assert.equal((await getMedia()).status, 404, `${kind} retaining metadata must remain private`);
  }
  asset.kind = "IMAGE";
  asset.key = null;
  asset.externalUrl = "https://images.example/test.jpg";
  assert.match((await getMedia()).headers.get("cache-control"), /no-store/);
  asset = null;
  assert.match((await getMedia()).headers.get("cache-control"), /no-store/);

  console.log("Security regressions passed: origin spoofing, proxy trust, CAPTCHA, body limits, middleware, secrets, and media revocation.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
