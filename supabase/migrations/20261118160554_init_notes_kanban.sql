create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','in_progress','done')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notes enable row level security;
alter table public.kanban_cards enable row level security;

create policy "own notes only" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own kanban cards only" on public.kanban_cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
