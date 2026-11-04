"use client";
import { useActionState } from "react";
import { entrar, type EstadoLogin } from "@/app/actions";

export default function LoginForm({ next, dominio }: { next: string; dominio: string }) {
  const [estado, acao, pendente] = useActionState<EstadoLogin | undefined, FormData>(entrar, undefined);
  const etapaCodigo = estado?.etapa === "codigo";

  return (
    <form action={acao} className="form">
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      {estado?.info && !estado.erro && <div className="ok">{estado.info}</div>}
      <input type="hidden" name="next" value={next} />

      {!etapaCodigo ? (
        <>
          <label>
            Email corporativo
            <input name="email" type="email" required autoComplete="email" autoFocus placeholder={`nome.sobrenome@${dominio}`} defaultValue={estado?.email ?? ""} />
          </label>
          <button className="btn" type="submit" name="acao" value="enviar" disabled={pendente}>
            {pendente ? "Enviando..." : "Enviar código"}
          </button>
        </>
      ) : (
        <>
          <input type="hidden" name="email" value={estado?.email ?? ""} />
          <label>
            Código de 6 dígitos
            <input
              name="codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              style={{ fontSize: 22, letterSpacing: 6, textAlign: "center" }}
            />
          </label>
          <button className="btn" type="submit" name="acao" value="verificar" disabled={pendente}>
            {pendente ? "Verificando..." : "Entrar"}
          </button>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <button className="btn secundario pequeno" type="submit" name="acao" value="reenviar" formNoValidate disabled={pendente}>
              Reenviar código
            </button>
            <button className="btn secundario pequeno" type="submit" name="acao" value="voltar" formNoValidate disabled={pendente}>
              Usar outro email
            </button>
          </div>
        </>
      )}
    </form>
  );
}
