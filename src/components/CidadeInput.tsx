"use client";
import { useEffect, useRef, useState } from "react";
import { buscarCidades, CIDADE_POR_IBGE, type Cidade } from "@/lib/cidades";

// Campo de cidade com busca na base de municipios da SPI. Grava o codigo IBGE (cidade_ibge) e o rotulo (cidade).
export default function CidadeInput({ ibgeInicial, valorExterno }: { ibgeInicial?: string | null; valorExterno?: Cidade | null }) {
  const [ibge, setIbge] = useState(ibgeInicial ?? "");
  const [texto, setTexto] = useState(ibgeInicial ? CIDADE_POR_IBGE[ibgeInicial]?.rotulo ?? "" : "");
  const [aberto, setAberto] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Preenchimento vindo do CEP
  useEffect(() => {
    if (valorExterno) { setIbge(valorExterno.ibge); setTexto(valorExterno.rotulo); setAberto(false); }
  }, [valorExterno]);

  useEffect(() => {
    function fora(e: MouseEvent) { if (box.current && !box.current.contains(e.target as Node)) setAberto(false); }
    document.addEventListener("mousedown", fora); return () => document.removeEventListener("mousedown", fora);
  }, []);

  const opcoes = aberto ? buscarCidades(texto) : [];

  return (
    <div className="cidade-box" ref={box}>
      <input type="hidden" name="cidade_ibge" value={ibge} />
      <input type="hidden" name="cidade" value={ibge ? CIDADE_POR_IBGE[ibge]?.rotulo ?? "" : ""} />
      <input
        value={texto}
        onChange={(e) => { setTexto(e.target.value); setIbge(""); setAberto(true); }}
        onFocus={() => setAberto(true)}
        placeholder="Digite o nome da cidade"
        autoComplete="off"
        className={ibge ? "ok" : ""}
      />
      {opcoes.length > 0 && (
        <ul className="cidade-lista">
          {opcoes.map((c) => (
            <li key={c.ibge} onMouseDown={() => { setIbge(c.ibge); setTexto(c.rotulo); setAberto(false); }}>
              {c.rotulo} <small>{c.distrito === "990" ? "fora da cobertura" : `Distrito ${c.distrito}`}</small>
            </li>
          ))}
        </ul>
      )}
      {!ibge && texto && !aberto && <div className="pequeno" style={{ color: "var(--vermelho)" }}>Escolha a cidade na lista.</div>}
    </div>
  );
}
