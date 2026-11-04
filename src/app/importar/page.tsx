import { redirect } from "next/navigation";
import Topbar from "@/components/Topbar";
import ImportForm from "./ImportForm";
import { usuarioOuLogin } from "@/lib/pagina";

export const dynamic = "force-dynamic";

export default async function ImportarPage() {
  const eu = await usuarioOuLogin();
  if (eu.papel !== "GR") redirect("/inventario");
  return (
    <>
      <Topbar usuario={eu} />
      <main className="conteudo">
        <h1>Importar lote</h1>
        <p className="suave">Carga de vários aparelhos de uma vez (ex.: planilha IMPULSE já filtrada para a SPI). Cards já importados e séries repetidas são pulados. Cada registro fica em nome do GD informado; os campos que vierem em branco ficam pendentes e o GD é obrigado a completá-los na primeira edição.</p>
        <div className="card"><ImportForm /></div>
      </main>
    </>
  );
}
