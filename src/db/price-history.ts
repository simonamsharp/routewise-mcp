import type { SupabaseClient } from '@supabase/supabase-js';
import type { PriceHistoryEntry, PriceChange } from '../engine/types.js';

export async function insertPriceChange(
  supabase: SupabaseClient,
  entry: Omit<PriceHistoryEntry, 'id' | 'detected_at'>,
): Promise<void> {
  const { error } = await supabase.from('price_history').insert({
    model_id: entry.model_id,
    field_changed: entry.field_changed,
    old_value: entry.old_value,
    new_value: entry.new_value,
    change_pct: entry.change_pct,
  });

  if (error) throw new Error(`Failed to insert price change: ${error.message}`);
}

export async function getPriceChangesSince(
  supabase: SupabaseClient,
  since: string,
  modelId?: string,
  provider?: string,
): Promise<PriceChange[]> {
  let query = supabase
    .from('price_history')
    .select('*, models!inner(provider, display_name)')
    .gte('detected_at', since)
    .order('detected_at', { ascending: false });

  if (modelId) {
    query = query.eq('model_id', modelId);
  }
  if (provider) {
    query = query.eq('models.provider', provider);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch price changes: ${error.message}`);

  return (data ?? []).map((row): PriceChange => {
    const field = row.field_changed as string;
    const isInput = field === 'pricing_prompt';
    const isOutput = field === 'pricing_completion';

    return {
      model_id: row.model_id,
      change_type: row.new_value > row.old_value ? 'price_increase' : 'price_decrease',
      old_input_price: isInput ? row.old_value * 1_000_000 : null,
      new_input_price: isInput ? row.new_value * 1_000_000 : null,
      old_output_price: isOutput ? row.old_value * 1_000_000 : null,
      new_output_price: isOutput ? row.new_value * 1_000_000 : null,
      percent_change: row.change_pct,
      detected_at: row.detected_at,
      note: `${field.replace('pricing_', '')} price ${row.new_value > row.old_value ? 'increased' : 'decreased'} by ${Math.abs(row.change_pct).toFixed(1)}%`,
    };
  });
}
