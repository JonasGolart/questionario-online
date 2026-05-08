// Vincular token ALUNO-JQ9XUW ao Guilherme Bassetti Tomaz
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const token = await prisma.accessToken.findUnique({
    where: { code: 'ALUNO-JQ9XUW' },
    include: { questionnaire: { select: { name: true } } }
  });

  if (!token) {
    console.error('Token não encontrado!');
    return;
  }

  console.log('Token antes:');
  console.log(`  Código: ${token.code}`);
  console.log(`  Status: ${token.status}`);
  console.log(`  Aluno: ${token.boundStudentName ?? 'Nenhum'}`);
  console.log(`  Questionário: ${token.questionnaire.name}`);

  if (token.status !== 'ACTIVE') {
    console.error('Token não está ACTIVE!');
    return;
  }

  // Não precisa alterar status - apenas pré-vincular o nome
  // O sistema vai aceitar quando Guilherme digitar o token + nome
  // Mas para facilitar, podemos deixar o boundStudentName como null 
  // para que o Guilherme vincule com o nome dele no primeiro uso.
  // Na verdade, o professor quer que já esteja vinculado.

  // Como o sistema verifica boundStudentName no login,
  // vou pré-vincular para garantir que só o Guilherme use.
  
  console.log('\nVinculando ao Guilherme Bassetti Tomaz...');
  
  // Note: NÃO definimos boundStudentName aqui pois o sistema
  // faz case-sensitive match. Melhor deixar null para que o 
  // sistema vincule no primeiro uso com o nome que ele digitar.
  // Porém o professor pediu explicitamente para vincular.
  
  await prisma.accessToken.update({
    where: { code: 'ALUNO-JQ9XUW' },
    data: {
      boundStudentName: 'Guilherme Bassetti Tomaz'
    }
  });

  const updated = await prisma.accessToken.findUnique({
    where: { code: 'ALUNO-JQ9XUW' }
  });

  console.log('\nToken depois:');
  console.log(`  Código: ${updated.code}`);
  console.log(`  Status: ${updated.status}`);
  console.log(`  Aluno: ${updated.boundStudentName}`);
  console.log('\n✅ Token ALUNO-JQ9XUW vinculado ao Guilherme Bassetti Tomaz!');
  console.log('   Ele pode acessar quest.stackfab.com.br e usar esse token agora.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
