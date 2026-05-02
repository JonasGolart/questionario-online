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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/logo.png"
            alt="Questionário Online Logo"
            style={{ width: '100px', height: '100px', objectFit: 'contain', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
          />
        </div>
        <h2 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>Acesso Restrito</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          Painel de administração para professores.
        </p>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="email" className="label">E-mail</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="admin@stackfab.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Senha</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>
            Entrar
          </button>
        </form>
        {status ? <p style={{ marginTop: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>{status}</p> : null}
      </div>
    </div>
  );
}
