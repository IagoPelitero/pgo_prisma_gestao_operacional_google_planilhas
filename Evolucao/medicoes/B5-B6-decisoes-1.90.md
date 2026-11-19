# B5 e B6 — decisões da versão 1.90

Todos os números deste documento são do **SIMULADOR** (`Evolucao/Testes/simulador.js`), não da planilha
de verdade. As duas réguas são estimativas:

- **Régua técnica**: 25 ms por chamada e 0,9 s por milhão de células (a do `estresse.js`).
- **Régua PO**: 25 ms por chamada, 53 µs por célula e 1 s por busca do localizador. Os números
  vieram da aba ERROS da planilha do PO em 18/11/2026. São uma estimativa, não uma medição.

Quem confirma na planilha de verdade é a **M1** (Configurações › Estrutura › Medir a velocidade).

---

## B5 — O selo da SUSEP: localizador × coluna × leitura parcial

**Como medir de novo:** `node Evolucao/Testes/medir-susep.js --salvar Evolucao/medicoes/susep-1.90.json`

Cada medição é uma execução nova, com o cache quente. Os tamanhos são 1.000, 7.000, 16.000 e
50.000 linhas em **cada** aba (CORRETORAS e SUSEP_BLOQUEADAS).

| Linhas | Cenário | Localizador | Coluna | Parcial (blocos de 1.000) |
|---:|---|---|---|---|
| 7.000 | cadastrada | 8 cham. · 20 cél. · 1 busca → 0,20 s / **1,20 s** | 7 cham. · 7.020 cél. → 0,18 s / **0,55 s** | 13 cham. · 7.020 cél. → 0,33 s / 0,70 s |
| 7.000 | não existe | 13 · 21 · 2 → 0,33 s / **2,33 s** | 11 · 14.021 → 0,29 s / **1,02 s** | 23 · 14.021 → 0,59 s / 1,32 s |
| 16.000 | não existe | 13 · 21 · 2 → 0,33 s / **2,33 s** | 11 · 32.021 → 0,30 s / **1,97 s** | 41 · 32.021 → 1,05 s / 2,72 s |
| 50.000 | não existe | 13 · 21 · 2 → 0,33 s / **2,33 s** | 11 · 100.021 → 0,36 s / **5,58 s** | 109 · 100.021 → 2,81 s / 8,03 s |

(Cada célula traz: régua técnica / régua PO. A tabela completa está em `susep-1.90.json`.)

**O que os números mostram**

- **Parcial:** lê as mesmas células que a coluna e faz até 10 vezes mais chamadas. Não pode parar
  no primeiro achado, porque vale a **última** linha visível da SUSEP (bloqueada, desbloqueada,
  bloqueada de novo). No "não existe", que é o caso mais comum de quem digita, ela lê tudo de
  qualquer jeito. Fica **descartada**.
- **Localizador:** o custo é **constante**, de 20 a 32 células, qualquer que seja o tamanho da aba.
- **Coluna:** o custo **cresce** com a aba.
- **Na régua técnica**, localizador e coluna empatam (cerca de 0,3 s) em todos os tamanhos.
- **Na régua PO**, a coluna ganha até cerca de 16 mil linhas por aba, e o localizador ganha daí em
  diante. Mas o "1 s por busca" saiu de buscas do Buscar Caso em **várias colunas** da BASE_RET. A
  SUSEP procura em **uma coluna só**, então essa régua tende a superestimar o localizador aqui.

**Decisão: manter o localizador, sem mudar código.**

1. O custo dele não cresce, e a lista de bloqueadas vai crescer (o PO citou 16 mil).
2. Na régua técnica, as duas estratégias empatam.
3. A leitura da coluna continua como **plano B automático** quando o localizador falha (Etapa 63).
4. Se a M1 mostrar, na planilha de verdade, que o localizador numa coluna só custa mais que ler as
   ~23 mil células (7 mil corretoras + 16 mil bloqueadas), a troca é a configuração
   `OPERACAO.BUSCA_RAPIDA`. Ela é geral, então a decisão vale para a busca toda e precisa de
   medição antes.

**Sem cache compartilhado.** Um índice das SUSEPs no cache do script seria:

- **pequeno demais:** cerca de 23 mil SUSEPs, além do limite de 100 KB por chave;
- **atrasado:** um bloqueio novo precisa valer na hora, e não quando o cache vencer.

Os dois riscos são maiores que o ganho.

---

## B6 — Travas, auditoria e aba ERROS

### Como estava (desde as Etapas 61 e 64)

- **Fila durável:** a auditoria e os erros entram numa fila no PropertiesService, que não precisa
  de trava.
- **Descarga:** é feita em lote, com `tryLock(0)`. Se a trava está ocupada, a descarga desiste na
  hora e ninguém espera. A próxima ação descarrega.
- **Sem perda:** grava antes de tirar da fila, então uma falha não perde nada.
- **Leitores:** a trilha, o arquivamento e o diagnóstico descarregam antes de ler.
- **A brecha:** se a execução caísse **entre gravar e tirar da fila**, o próximo gravaria o lote
  **de novo**. Era um registro repetido na AUDITORIA ou na ERROS.

### O que mudou: o lote sem repetir

1. Antes de gravar, a descarga deixa uma **marca** no PropertiesService, com as chaves do lote e a
   impressão de cada registro (o segundo, o usuário e a ação, ou o lugar do erro).
2. Depois de gravar e tirar da fila, a marca sai.
3. Quem descarrega depois resolve uma marca que tenha sobrado, sempre dentro da trava:
   - **o lote está nas últimas linhas da aba:** ele foi gravado, e só sai da fila;
   - **o lote não está:** ele continua na fila e é gravado agora, uma vez só.
4. **Custo:** 2 idas ao PropertiesService por descarga, e **nenhuma** chamada a mais à planilha. A
   régua de todas as telas está igual à da 1.89. A planilha só é lida na recuperação, que é rara.
5. Vale para a **AUDITORIA** e para a **ERROS**.

**Testes** (`testes-ux-190.js`, seção B6), todos quebras de propósito:

- cai depois de gravar e antes de tirar: a próxima descarga **não repete**;
- cai antes de gravar: a próxima grava **uma vez só**, sem perder nada;
- a aba ERROS tem a mesma proteção;
- a descarga normal não deixa marca sobrando.

### O que **não** mudou, e por quê

- **A descarga continua a cada ação.** Adiá-la (descarregar só a cada N registros) pouparia cerca
  de 9 das 28 chamadas do `editarCaso`, uns 0,2 s na régua técnica. Mas a aba AUDITORIA ficaria
  atrasada para quem a abre direto na planilha, e 12 arquivos de teste contam com "aparece na
  hora". É uma mudança de comportamento visível, e não uma otimização segura.
- **A trava da gravação:** dentro dela fica só o essencial. Pelo simulador:

  | Operação | Travas | Chamadas dentro | Células dentro |
  |---|---|---|---|
  | `editarCaso` | 2: a gravação e a descarga da auditoria | 18 | 110 |
  | `alterarSituacaoDoCaso` | 1 | 7 | 103 |
  | `cadastrarCaso` | 2 | 19 | 58 |

  O que fica dentro da trava é reler a estrutura, conferir o Id e a versão (B1) e gravar. Tirar
  qualquer um deles enfraqueceria a B1, o que está proibido. A descarga da auditoria pega a trava
  só se ela estiver livre.
- **A aba ERROS:** continua guardando os 2.000 mais recentes, com o mesmo erro, no mesmo lugar,
  uma vez por hora.
