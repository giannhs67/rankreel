-- RankReel — initial schema (M0)
-- Single-owner app: every row is scoped to owner_id = auth.uid().
-- There is exactly one real user per deployment (see README.md), so storage policies below
-- check "auth.uid() is not null" rather than matching a
-- per-user folder prefix — any authenticated request *is* the owner.

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  format text not null check (format in ('ranking_list', 'title_banner', 'caption')),
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  template_id uuid references templates (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clips (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  order_index int not null default 0,
  storage_path text not null,
  title text not null default '',
  number int,
  trim_start numeric,
  trim_end numeric,
  created_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  owner_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'rendering', 'done', 'error')),
  progress numeric not null default 0,
  output_path text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clips_project_id_idx on clips (project_id);
create index if not exists jobs_project_id_idx on jobs (project_id);

-- Row Level Security: every table scoped to owner_id = auth.uid()
alter table templates enable row level security;
alter table projects enable row level security;
alter table clips enable row level security;
alter table jobs enable row level security;

create policy "templates_owner_all" on templates
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "projects_owner_all" on projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "clips_owner_all" on clips
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "jobs_owner_all" on jobs
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- Realtime on jobs for live render progress
alter publication supabase_realtime add table jobs;

-- Storage buckets: private, owner-only
insert into storage.buckets (id, name, public)
values ('clips', 'clips', false), ('renders', 'renders', false), ('fonts', 'fonts', false)
on conflict (id) do nothing;

create policy "clips_bucket_owner_all" on storage.objects
  for all using (bucket_id = 'clips' and auth.uid() is not null)
  with check (bucket_id = 'clips' and auth.uid() is not null);

create policy "renders_bucket_owner_all" on storage.objects
  for all using (bucket_id = 'renders' and auth.uid() is not null)
  with check (bucket_id = 'renders' and auth.uid() is not null);

create policy "fonts_bucket_owner_all" on storage.objects
  for all using (bucket_id = 'fonts' and auth.uid() is not null)
  with check (bucket_id = 'fonts' and auth.uid() is not null);
