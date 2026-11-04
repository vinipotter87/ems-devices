import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const u = await usuarioAtual();
  redirect(u ? "/inventario" : "/login");
}
