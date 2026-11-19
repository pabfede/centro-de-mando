import { supabase } from '../../lib/supabase';
import type { Note } from './types';

export async function listNotes(): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getNote(id: string): Promise<Note> {
  const { data, error } = await supabase.from('notes').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function createNote(input: { title: string; content: string }): Promise<Note> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('notes')
    .insert({ ...input, user_id: userData.user!.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateNote(
  id: string,
  input: { title: string; content: string },
): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw error;
}
