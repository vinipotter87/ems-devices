import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { one } from "./db";

export const COOKIE = "ems_sessao";
const DIAS = 30;

// Regra de acesso, aplicada no servidor: so emails deste dominio recebem codigo.
// Excecao: emails em ADMIN_EMAILS (variavel de ambiente) e Gerentes Regionais ja cadastrados.
export const DOMINIO_PERMITIDO = "ems.com.br";

export type Papel = "GR" | "GD" | "STAFF";
export type Usuario = { id: number; nome: string; email: string; papel: Papel; ativo: boolean };

export function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET não configurada (mínimo 16 caracteres).");
  return new TextEncoder().encode(s);
}

export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

export function emailValido(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.split("@").length === 2;
}

export function emailDoDominio(e: string): boolean {
  return emailValido(e) && e.endsWith("@" + DOMINIO_PERMITIDO);
}

export function nomeDoEmail(e: string): string {
  const local = e.split("@")[0].replace(/\d+/g, "");
  const partes = local.split(/[._-]+/).filter(Boolean);
  if (partes.length === 0) return e;
  return partes.map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
}

export function hashCodigo(email: string, codigo: string): string {
  return createHmac("sha256", secret()).update(`${email}:${codigo}`).digest("hex");
}

export function codigoConfere(email: string, codigo: string, hashGuardado: string): boolean {
  const a = Buffer.from(hashCodigo(email, codigo), "hex");
  const b = Buffer.from(hashGuardado, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function criarSessao(userId: number): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DIAS}d`)
    .sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS * 24 * 60 * 60,
  });
}

export async function encerrarSessao(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function usuarioAtual(): Promise<Usuario | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const uid = Number(payload.uid);
    if (!uid) return null;
    return await one<Usuario>(
      "SELECT id, nome, email, papel, ativo FROM usuarios WHERE id = $1 AND ativo = TRUE",
      [uid]
    );
  } catch {
    return null;
  }
}

export async function exigirUsuario(): Promise<Usuario> {
  const u = await usuarioAtual();
  if (!u) throw new Error("NAO_AUTENTICADO");
  return u;
}

export const PAPEL_LABEL: Record<Papel, string> = {
  GR: "Gerente Regional",
  GD: "Gerente Distrital",
  STAFF: "Staff",
};
