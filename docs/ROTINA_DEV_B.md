# Rotina Operacional - Dev B (Frontend)

## Objetivo
Entregar a interface completa de Admin e Aluno integrada com a API do projeto Questionario Online.

## Regras de trabalho
1. Trabalhar em branch propria: `feature/dev-b-frontend`.
2. Commits pequenos e frequentes por tela/fluxo.
3. Abrir PR diario com checklist de testes manuais.
4. Nao alterar contratos de API sem alinhamento previo.

## Entregas obrigatorias
1. Fluxo Admin:
- Login de professor/admin.
- Lista de questionarios.
- Criacao/edicao de questionario (nome, categoria, disciplina, descricao).
- Upload drag and drop de JSON/PDF.
- Revisao visual das questoes importadas.
- Tela de geracao e listagem de tokens.

2. Fluxo Aluno:
- Tela de entrada com token + nome completo.
- Aviso claro de tentativa unica.
- Tela de prova com perguntas objetivas.
- Confirmacao antes de finalizar.
- Tela final com feedback (nota, percentual, gabarito, temas com erro).

3. Estados de erro obrigatorios:
- Token invalido.
- Token expirado.
- Token ja utilizado.
- Nome diferente do nome vinculado ao token.

## Contrato de integracao (nao quebrar)
1. POST `/api/v1/student/start`:
- request: `{ token: string, studentFullName: string }`
- response: dados do questionario + tentativa.

2. POST `/api/v1/student/submit`:
- request: `{ attemptId: string, answers: [{ questionId: string, answer: string }] }`
- response: `{ score, percentage, feedback, correctAnswers, weakTopics }`

3. POST `/api/v1/admin/questionnaires/:id/import-json`:
- request: `{ questions: [...] }`
- response: questionario com lista de questoes atualizada.

4. POST `/api/v1/admin/questionnaires/:id/import-pdf`:
- request: `{ pdfBase64: string }`
- response: questionario com lista de questoes extraidas do PDF.
- observacao: parser inicial assume gabarito provisiorio e exige revisao humana antes da publicacao.

5. PATCH `/api/v1/admin/questionnaires/:id/publish`:
- request: `{ isPublished: boolean }`
- bloqueia publicacao sem questoes.

6. POST `/api/v1/admin/questionnaires/:id/tokens`:
- request: `{ quantity: number, expiresInDays: number }`
- response: lote de tokens gerados.

## Observacao de navegacao
As rotas auxiliares de questionario (`/admin/questionarios/novo`, `/admin/questionarios/revisao`, `/admin/questionarios/tokens`) redirecionam para `/admin/dashboard`, que e a tela operacional unica no estado atual.

## Plano diario recomendado
1. Dia 1:
- Estrutura base React + rotas.
- Tela login admin.
- Tela entrada aluno.

2. Dia 2:
- CRUD visual de questionarios.
- Upload/revisao de questoes.
- Tela de aplicacao da prova.

3. Dia 3:
- Tela de resultado.
- Tratamento de erros de token.
- Polimento responsivo (mobile + desktop).

## Checklist de pronto (Definition of Done)
1. Fluxos Admin e Aluno navegaveis de ponta a ponta.
2. Validacao visual e de formulario com mensagens claras.
3. Responsivo em mobile e desktop.
4. Sem erros de lint/build.
5. PR com video curto demonstrando o fluxo completo.
