// Fonts are self-hosted from public/fonts (see fonts.css), not fetched from Google at build time.
// Google now serves some families (e.g. Outfit) from URLs without a file extension, which makes
// next/font/google crash during `next build`. fonts.css sets --ff-anek, --ff-serif-bn, --ff-serif
// and --ff-outfit on :root, so every stylesheet that uses those variables keeps working unchanged.
import "./fonts.css";

export const fontVars = "";
