import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function setup() {
  try {
    // 1. Pegar o último questionário criado
    const q = await prisma.questionnaire.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!q) {
      console.log("Nenhum questionário encontrado. Crie um primeiro no Admin.");
      return;
    }

    console.log(`Configurando token de teste para: ${q.name}`);

    // 2. Criar ou atualizar o token TEST-1234
    const token = await prisma.accessToken.upsert({
      where: { code: 'TEST-1234' },
      update: {
        questionnaireId: q.id,
        status: 'ACTIVE',
        maxUses: 9999, // Praticamente infinito
        expiresAt: new Date('2030-01-01') // Expiração longa
      },
      create: {
        code: 'TEST-1234',
        questionnaireId: q.id,
        issuerId: q.teacherId,
        status: 'ACTIVE',
        maxUses: 9999,
        expiresAt: new Date('2030-01-01'),
        boundStudentName: 'Aluno de Teste'
      }
    });

    console.log(`✅ Sucesso! Token TEST-1234 vinculado ao questionário: ${q.name}`);
  } catch (error) {
    console.error("Erro ao configurar token:", error);
  } finally {
    await prisma.$disconnect();
  }
}

setup();
