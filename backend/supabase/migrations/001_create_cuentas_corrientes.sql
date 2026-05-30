create table if not exists public.cuentas_corrientes (
  id uuid primary key default gen_random_uuid(),
  usuario_a_id uuid not null references auth.users(id) on delete cascade,
  usuario_b_id uuid not null references auth.users(id) on delete cascade,
  saldo numeric(18,2) not null default 0.00,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint cuentas_corrientes_par_unico unique (usuario_a_id, usuario_b_id),
  constraint cuentas_corrientes_distinto check (usuario_a_id <> usuario_b_id)
);

create index idx_cuentas_corrientes_usuario_a on public.cuentas_corrientes(usuario_a_id);
create index idx_cuentas_corrientes_usuario_b on public.cuentas_corrientes(usuario_b_id);

alter table public.cuentas_corrientes enable row level security;

create policy "Los usuarios ven sus propias cuentas corrientes"
  on public.cuentas_corrientes
  for select
  using (auth.uid() = usuario_a_id or auth.uid() = usuario_b_id);

create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.cuentas_corrientes
  for each row
  execute function public.handle_updated_at();
