/**
 * Script de teste de conexão com Mercado Livre
 * Execute: npx tsx scripts/test-meli-connection.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { MeliAdapter } from '../src/api/marketplaces/adapters/ml.adapter';

const APP_ID = process.env.MELI_APP_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;

async function testConnection() {
  console.log('🧪 Testando conexão com Mercado Livre...\n');
  
  if (!APP_ID || !CLIENT_SECRET) {
    console.error('❌ ERR: MELI_APP_ID ou MELI_CLIENT_SECRET não configurados');
    process.exit(1);
  }
  
  console.log(`📋 App ID: ${APP_ID}`);
  console.log(`🔐 Client Secret: ${CLIENT_SECRET.substring(0, 8)}...\n`);

  // Criar adapter (sem token, apenas para testar API pública)
  const adapter = new MeliAdapter({
    app_id: APP_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: 'http://localhost:5173/integracoes',
    access_token: '',
    refresh_token: '',
    user_id: 0,
    expires_at: new Date(),
  });

  // Teste 1: Validar credenciais (chamar API pública)
  console.log('📡 Teste 1: Buscando sites disponíveis...');
  try {
    const { data: sites } = await adapter['client'].get('sites');
    console.log(`   ✅ Sites disponíveis: ${sites.length}`);
    const brlSite = sites.find((s: any) => s.id === 'MLB');
    console.log(`   ✅ Site Brasil (MLB): ${brlSite?.name}`);
  } catch (error: any) {
    console.error(`   ❌ Erro: ${error.message}`);
    return;
  }

  // Teste 2: Buscar categorias
  console.log('\n📡 Teste 2: Buscando categorias...');
  try {
    const { data: categories } = await adapter['client'].get('sites/MLB/categories');
    console.log(`   ✅ Categorias encontradas: ${categories.length}`);
    console.log(`   📌 Exemplo: ${categories[0]?.id} - ${categories[0]?.name}`);
  } catch (error: any) {
    console.error(`   ❌ Erro: ${error.message}`);
  }

  // Teste 3: Verificar configuração de OAuth (sem fazer login)
  console.log('\n📡 Teste 3: URL de autorização OAuth...');
  const authUrl = `https://auth.mercadolibre.com/authorization?response_type=code&client_id=${APP_ID}&redirect_uri=http://localhost:5173/integracoes`;
  console.log(`   ✅ URL gerada: ${authUrl}`);

  console.log('\n✅ Teste de conexão concluído!');
  console.log('\n📝 Próximos passos:');
  console.log('   1. Acesse a URL de OAuth acima');
  console.log('   2. Autorize o aplicativo');
  console.log('   3. Copie o código retornado');
  console.log('   4. Execute o script de troca de token');
}

testConnection().catch(console.error);