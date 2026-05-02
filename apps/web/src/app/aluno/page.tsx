'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '../../lib/api';

type StartResponse = {
  attemptId: string;
  studentToken: string;
  startedAt: string;
  questionnaire: {
    id: string;
    name: string;
    discipline: string;
    category: string;
    description: string | null;
    durationMinutes?: number;
    shuffleQuestions: boolean;
    questions: Array<{
      id: string;
      statement: string;
      imageUrl?: string | null;
      options: string[];
      position: number;
      weight: number;
    }>;
  };
};

export default function AlunoEntrada() {
  const [token, setToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const response = await postJson<StartResponse>('/api/v1/student/start', {
        token: token.trim().toUpperCase(),
        studentFullName: fullName.trim()
      });

      window.localStorage.setItem(
        'qo_active_attempt',
        JSON.stringify({
          attemptId: response.attemptId,
          studentToken: response.studentToken,
          startedAt: response.startedAt,
          studentFullName: fullName.trim(),
          questionnaire: response.questionnaire
        })
      );

      router.push('/aluno/boas-vindas');
    } catch (error) {
      if (error instanceof Error) {
        const map: Record<string, string> = {
          TOKEN_INVALID: 'Token inválido. Verifique o código e tente novamente.',
          TOKEN_EXPIRED: 'Token expirado. O prazo para realização desta prova encerrou.',
          TOKEN_ALREADY_USED: 'Token já utilizado. Você já realizou esta prova anteriormente.',
          TOKEN_BOUND_TO_OTHER_STUDENT: 'O nome informado é diferente do nome vinculado a este token.',
          QUESTIONNAIRE_NOT_PUBLISHED: 'Esta avaliação ainda não está publicada pelo professor.',
          NOT_SCHEDULED_FOR_TODAY: 'Esta avaliação está agendada para outra data. Verifique o cronograma.',
          STUDENT_NAME_INVALID: 'Informe seu nome completo corretamente.'
        };
        setErrorMsg(map[error.message] ?? `Falha ao iniciar: ${error.message}`);
      } else {
        setErrorMsg('Falha inesperada ao iniciar o questionário.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <style dangerouslySetInnerHTML={{ __html: `
        .login-container {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(-45deg, #0f172a, #1e293b, #3b82f6, #0f172a);
          background-size: 400% 400%;
          animation: gradientBG 15s ease infinite;
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }

        .login-container::before {
          content: "";
          position: absolute;
          width: 200vw;
          height: 200vh;
          background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(0,0,0,0) 70%);
          top: -50%;
          left: -50%;
          animation: rotateBg 30s linear infinite;
        }

        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes rotateBg {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes floatIn {
          0% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border-radius: 16px;
          padding: 2.5rem;
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 10;
          animation: floatIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          color: white;
        }

        @media (prefers-color-scheme: light) {
          .login-container {
            background: linear-gradient(-45deg, #f8fafc, #e2e8f0, #93c5fd, #f8fafc);
            background-size: 400% 400%;
          }
          .glass-card {
            background: rgba(255, 255, 255, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.5);
            box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
            color: #1e293b;
          }
          .custom-input {
            background: rgba(255, 255, 255, 0.9) !important;
            border: 1px solid #cbd5e1 !important;
            color: #1e293b !important;
          }
          .custom-input:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1) !important;
          }
          .alert-box {
            background: rgba(239, 68, 68, 0.1) !important;
            color: #ef4444 !important;
          }
          .warning-box {
            background: rgba(245, 158, 11, 0.1) !important;
            color: #b45309 !important;
          }
          .login-container::before {
            background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, rgba(255,255,255,0) 70%);
          }
        }

        .title-container {
          text-align: center;
          margin-bottom: 2rem;
        }

        .title {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          letter-spacing: -0.025em;
        }

        .subtitle {
          font-size: 0.95rem;
          opacity: 0.8;
          font-weight: 400;
        }

        .input-group {
          margin-bottom: 1.25rem;
        }

        .input-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          opacity: 0.9;
        }

        .custom-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          color: white;
          font-family: inherit;
          font-size: 1rem;
          transition: all 0.3s ease;
        }

        .custom-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2);
          background: rgba(15, 23, 42, 0.6);
        }

        .custom-input::placeholder {
          opacity: 0.5;
        }

        .submit-btn {
          width: 100%;
          padding: 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 0.5rem;
        }

        .submit-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(37, 99, 235, 0.5);
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .alert-box {
          background: rgba(239, 68, 68, 0.2);
          border-left: 4px solid #ef4444;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          animation: floatIn 0.4s ease forwards;
        }
          
        .warning-box {
          background: rgba(245, 158, 11, 0.15);
          border-left: 4px solid #f59e0b;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .warning-title {
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        
        .warning-text {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}} />

      <div className="glass-card">
        <div className="title-container">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <img
              src="/logo.png"
              alt="Questionário Online Logo"
              style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.2)' }}
            />
          </div>
          <h2 className="title">Portal do Aluno</h2>
          <p className="subtitle">Insira suas credenciais para acessar a avaliação</p>
        </div>
        
        <div className="warning-box">
          <div className="warning-title">⚠️ Atenção: Tentativa Única</div>
          <div className="warning-text">
            Não atualize a página ou feche o navegador durante a prova. O teste é submetido automaticamente se o tempo esgotar.
          </div>
        </div>

        {errorMsg && (
          <div className="alert-box">
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {errorMsg}
            </div>
          </div>
        )}

        <form onSubmit={handleStart}>
          <div className="input-group">
            <label htmlFor="token" className="input-label">Token de Acesso</label>
            <input
              id="token"
              type="text"
              className="custom-input"
              placeholder="Ex: ABC-123-XYZ"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="fullName" className="input-label">Nome Completo</label>
            <input
              id="fullName"
              type="text"
              className="custom-input"
              placeholder="Digite seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading || !token.trim() || !fullName.trim()}>
            {loading ? (
              <div className="spinner" />
            ) : (
              <>
                <span>Iniciar Avaliação</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
