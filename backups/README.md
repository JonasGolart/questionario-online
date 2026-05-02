# 💾 Sistema de Backup e Restore

Este sistema permite fazer backup completo do banco de dados e restaurar em caso de perda de dados.

## 📋 Visão Geral

O sistema de backup exporta todas as tabelas do banco de dados para um arquivo JSON com timestamp. Você pode restaurar qualquer backup a qualquer momento.

### O que é incluído no backup:
- ✅ **Usuários** (professores/admins)
- ✅ **Questionários** (com metadados)
- ✅ **Questões** (com imagens em base64)
- ✅ **Tokens de acesso** (para alunos)
- ✅ **Tentativas** (respostas dos alunos)

## 🚀 Uso Rápido

### Criar um Backup

```bash
# Na raiz do projeto
npm run -w @questionario/api backup

# Ou na pasta da API
cd apps/api
npm run backup
```

**Resultado:**
```
✅ Backup criado com sucesso!

📁 Arquivo: backup_2026-05-01T14-30-45-123Z.json
📍 Localização: /path/to/backups/backup_2026-05-01T14-30-45-123Z.json

📊 Resumo do Backup:
   - Usuários: 1
   - Questionários: 3
   - Questões: 15
   - Tokens: 30
   - Tentativas: 5

💾 Backup salvo em: /path/to/backups/backup_2026-05-01T14-30-45-123Z.json
```

### Listar Backups Disponíveis

```bash
npm run -w @questionario/api restore:backup
```

**Resultado:**
```
❌ Uso: npm run restore:backup -- <arquivo-backup>

📁 Backups disponíveis:

   1. backup_2026-05-01T14-30-45-123Z.json (156.42KB - 01/05/2026 14:30:45)
   2. backup_2026-04-30T10-15-20-456Z.json (142.18KB - 30/04/2026 10:15:20)
   3. backup_2026-04-29T09-00-00-789Z.json (130.56KB - 29/04/2026 09:00:00)

💡 Exemplo: npm run restore:backup -- backup_2026-05-01T14-30-45-123Z.json
```

### Restaurar um Backup

```bash
# 1. Listar backups
npm run -w @questionario/api restore:backup

# 2. Escolher qual backup restaurar
npm run -w @questionario/api restore:backup -- backup_2026-05-01T14-30-45-123Z.json --confirm
```

⚠️ **Atenção:** Restaurar um backup vai **DELETAR TODOS OS DADOS ATUAIS** e restaurar do backup escolhido!

## 📁 Estrutura de Backups

```
backups/
├── backup_2026-05-01T14-30-45-123Z.json
├── backup_2026-04-30T10-15-20-456Z.json
├── backup_2026-04-29T09-00-00-789Z.json
└── backup_2026-04-28T15-45-30-000Z.json
```

Cada arquivo tem um timestamp ISO no nome, ordenado alfabeticamente (mais recente primeiro).

## 🔄 Fluxo Recomendado

### 1. **Antes de Atualizações Importantes**
```bash
npm run -w @questionario/api backup
# Aguardar confirmação ✅
```

### 2. **Depois de Atualizar Código**
Se houver erro:
```bash
npm run -w @questionario/api restore:backup -- backup_2026-05-01T14-30-45-123Z.json --confirm
```

### 3. **Manutenção Periódica**
- ✅ Fazer backup **antes** de executar `prisma migrate reset`
- ✅ Fazer backup **diariamente** em produção
- ✅ Fazer backup **antes** de deletar dados manualmente
- ✅ Arquivar backups antigos (> 30 dias)

## 📊 Tamanho de Backup

Um backup típico contém:
- Dados estruturados em JSON
- Imagens em base64 (aumentam o tamanho)
- Metadados de todas as tentativas

**Exemplo:**
- 1 professor
- 10 questionários
- 100 questões com imagens
- 200 tokens
- 50 tentativas

= ~200-300KB por backup

## ⚠️ Considerações Importantes

### ✅ Segurança dos Backups
- Backups contêm **senhas hasheadas** (seguro)
- Backups contêm **imagens em base64** (cuidado com sensibilidade)
- Mantenha backups em **local seguro**
- Faça **backup do backup** em outro servidor/nuvem

### 🔒 Proteção de Dados
1. **Faça backup regularmente** (diário em produção)
2. **Guarde em local seguro** (não no mesmo servidor)
3. **Teste restore periodicamente** (mensalmente)
4. **Mantenha histórico** de pelo menos 30 dias

## 🛠️ Troubleshooting

### Erro: "Arquivo de backup não encontrado"
```bash
# Verificar se o arquivo existe
ls -la backups/

# Listar backups disponíveis
npm run -w @questionario/api restore:backup
```

### Erro: "Este comando vai DELETAR todos os dados"
```bash
# Você precisa confirmar com --confirm
npm run -w @questionario/api restore:backup -- backup_XXX.json --confirm
```

### Backup muito lento
- Verifique a conexão com o banco de dados
- Se o banco tem muitos dados, backup pode levar minutos
- Backup não bloqueia a aplicação

## 📝 Exemplo Completo

```bash
# 1. Iniciar desenvolvimento
npm run dev

# 2. Criar dados (questionários, alunos, etc)
# ... usar a aplicação normalmente ...

# 3. Antes de fazer uma atualização importante
npm run -w @questionario/api backup

# ✅ Backup criado: backup_2026-05-01T14-30-45-123Z.json

# 4. Fazer a atualização (ex: prisma migrate)
npm run -w @questionario/api prisma:deploy

# 5. Se algo der errado:
npm run -w @questionario/api restore:backup -- backup_2026-05-01T14-30-45-123Z.json --confirm

# 6. Banco restaurado ao estado anterior! ✅
```

## 🚀 Próximos Passos

Considere implementar:
- [ ] Backup automático diário (cron job)
- [ ] Upload para nuvem (AWS S3, Google Cloud, etc)
- [ ] Compressão de backups (gzip)
- [ ] Verificação de integridade de backup
- [ ] Limpeza automática de backups antigos
- [ ] Notificação por email quando backup for criado

---

**Último update:** 01/05/2026
**Versão:** 1.0
