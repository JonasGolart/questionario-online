import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const QUESTIONNAIRE_ID = 'a29b0ee0-4918-412e-92c1-6578422151fb';

async function cleanTestTokens() {
  // Encontrar todos os tokens TESTRUN-*
  const testTokens = await prisma.accessToken.findMany({
    where: {
      questionnaireId: QUESTIONNAIRE_ID,
      code: { startsWith: 'TESTRUN-' }
    },
    select: { id: true, code: true }
  });

  console.log(`Encontrados ${testTokens.length} tokens de teste para limpar...`);

  for (const t of testTokens) {
    // Deletar respostas, feedback, tentativa e token em cascata
    const attempt = await prisma.attempt.findFirst({ where: { tokenId: t.id } });
    if (attempt) {
      await prisma.answer.deleteMany({ where: { attemptId: attempt.id } });
      await prisma.feedbackReport.deleteMany({ where: { attemptId: attempt.id } });
      await prisma.attempt.delete({ where: { id: attempt.id } });
      console.log(`   🗑️ Limpou tentativa do ${t.code}`);
    }
    await prisma.accessToken.delete({ where: { id: t.id } });
    console.log(`   ✅ Removeu token ${t.code}`);
  }

  // Agora gerar o relatório final
  const tokens = await prisma.accessToken.findMany({
    where: { questionnaireId: QUESTIONNAIRE_ID },
    include: {
      attempt: { select: { finishedAt: true, studentFullName: true, percentage: true, score: true } }
    },
    orderBy: { createdAt: 'asc' }
  });

  const used = tokens.filter(t => t.status === 'USED' || (t.attempt && t.attempt.finishedAt));
  const active = tokens.filter(t => t.status === 'ACTIVE' && !t.attempt?.finishedAt);

  console.log('\n' + '═'.repeat(80));
  console.log('📋 RELATÓRIO FINAL: TOKENS USADOS');
  console.log('═'.repeat(80));
  console.log(
    '#'.padStart(3) +
    '  Token'.padEnd(16) +
    'Aluno'.padEnd(40) +
    'Nota'.padStart(6) +
    '  Status'
  );
  console.log('─'.repeat(80));
  let i = 1;
  for (const t of used) {
    console.log(
      `${i}`.padStart(3) +
      `  ${t.code}`.padEnd(16) +
      (t.attempt?.studentFullName || t.boundStudentName || '—').substring(0, 39).padEnd(40) +
      (t.attempt?.percentage !== null && t.attempt?.percentage !== undefined ? `${t.attempt.percentage.toFixed(0)}%` : '—').padStart(6) +
      `  ${t.attempt?.finishedAt ? '✅ Finalizado' : '⚠️ Em andamento'}`
    );
    i++;
  }

  console.log('\n' + '═'.repeat(80));
  console.log('📋 TOKENS DISPONÍVEIS PARA AMANHÃ (08/05)');
  console.log('═'.repeat(80));
  i = 1;
  for (const t of active) {
    const vinculo = t.boundStudentName ? `→ ${t.boundStudentName}` : '(livre)';
    console.log(`   ${i}. ${t.code}  ${vinculo}`);
    i++;
  }

  console.log(`\n📊 RESUMO: ${used.length} provas realizadas | ${active.length} tokens disponíveis`);

  await prisma.$disconnect();
}

cleanTestTokens().catch(console.error);
