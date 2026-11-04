"use client";
import { useActionState } from "react";
import { importarLote, type ResultadoLote } from "@/app/actions";

export default function ImportForm() {
  const [estado, acao, pendente] = useActionState<ResultadoLote | undefined, FormData>(importarLote, undefined);
  return (
    <form action={acao} className="form">
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      {estado && !estado.erro && (
        <div className="ok">
          {estado.criados} registro{estado.criados === 1 ? "" : "s"} criado{estado.criados === 1 ? "" : "s"}.
          {estado.pulados && estado.pulados.length > 0 && (
            <ul style={{ margin: "6px 0 0 18px" }}>{estado.pulados.map((p, i) => <li key={i}>{p}</li>)}</ul>
          )}
        </div>
      )}
      <label>
        Registros em JSON (lista de objetos com tipo, status, distrito, medico_nome, medico_crm, clinica, cidade_ibge, responsavel_email ou responsavel_nome, data_negociacao, observacao, card_impulse)
        <textarea name="json" required style={{ minHeight: 260, fontFamily: "ui-monospace, monospace", fontSize: 12 }} placeholder='[{"tipo":"mrpa","status":"instalado","distrito":"11030300", ...}]' />
      </label>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn" type="submit" disabled={pendente}>{pendente ? "Importando..." : "Importar"}</button>
      </div>
    </form>
  );
}
