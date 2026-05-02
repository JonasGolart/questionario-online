# Questionário Online (StackFAB / UTFPR)

Plataforma oficial de questionários online projetada com o **Design System StackFAB**. Inclui um painel administrativo completo para professores, acesso exclusivo por token para alunos e correção/feedback automático detalhado ao final de cada avaliação.

---

## 📋 Pré-requisitos

- **Node.js**: v20 LTS ou superior.
- **Gerenciador de pacotes**: npm.
- **Banco de Dados**: PostgreSQL (Instância local ou na Coolify).
- *(Opcional)* **Resend API Key**: Para envio de tokens por e-mail aos alunos.

## 🚀 Instalação

1. Clone o repositório ou acesse o diretório do projeto.
2. Instale as dependências para todos os workspaces do monorepo:
```bash
npm install
```

## 🔒 Variáveis de ambiente

Crie arquivos `.env` baseados nos modelos fornecidos (você encontrará `.env.example` na raiz e dentro de `apps/api`). 
**Atenção:** Os valores reais e credenciais em produção **nunca** devem ser "commitados" e podem ser consultados diretamente no **Armazém StackFAB (01 - Credenciais)**.

## 💻 Como rodar localmente

Este projeto está estruturado em um monorepo contendo `apps/api` e `apps/web`.

### 1. Configurando o Banco de Dados (Backend)
Na API, gere o cliente do Prisma e aplique a migration:
```bash
npm run prisma:generate -w @questionario/api
npm run prisma:migrate -w @questionario/api
```

*(Opcional)* Popule o banco com o usuário administrador inicial e dados de teste:
```bash
npm run prisma:seed -w @questionario/api
```

### 2. Rodando o Frontend e a API
Para rodar a API de validação:
```bash
npm run dev:api
```

Para rodar a interface Frontend (Next.js):
```bash
npm run dev:web
```

> A aplicação web estará disponível em `http://localhost:3000`. Você pode testar os fluxos acessando:
> - **Entrada do Aluno:** `/aluno`
> - **Login Admin:** `/admin/login`

### 3. Build para Produção
Caso queira gerar a build otimizada da aplicação Front-End localmente:
```bash
npm run build:web
```

## 🏗 Estrutura e Funcionalidades Recentes

- **Frontend (`apps/web/`)**: Construído com Next.js 14+ (App Router). Adota paleta de cores flexível (Claro/Escuro) e layout responsivo focado no estudante e no professor. **Recentemente atualizado com landing page otimizada contendo a logo da instituição.**
- **Backend (`apps/api/`)**: API REST com Fastify, Prisma e Zod. Regras de negócio restritas, geração de tokens e correção automática.
- **Integração com Resend**: Envio em lote de tokens para os alunos via e-mail diretamente pelo painel.
- **Importação de Questões Inteligente**:
  - **Parser Adaptativo (JSON)**: Traduz estruturas JSONs informais (ex: chaves em português como "pergunta", "gabarito", "secao") automaticamente para o esquema estrito da API.
  - **Importação via PDF**: Processa provas em formato PDF para montar questionários automaticamente (requer revisão do professor para garantir gabarito final).
- **Relatórios Gerenciais**: Exportação nativa de relatórios de turmas, notas e tópicos fracos diretamente para **Excel (.xlsx)**.
- **Painel Administrativo Refinado**: Dashboard focado em KPIs (Questionários, Publicados, Tokens) com SideBar de navegação central.

**Regras críticas do Sistema:**
1. Todo token gerado no painel fica rigidamente vinculado ao nome completo informado pelo aluno no seu primeiro acesso.
2. Cada token permite **apenas uma** tentativa finalizada de avaliação.
3. Tokens não utilizados ou questionários vazios podem ser deletados através de uma rotina em cascata.

## ☁️ Deploy

A integração e o build de produção serão implantados e orquestrados na VPS remota (via Coolify). Certifique-se de configurar a variável `CORS_ALLOW_ORIGINS`, `RESEND_API_KEY`, e as URLs front-end/back-end apropriadas nos ambientes de deploy.

## 📩 Contato / Responsável

Projeto mantido pelo esquadrão **StackFAB** (Responsabilidade compartilhada entre a inteligência orquestradora e a equipe). Consulte o **Hub de Projetos** ou `docs/ROTINA_DEV_B.md` para diretrizes de contribuição no Front-end.
