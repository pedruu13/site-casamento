const { execSync } = require('child_process');

const token = 'APP_USR-830670487552796-072520-b9accc474b03d68254912f4c40351cfd-3490727779';

try {
  console.log('Adicionando em production...');
  execSync('npx vercel env add MERCADO_PAGO_ACCESS_TOKEN production', { input: token, stdio: ['pipe', 'inherit', 'inherit'] });
} catch (e) {
  console.log('Erro ao adicionar em production (pode ja existir)');
}

try {
  console.log('Adicionando em preview...');
  execSync('npx vercel env add MERCADO_PAGO_ACCESS_TOKEN preview', { input: token, stdio: ['pipe', 'inherit', 'inherit'] });
} catch (e) {
  console.log('Erro ao adicionar em preview (pode ja existir)');
}

try {
  console.log('Adicionando em development...');
  execSync('npx vercel env add MERCADO_PAGO_ACCESS_TOKEN development', { input: token, stdio: ['pipe', 'inherit', 'inherit'] });
} catch (e) {
  console.log('Erro ao adicionar em development (pode ja existir)');
}
