# 🎓 Sistema Inteligente de Importação de Questões

## 📋 Resumo

O sistema agora suporta **múltiplos formatos de questões**:

- ✅ **Múltipla Escolha** - com opções e uma resposta correta
- ✅ **Discursivas** - com múltiplas respostas aceitáveis
- ✅ **Detecção Automática** - identifica o tipo baseado na estrutura
- ✅ **Normalização Inteligente** - converte diferentes formatos para o padrão

---

## 🔄 Processo de Normalização

### Entrada: Seu JSON Original

```json
{
  "disciplina": "ANATOMIA 1",
  "questoes": [
    {
      "enunciado": "Os [lacuna] e [lacuna] são...",
      "gabarito": ["tíbia", "fíbula"]
    }
  ]
}
```

### Detecção de Tipo

O sistema analisa a estrutura da questão:

| Característica | Tipo Detectado |
|---|---|
| Tem `options/opcoes` com 2+ itens | `MULTIPLE_CHOICE` |
| Tem `gabarito` com múltiplos valores | `ESSAY` |
| Tem `correctAnswer` único | `MULTIPLE_CHOICE` |
| Sem opções, apenas respostas | `ESSAY` |

### Normalização de Campos

O sistema reconhece múltiplas aliases para cada campo:

| Campo | Aliases Reconhecidas |
|-------|---------------------|
| **statement** | `statement`, `enunciado`, `pergunta`, `question`, `titulo`, `text`, `conteudo` |
| **options** | `options`, `opcoes`, `alternativas`, `choices` |
| **correct answer** | `correctAnswer`, `gabarito`, `respostasCorretas`, `correctAnswers`, `answer`, `resposta` |
| **image** | `imageUrl`, `image_url`, `imagem`, `image`, `grafico`, `figura`, `imagemUrl` |
| **topic** | `topic`, `topico`, `assunto`, `tema` |
| **weight** | `weight`, `peso` |

### Saída: JSON Normalizado

```json
{
  "type": "ESSAY",
  "statement": "Os [lacuna] e [lacuna] são os dois principais ossos que formam o esqueleto da perna.",
  "correctAnswers": ["tíbia", "fíbula"],
  "topic": "Osteologia",
  "weight": 1
}
```

---

## 🧪 Tipos de Questão

### 1️⃣ Múltipla Escolha (MULTIPLE_CHOICE)

Formato esperado:
```json
{
  "statement": "Qual é a capital do Brasil?",
  "options": ["São Paulo", "Brasília", "Rio de Janeiro"],
  "correctAnswer": "Brasília"
}
```

Renderização: **Radio buttons** com opções

---

### 2️⃣ Discursiva (ESSAY)

Formato esperado:
```json
{
  "statement": "Os [lacuna] e [lacuna] são...",
  "correctAnswers": ["tíbia", "fíbula", "ossos da perna"]
}
```

ou com resposta única:
```json
{
  "statement": "Defina o sistema circulatório",
  "gabarito": ["sistema responsável pela circulação de sangue"]
}
```

Renderização: **Textarea** para entrada livre

---

## 📥 Como Usar

### 1. Preparar o JSON

Você pode usar **qualquer um desses formatos**:

```json
// Formato 1: Array direto
[
  { "statement": "...", "options": [...], "correctAnswer": "..." },
  { "enunciado": "...", "gabarito": [...] }
]

// Formato 2: Campo "questions"
{
  "questions": [...]
}

// Formato 3: Campo "questoes" (português)
{
  "questoes": [...]
}

// Formato 4: Metadados + questões
{
  "disciplina": "...",
  "professor": "...",
  "questoes": [...]
}
```

### 2. Importar no Sistema

1. Acesse a página do questionário
2. Clique em **"Importar Questões"**
3. Cole o JSON no campo de texto
4. O sistema vai:
   - Validar a sintaxe JSON ✅
   - Extrair o array de questões ✅
   - Normalizar cada questão ✅
   - Detectar o tipo automaticamente ✅
   - Importar para o banco de dados ✅

### 3. Visualizar

As questões agora aparecem no dashboard com indicadores:
- 🔘 **Múltipla Escolha** - "✅ Resposta"
- 📝 **Discursiva** - "📝 Discursiva: respostas..."

---

## 🎯 Exemplo Real: Seu JSON

### ❌ Antes (com erro):
```json
{
  "disciplina": "ANATOMIA 1",
  "questoes": [{
    "numero": 1,
    "enunciado": "Os [lacuna] e [lacuna] são...",
    "gabarito": ["tíbia", "fíbula"]
  }]
}
```
**Erro**: Formato de questões discursivas não suportado

### ✅ Depois (funciona!):
O sistema **detecta automaticamente** que é ESSAY, aceita o JSON como está!

---

## 🔧 Tratamento de Erros

Se houver erro na importação, você verá mensagens claras:

| Erro | Motivo | Solução |
|------|--------|---------|
| `"Não foi encontrado array de questões"` | JSON não tem campo `questions`/`questoes` | Adicione `"questions": [...]` ou envie array direto |
| `"Array de questões está vazio"` | `questions: []` | Adicione pelo menos 1 questão |
| `"QUESTION_OPTIONS_INVALID"` | Múltipla escolha com < 2 opções | Adicione mais opções |
| `"QUESTION_CORRECT_ANSWER_INVALID"` | Resposta não está nas opções | Corrija a resposta |

---

## 💡 Dicas e Boas Práticas

### ✅ Funciona bem com:

- JSON desorganizado com muitos campos
- Nomes de campos em português e inglês
- Múltiplos formatos no mesmo arquivo
- Respostas com acentos e caracteres especiais
- Imagens em base64 ou URLs

### ⚠️ Evite:

- Arrays vazios `questions: []`
- Questões sem enunciado
- Múltipla escolha sem opções
- Misturar tipos incompatíveis (não misture MULTIPLE_CHOICE com ESSAY no mesmo campo)

---

## 🚀 Próximas Features (Futuro)

- 📊 Importação de relatórios de questões
- 🤖 Sugestão automática de tipos de questão
- 📈 Validação de qualidade das questões
- 🔄 Conversão de PDF para questões estruturadas
- ⚙️ Templates pré-definidos por disciplina

---

## 📞 Suporte

Se encontrar problemas com a importação:

1. Verifique a sintaxe JSON em [jsonlint.com](https://www.jsonlint.com)
2. Compare com os exemplos acima
3. Verifique se o campo de questões tem um nome reconhecido
4. Teste com uma questão por vez

**Dúvidas?** Verifique o console do navegador (F12) para mais detalhes do erro!
