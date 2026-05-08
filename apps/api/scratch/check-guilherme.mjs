// Verificar a tentativa do Guilherme - especialmente tabSwitches
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const token = await prisma.accessToken.findUnique({
    where: { code: 'ALUNO-JQ9XUW' },
    include: {
      attempt: {
        include: {
          answers: {
            include: {
              question: { select: { statement: true, correctAnswer: true, position: true } }
            },
            orderBy: { createdAt: 'asc' }
          },
          feedbackReport: true
        }
      },
      questionnaire: { select: { name: true, durationMinutes: true } }
    }
  });

  if (!token) {
    console.log('Token não encontrado!');
    return;
  }

  console.log('=== TENTATIVA DO GUILHERME ===');
  console.log(`Token: ${token.code}`);
  console.log(`Status do token: ${token.status}`);
  console.log(`Aluno: ${token.boundStudentName}`);
  console.log(`Questionário: ${token.questionnaire.name}`);
  console.log(`Duração configurada: ${token.questionnaire.durationMinutes} min`);
  console.log('');

  if (!token.attempt) {
    console.log('❌ Nenhuma tentativa encontrada!');
    return;
  }

  const att = token.attempt;
  console.log(`Attempt ID: ${att.id}`);
  console.log(`Nome na tentativa: ${att.studentFullName}`);
  console.log(`Iniciada em: ${att.startedAt}`);
  console.log(`Finalizada em: ${att.finishedAt}`);
  
  if (att.startedAt && att.finishedAt) {
    const durationMs = new Date(att.finishedAt).getTime() - new Date(att.startedAt).getTime();
    const durationMin = (durationMs / 1000 / 60).toFixed(1);
    console.log(`Tempo gasto: ${durationMin} minutos`);
  }

  console.log(`Score: ${att.score}`);
  console.log(`Porcentagem: ${att.percentage}%`);
  console.log('');
  
  // VERIFICAÇÃO CRÍTICA: Tab switches
  console.log('=== SISTEMA ANTI-COLA (Tab Switches) ===');
  console.log(`Tab Switches registrados: ${att.tabSwitches}`);
  
  if (att.tabSwitches >= 2) {
    console.log('⚠️  PROVA ENCERRADA AUTOMATICAMENTE pelo sistema anti-cola!');
    console.log('   O aluno trocou de aba 2 vezes -> auto-submit ativado.');
  } else if (att.tabSwitches === 1) {
    console.log('⚡ O aluno recebeu 1 advertência por trocar de aba.');
    console.log('   A prova NÃO foi encerrada pelo sistema anti-cola.');
  } else {
    console.log('✅ Nenhuma troca de aba detectada.');
  }

  console.log('');
  console.log(`=== RESPOSTAS (${att.answers.length}) ===`);
  for (const a of att.answers) {
    const correct = a.isCorrect ? '✅' : '❌';
    const pos = String(a.question.position).padStart(2);
    console.log(`  Q${pos}: ${correct} Respondeu: "${a.answerValue}" | Gabarito: "${a.question.correctAnswer}"`);
  }

  // Verificar se houve respostas em branco (prova cortada antes de terminar)
  const totalSelected = att.selectedQuestionIds?.length ?? 0;
  const answered = att.answers.length;
  console.log('');
  console.log(`Questões selecionadas: ${totalSelected}`);
  console.log(`Questões respondidas: ${answered}`);
  if (totalSelected > answered) {
    console.log(`⚠️  ${totalSelected - answered} questões ficaram sem resposta (prova foi cortada?)`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
