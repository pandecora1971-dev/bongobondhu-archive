import "server-only";

const isProd = process.env.NODE_ENV === "production";

function need(name: string, devFallback?: string): string {
  const v = process.env[name];
  if (isProd && devFallback !== undefined && v === devFallback)
    throw new Error(`Production ${name} must not use the development key`);
  if (v && v !== "change-me" && !v.startsWith("change-me")) return v;
  if (!isProd && devFallback !== undefined) return devFallback;
  throw new Error(`Missing required environment variable ${name}`);
}

function signingSecret(name: string, devFallback: string): string {
  const value = need(name, devFallback);
  if (isProd && (value.length < 32 || value.startsWith("dev-")))
    throw new Error(`Production ${name} must contain at least 32 random characters`);
  return value;
}

export const env = {
  isProd,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  get authSecret() {
    return signingSecret("AUTH_SECRET", "dev-auth-secret-for-local-development-only");
  },
  get rateLimitSalt() {
    return signingSecret("RATE_LIMIT_SALT", "dev-rate-limit-salt");
  },
  get encryptionKey() {
    return need("ENCRYPTION_KEY", "ZGV2LWVuY3J5cHRpb24ta2V5LTMyLWJ5dGVzLWxvbmch");
  },
  get uploadSecret() {
    return signingSecret("UPLOAD_SIGNING_SECRET", "dev-upload-secret");
  },
  storageDriver: (process.env.STORAGE_DRIVER === "s3" ? "s3" : "local") as "s3" | "local",
  s3: {
    bucket: process.env.S3_BUCKET || "archive",
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
  },
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  captchaDisabled: process.env.CAPTCHA_DISABLED === "true",
};
