'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { getJson } from '../../../lib/api';
import AdminLayout from '../../../components/AdminLayout';

type Questionnaire = {
  id: string;
  name: string;
  category: string;
  discipline: string;
  durationMinutes: number | null;
  scheduledDate: string | null;
  isPublished: boolean;
  questions: unknown[];
  tokens: unknown[];
};

export default function AdminDashboard() {
  const [items, setItems] = useState<Questionnaire[]>([]);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadQuestionnaires = useCallback(async (authToken: string) => {
    try {
      const data = await getJson<Questionnaire[]>('/api/v1/admin/questionnaires', authToken);
      setItems(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao carregar.';
      if (msg === 'UNAUTHORIZED' || msg.includes('UNAUTHORIZED')) {
        window.localStorage.removeItem('qo_admin_token');
        window.location.href = '/admin'; // Redirect to login
        return;
      }
      setStatus(`Erro: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = window.localStorage.getItem('qo_admin_token');
    if (t) {
      loadQuestionnaires(t);
    }
  }, [loadQuestionnaires]);

  return (
    <AdminLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Dashboard</h1>
        <Link href="/admin/questionarios/novo" className="btn-primary" style={{ textDecoration: 'none' }}>
          + Novo Questionário
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>QUESTIONÁRIOS</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{items.length}</h2>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #16a34a' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>PUBLICADOS</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{items.filter(i => i.isPublished).length}</h2>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL TOKENS</span>
          <h2 style={{ fontSize: '2rem', margin: '0.5rem 0 0 0' }}>{items.reduce((acc, i) => acc + i.tokens.length, 0)}</h2>
        </div>
      </div>


      {status && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{status}</p>}

      {isLoading ? (
        <p>Carregando seus questionários...</p>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Nenhum questionário encontrado.</p>
          <Link href="/admin/questionarios/novo" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '1rem' }}>
            Criar meu primeiro questionário
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {items.map((item) => (
            <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 0.25rem 0' }}>{item.name}</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {item.discipline} • {item.category} • {item.questions.length} questões • {item.tokens.length} tokens {item.durationMinutes && `• ${item.durationMinutes} min`}
                </p>
                {item.scheduledDate && (
                  <p style={{ margin: '0.25rem 0 0 0', color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                    📅 Data da Prova: {item.scheduledDate.split('T')[0].split('-').reverse().join('/')}
                  </p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span style={{ 
                    display: 'inline-block', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    backgroundColor: item.isPublished ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                    color: item.isPublished ? '#16a34a' : '#ca8a04' 
                  }}>
                    {item.isPublished ? 'Publicado' : 'Rascunho'}
                  </span>
                </div>
              </div>
              <div>
                <Link href={`/admin/questionarios/${item.id}`} className="btn-primary" style={{ textDecoration: 'none', backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
                  Gerenciar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
