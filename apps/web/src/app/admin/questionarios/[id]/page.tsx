'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getJson, patchJson, postForm, postJson, deleteJson } from '../../../../lib/api';
import AdminLayout from '../../../../components/AdminLayout';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import imageCompression from 'browser-image-compression';

type Questionnaire = {
  id: string;
  name: string;
  category: string;
  discipline: string;
  description?: string | null;
  durationMinutes: number | null;
  questionsPerAttempt: number | null;
  scheduledDate: string | null;
  shuffleQuestions: boolean;
  isPublished: boolean;
  questions: Array<{
    id: string;
    type?: "MULTIPLE_CHOICE" | "ESSAY";
    difficulty: "EASY" | "MEDIUM" | "HARD";
    statement: string;
    imageUrl?: string | null;
    options?: any;
    correctAnswer?: string;
    correctAnswers?: string[];
    topic?: string | null;
    weight: number;
    position: number;
    includeInPool: boolean;
  }>;
  tokens: Array<{ id: string; code: string; status: string; boundStudentName: string | null }>;
};

type EditableQuestion = {
  id: string;
  type: "MULTIPLE_CHOICE" | "ESSAY";
  difficulty: "EASY" | "MEDIUM" | "HARD";
  statement: string;
  imageUrl: string;
  optionsText?: string;
  correctAnswer?: string;
  correctAnswers?: string[];
  topic: string;
  weight: number;
  includeInPool: boolean;
};

type QuestionnaireReport = {
  header: {
    name: string;
    discipline: string;
    category: string;
    teacherName: string;
    scheduledDate: string | null;
    totalStudents: number;
    avgScore: number;
    maxScore: number;
  };
  students: Array<{
    name: string;
    score: number;
    percentage: number;
    correctCount: number;
    incorrectCount: number;
    startedAt: string;
    finishedAt: string;
  }>;
  topics: Array<{ name: string; total: number; correct: number; percentage: number }>;
};

const JSON_IMPORT_TEMPLATE = `{
  "questions": [
    {
      "enunciado": "Qual e a capital do Brasil?",
      "alternativas": {
        "a": "Sao Paulo",
        "b": "Rio de Janeiro",
        "c": "Brasilia",
        "d": "Salvador"
      },
      "resposta_correta": "c",
      "nivel": "Geografia"
    },
    {
      "enunciado": "Explique o que e fotossintese.",
      "gabarito": [
        "processo em que plantas produzem glicose",
        "usa luz solar, agua e dioxido de carbono"
      ],
      "nivel": "Biologia"
    }
  ]
}`;

export default function QuestionnaireDetails() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [questionnaire, setQuestionnaire] = useState<Questionnaire | null>(null);
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Tabs for importing
  const [importMode, setImportMode] = useState<'pdf' | 'json' | null>(null);
  const [jsonText, setJsonText] = useState(JSON_IMPORT_TEMPLATE);
  const [pdfFileName, setPdfFileName] = useState('');

  // JSON preview/validation
  type JsonPreviewQuestion = { statement: string; type: 'MULTIPLE_CHOICE' | 'ESSAY'; difficulty: 'EASY' | 'MEDIUM' | 'HARD'; options?: string[]; correctAnswer?: string; correctAnswers?: string[]; topic?: string; };
  const [jsonPreview, setJsonPreview] = useState<JsonPreviewQuestion[] | null>(null);
  const [jsonPreviewError, setJsonPreviewError] = useState<string | null>(null);
  const [isFixingJson, setIsFixingJson] = useState(false);
  
  // Question Editing
  const [editingQuestion, setEditingQuestion] = useState<EditableQuestion | null>(null);

  // Email Distribution
  const [emailList, setEmailList] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number; details: Array<{ email: string; token: string; status: string; error?: string }> } | null>(null);
  
  // Filtering
  const [filterDifficulty, setFilterDifficulty] = useState<'ALL' | 'EASY' | 'MEDIUM' | 'HARD'>('ALL');

  // Metadata Editing
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [metaData, setMetaData] = useState({
    name: '',
    category: '',
    discipline: '',
    description: '',
    durationMinutes: 60,
    questionsPerAttempt: null as number | null,
    scheduledDate: '',
    shuffleQuestions: false
  });

  const loadQuestionnaire = useCallback(async (authToken: string) => {
    try {
      const data = await getJson<Questionnaire[]>(`/api/v1/admin/questionnaires`, authToken);
      const found = data.find((q) => q.id === id);
      if (found) {
        setQuestionnaire(found);
        setMetaData({
          name: found.name,
          category: found.category,
          discipline: found.discipline,
          description: found.description || '',
          durationMinutes: found.durationMinutes || 60,
          questionsPerAttempt: found.questionsPerAttempt,
          scheduledDate: found.scheduledDate ? found.scheduledDate.split('T')[0] : '',
          shuffleQuestions: found.shuffleQuestions
        });
      } else {
        router.replace('/admin/dashboard');
      }
    } catch (error) {
      setStatus(error instanceof Error ? `Erro: ${error.message}` : 'Erro ao carregar.');
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    const t = window.localStorage.getItem('qo_admin_token');
    setToken(t);
    if (t) {
      loadQuestionnaire(t);
    }
  }, [loadQuestionnaire]);

  async function handlePublish(isPublished: boolean) {
    if (!token) return;
    setStatus(isPublished ? 'Publicando...' : 'Despublicando...');
    try {
      await patchJson(`/api/v1/admin/questionnaires/${id}/publish`, { isPublished }, token);
      await loadQuestionnaire(token);
      setStatus(isPublished ? 'Questionário publicado!' : 'Questionário despublicado.');
    } catch {
      setStatus('Erro ao alterar publicação.');
    }
  }

  async function handleSaveMetadata() {
    if (!token) return;
    setStatus('Salvando informações...');
    try {
      await patchJson(`/api/v1/admin/questionnaires/${id}`, metaData, token);
      await loadQuestionnaire(token);
      setIsEditingMetadata(false);
      setStatus('Informações atualizadas!');
    } catch {
      setStatus('Erro ao salvar informações.');
    }
  }

  async function handleGenerateTokens() {
    if (!token) return;
    setStatus('Gerando tokens...');
    try {
      await postJson(`/api/v1/admin/questionnaires/${id}/tokens`, { quantity: 30, expiresInDays: 7 }, token);
      await loadQuestionnaire(token);
      setStatus('30 tokens gerados com sucesso.');
    } catch {
      setStatus('Erro na geração de tokens.');
    }
  }
  
    function handleValidateJson() {
      setJsonPreview(null);
      setJsonPreviewError(null);
      if (!jsonText.trim()) {
        setJsonPreviewError('Cole o JSON no campo acima antes de verificar.');
        return;
      }
      let raw: any;
      try {
        raw = JSON.parse(jsonText);
      } catch {
        setJsonPreviewError('JSON inválido: verifique a sintaxe (aspas, vírgulas, colchetes).');
        return;
      }
      let questions: any[] = [];
      if (Array.isArray(raw)) {
        questions = raw;
      } else if (raw && typeof raw === 'object') {
        const found = raw.questions || raw.questoes || raw.perguntas || raw.itens || raw.items;
        if (Array.isArray(found)) questions = found;
      }
      if (questions.length === 0) {
        setJsonPreviewError('Nenhuma questão encontrada. Use um array ou um objeto com campo "questions", "questoes" ou "perguntas".');
        return;
      }
      // Client-side normalisation preview
      type AliasMap = Record<string, any>;
      const FIELD_NAMES = ['statement','enunciado','pergunta','question','titulo','texto','conteudo'];
      const OPT_NAMES   = ['options','opcoes','alternativas','choices'];
      const ANS_NAMES   = ['correctAnswer','resposta_correta','gabarito','correctAnswers','respostasCorretas','answer','resposta'];
      const TOPIC_NAMES = ['topic','topico','assunto','tema'];
      const DIFF_NAMES  = ['difficulty','dificuldade','level','nivel','nivel_dificuldade'];
      const preview: JsonPreviewQuestion[] = [];
      for (let i = 0; i < questions.length; i++) {
        const q: AliasMap = questions[i];
        const statement = FIELD_NAMES.map(k => q[k]).find(v => typeof v === 'string' && v.trim());
        if (!statement) {
          setJsonPreviewError(`Questão ${i + 1}: campo de enunciado não encontrado. Use "statement", "enunciado" ou "pergunta".`);
          return;
        }
        const rawOpts = OPT_NAMES.map(k => q[k]).find(v => v != null);
        const rawAns  = ANS_NAMES.map(k => q[k]).find(v => v != null);
        const topic   = TOPIC_NAMES.map(k => q[k]).find(v => typeof v === 'string' && v.trim()) || undefined;
        
        const rawDiff = String(DIFF_NAMES.map(k => q[k]).find(v => v != null) || '').toUpperCase();
        let difficulty: 'EASY' | 'MEDIUM' | 'HARD' = 'MEDIUM';
        if (rawDiff.includes('FACIL') || rawDiff.includes('FÁCIL') || rawDiff.includes('EASY')) difficulty = 'EASY';
        else if (rawDiff.includes('MEDIO') || rawDiff.includes('MÉDIO') || rawDiff.includes('MEDIUM')) difficulty = 'MEDIUM';
        else if (rawDiff.includes('DIFICIL') || rawDiff.includes('DIFÍCIL') || rawDiff.includes('HARD')) difficulty = 'HARD';
        let options: string[] | undefined;
        let keyMap: Record<string, string> = {};
        if (rawOpts && !Array.isArray(rawOpts) && typeof rawOpts === 'object') {
          keyMap = Object.fromEntries(Object.entries(rawOpts as Record<string,any>).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
          options = Object.values(keyMap);
        } else if (Array.isArray(rawOpts)) {
          options = rawOpts.map((o: any) => String(o).trim()).filter(Boolean);
        }
        if (options && options.length < 2) {
          setJsonPreviewError(`Questão ${i + 1}: múltipla escolha precisa de pelo menos 2 opções.`);
          return;
        }
        const type: 'MULTIPLE_CHOICE' | 'ESSAY' = options && options.length >= 2 ? 'MULTIPLE_CHOICE' : 'ESSAY';
        let correctAnswer: string | undefined;
        let correctAnswers: string[] | undefined;
        if (type === 'MULTIPLE_CHOICE') {
          const raw = Array.isArray(rawAns) ? String(rawAns[0]).trim() : String(rawAns ?? '').trim();
          if (/^[a-zA-Z]$/.test(raw) && Object.keys(keyMap).length > 0) {
            correctAnswer = keyMap[raw.toLowerCase()];
          } else if (/^[a-zA-Z]$/.test(raw) && options) {
            const idx = raw.toLowerCase().charCodeAt(0) - 97;
            correctAnswer = options[idx];
          } else {
            correctAnswer = raw;
          }
          if (!correctAnswer || !options!.includes(correctAnswer)) {
            setJsonPreviewError(`Questão ${i + 1}: resposta correta "${rawAns}" não corresponde a nenhuma das opções.`);
            return;
          }
        } else {
          correctAnswers = Array.isArray(rawAns) ? rawAns.map(String) : rawAns ? [String(rawAns)] : [];
        }
        preview.push({ statement: String(statement).trim(), type, difficulty, options, correctAnswer, correctAnswers, topic });
      }
      setJsonPreview(preview);
    }

    async function handleAiFixJson() {
      if (!token) return;
      if (!jsonText.trim()) return;
      
      setIsFixingJson(true);
      setJsonPreviewError(null);
      
      try {
        const result = await postJson<any>(`/api/v1/admin/ai/fix-json`, { jsonText }, token);
        if (result && result.questions) {
          setJsonText(JSON.stringify(result, null, 2));
          setStatus('✨ JSON corrigido e formatado pela IA!');
          // Opcional: já validar automaticamente após o fix
          setTimeout(handleValidateJson, 100);
        }
      } catch (err: any) {
        setJsonPreviewError(`IA: ${err.message || 'Erro ao tentar corrigir o JSON'}`);
      } finally {
        setIsFixingJson(false);
      }
    }

  async function handleImportJson() {
    if (!token) return;
    setStatus('Importando JSON...');
    if (!jsonPreview) return;
    try {
      setStatus('Importando questões...');
      const raw = JSON.parse(jsonText);
      const questions: any[] = Array.isArray(raw) ? raw : (raw.questions || raw.questoes || raw.perguntas || raw.itens || raw.items || []);
      await postJson(`/api/v1/admin/questionnaires/${id}/import-json`, { questions }, token);
      await loadQuestionnaire(token);
      setImportMode(null);
      setJsonPreview(null);
      setJsonPreviewError(null);
      setJsonText(JSON_IMPORT_TEMPLATE);
      setStatus(`✅ ${jsonPreview.length} questões importadas com sucesso!`);
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      setStatus(`❌ Erro ao importar: ${msg}`);
    }
  }

  async function handleExportExcel() {
    if (!token) return;
    setStatus('Gerando relatório Excel...');
    try {
      const data = await getJson<QuestionnaireReport>(`/api/v1/admin/questionnaires/${id}/report`, token);

      const wb = XLSX.utils.book_new();

      // 1. Aba Resumo
      const summaryData: (string | number)[][] = [
        ['RELATÓRIO DE AVALIAÇÃO'],
        [],
        ['Avaliação', data.header.name],
        ['Disciplina', data.header.discipline],
        ['Categoria', data.header.category],
        ['Professor', data.header.teacherName],
        ['Data', data.header.scheduledDate ? new Date(data.header.scheduledDate).toLocaleDateString('pt-BR') : 'Não agendada'],
        ['Total de Alunos', data.header.totalStudents],
        ['Nota Máxima', data.header.maxScore],
        ['Média da Turma', data.header.totalStudents > 0 ? Number(data.header.avgScore.toFixed(2)) : 'Sem dados'],
      ];
      if (data.topics.length > 0) {
        summaryData.push(
          [],
          ['TÓPICOS COM MAIOR ÍNDICE DE ERRO'],
          ['Tópico', 'Total de Questões', 'Acertos', '% Acerto'],
          ...data.topics.map((t) => [t.name, t.total, t.correct, `${t.percentage.toFixed(1)}%`])
        );
      }
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

      // 2. Aba Alunos (somente se houver dados)
      if (data.students.length > 0) {
        const studentData = [
          ['Nome do Aluno', 'Nota', '%', 'Acertos', 'Erros', 'Inicio da Prova', 'Fim da Prova'],
          ...data.students.map((s) => [
            s.name,
            s.score,
            `${s.percentage.toFixed(1)}%`,
            s.correctCount,
            s.incorrectCount,
            s.startedAt ? new Date(s.startedAt).toLocaleString('pt-BR') : '-',
            s.finishedAt ? new Date(s.finishedAt).toLocaleString('pt-BR') : '-'
          ])
        ];
        const wsStudents = XLSX.utils.aoa_to_sheet(studentData);
        XLSX.utils.book_append_sheet(wb, wsStudents, 'Alunos');
      }

      // 3. Aba Questões do questionário
      if (questionnaire) {
        const questionData = [
          ['#', 'Enunciado', 'Resposta Correta', 'Tópico', 'Peso'],
          ...questionnaire.questions.map((q) => [
            q.position,
            q.statement,
            q.correctAnswer,
            q.topic || 'Geral',
            q.weight
          ])
        ];
        const wsQuestions = XLSX.utils.aoa_to_sheet(questionData);
        XLSX.utils.book_append_sheet(wb, wsQuestions, 'Questões');
      }

      XLSX.writeFile(wb, `Relatorio_${data.header.name.replace(/\s+/g, '_')}.xlsx`);
      setStatus('✅ Relatório gerado com sucesso!');
    } catch (error) {
      console.error(error);
      setStatus('Erro ao gerar relatório.');
    }
  }

  async function handleExportPdf() {
    if (!token) return;
    setStatus('Gerando relatório PDF...');
    try {
      const data = await getJson<QuestionnaireReport>(`/api/v1/admin/questionnaires/${id}/report`, token);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const title = 'RELATORIO DE AVALIACAO';
      doc.setFontSize(16);
      doc.text(title, 14, 16);

      autoTable(doc, {
        startY: 22,
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 1.5 },
        body: [
          ['Avaliacao', data.header.name],
          ['Disciplina', data.header.discipline],
          ['Categoria', data.header.category],
          ['Professor', data.header.teacherName],
          ['Data', data.header.scheduledDate ? new Date(data.header.scheduledDate).toLocaleDateString('pt-BR') : 'Nao agendada'],
          ['Total de Alunos', String(data.header.totalStudents)],
          ['Nota Maxima', String(data.header.maxScore)],
          ['Media da Turma', data.header.totalStudents > 0 ? data.header.avgScore.toFixed(2) : 'Sem dados']
        ]
      });

      if (data.topics.length > 0) {
        const topicsStartY = (doc as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY || 22;
        doc.setFontSize(12);
        doc.text('TOPICOS COM MAIOR INDICE DE ERRO', 14, topicsStartY + 8);
        autoTable(doc, {
          startY: topicsStartY + 11,
          head: [['Topico', 'Total de Questoes', 'Acertos', '% Acerto']],
          body: data.topics.map((t) => [t.name, String(t.total), String(t.correct), `${t.percentage.toFixed(1)}%`]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [37, 99, 235] }
        });
      }

      if (data.students.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('ALUNOS', 14, 16);
        autoTable(doc, {
          startY: 22,
          head: [['Nome do Aluno', 'Nota', '%', 'Acertos', 'Erros', 'Inicio da Prova', 'Fim da Prova']],
          body: data.students.map((s) => [
            s.name,
            String(s.score),
            `${s.percentage.toFixed(1)}%`,
            String(s.correctCount),
            String(s.incorrectCount),
            s.startedAt ? new Date(s.startedAt).toLocaleString('pt-BR') : '-',
            s.finishedAt ? new Date(s.finishedAt).toLocaleString('pt-BR') : '-'
          ]),
          styles: { fontSize: 8 },
          headStyles: { fillColor: [22, 163, 74] }
        });
      }

      if (questionnaire && questionnaire.questions.length > 0) {
        doc.addPage();
        doc.setFontSize(14);
        doc.text('QUESTOES', 14, 16);
        autoTable(doc, {
          startY: 22,
          head: [['#', 'Enunciado', 'Resposta Correta', 'Topico', 'Peso']],
          body: questionnaire.questions.map((q) => [
            String(q.position),
            q.statement,
            q.type === 'ESSAY' ? `[Discursiva - Respostas: ${q.correctAnswers?.join(', ') || 'N/A'}]` : (q.correctAnswer || 'N/A'),
            q.topic || 'Geral',
            String(q.weight)
          ]),
          styles: { fontSize: 8, overflow: 'linebreak', cellWidth: 'wrap' },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 95 },
            2: { cellWidth: 35 },
            3: { cellWidth: 35 },
            4: { cellWidth: 12 }
          },
          headStyles: { fillColor: [139, 92, 246] }
        });
      }

      doc.save(`Relatorio_${data.header.name.replace(/\s+/g, '_')}.pdf`);
      setStatus('✅ Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error(error);
      setStatus('Erro ao gerar relatório PDF.');
    }
  }

  async function handleImportPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setPdfFileName(file.name);
    setStatus('Enviando PDF para extração...');
    try {
      const formData = new FormData();
      formData.append('file', file);
      await postForm(`/api/v1/admin/questionnaires/${id}/import-pdf-file`, formData, token);
      await loadQuestionnaire(token);
      setImportMode(null);
      setStatus('PDF processado com sucesso!');
    } catch {
      setStatus('Erro ao processar PDF.');
    }
  }

  async function handleJsonFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setStatus('Lendo arquivo JSON...');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Basic validation
        JSON.parse(content);
        setJsonText(content);
        setStatus('JSON carregado do arquivo! Clique em "Verificar" para validar as questões.');
      } catch {
        setStatus('❌ Erro: O arquivo não contém um JSON válido.');
      }
    };
    reader.readAsText(file);
  }

  async function handleSaveQuestion() {
    if (!token || !editingQuestion) return;
    setStatus('Salvando questão...');
    try {
      const payload: Record<string, any> = {
        type: editingQuestion.type,
        difficulty: editingQuestion.difficulty,
        statement: editingQuestion.statement,
        imageUrl: editingQuestion.imageUrl || undefined,
        topic: editingQuestion.topic || null,
        weight: editingQuestion.weight,
        includeInPool: editingQuestion.includeInPool
      };

      // Handle different question types
      if (editingQuestion.type === 'ESSAY') {
        payload.correctAnswers = (editingQuestion.correctAnswers || []).map((a) => a.trim()).filter(Boolean);
      } else {
        // MULTIPLE_CHOICE
        payload.options = (editingQuestion.optionsText || '').split('\n').map(o => o.trim()).filter(o => o);
        payload.correctAnswer = (editingQuestion.correctAnswer || '').trim();
      }

      await patchJson(`/api/v1/admin/questions/${editingQuestion.id}`, payload, token);
      await loadQuestionnaire(token);
      setEditingQuestion(null);
      setStatus('Questão atualizada com sucesso!');
    } catch {
      setStatus('Erro ao salvar questão.');
    }
  }

  async function toggleIncludeInPool(qId: string, currentStatus: boolean, type: string) {
    if (!token) return;
    try {
      await patchJson(`/api/v1/admin/questions/${qId}`, { 
        includeInPool: !currentStatus,
        type: type // Necessário para validação do backend
      }, token);
      await loadQuestionnaire(token);
    } catch {
      setStatus('Erro ao alterar status no pool.');
    }
  }

  async function handleQuestionImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !editingQuestion) return;

    if (!file.type.startsWith('image/')) {
      setStatus('Arquivo inválido. Envie uma imagem (PNG, JPG, WEBP etc).');
      return;
    }

    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      setStatus('Comprimindo imagem grande (este processo pode levar um momento)...');
    }

    try {
      setStatus('Comprimindo imagem...');

      // Compress image with size optimization
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5, // Target 500KB max size
        maxWidthOrHeight: 1200, // Scale down large images
        useWebWorker: true
      });

      // Convert to base64 data URL
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(new Error('Falha ao ler imagem.'));
        reader.readAsDataURL(compressedFile);
      });

      const originalSizeKb = (file.size / 1024).toFixed(1);
      const compressedSizeKb = (compressedFile.size / 1024).toFixed(1);
      const reduction = Math.round((1 - compressedFile.size / file.size) * 100);

      setEditingQuestion({ ...editingQuestion, imageUrl: dataUrl });
      setStatus(`✅ Imagem comprimida de ${originalSizeKb}KB para ${compressedSizeKb}KB (${reduction}% menor). Clique em Salvar para persistir.`);
    } catch (error) {
      console.error(error);
      setStatus('Erro ao comprimir a imagem. Tente outra imagem ou um formato diferente.');
    }
  }



  async function handleSendEmails() {
    if (!token) return;
    const emails = emailList
      .split('\n')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    if (emails.length === 0) {
      setStatus('Insira pelo menos um e-mail.');
      return;
    }

    setIsSendingEmails(true);
    setEmailResult(null);
    setStatus('Enviando tokens por e-mail...');

    try {
      const result = await postJson<{ sent: number; failed: number; details: Array<{ email: string; token: string; status: string; error?: string }> }>(
        `/api/v1/admin/questionnaires/${id}/send-tokens`,
        { emails },
        token
      );
      setEmailResult(result);
      setEmailList('');
      await loadQuestionnaire(token);
      setStatus(`✅ ${result.sent} e-mail(s) enviado(s) com sucesso!${result.failed > 0 ? ` ⚠️ ${result.failed} falha(s).` : ''}`);
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        if (error.message === 'NOT_ENOUGH_TOKENS') {
          setStatus('❌ Tokens insuficientes. Gere mais tokens antes de enviar.');
        } else if (error.message === 'RESEND_NOT_CONFIGURED') {
          setStatus('❌ Serviço de e-mail não configurado. Configure a RESEND_API_KEY no servidor.');
        } else {
          setStatus(`❌ Erro ao enviar: ${error.message}`);
        }
      } else {
        setStatus('❌ Erro inesperado ao enviar e-mails.');
      }
    } finally {
      setIsSendingEmails(false);
    }
  }

  async function handleDeleteQuestionnaire() {
    if (!token) return;
    if (!confirm('Tem certeza que deseja excluir este questionário? Esta ação não pode ser desfeita e só funcionará se não houver tokens já utilizados.')) return;
    
    setStatus('Excluindo questionário...');
    try {
      await deleteJson(`/api/v1/admin/questionnaires/${id}`, token);
      router.push('/admin/dashboard');
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? `Erro: ${error.message}` : 'Erro ao excluir questionário.');
    }
  }

  if (isLoading) {
    return <AdminLayout><p>Carregando...</p></AdminLayout>;
  }

  if (!questionnaire) {
    return <AdminLayout><p>Questionário não encontrado.</p></AdminLayout>;
  }

  const usedTokens = questionnaire.tokens.filter(t => t.status === 'USED' || t.boundStudentName);
  const freeTokens = questionnaire.tokens.filter(t => t.status === 'ACTIVE' && !t.boundStudentName);
  const poolSize = questionnaire.questions.filter(q => q.includeInPool).length;

  return (
    <AdminLayout>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: 0, color: 'var(--text-primary)' }}>{questionnaire.name}</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>{questionnaire.discipline}</span>
              <span>•</span>
              <span>{questionnaire.category}</span>
              {questionnaire.durationMinutes && (
                <>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    {questionnaire.durationMinutes} min
                  </span>
                </>
              )}
              {questionnaire.scheduledDate && (
                <>
                  <span>•</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {questionnaire.scheduledDate.split('T')[0].split('-').reverse().join('/')}
                  </span>
                </>
              )}
              <span style={{ margin: '0 0.5rem', color: 'var(--text-secondary)' }}>•</span>
              <span 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', backgroundColor: 'rgba(59,130,246,0.1)', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }} 
                title={`O sistema sorteará ${questionnaire.questionsPerAttempt || poolSize} questões dentre as ${poolSize} marcadas para o pool`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 12l-4-4-4 4"></path></svg>
                MODO POOL: {questionnaire.questionsPerAttempt || poolSize} de {poolSize} selecionadas
              </span>
            </p>
          </div>
          <button 
            onClick={() => setIsEditingMetadata(!isEditingMetadata)} 
            className="btn-primary" 
            style={{ backgroundColor: 'transparent', border: '1px solid var(--primary)', color: 'var(--primary)' }}
          >
            {isEditingMetadata ? 'Cancelar Edição' : 'Editar Informações'}
          </button>
        </div>

        {isEditingMetadata && (
          <div className="card" style={{ marginTop: '1.5rem', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nome da Avaliação</label>
                <input className="input-field" value={metaData.name} onChange={e => setMetaData({...metaData, name: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Disciplina</label>
                <input className="input-field" value={metaData.discipline} onChange={e => setMetaData({...metaData, discipline: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Categoria</label>
                <input className="input-field" value={metaData.category} onChange={e => setMetaData({...metaData, category: e.target.value})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Duração (minutos)</label>
                <input className="input-field" type="number" value={metaData.durationMinutes} onChange={e => setMetaData({...metaData, durationMinutes: Number(e.target.value)})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Questões p/ Aluno</label>
                <input className="input-field" type="number" placeholder="Vazio = Todas" value={metaData.questionsPerAttempt || ''} onChange={e => setMetaData({...metaData, questionsPerAttempt: e.target.value ? Number(e.target.value) : null})} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Data Agendada</label>
                <input className="input-field" type="date" value={metaData.scheduledDate} onChange={e => setMetaData({...metaData, scheduledDate: e.target.value})} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Instruções (Exibidas na tela de Boas-vindas)</label>
              <textarea className="input-field" rows={3} value={metaData.description} onChange={e => setMetaData({...metaData, description: e.target.value})} style={{ width: '100%', marginBottom: '1rem' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <input 
                type="checkbox" 
                id="shuffleQuestions"
                checked={metaData.shuffleQuestions} 
                onChange={e => setMetaData({...metaData, shuffleQuestions: e.target.checked})}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <div>
                <label htmlFor="shuffleQuestions" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', marginBottom: '0.25rem', display: 'block' }}>🔀 Embaralhar Sequência de Questões</label>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Cada aluno verá as questões em uma ordem diferente</p>
              </div>
            </div>
            <button onClick={handleSaveMetadata} className="btn-primary" style={{ width: '100%' }}>Salvar Alterações</button>
          </div>
        )}
      </div>

      {status && (
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontWeight: 500 }}>
          {status}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
        {/* Left Column: Questions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <section className="card">
            <div style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 1rem 0' }}>Questões ({questionnaire.questions.length})</h2>
              
              {/* Import Section */}
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Importar Questões</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setImportMode('pdf')} className="btn-primary" style={{ backgroundColor: '#ef4444', flex: 1 }}>+ Importar PDF</button>
                  <button onClick={() => { setImportMode('json'); if (!jsonText.trim()) setJsonText(JSON_IMPORT_TEMPLATE); }} className="btn-primary" style={{ backgroundColor: '#8b5cf6', flex: 1 }}>+ Importar JSON</button>
                </div>
              </div>

              {/* Reports Section */}
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase' }}>Gerar Relatórios</p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleExportExcel} className="btn-primary" style={{ backgroundColor: '#22c55e', flex: 1 }}>📊 Excel</button>
                  <button onClick={handleExportPdf} className="btn-primary" style={{ backgroundColor: '#0ea5e9', flex: 1 }}>📄 PDF</button>
                </div>
              </div>
            </div>

            {importMode === 'json' && (
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0 }}>Importar JSON</h3>

                {!jsonPreview ? (
                  <>
                    <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: 'rgba(139,92,246,0.05)', borderRadius: '8px', border: '1px dashed #8b5cf6' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', fontWeight: 600, color: '#7c3aed' }}>📁 Carregar de um arquivo .json</p>
                      <input 
                        type="file" 
                        accept=".json,application/json" 
                        onChange={handleJsonFileUpload}
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Ou cole o código JSON abaixo. Clique em <strong>Verificar</strong> para validar antes de salvar.
                    </p>
                    <textarea
                      className="input-field"
                      rows={16}
                      value={jsonText}
                      onChange={e => { setJsonText(e.target.value); setJsonPreviewError(null); }}
                      placeholder={'Modelo carregado automaticamente. Copie e substitua os dados.'}
                      style={{ width: '100%', marginBottom: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}
                    />
                    {jsonPreviewError && (
                      <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: '#dc2626', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                        ❌ {jsonPreviewError}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={handleValidateJson} 
                        className="btn-primary" 
                        disabled={isFixingJson}
                        style={{ backgroundColor: '#7c3aed' }}
                      >
                        {isFixingJson ? '⏳ Analisando...' : '🔍 Verificar JSON'}
                      </button>

                      <button 
                        onClick={handleAiFixJson} 
                        className="btn-primary"
                        disabled={isFixingJson}
                        style={{ 
                          backgroundColor: 'rgba(124, 58, 237, 0.1)', 
                          color: '#7c3aed', 
                          border: '1px solid #7c3aed' 
                        }}
                      >
                        {isFixingJson ? '✨ Corrigindo...' : '🪄 Corrigir com IA'}
                      </button>

                      <button 
                        onClick={() => { setJsonPreviewError(null); setJsonText(''); }} 
                        className="btn-primary" 
                        disabled={isFixingJson}
                        style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        Limpar Campo
                      </button>

                      <button 
                        onClick={() => { setImportMode(null); setJsonPreviewError(null); setJsonText(JSON_IMPORT_TEMPLATE); }} 
                        className="btn-primary" 
                        disabled={isFixingJson}
                        style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ padding: '0.75rem', backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', marginBottom: '1rem' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#15803d', fontSize: '0.9rem' }}>
                        ✅ {jsonPreview.length} questões reconhecidas — revise abaixo e confirme a importação
                      </p>
                    </div>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '6px', marginBottom: '1rem' }}>
                      {jsonPreview.map((q, i) => (
                        <div key={i} style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <span style={{ minWidth: '22px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{i + 1}.</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: '0 0 0.2rem 0', fontSize: '0.85rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.statement}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: q.type === 'MULTIPLE_CHOICE' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)', color: q.type === 'MULTIPLE_CHOICE' ? '#2563eb' : '#7c3aed', fontWeight: 600 }}>
                                {q.type === 'MULTIPLE_CHOICE' ? `🔘 Múltipla Escolha (${q.options?.length} opções)` : '📝 Discursiva'}
                              </span>
                              {q.type === 'MULTIPLE_CHOICE' && (
                                <span style={{ fontSize: '0.7rem', color: '#15803d', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(34,197,94,0.1)' }}>
                                  ✅ {q.correctAnswer}
                                </span>
                              )}
                              {q.type === 'ESSAY' && q.correctAnswers && q.correctAnswers.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#7c3aed', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(168,85,247,0.1)' }}>
                                  Respostas: {q.correctAnswers.join(', ')}
                                </span>
                              )}
                              <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: q.difficulty === 'EASY' ? 'rgba(34,197,94,0.1)' : q.difficulty === 'MEDIUM' ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)', color: q.difficulty === 'EASY' ? '#16a34a' : q.difficulty === 'MEDIUM' ? '#ca8a04' : '#dc2626', fontWeight: 700 }}>
                                {q.difficulty === 'EASY' ? 'FÁCIL' : q.difficulty === 'MEDIUM' ? 'MÉDIO' : 'DIFÍCIL'}
                              </span>
                              {q.topic && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                                  {q.topic}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={handleImportJson} className="btn-primary">✅ Confirmar Importação</button>
                      <button onClick={() => { setJsonPreview(null); setJsonPreviewError(null); }} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>← Corrigir JSON</button>
                      <button onClick={() => { setImportMode(null); setJsonPreview(null); setJsonPreviewError(null); setJsonText(JSON_IMPORT_TEMPLATE); }} className="btn-primary" style={{ backgroundColor: 'transparent', color: '#dc2626', border: '1px solid rgba(239,68,68,0.3)' }}>Cancelar</button>
                    </div>
                  </>
                )}
              </div>
            )}

            {importMode === 'pdf' && (
              <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '1.5rem' }}>
                <h3 style={{ marginTop: 0 }}>Importar PDF</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>A primeira alternativa será definida como correta pelo extrator base. Você deverá revisar depois.</p>
                <input type="file" accept="application/pdf" onChange={handleImportPdf} />
                {pdfFileName && <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>{pdfFileName}</p>}
                <div style={{ marginTop: '1rem' }}>
                  <button onClick={() => setImportMode(null)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}>Cancelar</button>
                </div>
              </div>
            )}
            {/* Filter Section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.5rem', backgroundColor: 'var(--bg-main)', borderRadius: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Filtrar Nível:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {(['ALL', 'EASY', 'MEDIUM', 'HARD'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setFilterDifficulty(level)}
                    style={{
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      borderRadius: '4px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: filterDifficulty === level 
                        ? (level === 'EASY' ? '#16a34a' : level === 'MEDIUM' ? '#ca8a04' : level === 'HARD' ? '#dc2626' : 'var(--primary)')
                        : 'rgba(0,0,0,0.05)',
                      color: filterDifficulty === level ? 'white' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {level === 'ALL' ? 'TODAS' : level === 'EASY' ? 'FÁCIL' : level === 'MEDIUM' ? 'MÉDIO' : 'DIFÍCIL'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              {questionnaire.questions.filter(q => filterDifficulty === 'ALL' || q.difficulty === filterDifficulty).length === 0 && (
                <p style={{ color: 'var(--text-secondary)', padding: '1rem', textAlign: 'center' }}>
                  Nenhuma questão encontrada com este filtro.
                </p>
              )}
              {questionnaire.questions
                .filter(q => filterDifficulty === 'ALL' || q.difficulty === filterDifficulty)
                .map((q) => (
                <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '1rem', opacity: q.includeInPool ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ paddingTop: '0.25rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <input 
                        type="checkbox" 
                        checked={q.includeInPool} 
                        onChange={() => toggleIncludeInPool(q.id, q.includeInPool, q.type)}
                        title="Incluir no pool de questões desta avaliação"
                        style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: 'var(--primary)' }}
                      />
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, color: q.includeInPool ? 'var(--primary)' : 'var(--text-secondary)' }}>
                        {q.includeInPool ? 'POOL' : 'OFF'}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, margin: '0 0 0.5rem 0', textDecoration: q.includeInPool ? 'none' : 'line-through' }}>{q.position}. {q.statement}</p>
                      {q.imageUrl && (
                        <p style={{ fontSize: '0.75rem', color: '#3b82f6', margin: '0.25rem 0' }}>🖼️ Contém imagem</p>
                      )}
                    </div>
                  </div>
                  
                  {q.imageUrl && (
                    <div style={{ marginBottom: '0.75rem', width: '100%' }}>
                      <img
                        src={q.imageUrl}
                        alt={`Imagem da questão ${q.position}`}
                        style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', border: '1px solid var(--border)' }}
                      />
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                    {q.type === 'ESSAY' ? (
                      <span>📝 <strong>Discursiva: {q.correctAnswers?.join(', ') || 'N/A'}</strong></span>
                    ) : (
                      <span>✅ <strong>{q.correctAnswer}</strong></span>
                    )}
                    <span style={{ color: q.difficulty === 'EASY' ? '#16a34a' : q.difficulty === 'MEDIUM' ? '#ca8a04' : '#dc2626', fontWeight: 700 }}>
                      Nível: {q.difficulty === 'EASY' ? 'Fácil' : q.difficulty === 'MEDIUM' ? 'Médio' : 'Difícil'}
                    </span>
                    <span>Tópico: {q.topic || 'Geral'}</span>
                    <span>Peso: {q.weight}</span>
                  </div>
                  <button onClick={() => setEditingQuestion({
                    id: q.id,
                    type: q.type || 'MULTIPLE_CHOICE',
                    difficulty: q.difficulty,
                    statement: q.statement,
                    imageUrl: q.imageUrl || '',
                    optionsText: Array.isArray(q.options) 
                      ? q.options.join('\n') 
                      : (typeof q.options === 'string' && q.options.startsWith('[') 
                          ? JSON.parse(q.options).join('\n') 
                          : ''),
                    correctAnswer: q.correctAnswer,
                    correctAnswers: q.correctAnswers,
                    topic: q.topic || '',
                    weight: q.weight,
                    includeInPool: q.includeInPool
                  })} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '0.25rem 0.75rem' }}>
                    Editar Questão
                  </button>
                </div>
              ))}
            </div>

            {/* Editor Modal Overlay */}
            {editingQuestion && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                  <h3 style={{ marginTop: 0 }}>Editar Questão</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Tipo: <strong>{editingQuestion.type === 'ESSAY' ? 'Discursiva' : 'Múltipla escolha'}</strong>
                    </div>
                    <textarea className="input-field" rows={3} value={editingQuestion.statement} onChange={(e) => setEditingQuestion({ ...editingQuestion, statement: e.target.value })} />
                    <input className="input-field" value={editingQuestion.imageUrl} onChange={(e) => setEditingQuestion({ ...editingQuestion, imageUrl: e.target.value })} placeholder="URL da imagem/gráfico (opcional)" />
                    <div>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                        Ou envie uma imagem do seu computador (até 3MB)
                      </label>
                      <input type="file" accept="image/*" onChange={handleQuestionImageUpload} />
                    </div>
                    {editingQuestion.imageUrl && (
                      <div style={{ position: 'relative', width: 'fit-content' }}>
                        <img
                          src={editingQuestion.imageUrl}
                          alt="Prévia da imagem da questão"
                          style={{ maxWidth: '100%', maxHeight: '220px', borderRadius: '8px', border: '1px solid var(--border)' }}
                        />
                        <button 
                          onClick={() => setEditingQuestion({ ...editingQuestion, imageUrl: '' })}
                          style={{ 
                            position: 'absolute', top: '10px', right: '10px', 
                            backgroundColor: '#ef4444', color: 'white', border: 'none', 
                            borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.7rem', 
                            cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.2)' 
                          }}
                        >
                          🗑️ Remover Imagem
                        </button>
                      </div>
                    )}

                    {editingQuestion.type === 'ESSAY' ? (
                      <textarea
                        className="input-field"
                        rows={4}
                        value={(editingQuestion.correctAnswers || []).join('\n')}
                        onChange={(e) => setEditingQuestion({
                          ...editingQuestion,
                          correctAnswers: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean)
                        })}
                        placeholder="Respostas aceitas (uma por linha)"
                      />
                    ) : (
                      <>
                        <textarea className="input-field" rows={5} value={editingQuestion.optionsText} onChange={(e) => setEditingQuestion({ ...editingQuestion, optionsText: e.target.value })} placeholder="Alternativas (uma por linha)" />
                        <input className="input-field" value={editingQuestion.correctAnswer} onChange={(e) => setEditingQuestion({ ...editingQuestion, correctAnswer: e.target.value })} placeholder="Resposta correta (texto exato da alternativa)" />
                      </>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Nível de Dificuldade</label>
                        <select 
                          className="input-field" 
                          value={editingQuestion.difficulty} 
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as any })}
                          style={{ width: '100%' }}
                        >
                          <option value="EASY">Fácil</option>
                          <option value="MEDIUM">Médio</option>
                          <option value="HARD">Difícil</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Tópico</label>
                        <input className="input-field" value={editingQuestion.topic} onChange={(e) => setEditingQuestion({ ...editingQuestion, topic: e.target.value })} placeholder="Tópico" />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Peso</label>
                        <input className="input-field" type="number" value={editingQuestion.weight} onChange={(e) => setEditingQuestion({ ...editingQuestion, weight: Number(e.target.value) })} placeholder="Peso" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
                      <input 
                        type="checkbox" 
                        id="modalIncludeInPool"
                        checked={editingQuestion.includeInPool} 
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, includeInPool: e.target.checked })}
                      />
                      <label htmlFor="modalIncludeInPool" style={{ fontSize: '0.875rem', cursor: 'pointer' }}>Incluir esta questão no pool de sorteio</label>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                      <button onClick={handleSaveQuestion} className="btn-primary">Salvar</button>
                      <button onClick={() => setEditingQuestion(null)} className="btn-primary" style={{ backgroundColor: 'transparent', color: 'var(--text-primary)' }}>Cancelar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Status & Tokens */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section className="card">
            <h2 style={{ marginTop: 0 }}>Status</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: questionnaire.isPublished ? '#22c55e' : '#eab308' }} />
              <span style={{ fontWeight: 600 }}>{questionnaire.isPublished ? 'Público' : 'Rascunho Privado'}</span>
            </div>
            
            <button 
              onClick={() => handlePublish(!questionnaire.isPublished)} 
              className="btn-primary" 
              style={{ width: '100%', backgroundColor: questionnaire.isPublished ? 'transparent' : 'var(--primary)', color: questionnaire.isPublished ? 'var(--text-primary)' : 'white', border: questionnaire.isPublished ? '1px solid var(--border)' : 'none' }}
            >
              {questionnaire.isPublished ? 'Remover do Ar' : 'Publicar Agora'}
            </button>
          </section>

          <section className="card">
            <h2 style={{ marginTop: 0 }}>Alunos e Tokens</h2>
            <button onClick={handleGenerateTokens} className="btn-primary" style={{ width: '100%', marginBottom: '1.5rem', backgroundColor: '#10b981' }}>
              Gerar 30 Tokens (7 dias)
            </button>

            {questionnaire.tokens.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>Nenhum token gerado.</p>}

            {usedTokens.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#3b82f6' }}>Alunos Realizando/Concluídos</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {usedTokens.map(t => (
                    <div key={t.id} style={{ padding: '0.5rem', border: '1px solid #bfdbfe', backgroundColor: '#eff6ff', borderRadius: '6px', fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: 600, color: '#1e3a8a' }}>{t.boundStudentName}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', color: '#3b82f6', fontSize: '0.75rem' }}>
                        <span>Token: {t.code}</span>
                        <span>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {freeTokens.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-secondary)' }}>Tokens Disponíveis ({freeTokens.length})</h4>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {freeTokens.map(t => (
                    <div key={t.id} style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>{t.code}</span>
                      <span style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>LIVRE</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Email Distribution */}
          <section className="card" style={{ borderLeft: '4px solid #8b5cf6' }}>
            <h2 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Enviar Tokens por E-mail
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Cole os e-mails dos alunos (um por linha). Cada aluno receberá um token único automaticamente.
            </p>
            
            {freeTokens.length === 0 ? (
              <div style={{ padding: '1rem', backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', color: '#92400e', fontSize: '0.875rem' }}>
                ⚠️ Nenhum token livre disponível. Gere tokens primeiro antes de enviar por e-mail.
              </div>
            ) : (
              <>
                <textarea
                  className="input-field"
                  rows={6}
                  placeholder={`aluno1@email.com\naluno2@email.com\naluno3@email.com`}
                  value={emailList}
                  onChange={(e) => setEmailList(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: '0.875rem', marginBottom: '0.75rem' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {emailList.split('\n').filter(e => e.trim().length > 0).length} e-mails •  {freeTokens.length} tokens livres
                  </span>
                  <button
                    onClick={handleSendEmails}
                    disabled={isSendingEmails || emailList.trim().length === 0}
                    className="btn-primary"
                    style={{ backgroundColor: '#8b5cf6' }}
                  >
                    {isSendingEmails ? 'Enviando...' : '📧 Enviar Tokens'}
                  </button>
                </div>
              </>
            )}

            {emailResult && (
              <div style={{ marginTop: '1rem', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-main)' }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>ENVIADOS</span>
                    <h3 style={{ margin: 0, color: '#16a34a' }}>{emailResult.sent}</h3>
                  </div>
                  {emailResult.failed > 0 && (
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>FALHAS</span>
                      <h3 style={{ margin: 0, color: '#ef4444' }}>{emailResult.failed}</h3>
                    </div>
                  )}
                </div>
                <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {emailResult.details.map((d, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0.5rem', fontSize: '0.8rem', borderRadius: '4px', backgroundColor: d.status === 'sent' ? 'rgba(22, 163, 74, 0.05)' : 'rgba(239, 68, 68, 0.05)' }}>
                      <span style={{ color: 'var(--text-primary)' }}>{d.email}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: d.status === 'sent' ? '#16a34a' : '#ef4444', fontWeight: 600 }}>
                        {d.status === 'sent' ? `✓ ${d.token}` : `✗ ${d.error}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {usedTokens.length === 0 && (
            <section className="card" style={{ borderColor: '#fca5a5', backgroundColor: '#fef2f2' }}>
              <h2 style={{ marginTop: 0, color: '#ef4444' }}>Zona de Perigo</h2>
              <p style={{ color: '#991b1b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Como nenhum aluno acessou este questionário, você pode excluí-lo permanentemente.
              </p>
              <button 
                onClick={handleDeleteQuestionnaire} 
                className="btn-primary" 
                style={{ width: '100%', backgroundColor: '#ef4444', color: 'white' }}
              >
                Excluir Questionário
              </button>
            </section>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
