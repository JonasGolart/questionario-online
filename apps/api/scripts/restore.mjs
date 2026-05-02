import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const BACKUPS_DIR = path.join(__dirname, '../../../backups');

async function restoreBackup() {
  const backupFile = process.argv[2];

  if (!backupFile) {
    console.log('❌ Uso: npm run restore:backup -- <arquivo-backup>\n');
    console.log('📁 Backups disponíveis:\n');

    if (!fs.existsSync(BACKUPS_DIR)) {
      console.log('   Nenhum backup encontrado.');
      process.exit(1);
    }

    const files = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      console.log('   Nenhum backup encontrado.');
      process.exit(1);
    }

    files.forEach((file, index) => {
      const stat = fs.statSync(path.join(BACKUPS_DIR, file));
      const size = (stat.size / 1024).toFixed(2);
      const date = stat.mtime.toLocaleString('pt-BR');
      console.log(`   ${index + 1}. ${file} (${size}KB - ${date})`);
    });

    console.log('\n💡 Exemplo: npm run restore:backup -- backup_2026-05-01T12-34-56-789Z.json\n');
    process.exit(1);
  }

  const backupPath = path.join(BACKUPS_DIR, backupFile);

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Arquivo de backup não encontrado: ${backupFile}`);
    console.error(`   Procurando em: ${backupPath}`);
    process.exit(1);
  }

  try {
    console.log('⚠️  ATENÇÃO: Este comando vai DELETAR todos os dados atuais e restaurar do backup!');
    console.log(`📁 Backup a restaurar: ${backupFile}\n`);

    // Confirmar restauração (em modo não-interativo, assumir confirmação)
    const confirmed = process.argv[3] === '--confirm';
    
    if (!confirmed) {
      console.log('Para confirmar, execute: npm run restore:backup -- <arquivo> --confirm\n');
      process.exit(1);
    }

    console.log('🔄 Limpando banco de dados...');

    // Deletar todos os dados em ordem de dependência
    await prisma.attempt.deleteMany({});
    await prisma.accessToken.deleteMany({});
    await prisma.question.deleteMany({});
    await prisma.questionnaire.deleteMany({});
    await prisma.user.deleteMany({});

    console.log('✅ Banco de dados limpo.\n');
    console.log('📥 Restaurando backup...\n');

    // Ler backup
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

    // Restaurar dados em ordem de dependência
    for (const user of backupData.data.users) {
      await prisma.user.create({ data: user });
    }
    console.log(`   ✓ ${backupData.data.users.length} usuários restaurados`);

    for (const questionnaire of backupData.data.questionnaires) {
      const { questions, tokens, attempts, ...data } = questionnaire;
      await prisma.questionnaire.create({ data });
    }
    console.log(`   ✓ ${backupData.data.questionnaires.length} questionários restaurados`);

    for (const question of backupData.data.questions) {
      await prisma.question.create({ data: question });
    }
    console.log(`   ✓ ${backupData.data.questions.length} questões restauradas`);

    for (const token of backupData.data.tokens) {
      await prisma.accessToken.create({ data: token });
    }
    console.log(`   ✓ ${backupData.data.tokens.length} tokens restaurados`);

    for (const attempt of backupData.data.attempts) {
      const { token, questionnaire, ...data } = attempt;
      await prisma.attempt.create({ data });
    }
    console.log(`   ✓ ${backupData.data.attempts.length} tentativas restauradas`);

    console.log('\n✅ Restauração concluída com sucesso!');
    console.log(`📊 Dados restaurados do backup: ${backupData.timestamp}`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao restaurar backup:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

restoreBackup();
