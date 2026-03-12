-- Phase 2: Chat history + rate limiting
-- Run this in the Supabase SQL editor or via supabase db push

-- Chat messages table (scoped per user + saved department)
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  dept_id uuid references departments(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

alter table chat_messages enable row level security;

create policy "Users see own chat messages"
  on chat_messages for select
  using (auth.uid() = user_id);

create policy "Users insert own chat messages"
  on chat_messages for insert
  with check (auth.uid() = user_id);

create policy "Users delete own chat messages"
  on chat_messages for delete
  using (auth.uid() = user_id);

create index chat_messages_lookup_idx
  on chat_messages (user_id, dept_id, created_at);

-- Rate limiting table (one row per user, tracks current window)
create table chat_rate_limits (
  user_id uuid references auth.users(id) on delete cascade primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

-- Atomic check-and-increment function.
-- Returns true if the request is allowed, false if rate limited.
-- Runs as security definer (postgres), bypassing RLS.
create or replace function check_chat_rate_limit(
  p_user_id uuid,
  p_max int default 20,
  p_window_secs int default 60
) returns boolean
language plpgsql security definer as $$
declare
  v_count int;
  v_window_start timestamptz;
begin
  select count, window_start
  into v_count, v_window_start
  from chat_rate_limits
  where user_id = p_user_id;

  if not found
     or now() - v_window_start > (p_window_secs || ' seconds')::interval
  then
    insert into chat_rate_limits (user_id, count, window_start)
    values (p_user_id, 1, now())
    on conflict (user_id) do update set count = 1, window_start = now();
    return true;
  end if;

  if v_count >= p_max then
    return false;
  end if;

  update chat_rate_limits set count = count + 1
  where user_id = p_user_id;
  return true;
end;
$$;

-- Allow authenticated users to call this function
grant execute on function check_chat_rate_limit to authenticated;
