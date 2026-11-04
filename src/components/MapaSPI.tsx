"use client";
import { useEffect, useMemo, useState } from "react";
import { CIDADE_POR_IBGE, CIDADES, DISTRITO_GEO_COR, DISTRITO_GEO_NOME } from "@/lib/cidades";
import { DEVICES, DEVICE_NOME } from "@/lib/devices";

type Contagem = Record<string, Record<string, number>>; // ibge -> tipo -> n
type Geom = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Feature = { properties: { id: string }; geometry: Geom };

const W = 900;

export default function MapaSPI({ contagem, escopo }: { contagem: Contagem; escopo: string }) {
  const [feats, setFeats] = useState<Feature[] | null>(null);
  const [filtroDev, setFiltroDev] = useState<string | null>(null);
  const [filtroDist, setFiltroDist] = useState<string | null>(null);
  const [tip, setTip] = useState<{ ibge: string; x: number; y: number } | null>(null);

  useEffect(() => {
    fetch("/geo/spi.json").then((r) => r.json()).then((g) => setFeats(g.features)).catch(() => setFeats([]));
  }, []);

  const total = (ibge: string) => Object.entries(contagem[ibge] ?? {}).filter(([k]) => !filtroDev || k === filtroDev).reduce((a, [, v]) => a + v, 0);

  const proj = useMemo(() => {
    if (!feats || feats.length === 0) return null;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    const each = (g: Geom, fn: (p: number[]) => void) => (g.type === "Polygon" ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][])).forEach((poly) => poly.forEach((ring) => ring.forEach(fn)));
    feats.forEach((f) => each(f.geometry, ([x, y]) => { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }));
    const latm = Math.cos(((miny + maxy) / 2) * Math.PI / 180);
    const H = Math.round((W * (maxy - miny)) / ((maxx - minx) * latm));
    const px = (x: number) => ((x - minx) / (maxx - minx)) * W;
    const py = (y: number) => H - ((y - miny) / (maxy - miny)) * H;
    const pathD = (g: Geom) => {
      let d = "";
      (g.type === "Polygon" ? [g.coordinates as number[][][]] : (g.coordinates as number[][][][])).forEach((poly) => poly.forEach((ring) => { ring.forEach(([x, y], i) => { d += (i ? "L" : "M") + px(x).toFixed(1) + "," + py(y).toFixed(1); }); d += "Z"; }));
      return d;
    };
    const centroid = (g: Geom) => { let sx = 0, sy = 0, n = 0; each(g, ([x, y]) => { sx += x; sy += y; n++; }); return [px(sx / n), py(sy / n)]; };
    return { H, paths: feats.map((f) => ({ id: f.properties.id, d: pathD(f.geometry), c: centroid(f.geometry) })) };
  }, [feats]);

  const lista = CIDADES.filter((c) => !filtroDist || c.distrito === filtroDist).map((c) => ({ c, t: total(c.ibge) })).filter((x) => x.t > 0).sort((a, b) => b.t - a.t);
  const maxT = Math.max(1, ...lista.map((x) => x.t));
  const totAp = lista.reduce((a, x) => a + x.t, 0);
  const cobertas = CIDADES.filter((c) => c.distrito !== "990" && (!filtroDist || c.distrito === filtroDist)).length;

  const tipCidade = tip ? CIDADE_POR_IBGE[tip.ibge] : null;

  return (
    <div className="mapa-grid">
      <div className="card">
        <div className="filtros" style={{ marginTop: 0 }}>
          <button type="button" className={!filtroDev ? "ativo" : ""} onClick={() => setFiltroDev(null)}>Todos os devices</button>
          {DEVICES.map((d) => <button type="button" key={d.key} className={filtroDev === d.key ? "ativo" : ""} onClick={() => setFiltroDev(d.key)}>{d.nome}</button>)}
        </div>
        {!proj ? (
          <div className="vazio">{feats === null ? "Carregando mapa..." : "Não foi possível carregar a base geográfica."}</div>
        ) : (
          <svg className="mapa-svg" viewBox={`0 0 ${W} ${proj.H}`} xmlns="http://www.w3.org/2000/svg" onMouseLeave={() => setTip(null)}>
            {proj.paths.map((p) => {
              const c = CIDADE_POR_IBGE[p.id]; if (!c) return null;
              const dim = filtroDist && c.distrito !== filtroDist;
              return <path key={p.id} className={`mun${dim ? " dim" : ""}`} fill={DISTRITO_GEO_COR[c.distrito]} d={p.d}
                onMouseEnter={(e) => setTip({ ibge: p.id, x: e.clientX, y: e.clientY })} onMouseMove={(e) => setTip({ ibge: p.id, x: e.clientX, y: e.clientY })} />;
            })}
            {proj.paths.map((p) => {
              const c = CIDADE_POR_IBGE[p.id]; if (!c) return null; const t = total(p.id);
              if (!t || (filtroDist && c.distrito !== filtroDist)) return null;
              const r = 6 + 14 * Math.sqrt(t / maxT);
              return <g key={"b" + p.id} style={{ pointerEvents: "none" }}><circle className="bolha" cx={p.c[0]} cy={p.c[1]} r={r} /><text className="rot" x={p.c[0]} y={p.c[1] + 3.2}>{t}</text></g>;
            })}
          </svg>
        )}
        <div className="legenda">
          {Object.keys(DISTRITO_GEO_NOME).map((k) => (
            <button type="button" key={k} className={filtroDist === k ? "ativo" : ""} onClick={() => setFiltroDist(filtroDist === k ? null : k)}>
              <i style={{ background: DISTRITO_GEO_COR[k] }} />{k === "990" ? "" : `Distrito ${k} · `}{DISTRITO_GEO_NOME[k]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="card">
          <div className="kpis">
            <div className="kpi"><div className="n">{totAp}</div><div className="l">aparelhos</div></div>
            <div className="kpi"><div className="n">{lista.length}</div><div className="l">cidades com aparelho</div></div>
            <div className="kpi"><div className="n">{cobertas}</div><div className="l">cidades cobertas</div></div>
          </div>
          <h2>Cidades com mais aparelhos</h2>
          <p className="pequeno" style={{ marginTop: 0 }}>{escopo}</p>
          <ul className="rank">
            {lista.length === 0 && <li>Nenhum aparelho com cidade cadastrada.</li>}
            {lista.slice(0, 15).map(({ c, t }) => (
              <li key={c.ibge}>
                <a href={`/inventario?cidade=${c.ibge}`}>
                  {c.rotulo}<small>Distrito {c.distrito} · {c.utcs} UTCs · {c.setores} setor{c.setores > 1 ? "es" : ""}</small>
                  <div className="bar"><i style={{ width: `${Math.round((t / maxT) * 100)}%` }} /></div>
                </a>
                <b>{t}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {tip && tipCidade && (
        <div className="tip" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <b>{tipCidade.rotulo}</b>
          <div className="d">Distrito {tipCidade.distrito} · {DISTRITO_GEO_NOME[tipCidade.distrito]}<br />{tipCidade.utcs} UTCs · {tipCidade.setores} setor(es)</div>
          {total(tip.ibge) ? (
            <table>
              <tbody>
                {Object.entries(contagem[tip.ibge] ?? {}).filter(([k]) => !filtroDev || k === filtroDev).map(([k, v]) => <tr key={k}><td>{DEVICE_NOME[k] ?? k}</td><td>{v}</td></tr>)}
                <tr><td><b>Total</b></td><td>{total(tip.ibge)}</td></tr>
              </tbody>
            </table>
          ) : <div className="d">Nenhum aparelho cadastrado</div>}
        </div>
      )}
    </div>
  );
}
