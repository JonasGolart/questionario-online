'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type ResultData = {
  studentFullName: string;
  questionnaireName: string;
  totalQuestions: number;
  score: number;
  percentage: number;
  feedback: string;
  weakTopics: Array<{ topic: string; percentage: number }>;
  tabSwitches: number;
  correctAnswers: Array<{
    questionId: string;
    statement: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
    topic: string;
  }>;
};

export default function ResultadoProva() {
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    const raw = window.localStorage.getItem('qo_last_result');
    if (!raw) return;

    try {
      setResult(JSON.parse(raw) as ResultData);
    } catch {
      setResult(null);
    }
  }, []);

  const correctCount = useMemo(() => {
    if (!result) return 0;
    return result.correctAnswers.filter((item) => item.isCorrect).length;
  }, [result]);

  if (!result) {
    return (
      <div style={{ padding: '4rem 2rem', textAlign: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card" style={{ maxWidth: '400px' }}>
          <h2 style={{ marginBottom: '1rem' }}>Ops!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Nenhum resultado encontrado para exibir.</p>
          <Link href="/aluno" className="btn-primary" style={{ display: 'inline-block' }}>
            Voltar ao portal
          </Link>
        </div>
      </div>
    );
  }

  const isApproved = result.percentage >= 70;

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', minHeight: '100vh' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .stat-circle {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          border: 4px solid var(--border);
          margin: 0 auto 1rem;
        }
        .topic-tag {
          padding: 0.5rem 1rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(239, 68, 68, 0.05);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.1);
        }
        .gabarito-item {
          padding: 1.5rem;
          border-radius: 16px;
          border: 1px solid var(--border);
          background: var(--bg-main);
          transition: transform 0.2s ease;
        }
        .gabarito-item:hover {
          transform: translateX(4px);
          border-color: var(--primary);
        }
        .status-badge {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 700;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
      `}} />

      <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <div style={{ 
          display: 'inline-block', 
          padding: '1rem', 
          backgroundColor: isApproved ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          borderRadius: '24px',
          marginBottom: '1.5rem'
        }}>
          {isApproved ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
        </div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Avaliação Concluída!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          {result.questionnaireName} • <strong>{result.studentFullName}</strong>
        </p>
      </div>

      {result.tabSwitches > 0 && (
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '2px solid #ef4444', 
          borderRadius: '16px', 
          padding: '1.5rem', 
          marginBottom: '3rem', 
          textAlign: 'center',
          animation: 'pulse 2s infinite'
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.02); }
              100% { transform: scale(1); }
            }
          `}} />
          <p style={{ color: '#ef4444', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>
            ⚠️ Que coisa feia, abriu outras abas durante a avaliação!
          </p>
          <p style={{ color: '#7f1d1d', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Detectamos <strong>{result.tabSwitches}</strong> interrupções de foco. Isso foi registrado no seu relatório.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div className="stat-circle" style={{ borderColor: isApproved ? '#16a34a' : 'var(--error)' }}>
            <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{result.percentage}%</span>
          </div>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Aproveitamento</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Sua nota final baseada nos pesos das questões.</p>
        </div>

        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Feedback do Professor
          </h3>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: '1.05rem', fontStyle: 'italic' }}>
            &ldquo;{result.feedback}&rdquo;
          </p>
          
          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Questões</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{correctCount} / {result.totalQuestions}</span>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Status</span>
              <span className="status-badge" style={{ 
                backgroundColor: isApproved ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                color: isApproved ? '#16a34a' : '#ef4444'
              }}>
                {isApproved ? 'Aprovado' : 'Revisão Necessária'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {result.weakTopics.length > 0 && (
        <div className="card" style={{ marginBottom: '3rem', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Tópicos para Reforço
          </h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Identificamos que você teve maior dificuldade nos seguintes temas:</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {result.weakTopics.map((topic) => (
              <div key={topic.topic} className="topic-tag">
                <span>{topic.topic}</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>{topic.percentage}% acerto</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: '4rem' }}>
        <h3 style={{ marginBottom: '2rem', color: 'var(--text-primary)', textAlign: 'center' }}>Gabarito e Revisão</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {result.correctAnswers.map((item, idx) => (
            <div key={item.questionId} className="gabarito-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--primary)' }}>QUESTÃO {idx + 1}</span>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 700, 
                  color: item.isCorrect ? '#16a34a' : '#ef4444',
                  backgroundColor: item.isCorrect ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '6px'
                }}>
                  {item.isCorrect ? 'CORRETA' : 'INCORRETA'}
                </span>
              </div>
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '1.5rem', lineHeight: 1.5 }}>{item.statement}</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border)' }}>
                  <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>SUA RESPOSTA</span>
                  <span style={{ color: item.isCorrect ? '#16a34a' : '#ef4444', fontWeight: 700 }}>{item.selectedAnswer || '(Em branco)'}</span>
                </div>
                {!item.isCorrect && (
                  <div style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(22, 163, 74, 0.05)', border: '1px solid rgba(22, 163, 74, 0.1)' }}>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#16a34a', fontWeight: 700, marginBottom: '0.25rem' }}>GABARITO</span>
                    <span style={{ color: '#16a34a', fontWeight: 700 }}>{item.correctAnswer}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', paddingBottom: '4rem' }}>
        <Link href="/" className="btn-primary" style={{ padding: '1.25rem 3rem', borderRadius: '16px' }}>
          Voltar para a Página Inicial
        </Link>
      </div>
    </div>
  );
}
