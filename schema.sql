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
  tipo text not null check (tipo in ('cento','unidade')),
  preco_cento numeric(10,2), -- preço por 100 unidades — obrigatório quando tipo = 'cento', null quando 'unidade'
  preco_unidade numeric(10,2) not null, -- preço por unidade avulsa — sempre presente (tipo 'cento': cento/100 + R$0,10 por padrão; tipo 'unidade': é o único preço)
  preco_unidade_atacado numeric(10,2), -- opcional: preço por unidade quando a quantidade vendida > quantidade_minima_atacado (ex: Morango Cravejado)
  quantidade_minima_atacado numeric(10,2), -- opcional: quantidade a partir da qual (exclusive) vale o preco_unidade_atacado
  created_at timestamptz not null default now(),
  constraint categoria_preco_coerente check (
    (tipo = 'cento' and preco_cento is not null) or (tipo = 'unidade' and preco_cento is null)
  ),
  constraint categoria_atacado_coerente check (
    (preco_unidade_atacado is null and quantidade_minima_atacado is null) or
    (preco_unidade_atacado is not null and quantidade_minima_atacado is not null)
  )
);

-- ---------- Produtos ----------
create table produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria_id uuid not null references categorias_preco(id) on delete restrict,
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
  valor_item numeric(10,2) not null, -- calculado no momento da venda (snapshot do preço)
  modo_preco text not null default 'cento' check (modo_preco in ('cento','unidade')) -- qual preço da categoria foi usado neste item
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
  valor numeric(10,2) not null, -- valor desta linha: a compra inteira, ou 1 parcela dela
  forma_pagamento text not null check (forma_pagamento in ('pix','cartao')),
  cartao_id uuid references cartoes(id), -- obrigatório quando forma_pagamento = 'cartao'
  status text not null default 'Pago' check (status in ('Pago','Na fatura')),
  data_compra date,
  competencia date not null default date_trunc('month', current_date), -- mês da fatura em que esta linha/parcela conta
  grupo_compra_id uuid, -- mesma compra parcelada compartilha este id entre as parcelas
  numero_parcela int not null default 1,
  total_parcelas int not null default 1,
  created_at timestamptz not null default now(),
  constraint cartao_exigido check (
    (forma_pagamento = 'cartao' and cartao_id is not null) or (forma_pagamento = 'pix')
  ),
  constraint parcela_valida check (numero_parcela >= 1 and numero_parcela <= total_parcelas)
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

-- ============================================================
-- Funções
-- ============================================================

-- Marca como "Pago" as compras "Na fatura" de um cartão cuja
-- competência é o mês da fatura em aberto (p_competencia) ou
-- anterior (parcelas atrasadas), e registra o total em
-- faturas_pagas — tudo numa única transação (evita corrida
-- entre o SELECT do total e o UPDATE do status). Parcelas
-- futuras (competência > p_competencia) não são afetadas.
drop function if exists pagar_fatura(uuid);

create or replace function pagar_fatura(p_cartao_id uuid, p_competencia date)
returns numeric
language plpgsql
security invoker
as $$
declare
  v_total numeric(10,2);
  v_mes date := date_trunc('month', p_competencia)::date;
begin
  select coalesce(sum(valor), 0) into v_total
  from compras
  where cartao_id = p_cartao_id
    and forma_pagamento = 'cartao'
    and status = 'Na fatura'
    and competencia <= v_mes;

  if v_total = 0 then
    raise exception 'Não há fatura em aberto para esse cartão.';
  end if;

  update compras
  set status = 'Pago'
  where cartao_id = p_cartao_id
    and forma_pagamento = 'cartao'
    and status = 'Na fatura'
    and competencia <= v_mes;

  insert into faturas_pagas (cartao_id, valor_total) values (p_cartao_id, v_total);

  return v_total;
end;
$$;

-- ---------- Seed: cartão único hoje ----------
insert into cartoes (nome, dia_vencimento) values ('Cartão', 8);

-- ============================================================
-- Migração: parcelamento de compras
-- Rode este bloco no SQL Editor do Supabase se o banco já existia
-- antes desta mudança (colunas/função já criadas acima não fazem
-- mal se este bloco rodar de novo — é seguro repetir).
-- ============================================================
alter table compras add column if not exists competencia date;
alter table compras add column if not exists grupo_compra_id uuid;
alter table compras add column if not exists numero_parcela int not null default 1;
alter table compras add column if not exists total_parcelas int not null default 1;

update compras set competencia = date_trunc('month', coalesce(data_compra, created_at::date))::date
where competencia is null;

alter table compras alter column competencia set not null;
alter table compras alter column competencia set default date_trunc('month', current_date);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'parcela_valida'
  ) then
    alter table compras add constraint parcela_valida check (numero_parcela >= 1 and numero_parcela <= total_parcelas);
  end if;
end $$;

-- ---------- Renomeia o cartão seed de "Nubank" pra "Cartão" (rodar 1x) ----------
update cartoes set nome = 'Cartão' where nome = 'Nubank';

-- ============================================================
-- Migração: preço duplo por categoria (cento + unidade avulsa)
-- Toda categoria passa a guardar dois preços: preco_cento (pro-rata,
-- por 100 unidades) e preco_unidade (venda avulsa, sempre R$0,10 a
-- mais por unidade do que o pro-rata do cento). Categorias tipo
-- 'unidade' (itens sob encomenda) só usam preco_unidade — preco_cento
-- fica null nelas. Rode este bloco no SQL Editor do Supabase se o
-- banco já existia antes desta mudança (é seguro repetir).
-- ============================================================
alter table categorias_preco add column if not exists preco_cento numeric(10,2);
alter table categorias_preco add column if not exists preco_unidade numeric(10,2);

update categorias_preco set preco_cento = preco, preco_unidade = round(preco / 100 + 0.10, 2)
where tipo = 'cento' and preco_unidade is null;

update categorias_preco set preco_unidade = preco, preco_cento = null
where tipo = 'unidade' and preco_unidade is null;

alter table categorias_preco drop column if exists preco;
alter table categorias_preco alter column preco_unidade set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categoria_preco_coerente'
  ) then
    alter table categorias_preco add constraint categoria_preco_coerente check (
      (tipo = 'cento' and preco_cento is not null) or (tipo = 'unidade' and preco_cento is null)
    );
  end if;
end $$;

alter table venda_itens add column if not exists modo_preco text not null default 'cento';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'venda_itens_modo_preco_check'
  ) then
    alter table venda_itens add constraint venda_itens_modo_preco_check check (modo_preco in ('cento','unidade'));
  end if;
end $$;

-- ============================================================
-- Seed: categorias e produtos do cardápio de docinhos
-- Rode uma única vez (não é idempotente — evite rodar 2x sem
-- limpar antes, senão duplica categorias/produtos).
-- ============================================================
insert into categorias_preco (nome, tipo, preco_cento, preco_unidade) values
  ('Docinhos Tradicionais', 'cento', 110.00, 1.20),
  ('Docinhos Gourmet', 'cento', 130.00, 1.40),
  ('Gourmet Especial', 'cento', 130.00, 1.40),
  ('Gourmet Especial I', 'cento', 150.00, 1.60),
  ('Gourmet Especial II', 'cento', 180.00, 1.90),
  ('Gourmet Especial III', 'cento', 300.00, 3.10);

insert into categorias_preco (nome, tipo, preco_cento, preco_unidade) values
  ('Docinhos Especiais Personalizados', 'unidade', null, 200.00);

insert into produtos (nome, categoria_id)
select v.nome, cp.id
from (values
  ('Brigadeiro', 'Docinhos Tradicionais'),
  ('Beijinho', 'Docinhos Tradicionais'),
  ('Dois Amores', 'Docinhos Tradicionais'),
  ('Cajuzinho', 'Docinhos Tradicionais'),

  ('Leite Ninho', 'Docinhos Gourmet'),
  ('Confete', 'Docinhos Gourmet'),
  ('Churros', 'Docinhos Gourmet'),
  ('Coco Queimado', 'Docinhos Gourmet'),
  ('Pão de Mel', 'Docinhos Gourmet'),
  ('Caramelo Salgado', 'Docinhos Gourmet'),

  ('Surpresa de Uva', 'Gourmet Especial'),
  ('Moranguinho', 'Gourmet Especial'),
  ('Floresta Negra', 'Gourmet Especial'),
  ('Snickers', 'Gourmet Especial'),
  ('Banoffee', 'Gourmet Especial'),

  ('Leite Ninho com Nutella', 'Gourmet Especial I'),
  ('Capuccino', 'Gourmet Especial I'),
  ('Rafaello', 'Gourmet Especial I'),
  ('Kinder', 'Gourmet Especial I'),
  ('Nozes', 'Gourmet Especial I'),
  ('Pudim', 'Gourmet Especial I'),
  ('Ferrero Rocher', 'Gourmet Especial I'),
  ('Oreo', 'Gourmet Especial I'),
  ('Romeu e Julieta', 'Gourmet Especial I'),
  ('Ovomaltine', 'Gourmet Especial I'),

  ('Pistache', 'Gourmet Especial II'),
  ('Brulee', 'Gourmet Especial II'),
  ('Red Velvet', 'Gourmet Especial II'),
  ('Panetone', 'Gourmet Especial II'),
  ('Brigadeiro Alcoólico', 'Gourmet Especial II'),

  ('Coxinha de Morango', 'Gourmet Especial III'),
  ('Camafeu de Nozes', 'Gourmet Especial III'),

  ('Feliz Aniversário (personalizado)', 'Docinhos Especiais Personalizados')
) as v(nome, categoria_nome)
join categorias_preco cp on cp.nome = v.categoria_nome;

-- ============================================================
-- Migração: preço de atacado por quantidade (unidade)
-- Adiciona um preço de unidade alternativo, mais barato, que passa
-- a valer quando a quantidade vendida é MAIOR que um mínimo — para
-- todas as unidades do item, não só o excedente. Ex: Morango
-- Cravejado a R$13 a unidade, R$10 a unidade acima de 5 unidades.
-- Rode este bloco no SQL Editor do Supabase se o banco já existia
-- antes desta mudança (é seguro repetir).
-- ============================================================
alter table categorias_preco add column if not exists preco_unidade_atacado numeric(10,2);
alter table categorias_preco add column if not exists quantidade_minima_atacado numeric(10,2);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'categoria_atacado_coerente'
  ) then
    alter table categorias_preco add constraint categoria_atacado_coerente check (
      (preco_unidade_atacado is null and quantidade_minima_atacado is null) or
      (preco_unidade_atacado is not null and quantidade_minima_atacado is not null)
    );
  end if;
end $$;

-- ---------- Seed: Morango Cravejado ----------
insert into categorias_preco (nome, tipo, preco_cento, preco_unidade, preco_unidade_atacado, quantidade_minima_atacado)
values ('Morango Cravejado', 'unidade', null, 13.00, 10.00, 5);

insert into produtos (nome, categoria_id)
values ('Morango Cravejado', (select id from categorias_preco where nome = 'Morango Cravejado'));
