/**
 * Script para trocar código OAuth por token de acesso
 * Execute: npx tsx scripts/exchange-token.ts <CODIGO_AUTORIZACAO>
 * 
 * Exemplo: npx tsx scripts/exchange-token.ts TG-123456789-1234567890123-ABC123DEF456
 */
import * as dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';

const APP_ID = process.env.MELI_APP_ID;
const CLIENT_SECRET = process.env.MELI_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost:5173/integracoes';

async function exchangeCode(code: string) {
  console.log('🔄 Trocando código por token...\n');
  console.log(`📋 Code: ${code}\n`);

  if (!APP_ID || !CLIENT_SECRET) {
    console.error('❌ ERR: MELI_APP_ID ou MELI_CLIENT_SECRET não configurados');
    process.exit(1);
  }

  try {
    const response = await axios.post(
      'https://api.mercadolibre.com/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: APP_ID,
        client_secret: CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 30_000,
      }
    );

    console.log('✅ Token obtido com sucesso!\n');
    console.log('📊 Resposta:');
    console.log(`   access_token: ${response.data.access_token.substring(0, 20)}...`);
    console.log(`   token_type: ${response.data.token_type}`);
    console.log(`   expires_in: ${response.data.expires_in} segundos (${Math.round(response.data.expires_in / 3600)}h)`);
    console.log(`   refresh_token: ${response.data.refresh_token.substring(0, 20)}...`);
    console.log(`   user_id: ${response.data.user_id}`);
    console.log(`   scope: ${response.data.scope}`);

    console.log('\n📝 Próximos passos:');
    console.log('   1. Copie os tokens para o banco de dados');
    console.log('   2. Use o access_token para fazer chamadas API');
    console.log('   3. Use o refresh_token para renovar quando expirar');

  } catch (error: any) {
    console.error('❌ Erro ao trocar código por token:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    } else {
      console.error(`   ${error.message}`);
    }
    console.error('\n⚠️ Possíveis causas:');
    console.error('   - Código expirou (válido por apenas alguns minutos)');
    console.error('   - Redirect URI não corresponde');
    console.error('   - App não está ativo no painel do ML');
    process.exit(1);
  }
}

// Pegar código dos argumentos
const code = process.argv[2];
if (!code) {
  console.error('❌ Usage: npx tsx scripts/exchange-token.ts <CODIGO_AUTORIZACAO>');
  console.error('\n📋 Para obter o código:');
  console.log('   1. Acesse: https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=7390366245628041&redirect_uri=http%3A%2F%2Flocalhost%3A5173%2Fintegracoes');
  console.log('   2. Autorize o app');
  console.log('   3. Copie o código da URL de retorno (after "code=")');
  process.exit(1);
}

exchangeCode(code);