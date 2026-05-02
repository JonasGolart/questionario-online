import { startAttempt } from '../src/services/tokenService.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
  try {
    console.log('Testando startAttempt com TEST-1234...');
    const result = await startAttempt({
      token: 'TEST-1234',
      studentFullName: 'Aluno de Teste'
    });
    console.log('Sucesso:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Falha:', error.message);
  }
}

main().finally(() => process.exit());
