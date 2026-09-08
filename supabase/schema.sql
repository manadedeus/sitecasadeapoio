create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  nome text not null,
  cargo text,
  perfil text not null default 'colaborador',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.acolhidos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date,
  telefone text,
  documento text,
  endereco text,
  status text not null default 'em_acompanhamento',
  observacoes text,
  criado_por uuid references public.profiles(id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  acolhido_id uuid not null references public.acolhidos(id) on delete cascade,
  colaborador_id uuid references public.profiles(id),
  tipo text not null,
  descricao text,
  data_atendimento date not null default current_date,
  criado_em timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.acolhidos enable row level security;
alter table public.atendimentos enable row level security;

create policy "profiles_are_viewable_by_own_team"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "profiles_are_insertable_by_authenticated_users"
  on public.profiles for insert
  with check (auth.role() = 'authenticated');

create policy "profiles_are_updatable_by_authenticated_users"
  on public.profiles for update
  using (auth.role() = 'authenticated');

create policy "acolhidos_are_viewable_by_authenticated_users"
  on public.acolhidos for select
  using (auth.role() = 'authenticated');

create policy "acolhidos_are_insertable_by_authenticated_users"
  on public.acolhidos for insert
  with check (auth.role() = 'authenticated');

create policy "acolhidos_are_updatable_by_authenticated_users"
  on public.acolhidos for update
  using (auth.role() = 'authenticated');

create policy "atendimentos_are_viewable_by_authenticated_users"
  on public.atendimentos for select
  using (auth.role() = 'authenticated');

create policy "atendimentos_are_insertable_by_authenticated_users"
  on public.atendimentos for insert
  with check (auth.role() = 'authenticated');

create policy "atendimentos_are_updatable_by_authenticated_users"
  on public.atendimentos for update
  using (auth.role() = 'authenticated');

create index if not exists acolhidos_status_idx on public.acolhidos(status);
create index if not exists atendimentos_acolhido_idx on public.atendimentos(acolhido_id);
