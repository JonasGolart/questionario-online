'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson, patchJson } from '../../../lib/api';

type ActiveAttempt = {
  attemptId: string;
  startedAt: string;
  serverTime?: string;
  studentFullName: string;
  studentToken: string;
  savedAnswers?: Array<{ questionId: string; value: string }>;
  questionnaire: {
    id: string;
    name: string;
    discipline: string;
    category: string;
    durationMinutes?: number;
    shuffleQuestions: boolean;
    questions: Array<{
      id: string;
      type?: "MULTIPLE_CHOICE" | "ESSAY";
      statement: string;
      imageUrl?: string | null;
      options?: string[];
      position: number;
      weight: number;
    }>;
  };
};

type SubmitResponse = {
  score: number;
  percentage: number;
  feedback: string;
  weakTopics: Array<{ topic: string; percentage: number }>;
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

export default function TelaProva() {
  const router = useRouter();
  const [attempt, setAttempt] = useState<ActiveAttempt | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [status, setStatus] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const clockOffsetRef = useRef(0);
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const warningCountRef = useRef(0);

  useEffect(() => {
    setIsMounted(true);
    const raw = window.localStorage.getItem('qo_active_attempt');
    if (!raw) {
      router.push('/aluno');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ActiveAttempt;
      console.log('Dados da tentativa:', parsed);
      
      setAttempt(parsed);
      
      // Carregar respostas salvas para retomada
      if (parsed.savedAnswers) {
        const initialAnswers: Record<string, string> = {};
        parsed.savedAnswers.forEach(a => {
          initialAnswers[a.questionId] = a.value;
        });
        setAnswers(initialAnswers);
        setLastSavedAnswers(initialAnswers);
        console.log('[DEBUG] Respostas recuperadas do servidor:', Object.keys(initialAnswers).length);
      }
      
      // Inicializar timer persistente com compensação de relógio (Server-side drift protection)
      const duration = parsed.questionnaire.durationMinutes;
      const startedAt = parsed.startedAt;
      const serverTimeStr = parsed.serverTime;

      if (duration && duration > 0 && startedAt) {
        const start = new Date(startedAt).getTime();
        const durationMs = duration * 60 * 1000;
        
        // Calcular offset se tivermos o tempo do servidor
        let clockOffset = 0;
        if (serverTimeStr) {
          const serverTime = new Date(serverTimeStr).getTime();
          clockOffset = serverTime - Date.now();
          clockOffsetRef.current = clockOffset;
          console.log(`[DEBUG] Clock Offset detectado: ${clockOffset}ms`);
        }

        const nowAdjusted = Date.now() + clockOffset;
        const remaining = Math.max(0, Math.floor((start + durationMs - nowAdjusted) / 1000));
        
        console.log('Timer calculado com offset:', { start, durationMs, nowAdjusted, remaining });
        setTimeLeft(remaining);
      } else {
        console.warn('Prova sem duração definida ou não iniciada no servidor.');
        if (!startedAt) setTimeLeft(null);
      }
    } catch (err) {
      console.error('Erro ao processar tentativa:', err);
      router.push('/aluno');
    }
  }, [router]);

  const handleSubmit = useCallback(async () => {
    if (!attempt) return;
    setStatus('Enviando respostas...');

    try {
      const payload = {
        attemptId: attempt.attemptId,
        answers: attempt.questionnaire.questions.map((item) => ({
          questionId: item.id,
          answer: answers[item.id] ?? ''
        }))
      };

      const result = await postJson<SubmitResponse>('/api/v1/student/submit', payload, attempt.studentToken);
      window.localStorage.setItem(
        'qo_last_result',
        JSON.stringify({
          studentFullName: attempt.studentFullName,
          questionnaireName: attempt.questionnaire.name,
          totalQuestions: attempt.questionnaire.questions.length,
          ...result
        })
      );
      window.localStorage.removeItem('qo_active_attempt');
      router.push('/aluno/resultado');
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'EXAM_TIME_EXPIRED') {
          setStatus('O tempo da prova expirou. Suas respostas não foram aceitas pelo servidor.');
        } else {
          setStatus(`Falha no envio: ${error.message}`);
        }
      } else {
        setStatus('Falha inesperada no envio.');
      }
    }
  }, [answers, attempt, router]);

  // Lógica do Timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) {
        handleSubmit(); // Auto-submit
      }
      return;
    }

    const timer = setInterval(() => {
      if (!attempt || !attempt.startedAt || !attempt.questionnaire.durationMinutes) return;
      
      const start = new Date(attempt.startedAt).getTime();
      const durationMs = attempt.questionnaire.durationMinutes * 60 * 1000;

      const nowAdjusted = Date.now() + clockOffsetRef.current;
      const remaining = Math.max(0, Math.floor((start + durationMs - nowAdjusted) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        clearInterval(timer);
        handleSubmit(); // Auto-submit
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [handleSubmit, attempt, timeLeft]);

  // Salvamento Automático (Persistência)
  const [lastSavedAnswers, setLastSavedAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!attempt) return;

    const saveChanges = async () => {
      // Identificar TODAS as respostas que mudaram
      const changedIds = Object.keys(answers).filter(id => answers[id] !== lastSavedAnswers[id]);
      
      for (const questionId of changedIds) {
        const answerValue = answers[questionId];
        try {
          await postJson('/api/v1/student/save-answer', {
            attemptId: attempt.attemptId,
            questionId,
            answer: answerValue
          }, attempt.studentToken);
          
          setLastSavedAnswers(prev => ({ ...prev, [questionId]: answerValue }));
          console.log(`[AUTO-SAVE] Resposta salva para questão ${questionId}`);
        } catch (err) {
          console.error('[AUTO-SAVE] Erro ao salvar resposta:', err);
        }
      }
    };

    const timeout = setTimeout(saveChanges, 1000); // Debounce de 1s
    return () => clearTimeout(timeout);
  }, [answers, attempt, lastSavedAnswers]);

  // Monitoramento de troca de abas / perda de foco — SISTEMA DE ADVERTÊNCIAS
  useEffect(() => {
    if (!attempt) return;

    const handleCheatingAttempt = async () => {
      // Registrar no servidor
      try {
        await patchJson(`/api/v1/student/attempts/${attempt.attemptId}/tab-switch`, {}, attempt.studentToken);
      } catch (err) {
        console.error('Erro ao registrar troca de aba:', err);
      }

      // Incrementar advertências
      const newCount = warningCountRef.current + 1;
      warningCountRef.current = newCount;
      setWarningCount(newCount);

      if (newCount >= 2) {
        // SEGUNDA ADVERTÊNCIA: encerrar prova automaticamente
        setAutoSubmitted(true);
        setShowWarning(true);
        // Aguardar 3 segundos para o aluno ver a mensagem, depois enviar
        setTimeout(() => {
          handleSubmit();
        }, 3000);
      } else {
        // PRIMEIRA ADVERTÊNCIA: exibir modal de alerta
        setShowWarning(true);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleCheatingAttempt();
      }
    };

    const onBlur = () => {
      handleCheatingAttempt();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [attempt, handleSubmit]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const question = useMemo(() => {
    if (!attempt) {
      return null;
    }
    return attempt.questionnaire.questions[currentQuestion] ?? null;
  }, [attempt, currentQuestion]);

  if (!isMounted || !attempt || !question) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(59, 130, 246, 0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Carregando sua avaliação...</p>
          <style dangerouslySetInnerHTML={{ __html: `@keyframes spin { to { transform: rotate(360deg); } }` }} />
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / attempt.questionnaire.questions.length) * 100;

  const handleNext = () => {
    if (currentQuestion < attempt.questionnaire.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setShowConfirm(true);
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div style={{ padding: '1rem', maxWidth: '900px', margin: '0 auto', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header Fixo/Superior Melhorado */}
      <div style={{ 
        marginBottom: '1.5rem', 
        paddingBottom: '1rem', 
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-main)',
        zIndex: 10,
        marginTop: '-1rem',
        paddingTop: '1rem'
      }} className="exam-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center', gap: '1rem' }} className="header-top">
          <div style={{ flex: 1 }}>
            <h2 style={{ color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }} className="exam-name">
              {attempt.questionnaire.name}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
              <span style={{ padding: '0.1rem 0.4rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '4px', fontWeight: 600, fontSize: '0.7rem' }}>
                {attempt.questionnaire.discipline}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>• Q{currentQuestion + 1}/{attempt.questionnaire.questions.length}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {timeLeft !== null && (
              <div style={{ 
                padding: '0.4rem 0.8rem', 
                backgroundColor: timeLeft < 300 ? '#fef2f2' : '#eff6ff',
                borderRadius: '10px',
                border: '1px solid',
                borderColor: timeLeft < 300 ? '#fecaca' : '#bfdbfe',
                textAlign: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                minWidth: '90px'
              }}>
                <span style={{ 
                  display: 'block', 
                  color: timeLeft < 300 ? '#ef4444' : '#2563eb', 
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  fontFamily: 'monospace',
                  lineHeight: 1
                }}>
                  {formatTime(timeLeft)}
                </span>
                <span style={{ color: timeLeft < 300 ? '#991b1b' : '#1e40af', fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase' }}>
                  Tempo
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.4s ease' }} />
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media (max-width: 640px) {
          .exam-header {
            padding-bottom: 0.75rem !important;
          }
          .exam-name {
            font-size: 1.1rem !important;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 180px;
          }
          .header-top {
            gap: 0.5rem !important;
          }
        }
      `}} />

      {!showConfirm ? (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginBottom: '1.5rem' }}>
            Questão {currentQuestion + 1}
          </h3>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginBottom: '2rem', lineHeight: 1.5 }}>{question.statement}</p>
          {question.imageUrl && (
            <div style={{ marginBottom: '1.5rem' }}>
              <img
                src={question.imageUrl}
                alt={`Imagem da questão ${currentQuestion + 1}`}
                style={{ maxWidth: '100%', maxHeight: '340px', borderRadius: '10px', border: '1px solid var(--border)' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
            {question.type === 'ESSAY' || !question.options || question.options.length === 0 ? (
              // Questão discursiva / resposta aberta
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Sua resposta:
                </label>
                <textarea
                  value={answers[question.id] || ''}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [question.id]: e.target.value }))}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '1rem',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    color: 'var(--text-primary)',
                    backgroundColor: 'var(--bg-main)',
                    resize: 'vertical'
                  }}
                  placeholder="Digite sua resposta aqui..."
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  Esta é uma questão discursiva. Sua resposta será revisada pelo professor.
                </p>
              </div>
            ) : (
              // Múltipla escolha
              question.options.map((option) => {
                const isSelected = answers[question.id] === option;
                return (
                  <label
                    key={option}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-main)'
                    }}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      checked={isSelected}
                      onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: option }))}
                      style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }}
                    />
                    <span style={{ color: 'var(--text-primary)', fontWeight: isSelected ? 500 : 400 }}>{option}</span>
                  </label>
                );
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={handlePrev}
              disabled={currentQuestion === 0}
              className="btn-primary"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                opacity: currentQuestion === 0 ? 0.5 : 1,
                cursor: currentQuestion === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              Anterior
            </button>
            <button onClick={handleNext} className="btn-primary">
              {currentQuestion === attempt.questionnaire.questions.length - 1 ? 'Finalizar Prova' : 'Próxima'}
            </button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Confirmar Entrega</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', maxWidth: '420px' }}>
            Você respondeu <strong>{answeredCount}</strong> de <strong>{attempt.questionnaire.questions.length}</strong> questões.
            Ao enviar, o token será finalizado e não poderá ser reutilizado.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => setShowConfirm(false)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
              Voltar para Revisão
            </button>
            <button onClick={handleSubmit} className="btn-primary" style={{ backgroundColor: 'var(--error)' }}>
              Sim, Entregar Prova
            </button>
          </div>
          {status ? <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>{status}</p> : null}
        </div>
      )}

      {/* Grade de Navegação de Questões */}
      {!showConfirm && (
        <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
          {attempt.questionnaire.questions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = currentQuestion === idx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestion(idx)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid',
                  borderColor: isCurrent ? 'var(--primary)' : 'var(--border)',
                  backgroundColor: isCurrent ? 'var(--primary)' : (isAnswered ? 'rgba(37, 99, 235, 0.1)' : 'transparent'),
                  color: isCurrent ? 'white' : (isAnswered ? 'var(--primary)' : 'var(--text-secondary)'),
                  fontSize: '0.875rem',
                  fontWeight: (isCurrent || isAnswered) ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* OVERLAY DE ADVERTÊNCIA ANTI-COLA */}
      {showWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          animation: 'fadeIn 0.3s ease'
        }}>
          <div style={{
            backgroundColor: autoSubmitted ? '#1a1a2e' : '#1a1a2e',
            border: `2px solid ${autoSubmitted ? '#ef4444' : '#f59e0b'}`,
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '500px',
            textAlign: 'center',
            boxShadow: `0 0 60px ${autoSubmitted ? 'rgba(239, 68, 68, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
          }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              {autoSubmitted ? '🚫' : '⚠️'}
            </div>
            <h2 style={{
              color: autoSubmitted ? '#ef4444' : '#f59e0b',
              fontSize: '1.5rem',
              fontWeight: 800,
              marginBottom: '1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {autoSubmitted ? 'PROVA ENCERRADA' : 'ADVERTÊNCIA'}
            </h2>

            {autoSubmitted ? (
              <>
                <p style={{ color: '#f87171', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                  Você saiu da aba da avaliação pela <strong>segunda vez</strong>.
                </p>
                <p style={{ color: '#fca5a5', fontSize: '1rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                  Sua prova está sendo <strong>enviada automaticamente</strong> com as respostas feitas até este momento.
                  Esta ação foi registrada e será reportada ao professor.
                </p>
                <div style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}>
                  <span style={{ color: '#fca5a5', fontSize: '0.875rem' }}>
                    Enviando em instantes...
                  </span>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: '#fcd34d', fontSize: '1.1rem', marginBottom: '1rem', lineHeight: 1.6 }}>
                  Foi detectado que você <strong>saiu da aba da avaliação</strong>.
                </p>
                <p style={{ color: '#d4d4d8', fontSize: '0.95rem', marginBottom: '0.75rem', lineHeight: 1.6 }}>
                  Durante a prova, é <strong>proibido</strong> acessar outras abas, janelas ou aplicativos.
                  Mantenha o foco exclusivamente nesta avaliação.
                </p>
                <div style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  marginBottom: '1.5rem'
                }}>
                  <p style={{ color: '#f87171', fontSize: '0.9rem', fontWeight: 700, margin: 0 }}>
                    ⚠️ Advertência {warningCount} de 2 — Na próxima, sua prova será encerrada e enviada automaticamente.
                  </p>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  style={{
                    padding: '0.75rem 2rem',
                    backgroundColor: '#f59e0b',
                    color: '#1a1a2e',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  Entendi, voltar à prova
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}
