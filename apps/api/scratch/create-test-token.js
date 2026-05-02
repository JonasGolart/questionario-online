import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main() {
  const q = await prisma.questionnaire.findFirst();
  const u = await prisma.user.findFirst();
  
  if (!q || !u) {
    console.error('Nenhum questionário ou usuário encontrado para vincular o token de teste.');
    return;
  }
  
  const token = await prisma.accessToken.upsert({
    where: { code: 'TEST-1234' },
    update: { 
      status: 'ACTIVE', 
      maxUses: 9999, 
      expiresAt: new Date('2030-01-01'),
      questionnaireId: q.id
    },
    create: { 
      code: 'TEST-1234', 
      questionnaireId: q.id, 
      issuerId: u.id, 
      status: 'ACTIVE', 
      maxUses: 9999, 
      expiresAt: new Date('2030-01-01') 
    }
  });
  
  console.log('Token de teste (TEST-1234) criado/atualizado com sucesso.');
  console.log('Questionário vinculado:', q.name);
  console.log('Aluno padrão: Aluno de Teste');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
