import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function analyzeRealKnowledge() {
  const questionnaire = await prisma.questionnaire.findFirst({
    where: { name: { contains: 'CA', mode: 'insensitive' } },
    include: {
      tokens: {
        include: {
          attempt: {
            include: { answers: true }
          }
        }
      }
    }
  });

  if (!questionnaire) { console.log('Não encontrado'); return; }

  const attempts = questionnaire.tokens
    .filter(t => t.attempt?.finishedAt && t.attempt.studentFullName !== 'Aluno de Teste')
    .map(t => {
      const a = t.attempt;
      const started = a.startedAt ? new Date(a.startedAt) : new Date(a.createdAt);
      const finished = new Date(a.finishedAt);
      const durationMin = (finished - started) / 60000;
      const totalQ = a.selectedQuestionIds.length || 20;
      const correct = a.answers.filter(ans => ans.isCorrect).length;

      return {
        name: a.studentFullName,
        durationMin,
        totalQ,
        correct,
        wrong: totalQ - correct,
        percentage: a.percentage || 0,
        tabSwitches: a.tabSwitches,
        secPerQuestion: (durationMin * 60) / totalQ
      };
    });

  // ── MODELO DE ESTIMATIVA DE CONHECIMENTO REAL ──
  // 
  // Premissas:
  // 1. ~2 trocas de aba são "ruído" (notificações, clique acidental)
  // 2. Cada consulta real requer ~2 trocas (ir + voltar)
  // 3. Cada consulta corresponde a ~1 questão respondida com ajuda externa
  // 4. "Alunos limpos" (0-1 abas) servem como baseline do comportamento honesto
  //
  // Fórmula:
  //   estimatedLookups = max(0, (tabSwitches - 2)) / 2
  //   questionsWithHelp = min(estimatedLookups, correct)
  //   questionsWithOwnKnowledge = max(0, correct - questionsWithHelp)
  //   realKnowledge% = (questionsWithOwnKnowledge / totalQ) × 100
  //
  // AJUSTE TEMPORAL:
  //   Se o aluno foi muito rápido (< 30s/questão média), mesmo questões sem
  //   troca de aba podem ter sido chutadas. Aplicamos um fator de confiança
  //   temporal: timeConfidence = min(1, secPerQuestion / 45)
  //   (45s/questão = tempo mínimo para leitura + raciocínio em MC)

  const NOISE_SWITCHES = 2;
  const SWITCHES_PER_LOOKUP = 2;
  const MIN_SEC_PER_Q = 45; // segundos para ler e pensar honestamente

  console.log('=' .repeat(100));
  console.log('🧠 ANÁLISE DE CONHECIMENTO REAL — Avaliação 1 de CA');
  console.log('=' .repeat(100));

  // Baseline: alunos limpos
  const cleanStudents = attempts.filter(a => a.tabSwitches <= 1);
  const cleanAvgScore = cleanStudents.reduce((s, a) => s + a.percentage, 0) / cleanStudents.length;
  const cleanAvgTime = cleanStudents.reduce((s, a) => s + a.durationMin, 0) / cleanStudents.length;

  console.log('\n📏 BASELINE (Alunos com 0-1 trocas de aba):');
  console.log(`   Quantidade: ${cleanStudents.length}`);
  console.log(`   Nota média: ${cleanAvgScore.toFixed(1)}%`);
  console.log(`   Tempo médio: ${cleanAvgTime.toFixed(1)} min`);
  console.log(`   → Estes alunos representam o "teto" de conhecimento genuíno.`);

  console.log('\n' + '─'.repeat(100));
  console.log(
    'Aluno'.padEnd(35) +
    'Nota'.padStart(6) +
    'Abas'.padStart(6) +
    'Lookups'.padStart(9) +
    'Q.Ajuda'.padStart(9) +
    'Q.Sabe'.padStart(8) +
    'Tempo/Q'.padStart(9) +
    'ConfTemp'.padStart(9) +
    'REAL%'.padStart(8) +
    'Delta'.padStart(8)
  );
  console.log('─'.repeat(100));

  const results = attempts.map(a => {
    // Estimativa de consultas
    const estimatedLookups = Math.max(0, (a.tabSwitches - NOISE_SWITCHES)) / SWITCHES_PER_LOOKUP;
    const questionsWithHelp = Math.min(Math.round(estimatedLookups), a.correct);
    const questionsOwnKnowledge = Math.max(0, a.correct - questionsWithHelp);

    // Fator de confiança temporal
    const timeConfidence = Math.min(1, a.secPerQuestion / MIN_SEC_PER_Q);

    // Conhecimento real ajustado
    const rawRealPct = (questionsOwnKnowledge / a.totalQ) * 100;
    const adjustedRealPct = rawRealPct * timeConfidence;

    return {
      ...a,
      estimatedLookups: Math.round(estimatedLookups),
      questionsWithHelp,
      questionsOwnKnowledge,
      timeConfidence,
      realPct: Math.round(adjustedRealPct),
      delta: Math.round(a.percentage - adjustedRealPct)
    };
  }).sort((a, b) => b.delta - a.delta); // Ordenar pelo maior delta (quem mais "inflou" a nota)

  for (const r of results) {
    const bar = r.delta > 30 ? '🔴' : r.delta > 15 ? '🟡' : '✅';
    console.log(
      r.name.substring(0, 34).padEnd(35) +
      `${r.percentage.toFixed(0)}%`.padStart(6) +
      `${r.tabSwitches}`.padStart(6) +
      `~${r.estimatedLookups}`.padStart(9) +
      `${r.questionsWithHelp}`.padStart(9) +
      `${r.questionsOwnKnowledge}`.padStart(8) +
      `${r.secPerQuestion.toFixed(0)}s`.padStart(9) +
      `${(r.timeConfidence * 100).toFixed(0)}%`.padStart(9) +
      `${r.realPct}%`.padStart(8) +
      `  -${r.delta}pp ${bar}`.padStart(12)
    );
  }

  // Resumo estatístico
  const avgInflation = results.reduce((s, r) => s + r.delta, 0) / results.length;
  const avgReal = results.reduce((s, r) => s + r.realPct, 0) / results.length;
  const maxInflation = results[0];

  console.log('\n' + '=' .repeat(100));
  console.log('📊 RESUMO ESTATÍSTICO');
  console.log(`   Nota média oficial:   ${(results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(1)}%`);
  console.log(`   Nota média REAL est.: ${avgReal.toFixed(1)}%`);
  console.log(`   Inflação média:       ${avgInflation.toFixed(1)} pontos percentuais`);
  console.log(`   Maior inflação:       ${maxInflation.name} (${maxInflation.percentage}% → ${maxInflation.realPct}%, Δ=${maxInflation.delta}pp)`);

  // Faixas de conhecimento real
  const faixas = {
    'Sabe muito (≥80%)': results.filter(r => r.realPct >= 80).length,
    'Sabe razoável (50-79%)': results.filter(r => r.realPct >= 50 && r.realPct < 80).length,
    'Sabe pouco (25-49%)': results.filter(r => r.realPct >= 25 && r.realPct < 50).length,
    'Não sabe (<25%)': results.filter(r => r.realPct < 25).length,
  };

  console.log('\n📈 DISTRIBUIÇÃO DE CONHECIMENTO REAL:');
  for (const [faixa, count] of Object.entries(faixas)) {
    const bar = '█'.repeat(count);
    console.log(`   ${faixa.padEnd(25)} ${count.toString().padStart(2)} alunos  ${bar}`);
  }

  console.log('\n💡 INSIGHT: Se a turma fizesse esta prova SEM consulta,');
  console.log(`   a nota média cairia de ~${(results.reduce((s, r) => s + r.percentage, 0) / results.length).toFixed(0)}% para ~${avgReal.toFixed(0)}%.`);
  console.log('=' .repeat(100));

  await prisma.$disconnect();
}

analyzeRealKnowledge().catch(console.error);
