'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '../../../lib/api';

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    role: string;
  };
};

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Autenticando...');

    try {
      const response = await postJson<LoginResponse>('/api/v1/admin/login', { email, password });
      window.localStorage.setItem('qo_admin_token', response.accessToken);
      window.localStorage.setItem('qo_admin_user', JSON.stringify(response.user));
      router.push('/admin/dashboard');
    } catch (error) {
      if (error instanceof Error) {
        setStatus(`Falha: ${error.message}`);
      } else {
        setStatus('Falha inesperada no login.');
      }
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

        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
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
          max-width: 400px;
          position: relative;
          z-index: 10;
          color: white;
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
          margin-top: 0.5rem;
        }

        .submit-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 10px 20px -10px rgba(37, 99, 235, 0.5);
        }

        @media (max-width: 480px) {
          .glass-card {
            padding: 1.5rem;
          }
        }
      `}} />

      <div className="glass-card">
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Acesso Restrito</h2>
          <p style={{ margin: '0.5rem 0 0 0', opacity: 0.7, fontSize: '0.875rem' }}>Painel de administração para professores.</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">E-mail</label>
            <input
              type="email"
              className="custom-input"
              placeholder="admin@stackfab.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label">Senha</label>
            <input
              type="password"
              className="custom-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={status === 'Autenticando...'}>
            {status === 'Autenticando...' ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        {status && <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.875rem', color: status.startsWith('Falha') ? '#f87171' : 'white' }}>{status}</p>}
      </div>
    </div>
  );
}
