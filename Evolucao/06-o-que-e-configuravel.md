# O que é configurável, e o que ainda não é

> **A pergunta que originou este arquivo:** *"As configurações permitem
> configurar tudo que existe no PGO?"*
>
> A resposta honesta é **quase**. Esta página é a lista completa, sem
> maquiagem: o que já se ajusta pela tela, o que só se ajusta na planilha, e o
> que ainda não se ajusta em lugar nenhum.

A régua é simples: **nada que a operação precise mudar no dia a dia pode
exigir um programador.** Onde essa régua ainda não é cumprida, está escrito
abaixo com o motivo.

---

## Já se ajusta pela tela de Configurações

| Assunto | O que dá para fazer | Onde |
|---|---|---|
| **Campos do formulário** | Rótulo, dica, seção, tipo, máscara, obrigatoriedade, ordem, lista de origem, ligar e desligar | Campos do formulário |
| **Coluna nova na base** | Criar campo, que cria a coluna na planilha | Campos do formulário · **pede senha** |
| **Usuários** | Cadastrar, editar, trocar cargo e nível, canal que atende, tirar o acesso | Usuários |
| **Níveis de acesso** | Quais telas abrem, o que a pessoa pode fazer, até onde enxerga | Níveis de acesso |
| **Listas** | Situações, canais, motivos, ramos, áreas, cargos, formas de pagamento, origens: criar, renomear o rótulo, recolorir, reordenar, desligar | Listas |
| **Mesas de trabalho** | Nome, descrição, coluna da data, da hora, da situação, da finalização, da área responsável, colunas da fila e os grupos delas, ordem, ligar e desligar | Mesas de trabalho |
| **Cards do Dashboard** | Criar, renomear, escolher o que cada um conta, a cor, a ordem, mostrar ou ocultar, remover — até 12 por operação | Painéis |
| **Identidade** | Nome curto, nome por extenso, operação, frase da tela de bloqueio, cor da operação, plataforma, fabricante, **logo** (escolhendo a imagem do computador) | Identidade e segurança |
| **Senha de administrador** | Definir e trocar | Identidade e segurança |
| **Busca** | Em quais colunas cada mesa procura | Mesas de trabalho |
| **Planilha legada** | Apontar a base do sistema anterior — Id, aba e como ela aparece na busca. O Id é conferido na hora | Estrutura e auditoria |
| **Estrutura** | Conferir o laudo da planilha e ler a trilha de auditoria | Estrutura e auditoria |

---

## Ainda se ajusta só na planilha

Funciona, e é editável — mas exige abrir a aba e digitar na célula, o que não
é o mesmo que ser configurável.

| Assunto | Onde mora | Por que ainda não tem tela |
|---|---|---|
| **Nome das telas no menu** | `CONFIG` → `MENU.TITULOS` | Um JSON numa célula. Merece uma tela, e é o próximo a ganhar uma |
| **Janela da fila** (30 dias) | `CONFIG` → `OPERACAO.JANELA_DIAS` | Um número solto; entra junto com os títulos do menu |
| **Tema padrão da operação** | `CONFIG` → `OPERACAO.TEMA_PADRAO` | Idem |
| **Corretoras e canais** | aba `CANAIS` | Ganha tela própria na **etapa 10**, Tabela de Corretoras |
| **Produtos** | aba `PRODUTOS` | Mesma etapa |
| **SUSEPs bloqueadas** | aba `SUSEP_BLOQUEADAS` | Mesma etapa |
| **Visibilidade de campo por nível** | `CATALOGO` → `Configuracao.campos` | O servidor já respeita (oculto, leitura, edição). Falta a tela — hoje é um JSON |

---

## Ainda não se ajusta em lugar nenhum

Isto não é omissão: cada um tem uma razão para ainda não existir.

| Assunto | Por quê |
|---|---|
| **Criar mesa nova** | Criar mesa é criar aba na planilha. É a ação mais cara do sistema, e a única do contrato que ainda não passou por uma tela com senha |
| **Apagar mesa, campo ou lista** | Por decisão, o sistema **desliga** em vez de apagar. Apagar de verdade sairia do princípio de que nenhuma linha se perde |
| **Trocar o TIPO de uma coluna existente** | Mudar `texto` para `data` numa coluna com 30 mil linhas reinterpreta tudo o que já está gravado. Precisa de conversão e conferência, não de um seletor |
| **Renomear o cabeçalho de uma coluna** | É o nome que amarra o dado ao Power BI. Renomear na planilha e reconciliar aqui é o caminho seguro; um botão que fizesse isso quebraria relatório em silêncio |
| **Gráficos do Painel Analítico** | A aba `PAINEIS` já guarda tipo, dimensão, medida e limite. A tela chega na **etapa 8** |

---

## Como pensar nisso

Três perguntas, nesta ordem:

1. **A operação muda isso no dia a dia?** Se sim, tem de estar na tela.
2. **Errar isso quebra dado gravado?** Se sim, pede senha, ou não passa pela
   tela nenhuma.
3. **Errar isso quebra só a aparência?** Então é livre, e nem confirmação
   precisa.

Quase tudo o que está na primeira lista respondeu "sim" à primeira pergunta e
"não" à segunda. O que está na terceira lista respondeu "sim" à segunda — e é
por isso que continua fora.
