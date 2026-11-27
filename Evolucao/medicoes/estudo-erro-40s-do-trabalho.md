# Estudo — o "resumoDoCanal não respondeu em 40 segundos" depois de salvar (27/11/2026)

**Relato do PO (1.96):** com os filtros "Não trabalhado" e "Canal de origem" no Trabalho da RET,
toda vez que trabalha um caso e salva, a fila recarrega e aparece "O sistema demorou para responder
(…) resumoDoCanal não respondeu em 40 segundos". A RET tem 2.130 casos em aberto e 2.161
concluídos. O PO confirmou que **não** estava no "Mostrar: Todos" (estava entre 5 e 100).

## O que o simulador mostra

Uma RET do mesmo tamanho (4.291 casos), os filtros do PO, cada medida numa execução nova. Régua PO:
25 ms por chamada e 53 µs por célula (estimativa da aba ERROS).

| Caminho | Chamadas | Células | Régua PO |
|---|---:|---:|---:|
| Salvar o caso (`editarCaso`) | 30 | 216 | — |
| Recarregar, Mostrar 5 ou 20 | 26 | 46 mil | ~3 s |
| Recarregar, Mostrar 100 | 26 | 96 mil | ~6 s |
| Recarregar, Mostrar **Todos** (1.065 a 2.130 casos) | 26 | 256 mil | ~14 s + montar e enviar 500–700 KB |

**Conclusão:** com 5 a 100, o código sozinho fica longe dos 40 s. A causa está na planilha de
verdade. Suspeitas, em ordem:

1. **Recálculo de fórmulas depois de gravar.** Toda gravação faz o Google recalcular as fórmulas do
   arquivo antes da próxima leitura. Fórmulas pesadas no mesmo arquivo (SOMASES/CONT.SES sobre a
   BASE_RET, PROCV, QUERY, IMPORTRANGE, HOJE) fazem a recarga da fila esperar. Bate com "só depois
   de salvar".
2. **Linhas fantasmas.** Fórmula, caixa de seleção ou espaço arrastado até o fim da aba fazem o
   `getLastRow()` contar linhas vazias como dado: o Prisma lê muito mais do que precisa.

**Como confirmar (pedido ao PO):** o print de Configurações › Estrutura › **Medir a velocidade**
(linhas, grade vazia, fórmulas pesadas e tempos por aba) e as linhas `lento · resumoDoCanal` da aba
ERROS (o tempo "lendo a planilha" contra "no resto").

## O que a aba ERROS mostrou (print do PO, 27/11/2026, 16:52–17:13)

- **Toda carga do Trabalho** (`resumoDoCanal`) leva **10 a 15 s no servidor**, para 5 pessoas
  diferentes, a cada minuto mais ou menos — não só depois de salvar.
- O tempo é quase todo **"lendo a planilha"** (9 a 14,6 s). Trava, busca e datas: 0 s. "No resto"
  (o código): 0,5 a 1,4 s.
- A Produtividade: 9,4 s (7 s lendo). A tela do Buscar esperou 8 s.
- O "não respondeu em 40 segundos" (17:00) aparece com o servidor registrando ~10 s naquele
  minuto: os outros ~30 s foram FORA da função — fila, carga do projeto ou espera da planilha
  ocupada com as gravações das outras pessoas.

**Leitura:** o código não é o gargalo (≤ 1,4 s). Cada ida à planilha está custando muito mais do que
a régua estimava: ~26 idas e ~46 mil células em ~10 s, cerca de 3 vezes a régua PO. Com 5 pessoas
gravando o tempo todo, cada gravação faz o arquivo recalcular, e as leituras dos outros esperam.

**Falta o Medir a velocidade** para separar: o custo por ida (pedágio fixo de cada chamada) ou por
célula, as fórmulas pesadas e as linhas vazias da grade, aba por aba. É ele que decide a correção:
juntar as idas (se o pedágio é o problema) ou tirar o peso da planilha (se são as fórmulas).

## A paginação (decisões do PO)

Pedido: "mostra os filtros de 5, 10, 20, 50 e 100, mas também tem a opção de próxima página".

| Pergunta | Resposta |
|---|---|
| O "Todos" sai? | **Fica**, junto da paginação |
| Depois de salvar, em que página? | **Na mesma página** (se ficar vazia, volta uma) |
| Quando fazer | **Junto** com a correção do erro de 40 s, depois do print |

Nada foi implementado ainda.
