"use server";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export async function login(_: string | null, fd: FormData): Promise<string | null> {
  try {
    await signIn("credentials", { email: fd.get("email"), password: fd.get("password"), redirectTo: "/admin" });
    return null;
  } catch (e) {
    if (e instanceof AuthError) return (e as AuthError & { code?: string }).code === "rate_limited" ? "rate" : "bad";
    throw e; // NEXT_REDIRECT on success
  }
}
