'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '../../../lib/api';

type BootstrapResponse = {
  id: string;
  fullName: string;
  email: string;
  role: string;
};

export default function AdminSetup() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('');

    if (!fullName.trim()) {
      setStatus('⚠️ Nome completo é obrigatório (mínimo 5 caracteres)');
      return;
    }

    if (!email.includes('@')) {
      setStatus('⚠️ E-mail inválido');
      return;
    }

    if (password.length < 8) {
      setStatus('⚠️ Senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setStatus('⚠️ As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    setStatus('Criando conta de administrador...');

    try {
      const response = await postJson<BootstrapResponse>('/api/v1/admin/bootstrap', {
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        password
      });

      setStatus(`✅ Conta criada com sucesso para ${response.fullName}!`);
      setTimeout(() => {
        router.push('/admin/login');
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      if (message === 'BOOTSTRAP_ALREADY_DONE') {
        setStatus('⚠️ Uma conta de administrador já foi criada. Vá para o login.');
      } else {
        setStatus(`❌ Erro: ${message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1rem', backgroundColor: 'var(--bg-secondary)' }}>
      <div className="card" style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
          <img
            src="/utfpr-logo.png"
            alt="UTFPR Logo"
            style={{ width: '140px', height: 'auto', objectFit: 'contain' }}
          />
        </div>

        <h1 style={{ marginBottom: '0.5rem', textAlign: 'center', fontSize: '1.5rem' }}>
          🔧 Configuração Inicial
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center', fontSize: '0.875rem' }}>
          Crie a conta de administrador para acessar o painel de questionários.
        </p>

        {status && (
          <div style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: status.includes('✅') ? 'rgba(34, 197, 94, 0.1)' : status.includes('⚠️') ? 'rgba(251, 146, 60, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${status.includes('✅') ? '#22c55e' : status.includes('⚠️') ? '#f97316' : '#ef4444'}`,
            color: status.includes('✅') ? '#22c55e' : status.includes('⚠️') ? '#f97316' : '#ef4444',
            borderRadius: '8px',
            fontSize: '0.875rem'
          }}>
            {status}
          </div>
        )}

        <form onSubmit={handleSetup} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label htmlFor="fullName" className="label">Nome Completo *</label>
            <input
              id="fullName"
              type="text"
              className="input-field"
              placeholder="ex: Prof. João Silva"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Mínimo 5 caracteres</p>
          </div>

          <div>
            <label htmlFor="email" className="label">E-mail *</label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="label">Senha *</label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Mínimo 8 caracteres</p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="label">Confirmar Senha *</label>
            <input
              id="confirmPassword"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }} disabled={isLoading}>
            {isLoading ? 'Criando conta...' : 'Criar Conta de Administrador'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          <strong>ℹ️ Informação:</strong> Esta é a primeira vez que o sistema está sendo configurado. Após criar a conta, você poderá fazer login e gerenciar questionários.
        </div>
      </div>
    </div>
  );
}
