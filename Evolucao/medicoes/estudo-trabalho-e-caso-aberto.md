# Estudo — desempenho do Trabalho e do "Trabalhar no caso" (27/11/2026)

**Pergunta do PO:** "Na aba trabalho e trabalhar no caso tem algo que possa melhorar o desempenho e a
velocidade de carregamento". Só estudo: **nada foi mudado no sistema.** O cache da configuração
ficou de fora, por decisão do PO no estudo anterior (`estudo-configuracao-em-codigo.md`).

Números do **SIMULADOR**, na planilha do tamanho da do PO (RET com 3.571 casos). A "régua PO" é a
estimativa tirada da aba ERROS: 25 ms por chamada, 53 µs por célula e **1 s por busca do
localizador** (na aba ERROS, de 0,5 a 2,8 s cada).

## O que cada ação faz na planilha (cache quente)

| Ação | Chamadas | Buscas do localizador | Células | Régua PO |
|---|---:|---:|---:|---:|
| Trabalho RET, aba 1 | 16 | 0 | 16.321 | 1,3 s |
| Abrir o caso (`casoParaEditar`) | 10 | **1** | 102 | 1,3 s |
| Abrir o Alterar status (`situacoesParaTrocar`) | 8 | **1** | ~100 | ~1,2 s |
| Campos do status (`camposDaSituacao`, a cada troca no diálogo) | 8 | **1** | ~100 | ~1,2 s |
| Salvar o caso (`editarCaso`) | 21 a 34 | **1 a 2** | 263 | 2,9 s |
| Salvar o status (`alterarSituacaoDoCaso`) | 15 a 17 | **1** | 205 | 1,4 s |

Medido com `node Evolucao/Testes/medir-telas.js` e com o rastreio por chamada (a pilha de quem lê).

## O que pesa

1. **O localizador para achar o caso pelo Id.** Toda ação sobre UM caso procura o Id na coluna
   inteira (3.571 células) com o localizador — a parte mais cara na régua PO. No "Alterar status"
   são até 3 buscas: abrir, os campos do status e salvar.
2. **Duas idas ao servidor para abrir o Alterar status:** os status e, depois, os campos do status
   atual. Cada ida e volta do navegador ao Apps Script tem um custo fixo que o simulador não mede.
3. **O Trabalho** lê a coluna de status inteira e as linhas dos casos abertos (12.699 células, ~250
   linhas × 51 colunas). A leitura "leve" (só algumas colunas) já existe e entra quando compensa:
   ler colunas inteiras de 3.571 linhas custaria mais. `getLastRow` da base é chamado 4 vezes no
   mesmo clique.

## Propostas

| | Proposta | Ganho estimado (régua PO) | Risco |
|---|---|---|---|
| **1** | **A linha do caso vai junto da fila.** A fila já sabe em que linha está cada caso. Abrir o caso, abrir o Alterar status e pedir os campos do status leem só aquela linha e conferem o Id; se não bater (a linha mudou de lugar), procuram como hoje | ~1 s em cada abertura e em cada troca de status no diálogo | Baixo: o Id é sempre conferido. **As gravações continuam procurando como hoje**, porque a busca também detecta Id repetido; a B1 não muda |
| **2** | **O Alterar status abre numa ida só:** os status e os campos do status atual na mesma resposta | −1 ida ao servidor e −1 busca; o "Carregando o que este status pede…" deixa de aparecer na abertura | Baixo |
| **3** | Lembrar a última linha da base durante o mesmo clique do Trabalho | −3 chamadas (~0,1 s) | Nenhum |

**Fora:** guardar as colunas das bases entre cliques (risco de gravar na coluna errada) e ler só
algumas colunas no Trabalho (a leitura leve já faz isso quando compensa; era o caminho B da aba
ERROS, deixado de lado pelo PO).
