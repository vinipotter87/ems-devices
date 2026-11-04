"use client";
import { useActionState, useState } from "react";
import { DEVICES, STATUS } from "@/lib/devices";
import { LINHAS, DISTRITOS, DISTRITO_CODIGOS } from "@/lib/estrutura";
import { acharCidade, type Cidade } from "@/lib/cidades";
import CidadeInput from "@/components/CidadeInput";

type Valores = {
  id?: number; tipo?: string; numero_serie?: string | null; status?: string; distrito?: string; setor?: string | null; responsavel_email?: string | null; data_negociacao?: string | null;
  medico_nome?: string | null; medico_crm?: string | null; clinica?: string | null;
  endereco?: string | null; cidade?: string | null; cidade_ibge?: string | null; cep?: string | null; observacao?: string | null;
};
type Acao = (prev: { erro?: string } | undefined, fd: FormData) => Promise<{ erro?: string } | undefined>;

export default function DeviceForm({ acao, valores = {}, rotulo, ehGR = false, meuEmail = "" }: { acao: Acao; valores?: Valores; rotulo: string; ehGR?: boolean; meuEmail?: string }) {
  const [estado, submit, pendente] = useActionState(acao, undefined);
  const [status, setStatus] = useState(valores.status ?? "instalado");
  const [tipo, setTipo] = useState(valores.tipo ?? "");
  const dev = DEVICES.find((d) => d.key === tipo);
  const [linha, setLinha] = useState(valores.distrito ? DISTRITOS[valores.distrito]?.linha ?? "" : "");
  const [distrito, setDistrito] = useState(valores.distrito ?? "");
  const [setor, setSetor] = useState(valores.setor ?? "");
  const distritosDaLinha = DISTRITO_CODIGOS.filter((d) => DISTRITOS[d].linha === linha);
  const setoresDoDistrito = distrito ? DISTRITOS[distrito]?.setores ?? [] : [];
  const [endereco, setEndereco] = useState(valores.endereco ?? "");
  const [cidadeCep, setCidadeCep] = useState<Cidade | null>(null);
  const [cepInfo, setCepInfo] = useState("");

  // Preenche endereco e cidade a partir do CEP (ViaCEP). Se falhar, o usuario digita manualmente.
  async function buscarCep(cep: string) {
    const d = cep.replace(/\D/g, "");
    if (d.length !== 8) return;
    setCepInfo("Buscando CEP...");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { setCepInfo("CEP não encontrado. Preencha o endereço manualmente."); return; }
      const rua = [j.logradouro, j.bairro].filter(Boolean).join(", ");
      if (rua && !endereco) setEndereco(rua);
      const cid = j.localidade && j.uf ? acharCidade(j.localidade, j.uf) : undefined;
      if (cid) setCidadeCep(cid);
      setCepInfo(cid ? "Endereço e cidade preenchidos pelo CEP. Confira e complete o número." : "Endereço preenchido pelo CEP. A cidade deste CEP não está na base da SPI: escolha a mais próxima na lista.");
    } catch {
      setCepInfo("Não foi possível consultar o CEP. Preencha manualmente.");
    }
  }

  const instalado = status === "instalado";

  return (
    <form action={submit} className="form">
      {estado?.erro && <div className="erro">{estado.erro}</div>}
      {valores.id && <input type="hidden" name="id" value={valores.id} />}

      <h3>Device</h3>
      <input type="hidden" name="tipo" value={tipo} />
      <div className="device-opcoes">
        {DEVICES.map((d) => (
          <button type="button" key={d.key} className={`device-opcao ${tipo === d.key ? "ativo" : ""}`} onClick={() => setTipo(d.key)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.imagem} alt={d.nome} />
            <span className="nome">{d.nome}</span>
            <span className="cat">{d.categoria}</span>
          </button>
        ))}
      </div>
      {dev && (
        <div className="device-detalhe">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={dev.imagem} alt={dev.nome} />
          <div>
            <div className="nome">{dev.nome} <span className="cat">· {dev.categoria}</span></div>
            <div className="pequeno">{dev.descricao}</div>
            <div className="pequeno">Marcas relacionadas: {dev.marcas}</div>
          </div>
        </div>
      )}

      <div className="linha">
        <label>
          Número de série (pode ficar em branco e ser preenchido depois)
          <input name="numero_serie" defaultValue={valores.numero_serie ?? ""} placeholder="Como está na etiqueta do aparelho" style={{ textTransform: "uppercase" }} />
        </label>
        <label>
          Onde o aparelho está
          <select name="status" required value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="linha">
        <label>
          Data da negociação (opcional)
          <input name="data_negociacao" type="date" defaultValue={valores.data_negociacao ?? ""} />
        </label>
        {ehGR && (
          <label>
            Em nome de (email do GD responsável; em branco = {meuEmail})
            <input name="responsavel_email" type="email" defaultValue={valores.responsavel_email ?? ""} placeholder="nome.sobrenome@ems.com.br" />
          </label>
        )}
      </div>

      <h3>Estrutura</h3>
      <div className="linha tres">
        <label>
          Linha
          <select value={linha} onChange={(e) => { setLinha(e.target.value); setDistrito(""); setSetor(""); }} required>
            <option value="" disabled>Selecione</option>
            {Object.entries(LINHAS).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </label>
        <label>
          Distrito
          <select name="distrito" value={distrito} onChange={(e) => { setDistrito(e.target.value); setSetor(""); }} required disabled={!linha}>
            <option value="" disabled>{linha ? "Selecione" : "Escolha a linha"}</option>
            {distritosDaLinha.map((d) => <option key={d} value={d}>Distrito {Number(d.slice(4, 6)) * 100} · {d}</option>)}
          </select>
        </label>
        <label>
          Setor (opcional)
          <select name="setor" value={setor} onChange={(e) => setSetor(e.target.value)} disabled={!distrito}>
            <option value="">{distrito ? "Sem setor / com o GD" : "Escolha o distrito"}</option>
            {setoresDoDistrito.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <h3>Localização e clínica {instalado ? "(médico obrigatório para aparelho instalado)" : "(médico e clínica, se houver)"}</h3>
      <div className="linha">
        <label>
          Nome do médico
          <input name="medico_nome" required={instalado} defaultValue={valores.medico_nome ?? ""} />
        </label>
        <label>
          CRM
          <input name="medico_crm" required={instalado} defaultValue={valores.medico_crm ?? ""} placeholder="Ex.: 123456/SP" />
        </label>
      </div>
      <label>
        Clínica / consultório
        <input name="clinica" defaultValue={valores.clinica ?? ""} />
      </label>
      <div className="linha">
        <label>
          CEP
          <input name="cep" defaultValue={valores.cep ?? ""} placeholder="00000-000" inputMode="numeric" maxLength={9} onBlur={(e) => buscarCep(e.target.value)} />
        </label>
        <label>
          Cidade (obrigatória: posiciona o aparelho no mapa)
          <CidadeInput ibgeInicial={valores.cidade_ibge} valorExterno={cidadeCep} />
        </label>
      </div>
      <label>
        Endereço (rua, número, complemento)
        <input name="endereco" value={endereco} onChange={(e) => setEndereco(e.target.value)} />
      </label>
      {cepInfo && <div className="pequeno">{cepInfo}</div>}

      <label>
        Observação
        <textarea name="observacao" defaultValue={valores.observacao ?? ""} placeholder="Ex.: aguardando ativação na teleMRPA; aparelho com defeito; etc." />
      </label>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <a href="/inventario" className="btn secundario">Cancelar</a>
        <button className="btn" type="submit" disabled={pendente}>{pendente ? "Salvando..." : rotulo}</button>
      </div>
    </form>
  );
}
