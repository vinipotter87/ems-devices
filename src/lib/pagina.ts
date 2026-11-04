import { redirect } from "next/navigation";
import { usuarioAtual, type Usuario } from "./auth";
export { fmtData, fmtDataHora, hojeISO, STATUS_LABEL } from "./util";

export async function usuarioOuLogin(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) redirect("/login");
  return u;
}
