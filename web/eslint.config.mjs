import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });
export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "prisma/seed-data/**"] },
  {
    rules: {
      // Images: external seed URLs and private admin media are plain <img>; public content uses next/image.
      "@next/next/no-img-element": "off",
      // Deliberate full page loads between the homepage and the other routes: the homepage ships the
      // prototype's global stylesheet, which must not leak into /report, /dusshomoy or /admin on
      // client-side navigation.
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
    },
  },
];
