export type KanbanStatus = 'pending' | 'in_progress' | 'done';

export type KanbanCard = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: KanbanStatus;
  position: number;
  created_at: string;
  updated_at: string;
};
