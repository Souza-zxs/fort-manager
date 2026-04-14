/**
 * Script para verificar schema do banco
 * Execute: npx tsx scripts/check-schema.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!, 
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkSchema() {
  console.log('🧪 Verificando schema do banco...\n');

  // Buscar dados de integrations para ver as colunas
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .limit(1);

  if (error && error.message.includes('does not exist')) {
    console.log('⚠️ Tabela integrations não existe ou não tem dados');
  } else if (data && data.length > 0) {
    console.log('📋 Colunas da tabela integrations:');
    console.log(Object.keys(data[0]).join(', '));
  } else {
    console.log('⚠️ Nenhum registro encontrado, mas a tabela existe');
    
    // Tentar sem filtro para ver se há dados
    const { data: allData } = await supabase.from('integrations').select('*');
    if (allData && allData.length > 0) {
      console.log('📋 Colunas da tabela integrations:');
      console.log(Object.keys(allData[0]).join(', '));
    }
  }

  // Verificar orders
  const { data: ordersData } = await supabase.from('orders').select('*').limit(1);
  if (ordersData && ordersData.length > 0) {
    console.log('\n📋 Colunas da tabela orders:');
    console.log(Object.keys(ordersData[0]).join(', '));
  }

  // Verificar payments
  const { data: paymentsData } = await supabase.from('payments').select('*').limit(1);
  if (paymentsData && paymentsData.length > 0) {
    console.log('\n📋 Colunas da tabela payments:');
    console.log(Object.keys(paymentsData[0]).join(', '));
  }

  // Verificar sync_state
  const { data: syncData } = await supabase.from('sync_state').select('*').limit(1);
  if (syncData && syncData.length > 0) {
    console.log('\n📋 Colunas da tabela sync_state:');
    console.log(Object.keys(syncData[0]).join(', '));
  }

  // Verificar webhook_events
  const { data: webhookData } = await supabase.from('webhook_events').select('*').limit(1);
  if (webhookData && webhookData.length > 0) {
    console.log('\n📋 Colunas da tabela webhook_events:');
    console.log(Object.keys(webhookData[0]).join(', '));
  }

  console.log('\n✅ Verificação concluída!');
}

checkSchema().catch(console.error);