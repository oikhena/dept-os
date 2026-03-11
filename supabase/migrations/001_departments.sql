-- Phase 1: Departments table
-- Run this in the Supabase SQL editor or via supabase db push

create table departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  label text not null,
  kind text not null check (kind in ('generated', 'custom')),
  generation_query text,
  data jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table departments enable row level security;

create policy "Users see own departments"
  on departments for select
  using (auth.uid() = user_id);

create policy "Users insert own departments"
  on departments for insert
  with check (auth.uid() = user_id);

create policy "Users update own departments"
  on departments for update
  using (auth.uid() = user_id);

create policy "Users delete own departments"
  on departments for delete
  using (auth.uid() = user_id);

-- Auto-update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger departments_updated_at
  before update on departments
  for each row execute function update_updated_at();

-- Index for fast user lookups
create index departments_user_id_idx on departments(user_id);
