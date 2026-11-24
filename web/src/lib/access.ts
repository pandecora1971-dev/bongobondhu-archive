import type { OwnerType, Permission } from "@prisma/client";

/** Which permission is needed to see / moderate a file, by what it belongs to. */
export function permissionForOwner(t: OwnerType | null): Permission | "SUPER" {
  switch (t) {
    case "CONTRIBUTION":
      return "CONTRIBUTIONS";
    case "POST":
      return "POSTS";
    case "COMPLAINT":
    case "ACCUSED":
      return "COMPLAINTS";
    case "PROJECT":
    case "MILESTONE":
    case "FILM":
    case "CHAPTER":
    case "SITE":
      return "CONTENT";
    default:
      return "SUPER"; // unattached / unknown → only super admins
  }
}
