import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyze() {
  // 1. Encontrar o questionário
  const questionnaire = await prisma.questionnaire.findFirst({
    where: { name: { contains: 'CA', mode: 'insensitive' } },
    include: {
      questions: { select: { id: true, type: true, weight: true, topic: true } },
      tokens: {
        include: {
          attempt: {
            include: {
              answers: true,
              feedbackReport: true
            }
          }
        }
      }
    }
  });

  if (!questionnaire) {
    console.log('Questionário não encontrado!');
    // Listar todos para referência
    const all = await prisma.questionnaire.findMany({ select: { id: true, name: true } });
    console.log('Questionários disponíveis:', all);
    await prisma.$disconnect();
    return;
  }

  console.log('=' .repeat(80));
  console.log(`📋 ANÁLISE FORENSE: ${questionnaire.name}`);
  console.log(`   Disciplina: ${questionnaire.discipline}`);
  console.log(`   Questões no banco: ${questionnaire.questions.length}`);
  console.log(`   Duração configurada: ${questionnaire.durationMinutes || 'Sem limite'} min`);
  console.log(`   Questões por tentativa: ${questionnaire.questionsPerAttempt || 'Todas'}`);
  console.log('=' .repeat(80));

  // 2. Coletar dados de todas as tentativas finalizadas
  const attempts = questionnaire.tokens
    .filter(t => t.attempt && t.attempt.finishedAt)
    .map(t => {
      const a = t.attempt;
      const started = a.startedAt ? new Date(a.startedAt) : new Date(a.createdAt);
      const finished = new Date(a.finishedAt);
      const durationSec = (finished - started) / 1000;
      const durationMin = durationSec / 60;
      const questionsAnswered = a.answers.filter(ans => ans.answerValue && ans.answerValue.trim().length > 0).length;
      const totalQuestions = a.selectedQuestionIds.length || questionsAnswered;
      const secPerQuestion = totalQuestions > 0 ? durationSec / totalQuestions : 0;

      return {
        name: a.studentFullName,
        score: a.score,
        percentage: a.percentage,
        tabSwitches: a.tabSwitches,
        durationMin: Math.round(durationMin * 10) / 10,
        durationSec: Math.round(durationSec),
        totalQuestions,
        questionsAnswered,
        secPerQuestion: Math.round(secPerQuestion * 10) / 10,
        startedAt: started.toISOString(),
        finishedAt: finished.toISOString(),
        correctCount: a.answers.filter(ans => ans.isCorrect).length,
        wrongCount: a.answers.filter(ans => !ans.isCorrect).length,
      };
    })
    .sort((a, b) => a.durationMin - b.durationMin); // Ordenar pelo mais rápido

  if (attempts.length === 0) {
    console.log('Nenhuma tentativa finalizada encontrada.');
    await prisma.$disconnect();
    return;
  }

  // 3. Estatísticas gerais
  const durations = attempts.map(a => a.durationMin);
  const avgDuration = durations.reduce((s, d) => s + d, 0) / durations.length;
  const medianDuration = durations[Math.floor(durations.length / 2)];
  const stdDev = Math.sqrt(durations.reduce((s, d) => s + (d - avgDuration) ** 2, 0) / durations.length);

  const scores = attempts.map(a => a.percentage || 0);
  const avgScore = scores.reduce((s, d) => s + d, 0) / scores.length;

  const tabSwitches = attempts.map(a => a.tabSwitches);
  const avgTabs = tabSwitches.reduce((s, d) => s + d, 0) / tabSwitches.length;

  console.log('\n📊 ESTATÍSTICAS GERAIS');
  console.log(`   Total de alunos: ${attempts.length}`);
  console.log(`   Tempo médio: ${avgDuration.toFixed(1)} min`);
  console.log(`   Tempo mediano: ${medianDuration.toFixed(1)} min`);
  console.log(`   Desvio padrão: ${stdDev.toFixed(1)} min`);
  console.log(`   Nota média: ${avgScore.toFixed(1)}%`);
  console.log(`   Trocas de aba média: ${avgTabs.toFixed(1)}`);

  // 4. Estimativa de tempo honesto
  // Para múltipla escolha: ~1.5-2.5 min por questão é considerado razoável
  // Para discursiva: ~3-5 min por questão
  const mcCount = questionnaire.questions.filter(q => q.type === 'MULTIPLE_CHOICE').length;
  const essayCount = questionnaire.questions.filter(q => q.type === 'ESSAY').length;
  const questionsPerAttempt = questionnaire.questionsPerAttempt || questionnaire.questions.length;
  
  const estimatedMinPerMC = 1.5; // minutos por múltipla escolha (leitura + reflexão)
  const estimatedMinPerEssay = 4;
  const estimatedHonestMin = (mcCount * estimatedMinPerMC + essayCount * estimatedMinPerEssay) * (questionsPerAttempt / questionnaire.questions.length);

  console.log(`\n⏱️  ESTIMATIVA DE TEMPO HONESTO`);
  console.log(`   Questões MC: ${mcCount} × ~${estimatedMinPerMC} min = ${(mcCount * estimatedMinPerMC).toFixed(0)} min`);
  console.log(`   Questões Discursivas: ${essayCount} × ~${estimatedMinPerEssay} min = ${(essayCount * estimatedMinPerEssay).toFixed(0)} min`);
  console.log(`   Tempo estimado honesto: ~${estimatedHonestMin.toFixed(0)} min`);
  console.log(`   Limiar de "chute" (< 30% do tempo honesto): < ${(estimatedHonestMin * 0.3).toFixed(1)} min`);
  console.log(`   Limiar de "suspeito" (< 50% do tempo honesto): < ${(estimatedHonestMin * 0.5).toFixed(1)} min`);

  // 5. Tabela detalhada
  console.log('\n' + '=' .repeat(120));
  console.log('📋 DETALHAMENTO POR ALUNO (ordenado por tempo, do mais rápido ao mais lento)');
  console.log('=' .repeat(120));
  console.log(
    'Nome'.padEnd(35) +
    'Tempo'.padStart(8) +
    's/Quest'.padStart(9) +
    'Nota%'.padStart(8) +
    'Certas'.padStart(8) +
    'Erradas'.padStart(8) +
    'TabSwitch'.padStart(10) +
    '  Flags'
  );
  console.log('-'.repeat(120));

  for (const a of attempts) {
    const flags = [];

    // Flag: Muito rápido
    if (a.durationMin < estimatedHonestMin * 0.3) {
      flags.push('🔴 CHUTE');
    } else if (a.durationMin < estimatedHonestMin * 0.5) {
      flags.push('🟡 RÁPIDO');
    }

    // Flag: Muitas trocas de aba
    if (a.tabSwitches >= 5) {
      flags.push('🔴 COLA');
    } else if (a.tabSwitches >= 2) {
      flags.push('🟡 ABAS');
    }

    // Flag: Nota perfeita + muito rápido
    if (a.percentage >= 90 && a.durationMin < avgDuration * 0.5) {
      flags.push('⚠️ GENIO?');
    }

    // Flag: Mais rápido que 2 desvios padrão abaixo da média
    if (a.durationMin < avgDuration - 2 * stdDev && stdDev > 1) {
      flags.push('📉 OUTLIER');
    }

    console.log(
      a.name.substring(0, 34).padEnd(35) +
      `${a.durationMin}m`.padStart(8) +
      `${a.secPerQuestion}s`.padStart(9) +
      `${(a.percentage || 0).toFixed(0)}%`.padStart(8) +
      `${a.correctCount}`.padStart(8) +
      `${a.wrongCount}`.padStart(8) +
      `${a.tabSwitches}`.padStart(10) +
      '  ' + (flags.length > 0 ? flags.join(' ') : '✅')
    );
  }

  // 6. Resumo de suspeitos
  const suspects = attempts.filter(a =>
    a.tabSwitches >= 5 ||
    a.durationMin < estimatedHonestMin * 0.3 ||
    (a.durationMin < avgDuration - 2 * stdDev && stdDev > 1)
  );

  console.log('\n' + '=' .repeat(80));
  if (suspects.length > 0) {
    console.log(`🚨 ALUNOS COM COMPORTAMENTO SUSPEITO: ${suspects.length}`);
    for (const s of suspects) {
      const reasons = [];
      if (s.durationMin < estimatedHonestMin * 0.3) reasons.push(`tempo extremamente curto (${s.durationMin}min)`);
      if (s.tabSwitches >= 5) reasons.push(`${s.tabSwitches} trocas de aba`);
      if (s.durationMin < avgDuration - 2 * stdDev && stdDev > 1) reasons.push('outlier estatístico');
      console.log(`   ⚠️  ${s.name}: ${reasons.join(', ')} — Nota: ${(s.percentage || 0).toFixed(0)}%`);
    }
  } else {
    console.log('✅ Nenhum comportamento claramente suspeito detectado.');
  }
  console.log('=' .repeat(80));

  await prisma.$disconnect();
}

analyze().catch(console.error);
