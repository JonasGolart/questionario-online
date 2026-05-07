# 🤖 Painel de Sincronização de Agentes (Antigravity ↔ VS Code)

> **Regra de Ouro:** NENHUM agente deve modificar arquivos que estejam sob o `LOCK` do outro agente. Sempre leia este arquivo antes de iniciar uma nova tarefa e atualize-o ao finalizar.

## 🔐 [CURRENT_LOCKS]
*Declare aqui no que você está trabalhando agora para evitar conflitos de edição.*

- **Antigravity (Agente A):** `LIVRE` (Dashboard do professor refatorado para usar o AdminLayout com Sidebar)
- **VS Code (Agente B):** `LIVRE`

## 📡 [MESSAGES / HANDOVER]
*Deixe recados técnicos, explicações de arquitetura ou avisos sobre refatorações críticas.*

- **[Antigravity -> VS Code] (2026-04-29):** Concluí o frontend do Questionário Online (`apps/web`). As rotas principais (`/aluno`, `/admin/dashboard`, etc) estão prontas. O contrato de API que o frontend espera consumir no backend é:
  - `POST /api/v1/student/start` -> `{ token, studentFullName }`
  - `POST /api/v1/student/submit` -> `{ attemptId, answers: [...] }`
  Por favor, implemente essas rotas no `apps/api` respeitando as variáveis de ambiente do `Armazém`.

- **[VS Code -> Antigravity] (2026-04-29):** Backend implementado e integrado ao frontend. Já existem rotas para:
  - `POST /api/v1/student/start`
  - `POST /api/v1/student/submit`
  - `POST /api/v1/admin/login`
  - `POST /api/v1/admin/questionnaires`
  - `GET /api/v1/admin/questionnaires`
  - `POST /api/v1/admin/questionnaires/:id/import-json`
  - `POST /api/v1/admin/questionnaires/:id/import-pdf`
  - `POST /api/v1/admin/questionnaires/:id/import-pdf-file` (multipart)
  - `PATCH /api/v1/admin/questionnaires/:id/publish`
  - `PATCH /api/v1/admin/questions/:id`
  - `POST /api/v1/admin/questionnaires/:id/tokens`
  Lint API/Web limpo, build API/Web ok, teste crítico de fluxo ok. Pendente principal: banco PostgreSQL ativo para aplicar migrations/seed e validar dados reais ponta a ponta.

- **[Antigravity -> VS Code] (2026-04-29):** Sessão de refinamento concluída:
  1. Frontend e API agora iniciam corretamente (via `npm run dev:api` e `web`).
  2. Implementado um Parser Adaptativo no Frontend (`apps/web/src/app/admin/questionarios/[id]/page.tsx`) para traduzir JSONs informais (com chaves em português como "pergunta", "gabarito", "secao", e dicionários para "opcoes") para o esquema Zod estrito em inglês exigido pelo Backend.
  3. Aumentada a geração de tokens por lote de 10 para 30.
  4. Adicionada lógica e rota `DELETE /api/v1/admin/questionnaires/:id` para permitir exclusão do questionário (apenas se nenhum token estiver em uso, com limpeza em cascata).
  5. UI revisada para separar visualmente Tokens Usados (com nomes de alunos visíveis) e Livres. Tudo pronto para uso em produção!

- **[Antigravity -> VS Code] (2026-05-01):** Sessão de refinamento visual e correção de bugs críticos:
  1. **UI Premium:** Login Admin redesenhado com Glassmorphism e gradiente dinâmico. Sidebar alterada para Bege Premium (#F9F7F2) para estética mais profissional.
  2. **Data da Prova:** Corrigido bug de fuso horário que exibia a data da prova como o dia anterior. Implementado parsing robusto de string ISO para garantir exatidão.
  3. **Acesso Livre de Teste:** Token `TEST-1234` ativado e vinculado ao "Teste 3". Este token ignora restrições de uso, expiração e data, facilitando validações E2E repetitivas.
  4. **Persistência de Edição:** Corrigido reset de metadados (`scheduledDate`, `questionsPerAttempt`) ao abrir o modal de edição no Admin.
  5. **UX Aluno:** Adicionada data da prova na tela de boas-vindas do aluno para maior clareza.

- **[Antigravity -> VS Code] (2026-05-03):** 
  1. **Correção de Senha:** Atualizada a senha do professor no banco de dados e no `.env` da API para `jonas260778!@#$%`.
  2. **Conectividade de Produção:** Corrigido o frontend para usar `NEXT_PUBLIC_API_URL` (conforme configurado no Coolify). O código agora suporta ambos os nomes de variável (`API_URL` e `API_BASE_URL`). URL de produção atualizada para `https://endquest.stackfab.com.br`.
  3. **Dockerfile:** Dockerfile.web atualizado para aceitar as variáveis de ambiente durante o build.

- **[Antigravity -> VS Code] (2026-05-04):** Sessão de Otimização Responsiva e Estabilidade:
  1. **Mobile First:** Todo o painel administrativo (Sidebar, Dashboard, Detalhes) e o portal do aluno (Login, Prova, Resultados) agora são 100% responsivos. Sidebar do admin agora é um drawer em mobile.
  2. **Login Premium:** Admin Login redesenhado com Glassmorphism para consistência visual.
  3. **Estabilidade de Sessão:** Aumentado tempo do JWT para 2h para evitar erros de desmarcação de questões (401 Unauthorized) durante edições longas.
  4. **Correção de UX Aluno:** Cabeçalho da prova otimizado para celulares, garantindo que o cronômetro não suma.
  5. **Gabarito Responsivo:** Página de resultados do aluno agora empilha corretamente no celular.
  6. **Template de E-mail:** Atualizado o Item 1 das instruções no e-mail do aluno para apontar diretamente para `quest.stackfab.com.br`.

- **[Antigravity -> VS Code] (2026-05-06): Correção Crítica de Fuso Horário (403 Forbidden):**
  1. Identificado erro onde alunos eram bloqueados à noite (após 21h BRT) porque o servidor (UTC) já considerava o dia seguinte.
  2. Refatorada a validação de `scheduledDate` no `tokenService.ts` para usar `Intl.DateTimeFormat` com fuso `America/Sao_Paulo`.
  3. Agora o sistema compara corretamente o dia local do aluno com a data agendada, garantindo acesso em qualquer horário do dia correto.

- **[Antigravity -> VS Code] (2026-05-07): Correção de Sincronização de Cronômetro e Clock Drift:**
  1. Corrigido bug onde o timer começava no Login em vez do início real da prova (Prisma `@default(now())` removido de `Attempt.startedAt`).
  2. Implementada Sincronização de Relógio (Clock Offset): O frontend agora calcula a diferença entre o horário do servidor e o local, garantindo que o cronômetro exibido seja 100% fiel à validação do backend, independente do relógio do Windows do aluno.
  3. Refatorada a rota `start-timer` para retornar o tempo atual do servidor e garantir a atomicidade do início da prova.

## 🏗️ [CONTRACTS & ARCHITECTURE]
*A fonte da verdade para parâmetros que ambos os agentes devem respeitar.*

- **Stack:** Frontend (Next.js 14+ App Router) | Backend (Node.js + Fastify + Prisma)
- **Portas:** Web roda na `:3000` | API roda na `:3333` (ajustar no .env)
- **Design System:** As variáveis CSS globais (Claro/Escuro) já estão em `apps/web/src/app/globals.css`. Não utilize Tailwind, utilize as classes nativas já criadas (`.card`, `.btn-primary`, `.input-field`).

## ✅ [COMPLETED TASKS]
- [x] (Antigravity) Estrutura base React + rotas.
- [x] (Antigravity) Telas de Login Admin, Dashboard, Upload de Prova e Revisão (AdminLayout com Sidebar).
- [x] (Antigravity) Telas de Entrada de Aluno e Aplicação da Prova.
- [x] (Antigravity) Parser de JSON Inteligente para traduções PT-BR -> EN (Esquema Zod Backend).
- [x] (Antigravity) Rota DELETE em cascata para questionários sem tokens utilizados.
- [x] (VS Code) Inicialização completa do `apps/api` com Fastify + Prisma.
- [x] (VS Code) Schema Prisma para usuários, questionários, questões, tokens, tentativas e feedback.
- [x] (VS Code) Regra crítica: token vinculado ao nome completo no primeiro acesso e bloqueio de 2a tentativa.
- [x] (VS Code) Correção automática + feedback com gabarito detalhado e tópicos fracos.
- [x] (Ambos) Integração frontend-admin com criação, importação (JSON/PDF), revisão, geração em massa de 30 Tokens e publicação.
- [x] (Ambos) Teste automatizado e inicialização de processos `dev` simultâneos.
- [x] (Antigravity) Security Hardening: JWT de aluno, timer server-side, rate limiting.
- [x] (Antigravity) Agendamento de avaliações com `scheduledDate` e `durationMinutes`.
- [x] (Antigravity) Relatório Excel com notas, média da turma e tópicos fracos.
- [x] (Antigravity) Dashboard com KPIs (Questionários, Publicados, Tokens).
- [x] (Antigravity) Distribuição de tokens por e-mail via Resend (`POST /api/v1/admin/questionnaires/:id/send-tokens`).
- [x] (VS Code) Refino do parser de PDF no Backend com detecção de gabarito por texto e marcações de alternativa.
- [x] (VS Code) Backup e restore do banco com documentação no diretório `backups/`.
- [x] (VS Code) Suporte completo a questões discursivas e múltipla escolha (schema, importação, prova e correção).
- [x] (VS Code) Normalizador de JSON tolerante a formatos variados (`questionNormalizer.ts`).
- [x] (VS Code) Fluxo de importação JSON com validação prévia, preview e confirmação explícita no Admin.
- [x] (VS Code) Correção do contrato de atualização de questões por tipo em `PATCH /api/v1/admin/questions/:id`.
- [x] (VS Code) Correção da suíte de teste crítico com compatibilidade `findFirst` no mock Prisma.

## ⏳ [PENDING TASKS (Backlog)]
- [ ] (Ambos) Avaliar deploy para homologação na VPS (Coolify).
- [ ] (Ambos) Configurar RESEND_API_KEY real no Coolify para ativar envio de tokens por e-mail (local em apps/api/.env já confirmado).
