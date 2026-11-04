import Topbar from "@/components/Topbar";
import DeviceForm from "@/components/DeviceForm";
import { usuarioOuLogin } from "@/lib/pagina";
import { criarDevice } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function NovoDevicePage() {
  const eu = await usuarioOuLogin();
  return (
    <>
      <Topbar usuario={eu} />
      <main className="conteudo">
        <h1>Novo registro</h1>
        <p className="suave">Um registro por aparelho físico. Este registro ficará em nome de <b>{eu.email}</b>.</p>
        <div className="card">
          <DeviceForm acao={criarDevice} rotulo="Registrar aparelho" ehGR={eu.papel === "GR"} meuEmail={eu.email} />
        </div>
      </main>
    </>
  );
}
