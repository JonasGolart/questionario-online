import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
  // 1. Encontrar o questionário CA
  const questionnaire = await prisma.questionnaire.findFirst({
    where: { name: { contains: 'CA', mode: 'insensitive' } },
    include: {
      tokens: {
        include: {
          attempt: {
            include: { answers: { select: { id: true } } }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!questionnaire) {
    console.log('Questionário CA não encontrado!');
    await prisma.$disconnect();
    return;
  }

  console.log('=' .repeat(90));
  console.log(`📋 DIAGNÓSTICO: ${questionnaire.name}`);
  console.log(`   ID: ${questionnaire.id}`);
  console.log(`   Data agendada atual: ${questionnaire.scheduledDate}`);
  console.log(`   Expiração tokens: verificando abaixo`);
  console.log('=' .repeat(90));

  // 2. Classificar tokens
  const usedTokens = [];
  const activeTokens = [];
  const expiredTokens = [];

  for (const t of questionnaire.tokens) {
    if (t.code === 'TEST-1234') continue; // ignorar token de teste

    const info = {
      code: t.code,
      status: t.status,
      boundStudentName: t.boundStudentName || '—',
      sentToEmail: t.sentToEmail || '—',
      expiresAt: t.expiresAt,
      isExpired: new Date(t.expiresAt) < new Date(),
      hasAttempt: !!t.attempt,
      attemptFinished: t.attempt?.finishedAt ? true : false,
      answersCount: t.attempt?.answers?.length || 0,
      score: t.attempt?.percentage || null
    };

    if (t.status === 'USED' || (t.attempt && t.attempt.finishedAt)) {
      usedTokens.push(info);
    } else if (new Date(t.expiresAt) < new Date()) {
      expiredTokens.push(info);
    } else {
      activeTokens.push(info);
    }
  }

  // 3. Relatório de tokens usados
  console.log(`\n🔴 TOKENS USADOS (${usedTokens.length}) — Provas já realizadas`);
  console.log('─'.repeat(90));
  console.log(
    'Token'.padEnd(16) +
    'Aluno'.padEnd(35) +
    'Nota'.padStart(6) +
    'Respostas'.padStart(11) +
    'Email Enviado'.padStart(25)
  );
  console.log('─'.repeat(90));
  for (const t of usedTokens) {
    console.log(
      t.code.padEnd(16) +
      t.boundStudentName.substring(0, 34).padEnd(35) +
      (t.score !== null ? `${t.score.toFixed(0)}%` : '—').padStart(6) +
      `${t.answersCount}`.padStart(11) +
      t.sentToEmail.substring(0, 24).padStart(25)
    );
  }

  // 4. Tokens ativos
  console.log(`\n🟢 TOKENS ATIVOS (${activeTokens.length}) — Disponíveis para uso`);
  console.log('─'.repeat(90));
  console.log(
    'Token'.padEnd(16) +
    'Status'.padEnd(10) +
    'Vinculado a'.padEnd(30) +
    'Expira em'.padStart(25) +
    'Expirado?'.padStart(10)
  );
  console.log('─'.repeat(90));
  for (const t of activeTokens) {
    console.log(
      t.code.padEnd(16) +
      t.status.padEnd(10) +
      t.boundStudentName.substring(0, 29).padEnd(30) +
      new Date(t.expiresAt).toLocaleString('pt-BR').padStart(25) +
      (t.isExpired ? '⚠️ SIM' : '✅ NÃO').padStart(10)
    );
  }

  // 5. Tokens expirados mas não usados
  console.log(`\n🟡 TOKENS EXPIRADOS NÃO USADOS (${expiredTokens.length})`);
  for (const t of expiredTokens) {
    console.log(`   ${t.code} — Expirou em ${new Date(t.expiresAt).toLocaleString('pt-BR')} — Vinculado: ${t.boundStudentName}`);
  }

  // 6. Resumo de ações necessárias
  console.log('\n' + '=' .repeat(90));
  console.log('📋 AÇÕES NECESSÁRIAS PARA REAGENDAR PARA AMANHÃ (08/05):');
  console.log(`   1. Atualizar scheduledDate para 2026-05-08`);
  
  const tokensNeedExtension = activeTokens.filter(t => t.isExpired);
  console.log(`   2. Renovar expiração de ${tokensNeedExtension.length} tokens expirados`);
  console.log(`   3. Provas já realizadas: ${usedTokens.length} (PRESERVADAS, não serão tocadas)`);
  console.log(`   4. Tokens livres para amanhã: ${activeTokens.length - tokensNeedExtension.length}`);
  console.log('=' .repeat(90));

  // Output JSON summary for next script
  console.log('\n--- DADOS PARA SCRIPT ---');
  console.log(JSON.stringify({
    questionnaireId: questionnaire.id,
    usedCount: usedTokens.length,
    activeCount: activeTokens.length,
    expiredCount: expiredTokens.length,
    needsExtension: tokensNeedExtension.length
  }));

  await prisma.$disconnect();
}

diagnose().catch(console.error);
