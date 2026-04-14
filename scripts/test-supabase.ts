/**
 * Script de teste de conexão com Supabase
 * Execute: npx tsx scripts/test-supabase.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testSupabase() {
  console.log('🧪 Testando conexão com Supabase...\n');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ ERR: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
    process.exit(1);
  }
  
  console.log(`📡 URL: ${SUPABASE_URL}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Teste 1: Tabelas existentes
  console.log('\n📡 Teste 1: Verificando tabelas...');
  
  try {
    // Testar tabela integrations
    const { data: integrations, error: intError } = await supabase
      .from('integrations')
      .select('id, marketplace, is_active')
      .limit(5);
    
    if (intError) {
      console.error(`   ❌ Erro em 'integrations': ${intError.message}`);
    } else {
      console.log(`   ✅ Tabela 'integrations': ${integrations?.length ?? 0} registros`);
    }

    // Testar tabela orders
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('id, external_order_id, status')
      .limit(5);
    
    if (orderError) {
      console.error(`   ❌ Erro em 'orders': ${orderError.message}`);
    } else {
      console.log(`   ✅ Tabela 'orders': ${orders?.length ?? 0} registros`);
    }

    // Testar tabela payments
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('id, external_transaction_id, status')
      .limit(5);
    
    if (payError) {
      console.error(`   ❌ Erro em 'payments': ${payError.message}`);
    } else {
      console.log(`   ✅ Tabela 'payments': ${payments?.length ?? 0} registros`);
    }

    // Testar sync_state (se existir)
    const { data: syncState, error: syncError } = await supabase
      .from('sync_state')
      .select('id, entity_type')
      .limit(5);
    
    if (syncError) {
      console.log(`   ⚠️ Tabela 'sync_state': ${syncError.message} (pode não existir)`);
    } else {
      console.log(`   ✅ Tabela 'sync_state': ${syncState?.length ?? 0} registros`);
    }

    // Testar webhook_events (se existir)
    const { data: webhooks, error: webError } = await supabase
      .from('webhook_events')
      .select('id, topic, processed')
      .limit(5);
    
    if (webError) {
      console.log(`   ⚠️ Tabela 'webhook_events': ${webError.message} (pode não existir)`);
    } else {
      console.log(`   ✅ Tabela 'webhook_events': ${webhooks?.length ?? 0} registros`);
    }

  } catch (error: any) {
    console.error(`   ❌ Erro: ${error.message}`);
    return;
  }

  console.log('\n✅ Conexão com Supabase OK!');
}

testSupabase().catch(console.error);