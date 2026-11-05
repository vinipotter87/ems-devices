import Topbar from "@/components/Topbar";
import MapaSPI from "@/components/MapaSPI";
import { usuarioOuLogin } from "@/lib/pagina";
import { q } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const eu = await usuarioOuLogin();
  // O mapa e a visao da regional inteira, para qualquer usuario logado.
  const rows = await q<{ cidade_ibge: string; tipo: string; n: string }>(
    `SELECT cidade_ibge, tipo, COUNT(*)::text AS n FROM devices WHERE cidade_ibge IS NOT NULL GROUP BY cidade_ibge, tipo`);
  const contagem: Record<string, Record<string, number>> = {};
  for (const r of rows) (contagem[r.cidade_ibge] ??= {})[r.tipo] = Number(r.n);
  return (
    <>
      <Topbar usuario={eu} />
      <main className="conteudo largo">
        <h1>Mapa da SPI</h1>
        <p className="suave">Municípios cobertos, coloridos por distrito geográfico. A bolha mostra quantos aparelhos estão na cidade; passe o mouse para ver por device e clique no distrito para isolar.</p>
        <MapaSPI contagem={contagem} escopo="Regional SPI · todos os registros" />
      </main>
    </>
  );
}
