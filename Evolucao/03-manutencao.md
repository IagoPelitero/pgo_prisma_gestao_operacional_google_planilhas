# Manutenção

Para quem vai mexer neste sistema depois — inclusive você mesmo daqui a seis
meses, que não vai lembrar de nada.

Leia antes: [`01-arquitetura.md`](01-arquitetura.md) explica **por que** o
sistema é assim. Este arquivo explica **como** mexer nele sem quebrar.

---

## 1. Definição de pronto

Uma etapa só está concluída quando as três coisas valem ao mesmo tempo:

1. **Funciona.** Não é código escrito — é tela que abre, botão que responde e
   dado que chega na célula certa. Conferido rodando, não lendo.
2. **A suíte passa**, cinco execuções seguidas.
3. **Está no GitHub.** Commitada e enviada, com a documentação da pasta
   `Evolucao/` atualizada junto.

Etapa que fica só na máquina de alguém não existe. Etapa que passa no teste
mas nunca foi aberta no navegador também não.

---

## 2. A regra de ouro

**Rode a suíte antes e depois de qualquer mudança.**

```bash
node Evolucao/Testes/rodar.js
```

Cinco execuções seguidas sem falha. Rodar uma vez não detecta teste instável —
isso já aconteceu no sistema anterior, com uma comparação de carimbo de tempo
que falhava quando duas gravações caíam no mesmo milissegundo.

Se a suíte reprovar depois da sua mudança, **a suíte está certa até você provar
o contrário.** Cada teste ali nasceu de um problema real.

---

## 3. As tarefas que aparecem toda semana

### Preciso de uma coluna nova numa base

Não edite o cabeçalho na planilha à mão. Use:

```javascript
adicionarColuna_('BASE_MESA', 'Nome da coluna', 'texto');
```

Os tipos válidos estão em `RECC_TIPO_DE_DADO`, no `Back-End/Base.gs`.
A função cria a coluna no **fim** da aba, aplica o formato de célula certo e
registra o tipo em `CAMPOS`. Sem esse registro, na próxima execução a coluna
voltaria a ser lida como texto — e uma coluna de moeda guardaria
`"R$ 2.500,00"` em vez de `2500`.

### Alguém digitou linhas direto na planilha

Linha digitada à mão nasce sem Id. Sem Id não há relacionamento, e a
atualização por Id não acha o registro.

```javascript
normalizarIdentificadoresDaAba_('BASE_MESA');
```

Ela carimba os Ids que faltam, realinha a sequência e devolve um laudo com
quantas linhas foram carimbadas e se há Id repetido.

### Um cabeçalho mudou de nome na planilha

```javascript
verificarEstruturaRECC();
```

Só lê. Mostra o que sumiu e o que apareceu, sem consertar nada. O conserto é
decisão de gente: ou renomeia de volta na planilha, ou ajusta o contrato no
`Back-End/Base.gs`.

### Preciso esconder um registro sem perdê-lo

Nunca apague a linha. A exclusão do RECC é lógica:

```javascript
ocultarRegistro_('BASE_MESA', '0000000042', idDoUsuario);
reexibirRegistro_('BASE_MESA', '0000000042');
```

Some do sistema, permanece na planilha. Dá para reverter editando `_Visivel`
na mão, direto na célula.

### Quero ver as telas sem publicar no Apps Script

```bash
node Evolucao/Testes/gerar-previa.js
```

Escreve `previa/sistema.html` e `previa/sem-acesso.html`, que abrem em
qualquer navegador. São montados pelo **mesmo código do servidor** — só a ponte
com o Google é substituída.

---

## 4. Onde mexer, por tipo de mudança

São **19 arquivos**, agrupados por assunto: 7 do servidor e 12 de tela. Se
você não souber em qual está o que procura, o agrupamento está errado — não
você. Abra uma questão.

| Quero mudar | Mexo em |
|---|---|
| Uma coluna, um tipo de dado, uma aba | `Back-End/Base.gs` |
| Como o sistema lê ou grava na planilha | `Back-End/Base.gs` |
| A regra do Id | `Back-End/Base.gs` |
| O que cada nível de acesso pode | `Back-End/Entrada.gs` |
| Quem pode entrar | `Back-End/Entrada.gs` |
| O que a tela recebe ao abrir (o `doGet`) | `Back-End/Entrada.gs` |
| As perguntas do formulário, a validação | `Back-End/Casos.gs` |
| Gravar, editar ou ocultar um caso | `Back-End/Casos.gs` |
| Como a busca procura | `Back-End/Casos.gs` |
| Os cartões do Dashboard e a fila | `Back-End/Indicadores.gs` |
| As contas dos gráficos | `Back-End/Indicadores.gs` |
| Os números de uma pessoa, a meta, o ranking | `Back-End/Indicadores.gs` |
| Corretoras, produtos, SUSEPs bloqueadas | `Back-End/Cadastros.gs` |
| A importação em lote | `Back-End/Cadastros.gs` |
| Uma seção da tela de Configurações | `Back-End/Config.gs` |
| O gerador das abas `ANALISE_*` | `Back-End/Config.gs` |
| O que o instalador cria numa planilha nova | `Back-End/Instalacao.gs` |
| O que o diagnóstico confere | `Back-End/Instalacao.gs` |
| A aparência, as cores, os temas | `Front-End/Estilos.html` |
| O menu, a barra superior, o formulário, os gráficos | `Front-End/Comuns.html` |
| A ponte com o servidor e a navegação | `Front-End/Aplicacao.html` |
| Uma tela do menu | `Front-End/<NomeDaTela>.html` |
| Nome, logo, cor, nomes das telas | **a aba `CONFIG` da planilha** — não o código |

A última linha é a mais importante. Boa parte do que parece código é
configuração: nome do sistema, logo, cor, títulos do menu, status, motivos,
cargos, níveis, mesas e campos do formulário vivem na planilha.

---

## 5. Publicar no Apps Script

O projeto do Apps Script **não tem pastas**. As pastas aqui são organização do
repositório.

| Aqui | No editor do Apps Script |
|---|---|
| `Back-End/Entrada.gs` | `Entrada.gs` |
| `Front-End/Index.html` | `Index.html` |
| `Evolucao/` | **não vai** — roda no seu computador |

A ordem da cópia não importa: o Apps Script avalia os `.gs` em ordem
alfabética, e **nenhum arquivo tem código de topo que dependa de outro**. Essa
regra não é estilo — no sistema anterior, uma constante de topo lida antes da
hora derrubava a carga do projeto inteiro com um erro que aparecia longe da
causa.

Depois de publicar, rode `verificarEstruturaRECC()` no editor. Nenhum teste
rodado fora do Apps Script pega um arquivo que ficou para trás na cópia.

---

## 6. As armadilhas que já custaram caro

Não repita nenhuma delas. A lista completa, com sintoma e causa, está em
[`04-bugs-capturados.md`](04-bugs-capturados.md).

1. **Gravar identificador sem formatar a célula como texto antes.**
   O Sheets converte: `00000010` vira `10`, `000000E1` vira `0`.
2. **Deduzir coluna pela posição.** Só pelo nome do cabeçalho.
3. **Escrever cor à mão num componente do CSS.** Ela sobrevive à troca de tema.
4. **Decidir permissão pelo nome do cargo.** Permissão vem do nível, sempre.
5. **Deixar uma falha virar lista de permissões vazia.** Menu vazio é lido como
   "não tenho acesso", e manda a pessoa procurar no lugar errado.
6. **Escrever a sintaxe de scriptlet dentro de comentário de HTML.** O Apps
   Script executa scriptlet até em comentário.
7. **Código de topo num `.gs` que dependa de outro arquivo.**

---

## 7. Nunca commite

CPF, nome de cliente, protocolo real, e-mail corporativo, Id de planilha,
senha, token, URL privada ou caminho de máquina local.

Os dados dos testes e da prévia são **inventados** — mantenha assim.
