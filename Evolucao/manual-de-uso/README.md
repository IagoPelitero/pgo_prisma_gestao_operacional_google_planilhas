# Manual de uso do Prisma (apresentação)

`Manual-do-Prisma.pptx` é o manual para quem **usa** o sistema, feito para abrir no
**Google Apresentações** (Arquivo › Abrir › Fazer upload) ou no PowerPoint. São 33
slides, com as telas de verdade do Prisma, círculos laranja numerados mostrando onde
clicar e o texto de cada número ao lado. Os textos seguem o
[`07-manual-completo.md`](../07-manual-completo.md).

| Parte | Para quem | O que tem |
|---|---|---|
| **1 · O dia a dia** | Analista | Entrar, conhecer a tela, Trabalho (canal, cartões, filtros, fila), selos de prazo, aviso de casos perto de vencer, trabalhar no caso, alterar status, excluir, cadastrar caso, reuniões da Mesa, Buscar Caso, Tabela de Corretoras |
| **2 · Para quem cobre o gestor** | Gestor e substituto | Importação (3 passos), Produtividade RECC, controle de prazos, exportar relatório, Configurações (usuários, listas, painéis, sinalizadores) |
| **Problemas comuns** | Todos | Seis situações frequentes e o que fazer em cada uma |

Versão do sistema retratada: **1.81**. As fotos são da prévia (`Evolucao/previa/`),
com os dados fictícios de exemplo.

## Como regerar (quando as telas mudarem)

Os scripts em `gerador/` rodam no ambiente de desenvolvimento (Node com Playwright e
`pptxgenjs`; Python com Pillow):

1. `node capturar.js` — abre a prévia, fotografa cada tela e anota onde fica cada
   item a circular (`alvos.json`). `node capturar.js id1,id2` refaz só algumas.
2. `python recortar.py` — aproxima cada foto da região dos círculos (`zoom.json`).
3. `node gerar.js` — monta o `.pptx`: uma foto, os círculos e o texto por slide.

Os círculos e os números são formas do próprio slide (não fazem parte da imagem):
dá para movê-los ou editá-los no Google Apresentações.
