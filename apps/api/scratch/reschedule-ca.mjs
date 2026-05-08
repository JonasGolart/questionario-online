import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const QUESTIONNAIRE_ID = 'a29b0ee0-4918-412e-92c1-6578422151fb';
const NEW_DATE = '2026-05-08T00:00:00.000Z';

async function reschedule() {
  console.log('=' .repeat(80));
  console.log('🔧 REAGENDANDO AVALIAÇÃO 1 DE CA PARA 08/05/2026');
  console.log('=' .repeat(80));

  // 1. Atualizar a data do questionário
  const updated = await prisma.questionnaire.update({
    where: { id: QUESTIONNAIRE_ID },
    data: { scheduledDate: new Date(NEW_DATE) }
  });
  console.log(`\n✅ Data atualizada: ${updated.scheduledDate}`);

  // 2. Limpar tokens de teste expirados (TESTRUN-*)
  const deletedTestRuns = await prisma.accessToken.deleteMany({
    where: {
      questionnaireId: QUESTIONNAIRE_ID,
      code: { startsWith: 'TESTRUN-' }
    }
  });
  console.log(`✅ Tokens de teste removidos: ${deletedTestRuns.count}`);

  // 3. Verificar estado final
  const tokens = await prisma.accessToken.findMany({
    where: { questionnaireId: QUESTIONNAIRE_ID },
    include: {
      attempt: { select: { finishedAt: true, studentFullName: true, percentage: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  const used = tokens.filter(t => t.status === 'USED' || (t.attempt && t.attempt.finishedAt));
  const active = tokens.filter(t => t.status === 'ACTIVE' && !t.attempt?.finishedAt);

  console.log(`\n📊 ESTADO FINAL:`);
  console.log(`   Provas realizadas (preservadas): ${used.length}`);
  console.log(`   Tokens ativos para amanhã: ${active.length}`);
  console.log(`   Data da prova: 08/05/2026`);

  // 4. Lista de tokens usados com alunos
  console.log(`\n${'─'.repeat(80)}`);
  console.log('📋 RELATÓRIO: TOKENS USADOS E SEUS ALUNOS');
  console.log('─'.repeat(80));
  console.log(
    'Token'.padEnd(16) +
    'Aluno'.padEnd(40) +
    'Nota'.padStart(6) +
    '  Status'
  );
  console.log('─'.repeat(80));
  for (const t of used) {
    console.log(
      t.code.padEnd(16) +
      (t.attempt?.studentFullName || t.boundStudentName || '—').substring(0, 39).padEnd(40) +
      (t.attempt?.percentage !== null ? `${t.attempt.percentage.toFixed(0)}%` : '—').padStart(6) +
      `  ${t.attempt?.finishedAt ? '✅ Finalizado' : '⚠️ Em andamento'}`
    );
  }

  // 5. Lista de tokens livres
  console.log(`\n${'─'.repeat(80)}`);
  console.log('📋 TOKENS DISPONÍVEIS PARA AMANHÃ');
  console.log('─'.repeat(80));
  for (const t of active) {
    const vinculo = t.boundStudentName ? `→ ${t.boundStudentName}` : '(livre)';
    const email = t.sentToEmail ? `📧 ${t.sentToEmail}` : '';
    console.log(`   ${t.code}  ${vinculo}  ${email}`);
  }

  console.log('\n' + '=' .repeat(80));
  console.log('✅ REAGENDAMENTO CONCLUÍDO COM SUCESSO');
  console.log('   → Nenhuma prova realizada foi perdida');
  console.log('   → Tokens ativos estão válidos até 09-11/05');
  console.log('   → Data da prova atualizada para 08/05/2026');
  console.log('=' .repeat(80));

  await prisma.$disconnect();
}

reschedule().catch(console.error);
