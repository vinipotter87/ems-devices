import { Pool, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __emsPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __emsSchemaReady: Promise<void> | undefined;
}

function connectionString(): string {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error("DATABASE_URL não configurada. Na Vercel, conecte um banco Neon em Storage.");
  return url;
}

export function pool(): Pool {
  if (!global.__emsPool) {
    const cs = connectionString();
    const isLocal = /localhost|127\.0\.0\.1/.test(cs);
    global.__emsPool = new Pool({
      connectionString: cs,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return global.__emsPool;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  papel TEXT NOT NULL CHECK (papel IN ('GR','GD','STAFF')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_codigos (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_em TIMESTAMPTZ NOT NULL,
  tentativas INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS login_codigos_email_idx ON login_codigos(email, id);

-- Um registro por aparelho fisico. O dono do registro e o email corporativo que logou e cadastrou.
CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  tipo TEXT NOT NULL,
  numero_serie TEXT NOT NULL,
  status TEXT NOT NULL,
  distrito TEXT NOT NULL,
  setor TEXT,
  medico_nome TEXT,
  medico_crm TEXT,
  clinica TEXT,
  endereco TEXT,
  cidade TEXT,
  cep TEXT,
  observacao TEXT,
  registrado_por INTEGER NOT NULL REFERENCES usuarios(id),
  registrado_email TEXT NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por INTEGER REFERENCES usuarios(id),
  atualizado_email TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tipo, numero_serie)
);
CREATE INDEX IF NOT EXISTS devices_distrito_idx ON devices(distrito);
CREATE INDEX IF NOT EXISTS devices_registrado_idx ON devices(registrado_por);
CREATE INDEX IF NOT EXISTS devices_tipo_idx ON devices(tipo, status);

-- Trilha de auditoria: cada criacao, alteracao ou exclusao grava quem (email) e o estado completo.
CREATE TABLE IF NOT EXISTS devices_historico (
  id SERIAL PRIMARY KEY,
  device_id INTEGER NOT NULL,
  acao TEXT NOT NULL CHECK (acao IN ('criou','alterou','excluiu')),
  email TEXT NOT NULL,
  dados JSONB NOT NULL,
  em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS devices_historico_device_idx ON devices_historico(device_id, id);
`;

export async function ensureSchema(): Promise<void> {
  if (!global.__emsSchemaReady) {
    global.__emsSchemaReady = pool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((e) => {
        global.__emsSchemaReady = undefined;
        throw e;
      });
  }
  return global.__emsSchemaReady;
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  await ensureSchema();
  const res = await pool().query<T>(text, params);
  return res.rows;
}

export async function one<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
