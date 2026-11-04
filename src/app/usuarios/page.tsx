import { redirect } from "next/navigation";
import Topbar from "@/components/Topbar";
import { usuarioOuLogin, fmtDataHora } from "@/lib/pagina";
import { PAPEL_LABEL, DOMINIO_PERMITIDO, type Papel } from "@/lib/auth";
import { q } from "@/lib/db";
import { alternarAtivo, alterarPapel, renomearUsuario } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  const eu = await usuarioOuLogin();
  if (eu.papel !== "GR") redirect("/inventario");
  const usuarios = await q<{ id: number; nome: string; email: string; papel: Papel; ativo: boolean; criado_em: string; n: string }>(
    `SELECT u.id, u.nome, u.email, u.papel, u.ativo, u.criado_em::text AS criado_em,
            (SELECT COUNT(*)::text FROM devices d WHERE d.registrado_por = u.id) AS n
     FROM usuarios u ORDER BY u.papel, u.nome`);
  return (
    <>
      <Topbar usuario={eu} />
      <main className="conteudo">
        <h1>Usuários</h1>
        <p className="suave">
          As contas são criadas sozinhas no primeiro acesso, por qualquer email @{DOMINIO_PERMITIDO} que receba o código. Todo mundo entra como Staff; aqui você promove a Gerente Distrital, ajusta o nome exibido ou desativa o acesso.
        </p>
        <div className="card">
          <h2>{usuarios.length} cadastrado{usuarios.length === 1 ? "" : "s"}</h2>
          <table className="tabela">
            <thead><tr><th>Nome</th><th>Email</th><th>Papel</th><th>Registros</th><th>Desde</th><th>Ações</th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={u.ativo ? "" : "inativo"}>
                  <td>
                    <form action={renomearUsuario} style={{ display: "flex", gap: 6 }}>
                      <input type="hidden" name="id" value={u.id} />
                      <input name="nome" defaultValue={u.nome} style={{ font: "inherit", fontSize: 13, padding: "5px 8px", border: "1px solid var(--borda)", borderRadius: 6, width: 170 }} />
                      <button type="submit" className="btn secundario pequeno">Salvar</button>
                    </form>
                  </td>
                  <td>{u.email}</td>
                  <td>{PAPEL_LABEL[u.papel]}</td>
                  <td>{u.n}</td>
                  <td>{fmtDataHora(u.criado_em)}</td>
                  <td>
                    {u.id !== eu.id && (
                      <div className="acoes-inline">
                        <form action={alterarPapel}>
                          <input type="hidden" name="id" value={u.id} />
                          <select name="papel" defaultValue={u.papel} style={{ font: "inherit", fontSize: 13, padding: "5px 6px", borderRadius: 6, border: "1px solid var(--borda)" }}>
                            <option value="STAFF">Staff</option>
                            <option value="GD">Gerente Distrital</option>
                            <option value="GR">Gerente Regional</option>
                          </select>
                          <button type="submit" className="btn secundario pequeno">Aplicar</button>
                        </form>
                        <form action={alternarAtivo}>
                          <input type="hidden" name="id" value={u.id} />
                          <button type="submit" className={`btn pequeno ${u.ativo ? "perigo" : "secundario"}`}>{u.ativo ? "Desativar" : "Reativar"}</button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
