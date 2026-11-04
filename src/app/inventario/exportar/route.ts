import { NextResponse } from "next/server";
import { usuarioAtual } from "@/lib/auth";
import { q } from "@/lib/db";
import { DEVICE_NOME, STATUS_LABEL } from "@/lib/devices";
import { LINHAS, DISTRITOS } from "@/lib/estrutura";

export const dynamic = "force-dynamic";

// CSV separado por ponto e virgula, com BOM, para abrir direto no Excel em pt-BR.
export async function GET() {
  const eu = await usuarioAtual();
  if (!eu) return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"));

  const params: unknown[] = [];
  const where = eu.papel === "GR" ? "" : (params.push(eu.id, eu.email), "WHERE (d.registrado_por = $1 OR d.responsavel_email = $2)");
  const rows = await q<Record<string, string | null>>(`
    SELECT d.tipo, d.numero_serie, d.status, d.distrito, d.setor, d.medico_nome, d.medico_crm, d.clinica, d.endereco, d.cidade, d.cidade_ibge, d.cep,
           d.observacao, u.nome AS registrado_nome, d.registrado_email, COALESCE(d.responsavel_email, d.responsavel_nome, d.registrado_email) AS gd_email, d.card_impulse,
           to_char(d.data_negociacao, 'DD/MM/YYYY') AS data_negociacao,
           to_char(d.criado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS criado_em,
           to_char(d.atualizado_em AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI') AS atualizado_em, d.atualizado_email
    FROM devices d JOIN usuarios u ON u.id = d.registrado_por ${where}
    ORDER BY d.distrito, d.tipo, d.numero_serie`, params);

  const cab = ["Device", "Número de série", "Status", "Linha", "Distrito", "Setor", "Médico", "CRM", "Clínica", "Endereço", "Cidade", "Código IBGE", "CEP", "Observação",
    "GD responsável", "Registrado por (email)", "Data negociação", "Card IMPULSE", "Criado em", "Atualizado em", "Atualizado por (email)"];
  const esc = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const linhas = rows.map((r) => [
    DEVICE_NOME[r.tipo ?? ""] ?? r.tipo, r.numero_serie, STATUS_LABEL[r.status ?? ""] ?? r.status,
    LINHAS[DISTRITOS[r.distrito ?? ""]?.linha ?? ""] ?? "", r.distrito, r.setor, r.medico_nome, r.medico_crm,
    r.clinica, r.endereco, r.cidade, r.cidade_ibge, r.cep, r.observacao, r.gd_email, r.registrado_email, r.data_negociacao, r.card_impulse, r.criado_em, r.atualizado_em, r.atualizado_email,
  ].map(esc).join(";"));
  const csv = "﻿" + [cab.map(esc).join(";"), ...linhas].join("\r\n");
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inventario_devices_${hoje}.csv"`,
    },
  });
}
