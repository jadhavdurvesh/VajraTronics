-- VajraTronics public site data schema
-- Run in the Supabase SQL Editor for the project's own Supabase instance.
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null default 'Engineering',
  summary text not null,
  body text not null default '',
  status text not null default 'In development',
  cover_image_url text,
  tags text[] not null default '{}',
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  project_slug text,
  title text not null,
  summary text not null,
  entry_date date not null default current_date,
  status text not null default 'Work in progress',
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  topic text not null default 'General enquiry' check (char_length(topic) <= 120),
  message text not null check (char_length(message) between 10 and 5000),
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.journal_entries enable row level security;
alter table public.contact_messages enable row level security;

drop policy if exists "Public can read published projects" on public.projects;
create policy "Public can read published projects"
  on public.projects for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Public can read published journal entries" on public.journal_entries;
create policy "Public can read published journal entries"
  on public.journal_entries for select to anon, authenticated
  using (is_published = true);

drop policy if exists "Visitors may send contact messages" on public.contact_messages;
create policy "Visitors may send contact messages"
  on public.contact_messages for insert to anon, authenticated
  with check (
    char_length(trim(name)) > 0
    and char_length(trim(email)) >= 3
    and char_length(trim(message)) >= 10
  );

-- Intentionally no public SELECT, UPDATE or DELETE policy on contact_messages.
-- Never put a service-role key in client-side environment variables.
grant select on public.projects, public.journal_entries to anon, authenticated;
grant insert on public.contact_messages to anon, authenticated;

comment on table public.contact_messages is 'Private inbound enquiries; never readable by anonymous visitors.';
comment on table public.projects is 'Project records. Public clients can only read records marked published.';
comment on table public.journal_entries is 'Engineering journal entries. Public clients can only read published entries.';
