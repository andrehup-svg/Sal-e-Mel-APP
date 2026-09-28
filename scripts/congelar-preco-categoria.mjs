#!/usr/bin/env node
// Congela o preço atual de uma categoria numa categoria-cópia "(preço antigo)",
// duplicando os produtos dela para a cópia. Serve para continuar lançando vendas
// no preço combinado com o cliente antes do reajuste, sem mexer na categoria
// original (que pode então ser atualizada pro preço novo normalmente).
//
// Uso:
//   node --env-file=.env.local scripts/congelar-preco-categoria.mjs "Docinhos Gourmet"
//   npm run preco:congelar -- "Docinhos Gourmet" --preco-cento 130 --preco-unidade 1.40
//
// Flags opcionais:
//   --preco-cento <n>        força o preço/cento da cópia (padrão: preço atual da categoria)
//   --preco-unidade <n>      força o preço/unidade da cópia (padrão: preço atual da categoria)
//   --preco-atacado <n>      força o preço de atacado da cópia
//   --qtd-min-atacado <n>    força a quantidade mínima de atacado da cópia
//   --nome-antiga "<nome>"   nome customizado da categoria antiga (padrão: "<nome> (preço antigo até DD/MM)")
//   --produtos "A,B,C"       duplica só esses produtos (padrão: todos os produtos da categoria)
//   --dry-run                mostra o que seria feito, sem gravar nada
//
// Requer no .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY  (Supabase → Project Settings → API → service_role;
//                               NUNCA comitar essa chave — ela ignora o RLS)

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const [nomeCategoria, ...rest] = argv;
  const flags = { dryRun: false };
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    switch (arg) {
      case "--preco-cento":
        flags.precoCento = Number(rest[++i]);
        break;
      case "--preco-unidade":
        flags.precoUnidade = Number(rest[++i]);
        break;
      case "--preco-atacado":
        flags.precoAtacado = Number(rest[++i]);
        break;
      case "--qtd-min-atacado":
        flags.qtdMinAtacado = Number(rest[++i]);
        break;
      case "--nome-antiga":
        flags.nomeAntiga = rest[++i];
        break;
      case "--produtos":
        flags.produtos = rest[++i]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case "--dry-run":
        flags.dryRun = true;
        break;
      default:
        throw new Error(`Flag desconhecida: ${arg}`);
    }
  }
  return { nomeCategoria, flags };
}

function hoje() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

async function main() {
  const { nomeCategoria, flags } = parseArgs(process.argv.slice(2));

  if (!nomeCategoria) {
    console.error(
      'Uso: node --env-file=.env.local scripts/congelar-preco-categoria.mjs "Nome da categoria" [flags]',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Faltam variáveis de ambiente. Confira se .env.local tem NEXT_PUBLIC_SUPABASE_URL e " +
        "SUPABASE_SERVICE_ROLE_KEY (pegue a service_role key em Project Settings > API no Supabase).",
    );
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data: categorias, error: buscaError } = await supabase
    .from("categorias_preco")
    .select("*")
    .ilike("nome", nomeCategoria);

  if (buscaError) {
    console.error("Erro ao buscar categoria:", buscaError.message);
    process.exit(1);
  }
  if (!categorias || categorias.length === 0) {
    console.error(`Nenhuma categoria encontrada com o nome "${nomeCategoria}".`);
    process.exit(1);
  }
  if (categorias.length > 1) {
    console.error(
      `Mais de uma categoria bate com "${nomeCategoria}": ${categorias.map((c) => c.nome).join(", ")}. ` +
        "Seja mais específico.",
    );
    process.exit(1);
  }
  const categoria = categorias[0];

  const nomeNovaCategoria = flags.nomeAntiga ?? `${categoria.nome} (preço antigo até ${hoje()})`;

  const { data: existente, error: existeError } = await supabase
    .from("categorias_preco")
    .select("id")
    .eq("nome", nomeNovaCategoria)
    .maybeSingle();
  if (existeError) {
    console.error("Erro ao verificar categoria antiga:", existeError.message);
    process.exit(1);
  }
  if (existente) {
    console.error(
      `Já existe uma categoria chamada "${nomeNovaCategoria}". Rode de novo com --nome-antiga "<outro nome>" ` +
        "se quiser congelar outro preço, ou apague a categoria antiga antes se foi engano.",
    );
    process.exit(1);
  }

  if (categoria.tipo === "cento" && flags.precoCento === undefined && categoria.preco_cento === null) {
    console.error("Categoria do tipo 'cento' sem preco_cento definido — dado inconsistente no banco.");
    process.exit(1);
  }

  const novaCategoria = {
    nome: nomeNovaCategoria,
    tipo: categoria.tipo,
    preco_cento: categoria.tipo === "cento" ? (flags.precoCento ?? categoria.preco_cento) : null,
    preco_unidade: flags.precoUnidade ?? categoria.preco_unidade,
    preco_unidade_atacado: flags.precoAtacado ?? categoria.preco_unidade_atacado,
    quantidade_minima_atacado: flags.qtdMinAtacado ?? categoria.quantidade_minima_atacado,
  };

  let produtosOrigem;
  if (flags.produtos && flags.produtos.length > 0) {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("categoria_id", categoria.id)
      .in("nome", flags.produtos);
    if (error) {
      console.error("Erro ao buscar produtos:", error.message);
      process.exit(1);
    }
    produtosOrigem = data ?? [];
    const encontrados = new Set(produtosOrigem.map((p) => p.nome));
    const faltando = flags.produtos.filter((n) => !encontrados.has(n));
    if (faltando.length > 0) {
      console.error(
        `Produto(s) não encontrado(s) na categoria "${categoria.nome}": ${faltando.join(", ")}.`,
      );
      process.exit(1);
    }
  } else {
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("categoria_id", categoria.id);
    if (error) {
      console.error("Erro ao buscar produtos:", error.message);
      process.exit(1);
    }
    produtosOrigem = data ?? [];
  }

  if (produtosOrigem.length === 0) {
    console.error(`A categoria "${categoria.nome}" não tem produtos vinculados — nada para duplicar.`);
    process.exit(1);
  }

  console.log(`Categoria original: "${categoria.nome}" (${categoria.tipo})`);
  console.log(
    `Categoria antiga a criar: "${novaCategoria.nome}" — ` +
      (novaCategoria.preco_cento !== null ? `cento R$${novaCategoria.preco_cento} / ` : "") +
      `unidade R$${novaCategoria.preco_unidade}` +
      (novaCategoria.preco_unidade_atacado
        ? ` / atacado R$${novaCategoria.preco_unidade_atacado} acima de ${novaCategoria.quantidade_minima_atacado} un`
        : ""),
  );
  console.log(`Produtos a duplicar (${produtosOrigem.length}): ${produtosOrigem.map((p) => p.nome).join(", ")}`);

  if (flags.dryRun) {
    console.log("\n--dry-run: nada foi gravado.");
    return;
  }

  const { data: categoriaCriada, error: catInsertError } = await supabase
    .from("categorias_preco")
    .insert(novaCategoria)
    .select()
    .single();

  if (catInsertError || !categoriaCriada) {
    console.error("Erro ao criar categoria antiga:", catInsertError?.message);
    process.exit(1);
  }

  const { data: produtosCriados, error: prodInsertError } = await supabase
    .from("produtos")
    .insert(produtosOrigem.map((p) => ({ nome: p.nome, categoria_id: categoriaCriada.id })))
    .select();

  if (prodInsertError) {
    console.error(
      `Categoria "${categoriaCriada.nome}" (id ${categoriaCriada.id}) foi criada, mas houve erro ao duplicar ` +
        `os produtos: ${prodInsertError.message}. Duplique os produtos manualmente em /produtos apontando ` +
        "para essa categoria.",
    );
    process.exit(1);
  }

  console.log(`\nCriado! Categoria "${categoriaCriada.nome}" (id ${categoriaCriada.id}) com ${produtosCriados?.length ?? 0} produto(s).`);
  console.log(
    "Agora é seguro atualizar o preço da categoria original em /produtos. " +
      `Use os produtos de "${categoriaCriada.nome}" nas vendas que ainda precisam do preço antigo.`,
  );
  console.log(
    "Lembrete: essa categoria e esses produtos não poderão ser apagados depois de usados numa venda " +
      "(regra de negócio) — quando não precisar mais deles, é seguro deixá-los ali, só não vão aparecer " +
      "muito nas buscas de produto novo se você parar de escolhê-los.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
