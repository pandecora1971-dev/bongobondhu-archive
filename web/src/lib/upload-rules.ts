// Shared by browser (pre-checks) and server (enforcement). Keep in sync with the forms' copy.
export type Kind = "IMAGE" | "VIDEO" | "AUDIO" | "PDF";
export type UploadPurpose = "contribution" | "complaint" | "accused" | "post";

const MB = 1024 * 1024;

export const UPLOAD_RULES: Record<
  UploadPurpose,
  { maxFiles: number; kinds: Kind[]; maxBytes: Record<Kind, number>; accept: string }
> = {
  // homepage BB / SH form: "সর্বোচ্চ ১০টি ফাইল" — photo, video or PDF
  contribution: {
    maxFiles: 10,
    kinds: ["IMAGE", "VIDEO", "PDF"],
    maxBytes: { IMAGE: 20 * MB, VIDEO: 200 * MB, PDF: 30 * MB, AUDIO: 0 },
    accept: "image/*,video/*,application/pdf",
  },
  // /report evidence: up to 15 files — photo, video, audio or PDF
  complaint: {
    maxFiles: 15,
    kinds: ["IMAGE", "VIDEO", "AUDIO", "PDF"],
    maxBytes: { IMAGE: 20 * MB, VIDEO: 200 * MB, PDF: 30 * MB, AUDIO: 60 * MB },
    accept: "image/*,video/*,audio/*,application/pdf",
  },
  // one photo per accused person
  accused: {
    maxFiles: 1,
    kinds: ["IMAGE"],
    maxBytes: { IMAGE: 15 * MB, VIDEO: 0, PDF: 0, AUDIO: 0 },
    accept: "image/*",
  },
  // দুঃসময়ের গল্প: up to 6 photos
  post: {
    maxFiles: 6,
    kinds: ["IMAGE"],
    maxBytes: { IMAGE: 15 * MB, VIDEO: 0, PDF: 0, AUDIO: 0 },
    accept: "image/*",
  },
};

export function kindFromMime(m: string): Kind | null {
  if (m.startsWith("image/")) return "IMAGE";
  if (m.startsWith("video/")) return "VIDEO";
  if (m.startsWith("audio/")) return "AUDIO";
  if (m === "application/pdf") return "PDF";
  return null;
}
