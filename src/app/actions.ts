"use server";

import { randomInt } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { q, one } from "@/lib/db";
import {
  criarSessao,
  encerrarSessao,
  exigirUsuario,
  adminEmails,
  emailValido,
  emailDoDominio,
  nomeDoEmail,
  hashCodigo,
  codigoConfere,
  DOMINIO_PERMITIDO,
  type Papel,
  type Usuario,
} from "@/lib/auth";
import { enviarCodigo } from "@/lib/email";
import { DEVICE_KEYS, STATUS_KEYS, cepValido } from "@/lib/devices";
import { DISTRITOS, setorPertence } from "@/lib/estrutura";

type Resultado = { erro?: string } | undefined;

function s(fd: FormData, k: string): string {
  return String(fd.get(k) ?? "").trim();
}

// ---------------- LOGIN POR CODIGO (somente emails @ems.com.br) ----------------
export type EstadoLogin = { etapa: "email" | "codigo"; email?: string; erro?: string; info?: string };

const VALIDADE_MIN = 10;
const MAX_TENTATIVAS = 5;
const MAX_CODIGOS_POR_HORA = 5;
const INTERVALO_REENVIO_SEG = 45;

async function emailAutorizado(email: string): Promise<boolean> {
  if (!emailValido(email)) return false;
  if (emailDoDominio(email) || adminEmails().includes(email)) return true;
  const gr = await one("SELECT 1 AS x FROM usuarios WHERE email = $1 AND papel = 'GR' AND ativo = TRUE", [email]);
  return !!gr;
}

async function emitirCodigo(email: string): Promise<EstadoLogin> {
  await q("DELETE FROM login_codigos WHERE criado_em < NOW() - INTERVAL '1 day'");

  const rec = await one<{ n: string; recente: boolean }>(
    `SELECT COUNT(*)::text AS n,
            COALESCE(BOOL_OR(criado_em > NOW() - INTERVAL '${INTERVALO_REENVIO_SEG} seconds'), FALSE) AS recente
       FROM login_codigos WHERE email = $1 AND criado_em > NOW() - INTERVAL '1 hour'`,
    [email]
  );
  if (rec?.recente) {
    return { etapa: "codigo", email, info: "Um código acabou de ser enviado. Aguarde alguns segundos para pedir outro." };
  }
  if (Number(rec?.n ?? 0) >= MAX_CODIGOS_POR_HORA) {
    return { etapa: "email", erro: "Muitos códigos solicitados para este email. Tente novamente em cerca de uma hora." };
  }

  const codigo = String(randomInt(0, 1000000)).padStart(6, "0");
  const reg = await one<{ id: number }>(
    `INSERT INTO login_codigos (email, codigo_hash, expira_em)
     VALUES ($1, $2, NOW() + INTERVAL '${VALIDADE_MIN} minutes') RETURNING id`,
    [email, hashCodigo(email, codigo)]
  );
  try {
    await enviarCodigo(email, codigo);
  } catch (e) {
    console.error("Falha ao enviar codigo:", e instanceof Error ? e.message : e);
    await q("DELETE FROM login_codigos WHERE id = $1", [reg!.id]);
    return { etapa: "email", erro: "Não foi possível enviar o email agora. Tente novamente em instantes." };
  }
  return { etapa: "codigo", email, info: `Enviamos um código de 6 dígitos para ${email}. Ele vale por ${VALIDADE_MIN} minutos.` };
}

export async function entrar(_prev: EstadoLogin | undefined, fd: FormData): Promise<EstadoLogin> {
  const acao = s(fd, "acao");
  const email = s(fd, "email").toLowerCase();
  const next = s(fd, "next");

  if (acao === "voltar") return { etapa: "email" };

  if (!emailValido(email)) return { etapa: "email", erro: "Informe um email válido." };
  if (!(await emailAutorizado(email))) {
    return { etapa: "email", erro: `Acesso restrito a emails @${DOMINIO_PERMITIDO}.` };
  }

  if (acao === "enviar" || acao === "reenviar") return emitirCodigo(email);

  const codigo = s(fd, "codigo").replace(/\D/g, "");
  if (codigo.length !== 6) return { etapa: "codigo", email, erro: "Digite os 6 dígitos do código." };

  const reg = await one<{ id: number; codigo_hash: string; expirado: boolean; tentativas: number }>(
    `SELECT id, codigo_hash, (expira_em < NOW()) AS expirado, tentativas
       FROM login_codigos WHERE email = $1 ORDER BY id DESC LIMIT 1`,
    [email]
  );
  if (!reg) return { etapa: "email", erro: "Solicite um novo código." };
  if (reg.expirado) return { etapa: "email", erro: "Código expirado. Solicite um novo." };
  if (reg.tentativas >= MAX_TENTATIVAS) return { etapa: "email", erro: "Muitas tentativas incorretas. Solicite um novo código." };

  if (!codigoConfere(email, codigo, reg.codigo_hash)) {
    await q("UPDATE login_codigos SET tentativas = tentativas + 1 WHERE id = $1", [reg.id]);
    return { etapa: "codigo", email, erro: "Código incorreto." };
  }

  await q("DELETE FROM login_codigos WHERE email = $1", [email]);

  const ehAdmin = adminEmails().includes(email);
  let u = await one<{ id: number; ativo: boolean }>("SELECT id, ativo FROM usuarios WHERE email = $1", [email]);
  if (!u) {
    u = await one<{ id: number; ativo: boolean }>(
      "INSERT INTO usuarios (nome, email, papel) VALUES ($1, $2, $3) RETURNING id, ativo",
      [nomeDoEmail(email), email, ehAdmin ? "GR" : "STAFF"]
    );
  } else if (ehAdmin) {
    await q("UPDATE usuarios SET papel = 'GR', ativo = TRUE WHERE id = $1", [u.id]);
    u.ativo = true;
  }
  if (!u!.ativo) return { etapa: "email", erro: "Conta desativada. Fale com o Gerente Regional." };

  await criarSessao(u!.id);
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/inventario");
}

export async function logout(): Promise<void> {
  await encerrarSessao();
  redirect("/login");
}

// ---------------- USUARIOS (somente GR) ----------------
export async function alternarAtivo(fd: FormData): Promise<void> {
  const eu = await exigirUsuario();
  if (eu.papel !== "GR") return;
  const id = Number(fd.get("id"));
  if (!id || id === eu.id) return;
  await q("UPDATE usuarios SET ativo = NOT ativo WHERE id = $1", [id]);
  revalidatePath("/usuarios");
}

export async function alterarPapel(fd: FormData): Promise<void> {
  const eu = await exigirUsuario();
  if (eu.papel !== "GR") return;
  const id = Number(fd.get("id"));
  const papel = String(fd.get("papel") ?? "") as Papel;
  if (!id || id === eu.id || !["GR", "GD", "STAFF"].includes(papel)) return;
  await q("UPDATE usuarios SET papel = $1 WHERE id = $2", [papel, id]);
  revalidatePath("/usuarios");
}

export async function renomearUsuario(fd: FormData): Promise<void> {
  const eu = await exigirUsuario();
  if (eu.papel !== "GR") return;
  const id = Number(fd.get("id"));
  const nome = s(fd, "nome");
  if (!id || !nome) return;
  await q("UPDATE usuarios SET nome = $1 WHERE id = $2", [nome, id]);
  revalidatePath("/usuarios");
  revalidatePath("/inventario");
}

// ---------------- INVENTARIO DE DEVICES ----------------
type Campos = {
  tipo: string; numero_serie: string; status: string; distrito: string; setor: string | null;
  medico_nome: string | null; medico_crm: string | null; clinica: string | null;
  endereco: string | null; cidade: string | null; cep: string | null; observacao: string | null;
};

function lerCampos(fd: FormData): { campos?: Campos; erro?: string } {
  const tipo = s(fd, "tipo");
  const numero_serie = s(fd, "numero_serie").toUpperCase();
  const status = s(fd, "status");
  const cepBruto = s(fd, "cep");
  const cep = cepBruto ? cepBruto.replace(/\D/g, "") : "";

  if (!DEVICE_KEYS.includes(tipo)) return { erro: "Selecione o device." };
  if (!numero_serie) return { erro: "Informe o número de série." };
  if (!STATUS_KEYS.includes(status)) return { erro: "Selecione onde o aparelho está." };
  const distrito = s(fd, "distrito");
  const setor = s(fd, "setor");
  if (!DISTRITOS[distrito]) return { erro: "Selecione o distrito." };
  if (setor && !setorPertence(setor, distrito)) return { erro: "O setor informado não pertence ao distrito selecionado." };
  if (cep && !cepValido(cep)) return { erro: "CEP inválido. Use o formato 00000-000." };

  const medico_nome = s(fd, "medico_nome") || null;
  const medico_crm = s(fd, "medico_crm") || null;
  if (status === "instalado" && (!medico_nome || !medico_crm)) {
    return { erro: "Para aparelho instalado na clínica, informe nome e CRM do médico." };
  }

  return {
    campos: {
      tipo, numero_serie, status, distrito,
      setor: setor || null,
      medico_nome, medico_crm,
      clinica: s(fd, "clinica") || null,
      endereco: s(fd, "endereco") || null,
      cidade: s(fd, "cidade") || null,
      cep: cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : null,
      observacao: s(fd, "observacao") || null,
    },
  };
}

async function podeEditar(eu: Usuario, id: number): Promise<boolean> {
  if (eu.papel === "GR") return true;
  const d = await one<{ x: number }>("SELECT 1 AS x FROM devices WHERE id = $1 AND registrado_por = $2", [id, eu.id]);
  return !!d;
}

async function registrarHistorico(deviceId: number, acao: "criou" | "alterou" | "excluiu", email: string): Promise<void> {
  const d = await one("SELECT * FROM devices WHERE id = $1", [deviceId]);
  await q("INSERT INTO devices_historico (device_id, acao, email, dados) VALUES ($1, $2, $3, $4)", [
    deviceId, acao, email, JSON.stringify(d ?? { id: deviceId }),
  ]);
}

export async function criarDevice(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const eu = await exigirUsuario();
  const { campos: c, erro } = lerCampos(fd);
  if (erro || !c) return { erro };

  const dup = await one("SELECT 1 AS x FROM devices WHERE tipo = $1 AND numero_serie = $2", [c.tipo, c.numero_serie]);
  if (dup) return { erro: "Já existe um registro deste device com esse número de série." };

  // O registro pertence ao email corporativo que esta logado.
  const d = await one<{ id: number }>(
    `INSERT INTO devices (tipo, numero_serie, status, distrito, setor, medico_nome, medico_crm, clinica, endereco, cidade, cep, observacao,
                          registrado_por, registrado_email, atualizado_por, atualizado_email)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$13,$14) RETURNING id`,
    [c.tipo, c.numero_serie, c.status, c.distrito, c.setor, c.medico_nome, c.medico_crm, c.clinica, c.endereco, c.cidade, c.cep, c.observacao, eu.id, eu.email]
  );
  await registrarHistorico(d!.id, "criou", eu.email);
  revalidatePath("/inventario");
  redirect("/inventario?ok=criado");
}

export async function atualizarDevice(_prev: Resultado, fd: FormData): Promise<Resultado> {
  const eu = await exigirUsuario();
  const id = Number(fd.get("id"));
  if (!id || !(await podeEditar(eu, id))) return { erro: "Você não pode alterar este registro." };
  const { campos: c, erro } = lerCampos(fd);
  if (erro || !c) return { erro };

  const dup = await one("SELECT 1 AS x FROM devices WHERE tipo = $1 AND numero_serie = $2 AND id <> $3", [c.tipo, c.numero_serie, id]);
  if (dup) return { erro: "Já existe outro registro deste device com esse número de série." };

  await q(
    `UPDATE devices SET tipo=$1, numero_serie=$2, status=$3, distrito=$4, setor=$5, medico_nome=$6, medico_crm=$7, clinica=$8,
            endereco=$9, cidade=$10, cep=$11, observacao=$12, atualizado_por=$13, atualizado_email=$14, atualizado_em=NOW()
     WHERE id=$15`,
    [c.tipo, c.numero_serie, c.status, c.distrito, c.setor, c.medico_nome, c.medico_crm, c.clinica, c.endereco, c.cidade, c.cep, c.observacao, eu.id, eu.email, id]
  );
  await registrarHistorico(id, "alterou", eu.email);
  revalidatePath("/inventario");
  redirect("/inventario?ok=alterado");
}

export async function excluirDevice(fd: FormData): Promise<void> {
  const eu = await exigirUsuario();
  const id = Number(fd.get("id"));
  if (!id || !(await podeEditar(eu, id))) return;
  await registrarHistorico(id, "excluiu", eu.email);
  await q("DELETE FROM devices WHERE id = $1", [id]);
  revalidatePath("/inventario");
  redirect("/inventario?ok=excluido");
}
