'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '../../../lib/api';

type ActiveAttempt = {
  attemptId: string;
  startedAt: string;
  studentFullName: string;
  studentToken: string;
  questionnaire: {
    id: string;
    name: string;
    discipline: string;
    category: string;
    description: string | null;
    durationMinutes?: number;
    scheduledDate: string | null;
    questions: Array<{ id: string }>;
  };
};

export default function BoasVindas() {
  const router = useRouter();
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem('qo_active_attempt');
    if (!raw) {
      router.push('/aluno');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ActiveAttempt;
      setAttempt(parsed);
    } catch {
      router.push('/aluno');
    }
  }, [router]);

  const handleStart = async () => {
    if (!attempt) return;
    setIsStarting(true);

    try {
      // Sincronizar início do timer no servidor
      const updated = await postJson<{ startedAt: string }>(
        `/api/v1/student/attempts/${attempt.attemptId}/start-timer`,
        {},
        attempt.studentToken
      );

      // Atualizar localStorage com o novo startedAt
      const newAttempt = { ...attempt, startedAt: updated.startedAt };
      window.localStorage.setItem('qo_active_attempt', JSON.stringify(newAttempt));

      router.push('/aluno/prova');
    } catch (error) {
      console.error('Erro ao iniciar timer:', error);
      // Mesmo com erro, tentamos seguir para não bloquear o aluno
      router.push('/aluno/prova');
    }
  };

  if (!attempt) return null;

  return (
    <div className="welcome-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .welcome-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          padding: 2rem;
          color: white;
          font-family: 'Inter', sans-serif;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          width: 100%;
          max-width: 680px;
          box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.8s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .header {
          text-align: center;
          margin-bottom: 2.5rem;
        }

        .badge {
          display: inline-block;
          padding: 0.5rem 1rem;
          background: rgba(59, 130, 246, 0.1);
          color: #60a5fa;
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 1rem;
          border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .title {
          font-size: 2.25rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
          background: linear-gradient(to right, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .subtitle {
          color: #94a3b8;
          font-size: 1.1rem;
        }

        .instructions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .info-box {
          background: rgba(255, 255, 255, 0.05);
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .info-label {
          display: block;
          color: #64748b;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
          font-weight: 700;
        }

        .info-value {
          font-size: 1.25rem;
          font-weight: 600;
          color: #f1f5f9;
        }

        .description {
          background: rgba(37, 99, 235, 0.05);
          border-left: 4px solid #3b82f6;
          padding: 1.5rem;
          border-radius: 0 16px 16px 0;
          margin-bottom: 2.5rem;
          line-height: 1.6;
          color: #cbd5e1;
        }

        .start-btn {
          width: 100%;
          padding: 1.25rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.1rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
        }

        .start-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 20px 30px -10px rgba(59, 130, 246, 0.5);
        }

        .start-btn:active {
          transform: translateY(0);
        }

        .footer-note {
          text-align: center;
          margin-top: 1.5rem;
          color: #64748b;
          font-size: 0.875rem;
        }

        @media (max-width: 640px) {
          .instructions-grid {
            grid-template-columns: 1fr;
          }
          .glass-card {
            padding: 2rem;
          }
        }
      `}} />

      <div className="glass-card">
        <div className="header">
          <span className="badge">{attempt.questionnaire.category}</span>
          <h1 className="title">Bem-vindo, {attempt.studentFullName.split(' ')[0]}!</h1>
          <p className="subtitle">Você está prestes a iniciar sua avaliação de <strong>{attempt.questionnaire.discipline}</strong>.</p>
        </div>

        <div className="instructions-grid">
          <div className="info-box">
            <span className="info-label">Duração</span>
            <span className="info-value">{attempt.questionnaire.durationMinutes || '60'} minutos</span>
          </div>
          <div className="info-box">
            <span className="info-label">Questões</span>
            <span className="info-value">{attempt.questionnaire.questions.length} itens</span>
          </div>
          {attempt.questionnaire.scheduledDate && (
            <div className="info-box" style={{ gridColumn: 'span 2' }}>
              <span className="info-label">Data da Avaliação</span>
              <span className="info-value">📅 {attempt.questionnaire.scheduledDate.split('T')[0].split('-').reverse().join('/')}</span>
            </div>
          )}
        </div>

        <div className="description">
          <span className="info-label" style={{ color: '#3b82f6' }}>Instruções</span>
          {attempt.questionnaire.description || 'Leia cada questão com atenção. Uma vez iniciada, a prova deve ser concluída sem interrupções. O progresso é salvo automaticamente ao navegar entre as questões.'}
        </div>

        <button 
          className="start-btn" 
          onClick={handleStart}
          disabled={isStarting}
        >
          <span>{isStarting ? 'Iniciando...' : 'Iniciar Prova Agora'}</span>
          {!isStarting && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          )}
        </button>

        <p className="footer-note">
          Ao clicar em iniciar, o cronômetro começará a contar. Boa sorte!
        </p>
      </div>
    </div>
  );
}
