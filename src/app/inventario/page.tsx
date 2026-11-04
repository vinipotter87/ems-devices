import Link from "next/link";
import Topbar from "@/components/Topbar";
import { usuarioOuLogin, fmtDataHora } from "@/lib/pagina";
import { q } from "@/lib/db";
import { DEVICES, DEVICE_NOME, DEVICE_IMAGEM, STATUS, STATUS_LABEL, fmtCep } from "@/lib/devices";
import { nomeDistrito } from "@/lib/estrutura";
import { excluirDevice } from "@/app/actions";

export const dynamic = "force-dynamic";

type Linha = {
  id: number; tipo: string; numero_serie: string; status: string; distrito: string; setor: string | null;
  medico_nome: string | null; medico_crm: string | null; clinica: string | null;
  endereco: string | null; cidade: string | null; cep: string | null; observacao: string | null;
  registrado_email: string; registrado_nome: string; atualizado_em: string; atualizado_email: string | null;
};

const OK: Record<string, string> = { criado: "Registro criado.", alterado: "Registro atualizado.", excluido: "Registro excluído." };

export default async function InventarioPage({ searchParams }: { searchParams: Promise<{ tipo?: string; status?: string; quem?: string; distrito?: string; ok?: string }> }) {
  const eu = await usuarioOuLogin();
  const sp = await searchParams;
  const ehGR = eu.papel === "GR";

  const cond: string[] = [];
  const params: unknown[] = [];
  // GD e Staff enxergam somente o que registraram com o proprio email; o GR enxerga tudo.
  if (!ehGR) { params.push(eu.id); cond.push(`d.registrado_por = $${params.length}`); }
  if (sp.tipo) { params.push(sp.tipo); cond.push(`d.tipo = $${params.length}`); }
  if (sp.status) { params.push(sp.status); cond.push(`d.status = $${params.length}`); }
  if (ehGR && sp.quem) { params.push(Number(sp.quem)); cond.push(`d.registrado_por = $${params.length}`); }
  if (sp.distrito) { params.push(sp.distrito); cond.push(`d.distrito = $${params.length}`); }
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";

  const linhas = await q<Linha>(`
    SELECT d.*, u.nome AS registrado_nome, d.atualizado_em::text AS atualizado_em
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
    ? await q<{ id: number; nome: string; email: string; n: string }>(
        `SELECT u.id, u.nome, u.email, COUNT(d.id)::text AS n FROM usuarios u
         LEFT JOIN devices d ON d.registrado_por = u.id
         WHERE u.ativo AND u.papel IN ('GD','STAFF') GROUP BY u.id ORDER BY u.nome`)
    : [];
  const cont = (tipo: string, status?: string) =>
    resumo.filter((r) => r.tipo === tipo && (!status || r.status === status)).reduce((a, r) => a + Number(r.n), 0);
  const total = resumo.reduce((a, r) => a + Number(r.n), 0);

  const link = (p: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const m = { tipo: sp.tipo, status: sp.status, quem: sp.quem, distrito: sp.distrito, ...p };
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
            <Link href="/inventario/novo" className="btn">Novo registro</Link>
          </div>
        </div>

        {sp.ok && OK[sp.ok] && <div className="ok" style={{ marginTop: 12 }}>{OK[sp.ok]}</div>}

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
                <h3>Registros por pessoa (quem logou e registrou)</h3>
                <div className="filtros" style={{ margin: 0 }}>
                  {porPessoa.map((p) => (
                    <Link key={p.id} href={link({ quem: String(p.id) })} className={sp.quem === String(p.id) ? "ativo" : ""} title={p.email}>
                      {p.nome}: {p.n}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="filtros">
          <Link href={link({ tipo: undefined, status: undefined, quem: undefined, distrito: undefined })} className={!sp.tipo && !sp.status && !sp.quem && !sp.distrito ? "ativo" : ""}>Todos</Link>
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
                    {DEVICE_NOME[d.tipo] ?? d.tipo} <span className="serie">{d.numero_serie}</span>
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
                    <span>GD: {d.registrado_nome} ({d.registrado_email})</span>
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
