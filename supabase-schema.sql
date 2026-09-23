-- Rode este script no Supabase: seu projeto → SQL Editor → New query → Run.
-- Cria a tabela onde o progresso de cada usuário fica salvo, e garante que
-- cada usuário só possa ler/gravar a própria linha (Row Level Security).

create table if not exists public.player_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.player_state enable row level security;

create policy "select own state" on public.player_state
  for select using (auth.uid() = user_id);

create policy "insert own state" on public.player_state
  for insert with check (auth.uid() = user_id);

create policy "update own state" on public.player_state
  for update using (auth.uid() = user_id);
