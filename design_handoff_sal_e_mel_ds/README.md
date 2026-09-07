# Handoff: Design System Sal e Mel

## Overview
Sistema visual da marca Sal e Mel (doces e salgados para festas), derivado da logo. Cobre cores, tipografia, botoes, inputs, tags, cards, regras de uso da logo e duas aplicacoes de referencia (catalogo web de encomendas e posts 1:1 para redes sociais).

## About the Design Files
Os arquivos deste pacote sao **referencias de design feitas em HTML** — prototipos que mostram aparencia e comportamento pretendidos, nao codigo de producao para copiar direto. A tarefa e **recriar esses designs no ambiente do codebase alvo** (React, Vue, SwiftUI, nativo, etc.) usando os padroes e bibliotecas ja estabelecidos ali. Se ainda nao houver codebase, escolha o framework mais adequado e implemente o DS nele (recomendado: React + Tailwind ou CSS variables).

## Fidelity
**High-fidelity.** Cores, tipografia, espacamentos e estados sao finais. Recrie fielmente.

## Design Tokens

### Cores — Mel (primaria)
| Token | Hex | Uso |
|---|---|---|
| mel-100 | #FBEBCF | fundos de aviso, hover de botao fantasma |
| mel-200 | #F7D9A0 | tags de categoria, placeholders de imagem |
| mel-400 | #F2B44E | hover do botao primario |
| mel-500 | #E8A33D | **cor primaria** — botoes, links ativos, destaques |
| mel-700 | #B9761F | texto de link, rotulos mono, sombra dura do botao primario |

### Cores — Cacau e neutros
| Token | Hex | Uso |
|---|---|---|
| cacau-600 | #6B3E22 | botao secundario, cards de destaque, texto de marca |
| cacau-900 | #3A2313 | texto sobre creme, sombra dura do botao secundario |
| tinta | #241C14 | cor de texto padrao |
| texto-medio | #6B5646 | paragrafos de apoio |
| texto-suave | #7A6A5A | legendas, rotulos |
| creme | #FAF0E1 | fundo da pagina |
| papel | #FFFBF4 | fundo de card / superficie |
| borda | #EBD9BC | borda padrao de cards e inputs |
| desabilitado-bg | #F0E5D2 | fundo de botao desabilitado |
| desabilitado-fg | #A79684 | texto de botao desabilitado |

### Cores — Confete (acentos do granulado)
| Token | Hex | Uso |
|---|---|---|
| confete-rosa | #EF7C8E | tag "mais pedido", detalhes em post |
| confete-menta | #6FC8B1 | tag "sem lactose" |
| confete-azul | #7FB3E8 | detalhes ilustrativos |
| sucesso | #4FA97C | status confirmado |
| erro | #D0533F | validacao, esgotado |

Regra: confetes so em elementos pequenos (badges, tags, ilustracao). Nunca como fundo de texto longo nem como cor de texto.

### Combinacoes aprovadas
tinta sobre creme · tinta sobre mel-500 · creme sobre cacau-900 · papel sobre cacau-600

### Evitar
branco puro sobre mel-500 · confetes como cor de texto · mel-200 sobre creme

### Tipografia
- **Display:** DM Serif Display (Google Fonts), regular. Titulos e nomes de produto. Nunca abaixo de 24px.
- **Interface/corpo:** Nunito (Google Fonts), pesos 400 / 600 / 800.
- **Rotulos tecnicos:** DM Mono 400, 12px, letter-spacing 0.16em, uppercase, cor mel-700.

Escala:
| Nivel | Fonte | Tamanho | Peso | Line-height |
|---|---|---|---|---|
| display | DM Serif Display | 48–64px | 400 | 1.0–1.05 |
| titulo | DM Serif Display | 32–34px | 400 | 1.15 |
| card-titulo | DM Serif Display | 24px | 400 | 1.1 |
| secao | Nunito | 20px | 800 | 1.2 |
| item | Nunito | 17px | 800 | 1.3 |
| corpo | Nunito | 16px | 400 | 1.6 |
| apoio | Nunito | 14px | 600 | 1.5 |
| rotulo | DM Mono | 12px | 400 | — |

### Espacamento
Escala de 4: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 72. Gap entre secoes da pagina: 72. Padding interno de card: 20–24.

### Raio de borda
14 inputs · 20 blocos internos e cards menores · 24 cards principais · 999 botoes e tags.

### Elevacao
Sem sombra difusa. Superficies usam borda solida 1px #EBD9BC. Botoes solidos usam sombra dura `0 2px 0` na versao escura da propria cor; no :active o botao desce 2px e a sombra some.

## Componentes

### Botao
Base: font Nunito 800, border-radius 999px, sem borda, cursor pointer.
- **Primario:** bg #E8A33D, texto #241C14, box-shadow 0 2px 0 #B9761F. Hover: bg #F2B44E. Active: translateY(2px), sem sombra.
- **Secundario:** bg #6B3E22, texto #FFFBF4, box-shadow 0 2px 0 #3A2313. Hover: bg #7D4B2C.
- **Contorno:** transparente, borda 2px #6B3E22, texto #6B3E22. Hover: bg #FBEBCF.
- **Fantasma:** transparente, texto #B9761F. Hover: bg #FBEBCF.
- **Desabilitado:** bg #F0E5D2, texto #A79684, cursor not-allowed.

Tamanhos: pequeno 36px de altura (padding 9/18, texto 14) · medio 48px (padding 14/28, texto 16) · grande 56px (padding 18/36, texto 18).

### Input
bg #FFFFFF, borda 2px #EBD9BC, radius 14, padding 13px 16px, texto 16px Nunito.
- Focus: border-color #E8A33D.
- Erro: border-color #D0533F + mensagem 13px peso 600 na mesma cor abaixo do campo.
- Label acima: 14px peso 800, gap 7px.

### Tag / status
radius 999, padding 7px 14px, texto 13px peso 800.
Categoria: bg mel-200, texto tinta. Destaque: bg confete-rosa. Restricao alimentar: bg confete-menta. Sucesso: bg #4FA97C texto #FFFBF4. Erro: bg #D0533F texto #FFFBF4.

### Card de produto
bg #FFFBF4, borda 1px #EBD9BC, radius 24, overflow hidden. Topo: area de imagem 110–150px. Corpo: padding 18px 20px 20px, gap 8, com tag de categoria, titulo display 24, descricao 14 (#6B5646) e preco 22 peso 800 + unidade 13 (#7A6A5A).

### Card de destaque
bg #6B3E22, radius 24, padding 24, texto #FFFBF4, rotulo mono em #F7D9A0, corpo em #F0DDC6, botao primario dentro.

### Estado vazio / aviso
bg #FBEBCF, borda tracejada 2px #E8A33D, radius 24.

### Placeholder de imagem
`repeating-linear-gradient(135deg, #F7D9A0 0 12px, #FBEBCF 12px 24px)` — substituir por foto real assim que houver.

## Regras da logo
- Preferencial: logo completa sobre creme (#FAF0E1) ou papel (#FFFBF4).
- Aceito: sobre cacau (#6B3E22), mantendo o fundo creme proprio da logo.
- Nunca: fundos saturados, padronagens, fotos sem area de respiro.
- Area de respiro: margem livre igual a altura da coxinha em todos os lados.
- Tamanho minimo: 120px em tela com o slogan; abaixo disso, usar so os personagens.
- Proibido girar, distorcer, trocar cores ou aplicar sombra nos personagens.

## Telas de referencia

### Catalogo web de encomendas
Header: superficie papel, borda inferior, logo 44px radius 10, nome da marca em display 22, nav a direita com pill ativa (mel-500) e itens inativos em texto-medio, alem de pill de carrinho em cacau-600.
Conteudo: fundo creme, titulo display 34 + subtitulo 15, linha de filtros com tags de confete, grid `repeat(auto-fit, minmax(190px, 1fr))` gap 16 de cards de produto. Item esgotado usa botao desabilitado.

### Post 1:1 redes sociais
Duas variantes, aspect-ratio 1/1, radius 20, padding 32, layout em tres blocos (topo / titulo / assinatura) com `justify-content: space-between`.
- Escuro: bg cacau-600, rotulo mono em mel-200, titulo display 46 com numero em mel-500, assinatura com logo 48px.
- Claro: bg mel-500, texto tinta, linha de tags de confete no topo, titulo display 46, CTA 15 peso 800.

## Responsividade
Tudo em grid `repeat(auto-fit, minmax(Xpx, 1fr))` e flex com `flex-wrap: wrap`. Container maximo 1080px, padding lateral 24px. Nada com largura fixa exceto os posts (1:1).

## Assets
- `assets/sal-e-mel-logo.jpg` — logo enviada pelo cliente, JPEG com fundo creme fixo. **Pedir versao vetorial ou PNG com fundo transparente antes de implementar.**
- Fotos de produto ainda nao existem; os placeholders listrados marcam onde entram.

## Files
- `Sal e Mel - Design System.dc.html` — o design system completo, todas as secoes.
- `assets/sal-e-mel-logo.jpg` — logo.
