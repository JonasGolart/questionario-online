import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const BACKUPS_DIR = path.join(__dirname, '../../../backups');

async function createBackup() {
  try {
    // Criar diretório de backups se não existir
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
      console.log(`✅ Diretório de backups criado: ${BACKUPS_DIR}`);
    }

    console.log('📦 Iniciando backup do banco de dados...\n');

    // Exportar todas as tabelas
    const [users, questionnaires, questions, tokens, attempts] = await Promise.all([
      prisma.user.findMany(),
      prisma.questionnaire.findMany({
        include: {
          questions: true,
          tokens: true,
          attempts: true
        }
      }),
      prisma.question.findMany(),
      prisma.accessToken.findMany(),
      prisma.attempt.findMany({
        include: {
          token: true,
          questionnaire: true
        }
      })
    ]);

    // Criar arquivo de backup com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `backup_${timestamp}.json`;
    const backupPath = path.join(BACKUPS_DIR, backupFileName);

    const backup = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      data: {
        users,
        questionnaires,
        questions,
        tokens,
        attempts
      }
    };

    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');

    console.log(`✅ Backup criado com sucesso!\n`);
    console.log(`📁 Arquivo: ${backupFileName}`);
    console.log(`📍 Localização: ${backupPath}`);
    console.log(`\n📊 Resumo do Backup:`);
    console.log(`   - Usuários: ${users.length}`);
    console.log(`   - Questionários: ${questionnaires.length}`);
    console.log(`   - Questões: ${questions.length}`);
    console.log(`   - Tokens: ${tokens.length}`);
    console.log(`   - Tentativas: ${attempts.length}`);
    console.log(`\n💾 Backup salvo em: ${backupPath}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

createBackup();
