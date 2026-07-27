-- Migration 0001_init.sql: Core schema and RLS for QuickBoard

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_online boolean default false,
  last_seen_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view any profile"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Function and trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- BOARDS TABLE
create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

alter table public.boards enable row level security;

create policy "Users can view their own boards"
  on public.boards for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own boards"
  on public.boards for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own boards"
  on public.boards for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own boards"
  on public.boards for delete
  using (auth.uid() = owner_id);

-- TASKS TABLE
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  status text not null check (status in ('todo', 'in_progress', 'done')) default 'todo',
  sketch_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users can view their own tasks"
  on public.tasks for select
  using (auth.uid() = owner_id);

create policy "Users can insert their own tasks"
  on public.tasks for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their own tasks"
  on public.tasks for update
  using (auth.uid() = owner_id);

create policy "Users can delete their own tasks"
  on public.tasks for delete
  using (auth.uid() = owner_id);

-- Function and trigger to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace trigger on_task_updated
  before update on public.tasks
  for each row execute procedure public.handle_updated_at();

-- STORAGE BUCKET FOR SKETCHES
insert into storage.buckets (id, name, public)
values ('sketches', 'sketches', true)
on conflict (id) do nothing;

create policy "Public Access to Sketches"
  on storage.objects for select
  using (bucket_id = 'sketches');

create policy "Authenticated Users can upload sketches"
  on storage.objects for insert
  with check (bucket_id = 'sketches' and auth.role() = 'authenticated');

create policy "Users can update their sketches"
  on storage.objects for update
  using (bucket_id = 'sketches' and auth.role() = 'authenticated');

create policy "Users can delete their sketches"
  on storage.objects for delete
  using (bucket_id = 'sketches' and auth.role() = 'authenticated');

-- REALTIME PUBLICATION
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.profiles;
