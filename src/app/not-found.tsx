import Link from "next/link";
export default function NotFound() {
  return (
    <main className="conteudo">
      <div className="card vazio">Página não encontrada. <Link href="/mapa">Voltar ao início</Link>.</div>
    </main>
  );
}
