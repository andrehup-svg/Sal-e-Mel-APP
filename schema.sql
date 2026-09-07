-- ============================================================
-- Sal e Mel — schema inicial (Supabase / Postgres)
-- Acompanha o documento regras-de-negocio.md
-- RLS: habilitado mas com policies de exemplo — ajustar conforme
-- a definição de papéis (dono x sócia) antes de ir pra produção.
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Clientes ----------
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  created_at timestamptz not null default now()
);

-- ---------- Categorias de preço ----------
create table categorias_preco (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo text not null check (tipo in ('cento','pacote')),
  preco_cento numeric(10,2), -- obrigatório apenas quando tipo = 'cento'
  created_at timestamptz not null default now(),
  constraint preco_cento_exigido check (
    (tipo = 'cento' and preco_cento is not null) or (tipo = 'pacote')
  )
);

-- ---------- Produtos ----------
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid not null references categorias_preco(id) on delete restrict,
  preco numeric(10,2), -- só usado quando a categoria é do tipo 'pacote'
  vendido_mes numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Vendas ----------
create table vendas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  data_entrega date,
  valor_total numeric(10,2) not null default 0,
  sinal numeric(10,2) not null default 0,
  restante numeric(10,2) not null default 0,
  status_pagamento text not null default 'Pendente' check (status_pagamento in ('Pago','Pendente')),
  status_entrega text not null default 'Pendente' check (status_entrega in ('Pendente','Entregue')),
  created_at timestamptz not null default now()
);

-- ---------- Itens de cada venda ----------
create table venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas(id) on delete cascade,
  produto_id uuid not null references produtos(id) on delete restrict,
  quantidade numeric(10,2) not null,
  valor_item numeric(10,2) not null -- calculado no momento da venda (snapshot do preço)
);

-- ---------- Cartões de crédito ----------
create table cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  dia_vencimento int not null default 8
);

-- ---------- Compras ----------
create table compras (
  id uuid primary key default gen_random_uuid(),
  fornecedor text not null,
  item text,
  valor numeric(10,2) not null,
  forma_pagamento text not null check (forma_pagamento in ('pix','cartao')),
  cartao_id uuid references cartoes(id), -- obrigatório quando forma_pagamento = 'cartao'
  status text not null default 'Pago' check (status in ('Pago','Na fatura')),
  data_compra date,
  created_at timestamptz not null default now(),
  constraint cartao_exigido check (
    (forma_pagamento = 'cartao' and cartao_id is not null) or (forma_pagamento = 'pix')
  )
);

-- ---------- Histórico de faturas pagas ----------
create table faturas_pagas (
  id uuid primary key default gen_random_uuid(),
  cartao_id uuid not null references cartoes(id),
  valor_total numeric(10,2) not null,
  data_pagamento date not null default current_date
);

-- ---------- Estoque ----------
create table estoque (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  quantidade numeric(10,2) not null default 0,
  unidade text not null default 'un',
  minimo numeric(10,2) not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- Parâmetros da divisão de lucro (linha única) ----------
create table parametros_divisao (
  id int primary key default 1,
  percentual_socia numeric(5,2) not null default 50.00,
  constraint singleton check (id = 1)
);
insert into parametros_divisao (id, percentual_socia) values (1, 50.00);

-- ---------- Status mensal da divisão (retirada / repasse) ----------
create table divisao_status_mensal (
  id uuid primary key default gen_random_uuid(),
  mes_referencia date not null, -- sempre dia 1 do mês, ex: 2026-09-01
  status_dono text not null default 'Ainda no caixa do negócio' check (status_dono in ('Ainda no caixa do negócio','Retirado')),
  data_retirada date,
  status_socia text not null default 'Pendente de repasse' check (status_socia in ('Pendente de repasse','Repassado')),
  data_repasse date,
  unique (mes_referencia)
);

-- ============================================================
-- Índices úteis
-- ============================================================
create index idx_vendas_cliente on vendas(cliente_id);
create index idx_vendas_data_entrega on vendas(data_entrega);
create index idx_venda_itens_venda on venda_itens(venda_id);
create index idx_produtos_categoria on produtos(categoria_id);
create index idx_compras_cartao on compras(cartao_id);

-- ============================================================
-- RLS — habilitar e ajustar as policies antes de ir pra produção.
-- Exemplo abaixo libera tudo para usuários autenticados; trocar
-- por regras reais quando os papéis (dono x sócia) forem definidos.
-- ============================================================
alter table clientes enable row level security;
alter table categorias_preco enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table cartoes enable row level security;
alter table compras enable row level security;
alter table faturas_pagas enable row level security;
alter table estoque enable row level security;
alter table parametros_divisao enable row level security;
alter table divisao_status_mensal enable row level security;

create policy "authenticated_full_access" on clientes for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on categorias_preco for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on produtos for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on vendas for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on venda_itens for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on cartoes for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on compras for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on faturas_pagas for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on estoque for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on parametros_divisao for all using (auth.role() = 'authenticated');
create policy "authenticated_full_access" on divisao_status_mensal for all using (auth.role() = 'authenticated');

-- ---------- Seed: cartão único hoje (Nubank) ----------
insert into cartoes (nome, dia_vencimento) values ('Nubank', 8);
