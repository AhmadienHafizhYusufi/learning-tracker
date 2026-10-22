import "server-only";
import { redirect } from "next/navigation";
import { getUserId } from "@/auth";

/** Untuk halaman (server component): ID user login, atau redirect ke /login */
export async function requirePageUser(): Promise<number> {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return userId;
}
