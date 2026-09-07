# Sal e Mel — Instruções para o Claude Code

## O que é este projeto
App de gestão para a Sal e Mel, confeitaria administrada por André e Fernanda. Substitui uma
planilha manual por um sistema completo: vendas, produtos/categorias de preço, clientes,
compras (com controle de fatura de cartão de crédito), agenda de entregas, divisão de lucro
com sócia, e controle de estoque.

## Stack
- Frontend: Next.js (React) + TypeScript.
- Backend/banco: Supabase (Postgres + Auth).
- Deploy: Vercel.
- PWA: instalável no celular (manifest + service worker), via `next-pwa` ou equivalente.
- Login: social via Google (Supabase Auth) — provedor mais simples de configurar.

## Documentos de referência (nesta mesma pasta — leia antes de codar)
- `regras-de-negocio.md` — fonte da verdade da lógica de negócio. Leia isso inteiro antes de
  implementar qualquer módulo.
- `schema.sql` — schema Postgres pronto pra rodar no Supabase (tabelas, relações, checks, RLS
  básica). Use como base; ajuste as policies de RLS quando os papéis de acesso (dono x sócia)
  forem definidos com o cliente.
- `sal-e-mel-mockups.html` — protótipo funcional (abra num navegador). Mostra o comportamento
  exato esperado de cada tela: formulários, cálculos ao vivo, modais, mobile e desktop. Use
  como referência de UX/interação — o visual não precisa ser pixel a pixel, mas o
  **comportamento** (o que cada botão faz, o que cada campo calcula) deve corresponder.

## Ordem de construção sugerida
1. Criar o projeto no Supabase e rodar `schema.sql`. Ativar o provedor Google em Authentication.
2. Criar o projeto Next.js e conectar as variáveis de ambiente do Supabase.
3. Subir um esqueleto vazio pra Vercel pra validar o pipeline de deploy antes de construir telas.
4. Implementar a tela de login (Supabase Auth com Google).
5. Construir os módulos nesta ordem (cada um depende dos anteriores):
   1. **Produtos + Categorias de Preço** — sem isso, Vendas não tem o que vender.
   2. **Clientes** — sem isso, Vendas não tem pra quem vender.
   3. **Vendas** — o núcleo do app.
   4. **Painel** — resumo do mês; depende de Vendas/Compras já existirem.
   5. **Compras** — incluindo a visão de fatura do cartão de crédito.
   6. **Agenda** — depende dos dados de entrega já existentes em Vendas.
   7. **Divisão de Lucros** — depende de Vendas + Compras.
   8. **Estoque** — módulo independente, pode entrar em qualquer ponto.
6. Adicionar manifest.json + service worker (PWA) **por último**, só depois das telas
   principais funcionando — evita retrabalho enquanto as telas ainda mudam.

## Pontos de atenção (não pule isso)
- O preço de um produto normalmente **não fica nele** — vem da categoria de preço vinculada
  (tipo `cento` = preço por 100 unidades; tipo `unidade` = preço por unidade — ambos definidos na
  categoria, nunca no produto).
  Ver seção 2 do `regras-de-negocio.md`.
- Sinal e Restante usam 2 casas decimais (moeda brasileira, R$ 0,00). O sinal sugere
  automaticamente 50% do valor do pedido, mas **para de recalcular** assim que o usuário edita
  o campo manualmente.
- Toda venda exige um **cliente já cadastrado** (busca com autocomplete por nome ou telefone) —
  não existe campo de texto livre pro nome do cliente.
- Compras no cartão de crédito não ficam "pagas" até a fatura ser quitada (vence todo dia 8).
  Pix é considerado pago na hora do lançamento.
- "Saldo previsto" (na tela de Compras) não é só o caixa de hoje — soma também o "restante" de
  vendas com entrega agendada até o vencimento da fatura. Ver seção 4 do `regras-de-negocio.md`.
- Marcar uma entrega como "Entregue" exige **confirmação em duas etapas** na interface.
- Uma categoria de preço ou um cliente **não podem ser removidos** se houver produtos ou vendas
  vinculados a eles, respectivamente.

## Como trabalhar
- Construa incrementalmente: termine um módulo, confirme que funciona, só então siga pro
  próximo. Não tente gerar o app inteiro de uma vez.
- Pergunte antes de assumir algo que não está claro no `regras-de-negocio.md` ou no protótipo.
- Use TypeScript com tipos que batam com as tabelas do `schema.sql`.
