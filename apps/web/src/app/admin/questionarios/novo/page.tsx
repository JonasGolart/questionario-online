'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { postJson } from '../../../../lib/api';
import AdminLayout from '../../../../components/AdminLayout';

export default function NovoQuestionario() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [questionsPerAttempt, setQuestionsPerAttempt] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const token = window.localStorage.getItem('qo_admin_token');
    
    if (!token) {
      setStatus('Sessão expirada. Faça login novamente.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Criando...');

    try {
      const created = await postJson<{ id: string }>(
        '/api/v1/admin/questionnaires',
        { 
          name, 
          category, 
          discipline, 
          description,
          durationMinutes: parseInt(durationMinutes) || 0,
          questionsPerAttempt: questionsPerAttempt ? parseInt(questionsPerAttempt) : null,
          scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : null
        },
        token
      );
      router.push(`/admin/questionarios/${created.id}`);
    } catch (error) {
      setStatus(error instanceof Error ? `Erro: ${error.message}` : 'Erro ao criar.');
      setIsSubmitting(false);
    }
  }

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>Novo Questionário</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Crie a base do questionário. Em seguida, você poderá importar as questões e gerar tokens.
        </p>
      </div>

      <section className="card" style={{ maxWidth: '600px' }}>
        <form onSubmit={handleCreate} style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label className="label">Nome da Avaliação</label>
            <input 
              className="input-field" 
              placeholder="Ex: Prova Bimestral" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label className="label">Disciplina</label>
              <input 
                className="input-field" 
                placeholder="Ex: Matemática" 
                value={discipline} 
                onChange={(e) => setDiscipline(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="label">Categoria</label>
              <input 
                className="input-field" 
                placeholder="Ex: Ensino Médio" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label className="label">Tempo de Prova (Minutos)</label>
              <input 
                type="number"
                className="input-field" 
                placeholder="Ex: 60" 
                value={durationMinutes} 
                onChange={(e) => setDurationMinutes(e.target.value)} 
                required 
              />
            </div>
            <div>
              <label className="label">Questões por Aluno (Pool)</label>
              <input 
                type="number"
                className="input-field" 
                placeholder="Vazio = Todas" 
                value={questionsPerAttempt} 
                onChange={(e) => setQuestionsPerAttempt(e.target.value)} 
              />
            </div>
          </div>

          <div>
            <label className="label">Data de Aplicação (Opcional)</label>
            <input 
              type="date"
              className="input-field" 
              value={scheduledDate} 
              onChange={(e) => setScheduledDate(e.target.value)} 
            />
          </div>

          <div>
            <label className="label">Descrição (Opcional)</label>
            <textarea 
              className="input-field" 
              placeholder="Instruções para os alunos..." 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              rows={3}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Criar Questionário'}
          </button>
        </form>

        {status && <p style={{ color: 'var(--error)', marginTop: '1rem', textAlign: 'center' }}>{status}</p>}
      </section>
    </AdminLayout>
  );
}
