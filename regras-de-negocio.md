# Sal e Mel — Regras de Negócio

> Documento de referência para implementação do app real (React + Supabase + Vercel).
> Reflete o comportamento validado no protótipo interativo (`sal-e-mel-mockups.html`).

## Visão geral

O app gerencia o dia a dia da Sal e Mel, confeitaria administrada por André e Fernanda.
O lucro do negócio é dividido entre André e uma sócia (mãe de André), conforme percentual configurável.

Módulos: **Vendas**, **Produtos e Categorias de Preço**, **Clientes**, **Compras**, **Agenda**,
**Divisão de Lucros**, **Estoque**, **Painel**.

---

## 1. Clientes

- Cadastro mínimo: **nome** (obrigatório) e **telefone** (opcional).
- Um cliente **não pode ser removido** se já tiver pedidos (vendas) associados a ele — a exclusão deve ser bloqueada nesse caso.
- Cada cliente tem um **histórico de pedidos**: todas as vendas vinculadas a ele, com itens, valores e status.
- **Toda venda exige um cliente cadastrado.** Não existe "cliente avulso" digitado na hora — quem lança a venda escolhe um cliente já existente (com busca por nome ou telefone) ou cadastra um novo antes de continuar.

## 2. Categorias de Preço e Produtos

A precificação vive na **categoria**, não no produto.

### Categoria de preço
- Campos: nome, **tipo de precificação** (`cento` ou `pacote`).
- Tipo `cento`: tem um **preço por 100 unidades**. O preço de qualquer produto dessa categoria é sempre derivado da categoria.
- Tipo `pacote`: **não tem preço próprio** — cada produto dessa categoria define seu próprio preço fixo (usado para itens sob encomenda, como kits, que não seguem a lógica de "cento").
- Uma categoria **não pode ser removida** se houver produtos vinculados a ela.

### Produto
- Campos: nome, categoria de preço (obrigatória).
- Se a categoria for do tipo `pacote`, o produto também tem um **preço fixo próprio**.
- Se a categoria for do tipo `cento`, o produto **não tem preço próprio** — herda o preço da categoria. Alterar o preço da categoria muda o preço de todos os produtos vinculados a ela imediatamente.
- Cada produto acumula um contador de **"vendido no mês"** (em unidades), incrementado toda vez que ele é vendido.

### Cálculo do valor de um item de venda
```
se categoria.tipo == "cento":
    valor_item = categoria.preco_cento * (quantidade / 100)
se categoria.tipo == "pacote":
    valor_item = produto.preco * quantidade
```
- Quantidades usuais: 25, 50 ou 100 unidades (múltiplos de lote), mas o campo aceita qualquer valor numérico.

## 3. Vendas

- Uma venda tem: **cliente**, um ou mais **itens** (produto + quantidade), **data de entrega** (opcional no momento do lançamento, editável depois), **sinal** e **restante**.
- **Valor do pedido** = soma do valor de todos os itens (ver cálculo acima).
- **Sinal**: valor recebido no momento da venda. Sugerido automaticamente como 50% do valor do pedido, mas **livremente editável**. Uma vez editado manualmente, o sistema para de recalcular o sinal automaticamente quando itens são adicionados/alterados (o valor manual é respeitado).
- **Restante** = Valor do pedido − Sinal. Recalculado automaticamente sempre que o valor do pedido ou o sinal mudam.
- **Status de pagamento**: `Pago` quando restante ≤ 0; caso contrário `Pendente`.
- **Status de entrega** (independente do status de pagamento): `Pendente` ou `Entregue`.
- Ao salvar uma venda:
  - A quantidade de cada item é somada ao contador "vendido no mês" do produto correspondente.
  - É gerado um **comprovante** (imagem) com cliente, itens, sinal, restante e data de entrega, pronto para compartilhar (WhatsApp/download).
- Uma venda **não pode ser salva** sem cliente selecionado e sem ao menos um item com valor > 0.

## 4. Compras

- Uma compra tem: fornecedor, item/descrição, valor, **forma de pagamento** (`pix` ou `cartão de crédito`), data.
- **Pix**: considerado **pago imediatamente** (o dinheiro já saiu do caixa na hora).
- **Cartão de crédito**: entra na **fatura em aberto** do cartão, com status `Na fatura`, até que a fatura seja quitada. Hoje existe um único cartão (Nubank); o modelo deve permitir mais de um cartão no futuro.
- A fatura do cartão **vence todo dia 8** do mês.
- **"Marcar fatura como paga"**: muda o status de todas as compras `Na fatura` daquele cartão para `Pago` de uma vez, e registra uma entrada no **histórico de faturas pagas** (cartão, valor total, data do pagamento).
- **Gasto total no mês** = soma de todas as compras (pix + cartão), independente do status de pagamento — é o valor usado no cálculo de lucro (ver seção Divisão).

### Saldo previsto (para saber se dá pra cobrir a fatura)
- **Caixa agora** = soma de (para cada venda: valor total se `Pago`, senão só o sinal) − soma das compras pagas em Pix.
- **A receber até o vencimento** = soma do "restante" de vendas com entrega agendada entre hoje e a data de vencimento da fatura (inclusive), que ainda não estão com status `Pago`.
- **Saldo previsto** = Caixa agora + A receber até o vencimento.
- O app compara Saldo previsto com o total da fatura em aberto e indica se **"dá pra cobrir"** ou **quanto falta**.

## 5. Agenda de Entregas

- Toda venda com data de entrega preenchida aparece na agenda.
- **Próxima entrega**: a venda com status de entrega `Pendente` e data de entrega mais próxima a partir de hoje (inclusive hoje).
- **Esta semana**: todas as vendas com entrega nos próximos 7 dias (incluindo hoje).
- **Calendário mensal**: mostra visualmente quais dias do mês têm ao menos uma entrega agendada; navegação entre meses.
- **Detalhe da entrega**: ao abrir uma entrega específica, é possível:
  - Ver cliente, telefone, itens, sinal, restante, valor total e status.
  - **Alterar a data de entrega** (isso atualiza a posição da venda na agenda/calendário).
  - **Marcar como entregue**, com **confirmação em duas etapas** (primeiro clique pede confirmação; segundo clique efetiva). Uma vez `Entregue`, a ação não pode ser desfeita pela mesma tela.

## 6. Divisão de Lucros

- **Lucro do mês** = Vendas do mês (soma dos valores totais de todas as vendas) − Compras do mês (soma de todas as compras, pix + cartão).
- O lucro é dividido entre **André (dono)** e a **sócia**, por um **percentual configurável** (padrão 50/50). O percentual da sócia é o parâmetro editável; a parte do dono é sempre o complemento (100% − percentual da sócia).
- Cada lado tem um **status próprio, independente**:
  - Parte do dono: `Ainda no caixa do negócio` → `Retirado` (quando ele retira o dinheiro do caixa da empresa para uso pessoal).
  - Parte da sócia: `Pendente de repasse` → `Repassado` (quando o valor é de fato transferido a ela).
- Existe um **histórico mês a mês** de ambos os status (quando cada lado foi retirado/repassado).
- Os totais de "Vendas do mês" e "Compras do mês" que compõem o lucro podem ser **detalhados** (lista de lançamentos que somam aquele valor).
- Existe um **extrato compartilhável** (imagem) com o resumo da divisão do mês, para compartilhar (ex.: com a sócia).

## 7. Estoque

- Cada insumo tem: nome, **quantidade atual**, **unidade de medida** (un, kg, g, L, ml, pacote, caixa), **quantidade mínima desejada**.
- Um item está **"precisa comprar"** quando quantidade atual < quantidade mínima.
- **Lista de compras automática**: conta e nomeia todos os itens abaixo do mínimo — pensada para consulta rápida no mercado.
- **Ajuste rápido de quantidade** (+/−) diretamente na lista, sem precisar abrir o formulário completo — pensado para repor/descontar estoque rapidamente.
- O estoque hoje é **independente** do módulo de Compras (lançar uma compra não altera o estoque automaticamente — ajuste manual).

## 8. Painel (Dashboard)

- Mostra um resumo do mês: lucro, vendas, compras, próximas entregas.
- Atalhos diretos para as áreas de gestão (Produtos, Clientes, Estoque).

---

## Papéis e permissões (a definir na implementação)

O protótipo não implementa autenticação nem controle de acesso. Para o app real, considerar:
- **Dono (André/Fernanda)**: acesso completo a todos os módulos.
- **Sócia**: possivelmente acesso restrito (ex.: só visualizar a Divisão de Lucros e o extrato), a confirmar com o negócio.
- Login social (o pedido original mencionava Google como opção mais simples via Supabase Auth).

## Observações para a modelagem de dados

- `produtos.preco` só é relevante quando a categoria associada é do tipo `pacote`; para categorias `cento`, o preço efetivo vem sempre de `categorias_preco.preco_cento`.
- `vendas` e `compras` guardam valores **em reais com 2 casas decimais** (sinal e restante especialmente exigem precisão de centavos).
- Datas de entrega devem ser guardadas em formato de data real (não texto), para permitir os cálculos de "esta semana", "próxima entrega" e "saldo previsto até o vencimento".
- Recomenda-se guardar o **dia de vencimento da fatura** como parâmetro configurável por cartão (hoje fixo em 8, mas não deveria ficar hard-coded no código).
