import { supabase } from '../../lib/supabase';
import type { KanbanCard, KanbanStatus } from './types';

export async function listCards(): Promise<KanbanCard[]> {
  const { data, error } = await supabase
    .from('kanban_cards')
    .select('*')
    .order('position', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createCard(title: string): Promise<KanbanCard> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('kanban_cards')
    .insert({ title, status: 'pending', user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCardStatus(id: string, status: KanbanStatus): Promise<void> {
  const { error } = await supabase
    .from('kanban_cards')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from('kanban_cards').delete().eq('id', id);
  if (error) throw error;
}
