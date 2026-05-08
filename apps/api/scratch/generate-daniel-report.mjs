// Gerar relatório HTML do Daniel (para salvar como PDF no navegador)
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const report = {
  student: 'Daniel Fernandes Barbosa',
  token: 'ALUNO-KVGRNG',
  questionnaire: 'Avaliação 1 de CA',
  score: 18,
  totalQuestions: 20,
  percentage: (18 / 20 * 100).toFixed(1),
  status: 'Finalizada',
  deletedAt: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  reason: 'Reset acidental do token durante troubleshooting de rate-limit (HTTP 429) para outro aluno (Guilherme Bassetti Tomaz).'
};

const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Relatório de Nota - ${report.student}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8fafc;
      color: #1e293b;
      padding: 2rem;
    }

    .container {
      max-width: 700px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: white;
      padding: 2rem 2.5rem;
    }

    .header h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .header p {
      font-size: 0.9rem;
      opacity: 0.85;
    }

    .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 0.25rem 0.75rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      margin-top: 0.75rem;
      letter-spacing: 0.5px;
    }

    .content {
      padding: 2rem 2.5rem;
    }

    .score-section {
      text-align: center;
      padding: 2rem 0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 1.5rem;
    }

    .score-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981, #059669);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
    }

    .score-value {
      color: white;
      font-size: 2.5rem;
      font-weight: 700;
    }

    .score-label {
      font-size: 0.875rem;
      color: #64748b;
      font-weight: 500;
    }

    .score-percentage {
      font-size: 1.25rem;
      font-weight: 600;
      color: #10b981;
      margin-top: 0.25rem;
    }

    .details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .detail-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 1rem;
    }

    .detail-label {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 0.25rem;
    }

    .detail-value {
      font-size: 0.95rem;
      font-weight: 500;
      color: #1e293b;
    }

    .warning-box {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-left: 4px solid #f59e0b;
      border-radius: 8px;
      padding: 1rem 1.25rem;
      margin-top: 1.5rem;
    }

    .warning-title {
      font-size: 0.875rem;
      font-weight: 600;
      color: #92400e;
      margin-bottom: 0.25rem;
    }

    .warning-text {
      font-size: 0.8rem;
      color: #78350f;
      line-height: 1.5;
    }

    .footer {
      background: #f1f5f9;
      padding: 1rem 2.5rem;
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
    }

    @media print {
      body { padding: 0; background: white; }
      .container { box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 Relatório de Nota Recuperada</h1>
      <p>Registro oficial da nota do aluno após incidente de reset de token</p>
      <div class="badge">DOCUMENTO DE REFERÊNCIA</div>
    </div>

    <div class="content">
      <div class="score-section">
        <div class="score-circle">
          <span class="score-value">${report.score}</span>
        </div>
        <div class="score-label">de ${report.totalQuestions} questões</div>
        <div class="score-percentage">${report.percentage}% de aproveitamento</div>
      </div>

      <div class="details">
        <div class="detail-card">
          <div class="detail-label">Aluno</div>
          <div class="detail-value">${report.student}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Token</div>
          <div class="detail-value" style="font-family: monospace;">${report.token}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Avaliação</div>
          <div class="detail-value">${report.questionnaire}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Status</div>
          <div class="detail-value" style="color: #10b981;">✅ ${report.status}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Nota</div>
          <div class="detail-value" style="font-size: 1.25rem; font-weight: 700;">${report.score} / ${report.totalQuestions}</div>
        </div>
        <div class="detail-card">
          <div class="detail-label">Respostas</div>
          <div class="detail-value">${report.totalQuestions} de ${report.totalQuestions}</div>
        </div>
      </div>

      <div class="warning-box">
        <div class="warning-title">⚠️ Nota sobre incidente</div>
        <div class="warning-text">
          A tentativa original do aluno foi removida do banco de dados em <strong>${report.deletedAt}</strong>.<br>
          <strong>Motivo:</strong> ${report.reason}<br><br>
          Este documento serve como registro oficial da nota do aluno. O token <code>${report.token}</code> foi resetado e está disponível para o Daniel refazer a prova, caso o professor julgue necessário.
        </div>
      </div>
    </div>

    <div class="footer">
      Gerado automaticamente pelo Sistema de Avaliações • StackFab &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>`;

const outputPath = resolve(__dirname, '..', '..', '..', 'relatorio_daniel_fernandes.html');
writeFileSync(outputPath, html, 'utf-8');
console.log(`✅ Relatório salvo em: ${outputPath}`);
console.log('   Abra no navegador e use Ctrl+P para salvar como PDF.');
