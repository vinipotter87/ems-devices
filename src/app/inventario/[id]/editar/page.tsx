import { notFound, redirect } from "next/navigation";
import Topbar from "@/components/Topbar";
import DeviceForm from "@/components/DeviceForm";
import { usuarioOuLogin, fmtDataHora } from "@/lib/pagina";
import { one, q } from "@/lib/db";
import { atualizarDevice } from "@/app/actions";
import { DEVICE_NOME } from "@/lib/devices";

export const dynamic = "force-dynamic";

export default async function EditarDevicePage({ params }: { params: Promise<{ id: string }> }) {
  const eu = await usuarioOuLogin();
  const { id } = await params;
  const d = await one<{
    id: number; tipo: string; numero_serie: string; status: string; distrito: string; setor: string | null; medico_nome: string | null;
    medico_crm: string | null; clinica: string | null; endereco: string | null; cidade: string | null; cidade_ibge: string | null; cep: string | null;
    observacao: string | null; registrado_por: number; registrado_email: string;
  }>("SELECT * FROM devices WHERE id = $1", [Number(id)]);
  if (!d) notFound();
  if (eu.papel !== "GR" && d.registrado_por !== eu.id) redirect("/inventario");

  const hist = await q<{ acao: string; email: string; em: string }>(
    "SELECT acao, email, em::text AS em FROM devices_historico WHERE device_id = $1 ORDER BY id DESC LIMIT 10", [d.id]);

  return (
    <>
      <Topbar usuario={eu} />
      <main className="conteudo">
        <h1>Editar · {DEVICE_NOME[d.tipo] ?? d.tipo} {d.numero_serie}</h1>
        <p className="suave">Registrado por {d.registrado_email}. Alterações ficam em nome de <b>{eu.email}</b>.</p>
        <div className="card">
          <DeviceForm acao={atualizarDevice} valores={d} rotulo="Salvar alterações" />
        </div>
        {hist.length > 0 && (
          <div className="card">
            <h2>Histórico</h2>
            <table className="tabela">
              <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th></tr></thead>
              <tbody>{hist.map((h, i) => <tr key={i}><td>{fmtDataHora(h.em)}</td><td>{h.email}</td><td>{h.acao}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
