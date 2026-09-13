# Manutenção

Para quem vai mexer neste sistema depois — inclusive você mesmo daqui a seis
meses, que não vai lembrar de nada.

Leia antes: [`01-arquitetura.md`](01-arquitetura.md) explica **por que** o
sistema é assim. Este arquivo explica **como** mexer nele sem quebrar.

---

## 1. A regra de ouro

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

## 2. As tarefas que aparecem toda semana

### Preciso de uma coluna nova numa base

Não edite o cabeçalho na planilha à mão. Use:

```javascript
adicionarColuna_('BASE_MESA', 'Nome da coluna', 'texto');
```

Os tipos válidos estão em `RECC_TIPO_DE_DADO`, no `Back-End/Esquema.gs`.
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
`Back-End/Esquema.gs`.

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

## 3. Onde mexer, por tipo de mudança

| Quero mudar | Mexo em |
|---|---|
| Uma coluna, um tipo de dado, uma aba | `Back-End/Esquema.gs` |
| Como o sistema lê ou grava na planilha | `Back-End/Planilha.gs` |
| A regra do Id | `Back-End/Sequencia.gs` |
| O que cada nível de acesso pode | `Back-End/Acesso.gs` |
| Quem pode entrar | `Back-End/Usuarios.gs` |
| O que a tela recebe ao abrir | `Back-End/Principal.gs` |
| A aparência, as cores, os temas | `Front-End/Estilos.html` |
| O menu e a barra superior | `Front-End/Moldura.html` |
| As telas e a navegação | `Front-End/Aplicacao.html` |
| Nome, logo, cor, nomes das telas | **a aba `CONFIG` da planilha** — não o código |

A última linha é a mais importante. Boa parte do que parece código é
configuração: nome do sistema, logo, cor, títulos do menu, status, motivos,
cargos, níveis, mesas e campos do formulário vivem na planilha.

---

## 4. Publicar no Apps Script

O projeto do Apps Script **não tem pastas**. As pastas aqui são organização do
repositório.

| Aqui | No editor do Apps Script |
|---|---|
| `Back-End/Acesso.gs` | `Acesso.gs` |
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

## 5. As armadilhas que já custaram caro

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

## 6. Nunca commite

CPF, nome de cliente, protocolo real, e-mail corporativo, Id de planilha,
senha, token, URL privada ou caminho de máquina local.

Os dados dos testes e da prévia são **inventados** — mantenha assim.
