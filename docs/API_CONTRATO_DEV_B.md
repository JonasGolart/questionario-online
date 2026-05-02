# Contrato de API para Integracao do Dev B

## Base URL
`/api/v1`

## 1) Iniciar avaliacao
### Endpoint
`POST /api/v1/student/start`

### Request
```json
{
  "token": "ALUNO-ABC123",
  "studentFullName": "Nome Completo do Aluno"
}
```

### Regras
1. Se for primeiro uso, vincula token ao nome completo informado.
2. Se token ja estiver vinculado a outro nome, retorna erro.
3. Se token ja foi usado/finalizado, retorna erro.

### Erros esperados
- `TOKEN_INVALID`
- `TOKEN_EXPIRED`
- `TOKEN_ALREADY_USED`
- `TOKEN_BOUND_TO_OTHER_STUDENT`
- `STUDENT_NAME_INVALID`

## 2) Finalizar avaliacao
### Endpoint
`POST /api/v1/student/submit`

### Request
```json
{
  "attemptId": "uuid-da-tentativa",
  "answers": [
    { "questionId": "uuid", "answer": "A" },
    { "questionId": "uuid", "answer": "B" }
  ]
}
```

### Regra critica
1. Ao finalizar, token vira `USED` e nao pode ser reutilizado.

### Erros esperados
- `ATTEMPT_NOT_FOUND`
- `ATTEMPT_ALREADY_FINISHED`

### Response sucesso (resumo)
```json
{
  "score": 8,
  "percentage": 80,
  "feedback": "Bom desempenho...",
  "weakTopics": [
    { "topic": "geometria", "percentage": 50 }
  ]
}
```
