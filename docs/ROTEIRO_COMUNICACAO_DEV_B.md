# 🤖 Protocolo de Orquestração: Manual para o Dev B (VS Code)

Olá, Agente do VS Code (Dev B)! 
Você está trabalhando em cooperação com o **Antigravity (Dev A)**. Nós operamos no mesmo repositório físico sob a tutela do mesmo Orquestrador Humano. Para garantirmos velocidade e zero conflitos de merge/arquivos, você deve seguir **estritamente** este roteiro operacional:

## 1. O Arquivo Central (`GEMINI.md`)
Sua fonte da verdade não é apenas o código-fonte, mas sim o arquivo `GEMINI.md` na raiz do projeto. 
- **Sempre que você for acordado (iniciado) pelo usuário:** A sua primeira ação autônoma deve ser *LER* o arquivo `GEMINI.md`. 
- Observe a sessão `[MESSAGES / HANDOVER]` para ver se eu (Dev A) deixei contratos de API ou estilos que você deve seguir obrigatoriamente.

## 2. A Regra de Ouro (Locks de Sistema)
Nós trabalhamos paralelamente. Isso significa que podemos tentar editar o mesmo arquivo ao mesmo tempo, causando corrupção.
- **Antes de escrever qualquer código:** Atualize a sessão `[CURRENT_LOCKS]` do `GEMINI.md`. Altere o status do `VS Code (Agente B)` de `LIVRE` para `EM USO` e descreva exatamente em qual diretório você está operando (ex: `apps/api`).
- **Verifique o meu Lock:** Se o status do `Antigravity (Agente A)` estiver apontando para um arquivo ou diretório, **você está terminantemente proibido** de modificar arquivos naquela região. 

## 3. Padrões de Arquitetura do Armazém
Nós seguimos a arquitetura StackFAB. Se tiver dúvidas sobre bancos de dados, conexões Coolify ou variáveis de ambiente, **nunca deduza**. Leia a documentação que consolidei em:
- `E:\STACKFAB\Armazem\01 - Credenciais\Coolify - Infraestrutura.md`
- `E:\STACKFAB\Armazem\03 - Padroes de Projeto\`

## 4. Passagem de Bastão (Handover)
Assim que você concluir a sua bateria de tarefas (ex: configurar o PostgreSQL, rodar o Prisma Seed, etc.), faça o seguinte rito de finalização:
1. Marque a tarefa como concluída `[x]` na sessão `[PENDING TASKS]`.
2. Vá até a sessão `[MESSAGES / HANDOVER]` e adicione um recado para mim. Exemplo: *"Dev A, banco de dados inicializado na porta 5433, migration rodou com sucesso. Pode iniciar testes E2E."*
3. Altere o seu status em `[CURRENT_LOCKS]` de volta para `LIVRE`.

## Resumo do seu Fluxo de Vida
`Ler GEMINI.md` -> `Lockar sua Tarefa` -> `Codar` -> `Escrever Handover` -> `Atualizar Tarefas` -> `Liberar Lock`.

Bom trabalho! O Orquestrador Humano avaliará sua performance.
