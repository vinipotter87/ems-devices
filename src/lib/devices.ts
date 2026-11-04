// Catalogo fechado de devices (fonte: "Central de Devices", Impulse | Grupo EMS | XM Medical).
// Para incluir um device novo, adicione aqui; os registros existentes nao mudam.
export const DEVICES = [
  { key: "mrpa", nome: "MRPA Bluetooth", categoria: "Pressão arterial", marcas: "Brasart · Bramicar · Lefor", imagem: "/devices/mrpa.png", descricao: "Medição da pressão fora do consultório; o paciente leva para casa e aperta START. Laudo pela teleMRPA." },
  { key: "complete", nome: "Complete", categoria: "Pressão + eletrocardiograma", marcas: "Xakilis · Vynaxa", imagem: "/devices/complete.png", descricao: "Pressão arterial e ECG de uma derivação no mesmo aparelho, sincronizado pelo app. Sem emissão de laudo." },
  { key: "nightview", nome: "NightView", categoria: "Pressão arterial noturna", marcas: "Brasart", imagem: "/devices/nightview.png", descricao: "Monitor de pulso com medições programadas durante o sono. Sem emissão de laudo." },
  { key: "holter", nome: "Holter", categoria: "Monitorização cardíaca", marcas: "Xakilis · Vynaxa", imagem: "/devices/holter.png", descricao: "Registro contínuo do ritmo cardíaco. Laudo solicitado pelo portal SRA da Geratherm." },
  { key: "arteris", nome: "AOP Arteris", categoria: "Avaliação vascular", marcas: "Xakilis · Vynaxa", imagem: "/devices/arteris.png", descricao: "Pressão central, velocidade da onda de pulso e rigidez arterial. Sem emissão de laudo." },
] as const;

export type DeviceKey = (typeof DEVICES)[number]["key"];
export const DEVICE_KEYS = DEVICES.map((d) => d.key) as string[];
export const DEVICE_NOME: Record<string, string> = Object.fromEntries(DEVICES.map((d) => [d.key, d.nome]));
export const DEVICE_IMAGEM: Record<string, string> = Object.fromEntries(DEVICES.map((d) => [d.key, d.imagem]));

// Onde o aparelho esta hoje.
export const STATUS = [
  { key: "instalado", label: "Instalado na clínica" },
  { key: "com_gd", label: "Com o GD" },
  { key: "com_rep", label: "Com o representante" },
  { key: "devolvido", label: "Devolvido / XM" },
] as const;

export const STATUS_KEYS = STATUS.map((s) => s.key) as string[];
export const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS.map((s) => [s.key, s.label]));

export function cepValido(cep: string): boolean {
  return /^\d{5}-?\d{3}$/.test(cep);
}

export function fmtCep(cep: string | null | undefined): string {
  if (!cep) return "";
  const d = cep.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : cep;
}
