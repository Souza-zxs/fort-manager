import { SupabaseClient } from '@supabase/supabase-js';
import { Database, SyncStateRow, SyncStateInsert } from '../infra/database/supabase.js';

export class SyncStateRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  async getLastSyncTimestamp(integrationId: string, entityType: string): Promise<Date | null> {
    const { data, error } = await this.db
      .from('sync_state')
      .select('last_sync_at')
      .eq('integration_id', integrationId)
      .eq('entity_type', entityType)
      .single();

    if (error || !data) return null;
    return new Date(data.last_sync_at);
  }

  async upsertTimestamp(integrationId: string, entityType: string, timestamp: Date): Promise<void> {
    const row: SyncStateInsert = {
      integration_id: integrationId,
      entity_type: entityType,
      last_sync_at: timestamp.toISOString(),
    };

    const { error } = await this.db
      .from('sync_state')
      .upsert(row as any, { onConflict: 'integration_id,entity_type' });

    if (error) throw new Error(error.message);
  }

  async getAllForIntegration(integrationId: string): Promise<SyncStateRow[]> {
    const { data, error } = await this.db
      .from('sync_state')
      .select('*')
      .eq('integration_id', integrationId);

    if (error) throw new Error(error.message);
    return data ?? [];
  }
}


