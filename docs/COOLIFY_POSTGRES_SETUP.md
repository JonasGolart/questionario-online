# PostgreSQL no Coolify - Padrao do Projeto

Este projeto usa PostgreSQL provisionado no Coolify, conforme padrao definido no Armazem.

## 1. Variaveis obrigatorias na API
Configurar no servico da API no Coolify:

- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `PORT`

Exemplo de `DATABASE_URL`:

`postgresql://POSTGRES_USER:POSTGRES_PASSWORD@POSTGRES_HOST:POSTGRES_PORT/POSTGRES_DB?schema=public`

## 2. Ordem de deploy recomendada
1. Subir banco no Coolify.
2. Aplicar migrations (`npm run prisma:deploy -w @questionario/api`).
3. Rodar seed inicial opcional (`npm run prisma:seed -w @questionario/api`).
4. Subir API.
5. Validar endpoint de saude (`/health`).

## 2.1 Migration inicial versionada
- Caminho: `apps/api/prisma/migrations/0001_init/migration.sql`
- Esse arquivo representa a estrutura base do banco para primeira subida.

## 3. Checklist rapido de validacao
1. API conecta no banco sem erro de autenticacao.
2. Migrations aplicadas com sucesso.
3. Endpoint `/api/v1/student/start` responde no ambiente.
4. Endpoint `/api/v1/student/submit` persiste respostas e fecha token.

## 4. Observacao de seguranca
Nunca versionar valores reais de credenciais. Apenas `.env.example` deve estar no repositorio.
