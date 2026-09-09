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

-- Sistema de gestão: mantém cada entrada e saída como histórico permanente.
alter table public.acolhidos add column if not exists origem_encaminhamento text;
alter table public.acolhidos add column if not exists naturalidade text;
alter table public.acolhidos add column if not exists sexo text;
alter table public.acolhidos add column if not exists rg text;
alter table public.acolhidos add column if not exists orgao_emissor text;
alter table public.acolhidos add column if not exists email text;
alter table public.acolhidos add column if not exists nome_pai text;
alter table public.acolhidos add column if not exists nome_mae text;
alter table public.acolhidos add column if not exists contato_familiar text;
alter table public.acolhidos add column if not exists dependentes_renda text;
alter table public.acolhidos add column if not exists renda_familiar text;
alter table public.acolhidos add column if not exists problemas_justica text;
alter table public.acolhidos add column if not exists problemas_vicios text;
alter table public.acolhidos add column if not exists horario_chegada text;
alter table public.acolhidos add column if not exists faixa_etaria text;
alter table public.acolhidos add column if not exists identidade_genero text;
alter table public.acolhidos add column if not exists raca_cor_etnia text;
alter table public.acolhidos add column if not exists veio_de_outro_local text;
alter table public.acolhidos add column if not exists documentacao_basica text;
alter table public.acolhidos add column if not exists beneficiario_programas text;
alter table public.acolhidos add column if not exists link_pasta text;
alter table public.acolhidos add column if not exists motivo_desligamento text;
alter table public.acolhidos add column if not exists data_desligamento date;
alter table public.acolhidos add column if not exists tempo_na_casa text;
alter table public.acolhidos add column if not exists reincidencia text;
alter table public.acolhidos add column if not exists codigo_acolhido text;

create table if not exists public.acolhido_movimentacoes (
  id uuid primary key default gen_random_uuid(),
  acolhido_id uuid not null references public.acolhidos(id) on delete cascade,
  tipo text not null check (tipo in ('entrada', 'saida', 'encaminhamento', 'alteracao_status')),
  data_evento date not null default current_date,
  status_anterior text,
  status_novo text,
  motivo text,
  observacoes text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz not null default now()
);

create table if not exists public.configuracoes_casa (
  id integer primary key default 1 check (id = 1),
  capacidade_total integer not null default 0 check (capacidade_total >= 0),
  atualizado_por uuid references auth.users(id),
  atualizado_em timestamptz not null default now()
);

alter table public.acolhido_movimentacoes enable row level security;
alter table public.configuracoes_casa enable row level security;

drop policy if exists movimentacoes_select_authenticated on public.acolhido_movimentacoes;
drop policy if exists movimentacoes_insert_authenticated on public.acolhido_movimentacoes;
drop policy if exists configuracoes_select_authenticated on public.configuracoes_casa;
drop policy if exists configuracoes_write_authenticated on public.configuracoes_casa;

create policy movimentacoes_select_authenticated on public.acolhido_movimentacoes
  for select using (auth.role() = 'authenticated');
create policy movimentacoes_insert_authenticated on public.acolhido_movimentacoes
  for insert with check (auth.role() = 'authenticated');
create policy configuracoes_select_authenticated on public.configuracoes_casa
  for select using (auth.role() = 'authenticated');
create policy configuracoes_write_authenticated on public.configuracoes_casa
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

create index if not exists movimentacoes_acolhido_idx on public.acolhido_movimentacoes(acolhido_id, data_evento desc);
create index if not exists movimentacoes_tipo_data_idx on public.acolhido_movimentacoes(tipo, data_evento);
