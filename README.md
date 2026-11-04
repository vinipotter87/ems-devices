# Devices EMS | Inventário

Inventário dos devices em campo da regional (MRPA Bluetooth, Complete, NightView, Holter, AOP Arteris). Cada GD registra, com o próprio email corporativo, onde está cada aparelho: número de série, status (instalado na clínica, com o GD, com o representante, devolvido/XM), médico (nome e CRM), clínica, endereço, cidade e CEP. O Gerente Regional vê o consolidado e exporta para Excel.

Mesma base do ems-eventos: Next.js 15 (App Router) · Postgres (Neon via Vercel Storage) · sessão em cookie assinado (jose) · login por código de 6 dígitos enviado por email (nodemailer, Gmail SMTP).

## Acesso e propriedade do registro

Só recebe código quem tem email `@ems.com.br` (regra no servidor, em `src/lib/auth.ts`), mais os emails em `ADMIN_EMAILS`. A conta é criada no primeiro acesso como Staff; o GR promove a GD em **Usuários**.

Todo registro grava `registrado_email` (quem logou e criou) e `atualizado_email` (quem fez a última alteração). GD e Staff só veem e editam os próprios registros; o GR vê e edita tudo. A tabela `devices_historico` guarda uma cópia completa do registro a cada criação, alteração e exclusão, com email e data.

## Variáveis de ambiente (Vercel > Settings > Environment Variables)

| Variável | Origem |
| --- | --- |
| `DATABASE_URL` | Preenchida automaticamente ao conectar um banco Neon em Storage na Vercel (crie um banco novo, não reutilize o do ems-eventos) |
| `AUTH_SECRET` | String longa e aleatória (40+ caracteres), diferente da do ems-eventos |
| `GMAIL_USER` | Gmail que envia os códigos (pode ser o mesmo do ems-eventos) |
| `GMAIL_APP_PASSWORD` | Senha de aplicativo do Google (pode ser a mesma) |
| `ADMIN_EMAILS` | Emails (separados por vírgula) que entram como Gerente Regional |

O esquema do banco é criado automaticamente na primeira requisição.

## Publicar

1. Crie o repositório `vinipotter87/ems-devices` no GitHub e suba este código.
2. Na Vercel: Add New > Project > importe o repositório. Framework: Next.js (detectado).
3. Storage > Create Database > Neon (região São Paulo) > conecte ao projeto. `DATABASE_URL` aparece sozinha.
4. Settings > Environment Variables: `AUTH_SECRET`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ADMIN_EMAILS`.
5. Deployments > Redeploy. A partir daí cada push na branch principal publica sozinho.

## Catálogo de devices

Os cinco devices e os status estão em `src/lib/devices.ts`. Para incluir um device novo, adicione uma linha; os registros existentes não mudam.

## Rodar localmente

```bash
cp .env.example .env.local   # preencha DATABASE_URL e AUTH_SECRET; use OTP_DEV_LOG=1 para ver o código no log
npm install
npm run dev
```
