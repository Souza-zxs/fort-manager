/**
 * Script de teste de conexão com Mercado Livre (API Pública)
 * Execute: npx tsx scripts/test-meli-connection.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const APP_ID = process.env.MELI_APP_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;

const BASE_URL = 'https://api.mercadolibre.com';

async function testConnection() {
  console.log('🧪 Testando conexão com Mercado Livre...\n');
  
  if (!APP_ID || !CLIENT_SECRET) {
    console.error('❌ ERR: MELI_APP_ID ou MELI_CLIENT_SECRET não configurados');
    process.exit(1);
  }
  
  console.log(`📋 App ID: ${APP_ID}`);
  console.log(`🔐 Client Secret: ${CLIENT_SECRET.substring(0, 8)}...\n`);

  // Teste 1: API pública - buscar sites (sem headers)
  console.log('📡 Teste 1: Buscando sites disponíveis...');
  try {
    const response = await axios.get(`${BASE_URL}/sites`, {
      timeout: 10000,
      validateStatus: (status) => status < 500,
    });
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, response.data);
  } catch (error: any) {
    console.error(`   ❌ Erro: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    return;
  }

  // Teste 2: Buscar categorias
  console.log('\n📡 Teste 2: Buscando categorias...');
  try {
    const response = await axios.get(`${BASE_URL}/sites/MLB/categories`, {
      timeout: 10000,
    });
    const categories = response.data;
    console.log(`   ✅ Categorias encontradas: ${categories.length}`);
    console.log(`   📌 Exemplo: ${categories[0]?.id} - ${categories[0]?.name}`);
  } catch (error: any) {
    console.error(`   ❌ Erro: ${error.message}`);
  }

  // Teste 3: URL de autorização OAuth (usando redirect local)
  console.log('\n📡 Teste 3: URL de autorização OAuth (LOCAL)...');
  const authUrl = `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${APP_ID}&redirect_uri=${encodeURIComponent('http://localhost:5173/integracoes')}&scope=read write offline_access`;
  console.log(`   ✅ URL gerada:\n   ${authUrl}`);

  console.log('\n✅ Teste concluído!');
}

testConnection().catch(console.error);