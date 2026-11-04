import Link from "next/link";
import Topbar from "@/components/Topbar";
import { usuarioOuLogin, fmtDataHora, fmtData } from "@/lib/pagina";
import { nomeDoEmail } from "@/lib/auth";
import { q } from "@/lib/db";
import { DEVICES, DEVICE_NOME, DEVICE_IMAGEM, STATUS, STATUS_LABEL, fmtCep } from "@/lib/devices";
import { nomeDistrito } from "@/lib/estrutura";
import { CIDADE_POR_IBGE } from "@/lib/cidades";
import { excluirDevice } from "@/app/actions";

export const dynamic = "force-dynamic";

type Linha = {
  id: number; tipo: string; numero_serie: string | null; status: string; distrito: string; setor: string | null; responsavel_email: string | null; responsavel_nome: string | null; card_impulse: string | null; data_negociacao: string | null;
  medico_nome: string | null; medico_crm: string | null; clinica: string | null;
  endereco: string | null; cidade: string | null; cep: string | null; observacao: string | null;
  registrado_email: string; registrado_nome: string; atualizado_em: string; atualizado_email: string | null;
};

const OK: Record<string, string> = { criado: "Registro criado.", alterado: "Registro atualizado.", excluido: "Registro excluído." };

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tipo?: string; status?: string; quem?: string; distrito?: string; cidade?: string; ok?: string }> }) {
  const eu = await usuarioOuLogin();
  const sp = await searchParams;
  const ehGR = eu.papel === "GR";

  const cond: string[] = [];
  const params: unknown[] = [];
  // GD e Staff enxergam somente o que registraram com o proprio email; o GR enxerga tudo.
  if (!ehGR) { params.push(eu.id); params.push(eu.email); cond.push(`(d.registrado_por = $${params.length - 1} OR d.responsavel_email = $${params.length})`); }
  if (sp.tipo) { params.push(sp.tipo); cond.push(`d.tipo = $${params.length}`); }
  if (sp.status) { params.push(sp.status); cond.push(`d.status = $${params.length}`); }
  if (ehGR && sp.quem) { params.push(sp.quem); cond.push(`COALESCE(d.responsavel_email, d.responsavel_nome, d.registrado_email) = $${params.length}`); }
  if (sp.distrito) { params.push(sp.distrito); cond.push(`d.distrito = $${params.length}`); }
  if (sp.cidade) { params.push(sp.cidade); cond.push(`d.cidade_ibge = $${params.length}`); }
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";

  const linhas = await q<Linha>(`
    SELECT d.*, u.nome AS registrado_nome, d.atualizado_em::text AS atualizado_em, d.data_negociacao::text AS data_negociacao
    FROM devices d JOIN usuarios u ON u.id = d.registrado_por
    ${where}
    ORDER BY d.distrito, d.tipo, d.numero_serie
  `, params);

  // Consolidado da regional (sem filtros), somente para o GR.
  const resumo = ehGR
    ? await q<{ tipo: string; status: string; n: string }>("SELECT tipo, status, COUNT(*)::text AS n FROM devices GROUP BY tipo, status")
    : [];
  const porDistrito = ehGR
    ? await q<{ distrito: string; n: string }>("SELECT distrito, COUNT(*)::text AS n FROM devices GROUP BY distrito ORDER BY distrito")
    : [];
  const porPessoa = ehGR
    ? await q<{ email: string; n: string }>(
        `SELECT COALESCE(d.responsavel_email, d.responsavel_nome, d.registrado_email) AS email, COUNT(*)::text AS n FROM devices d
         GROUP BY 1 ORDER BY 1`)
    : [];
  const cont = (tipo: string, status?: string) =>
    resumo.filter((r) => r.tipo === tipo && (!status || r.status === status)).reduce((a, r) => a + Number(r.n), 0);
  const total = resumo.reduce((a, r) => a + Number(r.n), 0);

  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const m = { tipo: sp.tipo, status: sp.status, quem: sp.quem, distrito: sp.distrito, cidade: sp.cidade, ...p };
    for (const [k, v] of Object.entries(m)) if (v) u.set(k, v);
    const qs = u.toString();
    return `/inventario${qs ? "?" + qs : ""}`;
  };

  return (
    <>
      <Topbar usuario={eu} />
      <main className="conteudo">
        <div className="card-cab">
          <div>
            <h1>Inventário de devices</h1>
            <p className="suave" style={{ margin: 0 }}>
              {ehGR ? "Regional · todos os registros" : `Registros feitos com ${eu.email}`}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {ehGR && <a href="/inventario/exportar" className="btn secundario">Exportar Excel (CSV)</a>}
            {ehGR && <Link href="/importar" className="btn secundario">Importar lote</Link>}
            <Link href="/inventario/novo" className="btn">Novo registro</Link>
          </div>
        </div>

        {sp.ok && OK[sp.ok] && <div className="ok" style={{ marginTop: 12 }}>{OK[sp.ok]}</div>}
        {sp.cidade && <div className="filtros" style={{ marginBottom: 0 }}><Link href={link({ cidade: undefined })} className="ativo">Cidade: {CIDADE_POR_IBGE[sp.cidade]?.rotulo ?? sp.cidade} ✕</Link></div>}

        {ehGR && (
          <div className="card" style={{ marginTop: 14 }}>
            <h2>Consolidado da regional · {total} aparelho{total === 1 ? "" : "s"}</h2>
            <table className="tabela" style={{ marginTop: 8 }}>
              <thead>
                <tr><th>Device</th>{STATUS.map((s) => <th key={s.key}>{s.label}</th>)}<th>Total</th></tr>
              </thead>
              <tbody>
                {DEVICES.map((d) => (
                  <tr key={d.key}>
                    <td><Link href={link({ tipo: d.key })}>{d.nome}</Link></td>
                    {STATUS.map((s) => <td key={s.key}>{cont(d.key, s.key) || ""}</td>)}
                    <td><b>{cont(d.key)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {porDistrito.length > 0 && (
              <>
                <h3>Por distrito</h3>
                <div className="filtros" style={{ margin: 0 }}>
                  {porDistrito.map((p) => (
                    <Link key={p.distrito} href={link({ distrito: sp.distrito === p.distrito ? undefined : p.distrito })} className={sp.distrito === p.distrito ? "ativo" : ""}>
                      {nomeDistrito(p.distrito)}: {p.n}
                    </Link>
                  ))}
                </div>
              </>
            )}
            {porPessoa.length > 0 && (
              <>
                <h3>Aparelhos por GD responsável</h3>
                <div className="filtros" style={{ margin: 0 }}>
                  {porPessoa.map((p) => (
                    <Link key={p.email} href={link({ quem: sp.quem === p.email ? undefined : p.email })} className={sp.quem === p.email ? "ativo" : ""} title={p.email}>
                      {p.email.includes("@") ? nomeDoEmail(p.email) : p.email}: {p.n}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="filtros">
          <Link href={link({ tipo: undefined, status: undefined, quem: undefined, distrito: undefined, cidade: undefined })} className={!sp.tipo && !sp.status && !sp.quem && !sp.distrito && !sp.cidade ? "ativo" : ""}>Todos</Link>
          {DEVICES.map((d) => <Link key={d.key} href={link({ tipo: sp.tipo === d.key ? undefined : d.key })} className={sp.tipo === d.key ? "ativo" : ""}>{d.nome}</Link>)}
          <span style={{ width: 8 }} />
          {STATUS.map((s) => <Link key={s.key} href={link({ status: sp.status === s.key ? undefined : s.key })} className={sp.status === s.key ? "ativo" : ""}>{s.label}</Link>)}
        </div>

        {linhas.length === 0 ? (
          <div className="card vazio">
            Nenhum registro {cond.length > (ehGR ? 0 : 1) ? "com esse filtro" : "ainda"}. <Link href="/inventario/novo">Registrar um aparelho</Link>.
          </div>
        ) : (
          <div className="lista-devices">
            {linhas.map((d) => (
              <div key={d.id} className="card device-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="thumb" src={DEVICE_IMAGEM[d.tipo]} alt={DEVICE_NOME[d.tipo] ?? d.tipo} />
                <div>
                  <div className="titulo">
                    {DEVICE_NOME[d.tipo] ?? d.tipo} {d.numero_serie ? <span className="serie">{d.numero_serie}</span> : <span className="badge pendente">série pendente</span>}
                    <span className={`badge ${d.status}`}>{STATUS_LABEL[d.status] ?? d.status}</span>
                  </div>
                  {(d.medico_nome || d.clinica) && (
                    <div className="meta">
                      {d.medico_nome && <span><b>{d.medico_nome}</b>{d.medico_crm ? ` · CRM ${d.medico_crm}` : ""}</span>}
                      {d.clinica && <span>{d.clinica}</span>}
                    </div>
                  )}
                  {(d.endereco || d.cidade || d.cep) && (
                    <div className="meta">
                      <span>{[d.endereco, d.cidade, fmtCep(d.cep)].filter(Boolean).join(" · ")}</span>
                    </div>
                  )}
                  {d.observacao && <div className="meta"><span>{d.observacao}</span></div>}
                  <div className="meta rodape">
                    <span><b>{nomeDistrito(d.distrito)}</b>{d.setor ? ` · Setor ${d.setor}` : ""}</span>
                    <span>GD: {d.responsavel_email ? `${nomeDoEmail(d.responsavel_email)} (${d.responsavel_email})` : d.responsavel_nome ? `${d.responsavel_nome} (email a vincular)` : `${d.registrado_nome} (${d.registrado_email})`}{d.responsavel_email || d.responsavel_nome ? ` · registrado por ${d.registrado_email}` : ""}</span>
                    {d.card_impulse && <span>Card IMPULSE {d.card_impulse}</span>}
                    {d.data_negociacao && <span>Negociado em {fmtData(d.data_negociacao)}</span>}
                    <span>Atualizado em {fmtDataHora(d.atualizado_em)}{d.atualizado_email && d.atualizado_email !== d.registrado_email ? ` por ${d.atualizado_email}` : ""}</span>
                  </div>
                </div>
                <div className="acoes-inline">
                  <Link href={`/inventario/${d.id}/editar`} className="btn secundario pequeno">Editar</Link>
                  <form action={excluirDevice}>
                    <input type="hidden" name="id" value={d.id} />
                    <button type="submit" className="btn perigo pequeno">Excluir</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
