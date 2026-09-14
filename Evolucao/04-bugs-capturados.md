# Bugs capturados

Todo defeito encontrado durante a construção, com o que ele fazia, por que
passou despercebido e o que impede a volta.

**Por que este arquivo existe:** quase todos são silenciosos — não davam
mensagem de erro, não travavam a tela, não apareciam no log. Um sistema que
grava dado errado sem reclamar é pior do que um que para. Documentar o sintoma
é a única forma de alguém reconhecê-lo se ele voltar.

**Como ler:** os bugs de origem foram herdados do PGO 5.x — apareceram em
produção e o RECC nasceu já protegido contra eles. Os demais foram encontrados
durante a construção, pela suíte ou olhando a tela.

---

## Herdados do PGO 5.x

Estes custaram caro em produção. O RECC nasceu com a defesa.

### H1 · O Google Planilhas corrompia identificadores

**Sintoma.** A busca por Id não achava o registro. A atualização gravava por
cima da linha errada. O gerador de sequência voltava a emitir Id já em uso.

**Causa.** Texto que "parece número" gravado numa célula de formato Geral é
convertido. `00000010` virava o número `10`, perdendo os zeros à esquerda, e
`000000E1` virava `0` — notação científica. Nos primeiros 200 mil Ids, 31 mil
viravam decimal, 9 mil viravam científico, e havia **4.328 colisões** em que
Ids diferentes terminavam com o mesmo valor na célula.

**Defesa.** A faixa é formatada como texto (`@`) **na linha, imediatamente
antes** do `setValues`. Formatar depois não desfaz: quando a célula converteu,
o zero já se foi. Ver `formatarEGravar_`, cujo nome existe para lembrar a
ordem.

### H2 · A sequência de Id andava para trás

**Sintoma.** Ids já usados eram emitidos de novo.

**Causa.** Diante de um Id deformado (H1), o gerador não o reconhecia como
número e rebaixava o piso da aba.

**Defesa.** O piso é `max(sequência guardada, maior Id da aba + 1)`, e a
sequência mora em Script Properties — nunca na planilha, que é editável à mão.

### H3 · Instalação nova nascia inacessível

**Sintoma.** Base recém-criada, ninguém conseguia entrar.

**Causa.** O acesso é pelo e-mail autenticado conferido contra a aba de
usuários. Base nova tem essa aba vazia: sem ninguém dentro ninguém entra, e sem
entrar ninguém cadastra.

**Defesa.** `instalarRECC()` cadastra quem a executou como o primeiro
administrador.

### H4 · Menu vazio confundido com falta de permissão

**Sintoma.** A pessoa abria o sistema, via o menu vazio e concluía que não
tinha acesso. Perdia-se uma tarde procurando no lugar errado.

**Causa.** Quando o resumo de acesso falhava, o backend devolvia uma lista de
permissões vazia — que na tela é idêntica a "não tenho permissão para nada".

**Defesa.** `pacoteDePartida` devolve `disponivel: false` com o **motivo
técnico**, e a tela mostra o motivo. Há quatro motivos distintos para a recusa,
e cada um leva a um lugar diferente: não cadastrado, cadastro desativado, nível
desligado e nível apagado do catálogo.

### H5 · Regra de permissão copiada em três lugares

**Causa.** Três cópias fora de sincronia. Uma tela ficou inalcançável para
quem tinha direito a ela.

**Defesa.** Uma fonte só, no servidor: o nível de acesso.

### H6 · Código de topo derrubava o projeto inteiro

**Sintoma.** `ReferenceError` na carga, com o sintoma longe da causa.

**Causa.** Uma constante no topo de um `.gs` dependia de outro arquivo ainda
não avaliado. O Apps Script avalia por ordem alfabética do nome do arquivo.

**Defesa.** Nenhum arquivo tem código de topo que dependa de outro. Toda
referência acontece dentro de função.

### H7 · Diagnóstico que aprovava build quebrado

**Causa.** Os blocos do diagnóstico eram embrulhados em
`if (typeof funcao === 'function')`. Quando o arquivo não era publicado — que é
justamente o que a ferramenta existe para achar — o bloco sumia e o build era
declarado íntegro.

**Defesa.** Função ausente é **falha**, não bloco pulado.

### H8 · Simulador de teste que não coagia

**Causa.** A planilha falsa das suítes gravava string como string. Nenhum teste
enxergava o H1.

**Defesa.** O simulador converte igual ao Sheets, e há um teste dedicado só a
provar que ele realmente corrompe quando o formato não é `@`. Sem esse teste,
os outros não valeriam nada.

---

## Encontrados na construção do RECC

### 1 · Coluna criada pelo administrador não guardava o tipo

**Etapa 1.** Uma coluna de moeda criada na tela receberia `"R$ 2.500,00"` como
**texto**, e o Power BI não somaria nada.

**Causa.** O tipo só existia no contrato (`Esquema.gs`). Coluna criada depois
não tinha onde guardar o seu.

**Defesa.** A aba `CAMPOS` ganhou a coluna `Aba` e passou a ser, sozinha, o
mapa coluna ↔ campo. `adicionarColuna_` registra o tipo lá.

### 2 · A próxima gravação passaria por cima de linha digitada à mão

**Etapa 1.** O mais grave da lista: perda de dado.

**Causa.** Eu calculava a última linha pela coluna de Id. Linha digitada à mão
nasce sem Id, então ficava invisível — e a inserção seguinte gravava em cima
dela. De quebra, o "normalizar base", que existe para carimbá-la, também não a
enxergava.

**Defesa.** A extensão dos dados é o conteúdo de **qualquer** coluna
(`ultimaLinhaComConteudo_`), nunca a coluna de Id.

### 3 · Um `case` esquecido devolvia CPF com pontuação

**Etapa 1 (durante o rename para português).** O `case` do `switch` ficou
apontando para uma constante renomeada. Como o `default` devolvia texto, o CPF
voltou a ser gravado com pontuação e **nada reclamou**.

**Defesa.** O `default` agora lança erro em vez de cair em texto calado, e um
teste percorre todo tipo declarado no Esquema exigindo formato e conversão.

### 4 · Comentário de HTML quebrava a página inteira

**Etapa 2.** A tela não chegava a ser montada.

**Causa.** O comentário do topo do arquivo explicava a sintaxe de scriptlet
**escrevendo a sintaxe**. O Apps Script executa scriptlet até dentro de
comentário de HTML.

**Defesa.** A explicação passou a descrever a sintaxe sem escrevê-la, e o
próprio comentário avisa o motivo.

### 5 · Campo sem coluna era descartado em silêncio

**Etapa 2.** Gravar `Protocolos` onde a coluna é `Protocolo` jogava o dado fora
e a tela dizia "salvo".

**Defesa.** Campo que não corresponde a nenhuma coluna vira **erro**, com a
lista das colunas existentes na mensagem.

### 6 · Nível de acesso desligado continuava valendo

**Etapa 2.** Desligar um nível no catálogo não tirava o acesso de ninguém.

**Defesa.** O nível precisa estar ativo, e a recusa diz que o problema é o
nível — mensagem diferente de "não cadastrado" e de "nível inexistente".

### 7 · A página do sistema não era montada

**Etapa 3.** `doGet` não entregava a identidade ao template do `Index`, que a
usa no título e na marca de abertura.

**Por que só apareceu na etapa 3.** O teste monta a página de verdade, em vez
de conferir se a função foi chamada.

### 8 · O simulador era mais restrito que o Apps Script

**Etapa 3.** Ele não dava aos templates acesso às funções do servidor, que no
Apps Script eles têm.

**Por que importa.** Um simulador mais rígido que a realidade reprova o que
funciona — tão ruim quanto um que finge. Os dois erros custam confiança na
suíte.

### 9 · A bolinha do tema escuro sumia no tema escuro

**Etapa 3. Encontrado olhando a tela, não por teste.** O anel estava por
dentro; passou para fora, num cinza que aparece nos dois fundos.

### 10 · O tema rosa tinha botões azuis

**Etapa 3. Encontrado olhando a foto.** A cor da operação, vinda de `CONFIG`,
era injetada direto em `--destaque` — e valia nos **quatro** temas.

**Defesa.** Ela entra em `--cor-da-operacao`, e só o tema padrão a consome. Um
teste confere que ninguém volte a escrever em `--destaque` e que os outros
temas não leiam a cor da operação.

### 11 · O identificador do registro era ilegível para quem o recebia

**Etapa 4.** `cadastrarCaso` devolvia `id: undefined`, e a tela mostrava
"Caso undefined cadastrado".

**Causa.** A coluna de identificador não tem o mesmo nome em toda aba: é `ID`
na Mesa Diamante, `id` na RET Vida e `Id` nas abas de sistema. Quem lia
`registro.Id` acertava numas abas e lia `undefined` nas outras — em silêncio.

**Defesa.** Todo registro carrega `__id`, sempre, qualquer que seja a grafia
do cabeçalho.

### 12 · Um nível chamado "Consulta" podia criar caso

**Etapa 4.** O nome dizia uma coisa e a permissão fazia outra.

**Causa.** A semente dava a MESMA lista de ações a todo nível que não fosse
administrador.

**Defesa.** Cada nível traz a sua lista, e um teste confere item a item que
Consulta não cria nem edita, que Operação não oculta e que só o administrador
mexe em estrutura.

### 13 · O sistema abria com duas telas mortas acima dele

**Etapa 4. Encontrado numa foto de página inteira** — as fotos anteriores, do
tamanho da janela, escondiam o problema.

**Causa.** O atributo `hidden` esconde por padrão do navegador, e **qualquer**
`display` escrito por nós ganha dele. As telas de abertura usam
`display: grid`, então continuavam ocupando 100vh cada uma depois de
escondidas. A página tinha 2.700px onde deveria ter 900.

**Defesa.** `[hidden] { display: none !important; }`, e um teste que confere
essa linha.

### 14 · O substituto do google.script.run inventou um erro

**Etapa 4. Não era bug do produto — era da ferramenta.** A prévia acusava
`Cannot read properties of undefined` ao consultar a SUSEP e montar o
formulário ao mesmo tempo.

**Causa.** O substituto guardava **um único par de retornos**, compartilhado
por todas as chamadas. Duas chamadas simultâneas se atropelavam: a resposta da
SUSEP chegava na mão de quem tinha pedido o formulário. O `google.script.run`
de verdade devolve um objeto novo a cada `withSuccessHandler`.

**Por que entra nesta lista.** É o mesmo erro do H8, invertido: lá o simulador
escondia um defeito, aqui inventou um. Ferramenta que não imita a realidade
custa confiança nas duas direções.

### 15 · Sete cartões para uma mesa de poucos casos

**Etapa 5, apontado pelo PO.** A Mesa Diamante tem menos demanda que a RET, e
um cartão por situação virava parede de números quase todos em zero.

**Não é bug de código, é de leitura** — e por isso entra aqui: painel que
cansa deixa de ser olhado, e um painel que ninguém olha não serve para nada.

**Defesa.** A mesa escolhe, na coluna `CartoesDoPainel`, quais situações viram
cartão. Vazia mostra todas.

### 16 · A fila era cinza inteira

**Etapa 5, apontado pelo PO.** Toda etiqueta de situação saía da mesma cor.
Numa fila de trinta linhas, "não trabalhado" não saltava aos olhos — era
preciso ler linha por linha.

**Defesa.** Cada situação tem a sua cor na coluna `Cor` do `CATALOGO`, gravada
como **nome de tom** (`bom`, `atencao`, `ruim`, `violeta`, `destaque`,
`neutro`) e não como código hexadecimal: cada tema pinta o seu verde. Gravar
`#15794A` deixaria o verde do tema claro aparecendo no escuro. Cor
desconhecida cai em `neutro`.

### 17 · O menu cansava a vista

**Etapa 5, apontado pelo PO.** Texto seminegrito e traço grosso nos ícones, em
cima de um fundo saturado, lido de relance o dia inteiro.

**Defesa.** Peso normal no item comum, seminegrito só no atual, traço dos
ícones de 1,7 para 1,5. Um teste tranca os pesos — é fácil alguém "reforçar"
o menu de novo sem perceber o custo.

### 18 · O aviso de "salvo" pintava branco à mão

**Etapa 6, pego pelo teste de tema.** O recado que aparece depois de gravar
nasceu com `color: #FFFFFF` escrito direto no componente. Num tema claro
ninguém veria diferença; no tema em que o verde é claro, o texto sumiria
dentro do próprio aviso.

**Defesa.** O teste que veio do achado 10 — "nenhum componente escreve cor à
mão" — apontou o arquivo e a linha antes de o aviso ser visto uma única vez na
tela. O recado passou a usar `--tom` e `--tom-tenue`, como todo o resto.

Vale registrar o que aconteceu aqui: a defesa de um bug antigo pegou um bug
novo sozinha, sem ninguém lembrar da regra. É para isso que ela existe.

### 19 · O menu ia em texto escuro sobre o azul

**Etapa 6, apontado pelo PO.** O texto do menu era azul-marinho sobre o azul
vivo da marca. Legível, mas de pouco contraste — e diferente do que a operação
tinha aprovado.

**Defesa.** `--lateral-texto` passou a branco nos três temas de fundo saturado
(padrão, rosa e Brasil), com opacidade .92 para o branco não vibrar, e o item
atual continua sendo o único totalmente opaco. Os sete desenhos do menu foram
refeitos para bater com o print: painel de quatro quadrados, mais, pulso, lupa,
prédio, barras e engrenagem. Um teste confere a cor nos três temas.

### 20 · O servidor recusava a resposta que ele mesmo tinha dado

**Etapa 7, pego pelo teste.** A tela lia os cards com `listarCardsDoPainel`,
deixava a pessoa mexer e devolvia a lista com `salvarCardsDoPainel`. O
servidor recusava: *"Não sei contar nacelula"*. Ele tinha devolvido
`nacelula`, porque a comparação de textos do sistema tira acento e caixa — e
esperava receber `naCelula` de volta.

**Defesa.** `dimensaoDoCartao_` traz a regra de contagem para uma forma
canônica só, e as duas pontas passam por ela. O mesmo defeito escondia um
segundo: o cartão "Finalizados na célula" **nunca aparecia**, porque a
comparação também falhava na hora de desenhar.

A lição: quando o que sai e o que entra são a mesma coisa, tem de passar pela
mesma função. Sempre.

### 21 · Um atributo servindo a duas coisas diferentes

**Etapa 7, pego no navegador.** O botão de trocar situação da linha nasceu com
`data-situacao`. Os **cartões** já usavam `data-situacao` para filtrar a fila.
Resultado: clicar num cartão abria o diálogo de troca de situação de um caso
que não existe — o valor ali é o rótulo do cartão, não um Id.

**Defesa.** O botão passou a `data-trocar-situacao`, e um teste procura o
nome antigo para garantir que ele não volte. Nenhum teste de servidor pegaria
isto: os dois lados estavam certos sozinhos.

### 22 · A logo do protocolo perdia as letras

**Etapa 7, pego na prévia.** `RET-2026-1018` aparecia como `20261018`. A
coluna `protocolo` estava declarada como `identificador`, e identificador
guarda **só dígitos** — de propósito, porque é o que o Power BI usa para
juntar tabelas.

**Defesa.** O protocolo da operação é alfanumérico, então virou `texto`. Vale
o registro de que o tipo estava fazendo exatamente o que promete: o erro foi
declarar o tipo errado, e só se enxergou com dado de verdade na tela.

---

### 23 · A linha aparada perdia a primeira coluna

**Sintoma.** Na tela de importação, uma linha colada do Excel com a primeira
coluna VAZIA aparecia inteira deslocada: o nome da corretora ia parar na
SUSEP, o canal na corretora, o segmento no canal. A recusa vinha certa —
"SUSEP sem nenhum dígito" — mas apontando para o campo errado, e dizendo que o
problema era um valor que a pessoa nunca digitou.

**Causa.** A função que lê o texto colado aparava cada LINHA antes de parti-la
em colunas:

```javascript
.map(function (linha) { return linha.trim(); })
```

Parece inofensivo, e é — até o separador ser TAB. `"\tCorretora Alfa\tAgente"`
aparado vira `"Corretora Alfa\tAgente"`, e a coluna vazia do começo
simplesmente deixou de existir. Todas as outras andaram uma casa para a
esquerda.

**Defesa.** A linha não é mais aparada. Quem apara é cada CÉLULA, depois de
partida — que era o único lugar em que aparar sempre foi seguro. A linha em
branco continua sendo descartada, mas por uma cópia aparada, sem mexer na
original.

**Por que importa mais do que parece.** Este é o caso em que a mensagem de erro
MENTE. O sistema recusou a linha, o que está certo, e explicou o motivo, o que
também está certo — mas explicou o motivo errado. Quem estivesse conferindo
duzentas linhas iria procurar o defeito na coluna que a tela apontou, e não na
que estava vazia.

**Como apareceu.** Não foi teste: foi olhar a tela com o dado colado nela. Os
quinze testes da importação passavam, porque nenhum deles tinha uma primeira
coluna vazia — e escrever esse caso não teria ocorrido a ninguém antes de ver
a linha torta na tela.

---

### 24 · A regra do campo de digitar esticou a caixa de marcar

**Sintoma.** Na lista de colunas de uma análise, as caixas de marcar
apareciam — e os nomes das colunas, não. Os rótulos estavam no HTML, com o
texto certo, e mesmo assim invisíveis na tela.

**Causa.** Uma linha escrita meses antes, para os campos de digitar:

```css
.config-campo input, .config-campo select { …  width: 100%; }
```

A lista de colunas foi a PRIMEIRA caixa de marcar a morar dentro de um
`.config-campo`. A regra a pegou junto, esticou a caixinha até a largura
inteira do painel, e empurrou o rótulo para 1405px — fora da tela.

**Defesa.** `:not([type="checkbox"])` na regra, com o motivo escrito ao lado.

**O que ela ensina.** É o item [21](#21--um-atributo-servindo-a-duas-coisas-diferentes)
outra vez, em CSS: uma regra escrita para uma coisa passa a valer para uma
segunda que ainda não existia quando ela foi escrita. Nos dois casos o código
antigo estava certo, o código novo estava certo, e o encontro entre eles é
que estava errado.

---

### 25 · O erro que sabia tudo e não contava nada

**Sintoma.** Publicado no Apps Script, o sistema não abria. A única coisa que
aparecia era:

> nenhum arquivo html com o nome formulario foi encontrado — linha 53

**Causa.** Verdadeira, e insuficiente. O `Formulario.html` tinha ficado para
trás na cópia dos arquivos para o projeto. Mas a mensagem é do Apps Script, e
ela não diz nada do que resolve:

- **de onde tirar o arquivo** — quem recebe isso não sabe se o nome está
  errado, se o arquivo não foi copiado, ou se é defeito do sistema;
- **como nomear** — no Apps Script o arquivo se chama `Formulario`, sem
  `.html`, sem acento, com as maiúsculas iguais. Metade dos casos é isto;
- **quantos mais faltam** — e este é o pior. Ela nomeia UM. A pessoa copia
  esse, recarrega, descobre o próximo, e repete quinze vezes.

E nenhum teste pegava, porque **os testes leem a pasta do repositório, onde o
arquivo está**. Quem não tinha o arquivo era o projeto do Apps Script.

**Defesa.** Três, e as três vieram juntas:

1. `incluir_` embrulha a falha e devolve um recado que diz o nome exato, a
   regra de nomenclatura e **todos** os arquivos que faltam, de uma vez.
2. `verificarEstruturaRECC()` passou a conferir os arquivos de tela, e não só
   as abas. Ela sempre prometeu isso no README — *"diz em segundos se algum
   arquivo ficou para trás na cópia"* — e conferia só a planilha.
3. O simulador ganhou `esconderTela(nome)`: um arquivo que está na pasta e
   não está no projeto. Sem poder simular isso, o caminho de erro mais comum
   de uma instalação nova continuaria sem teste. São cinco testes novos.

**O que ela ensina.** Uma mensagem de erro tem um trabalho: encurtar o
caminho até o conserto. Esta dizia a verdade e deixava a pessoa exatamente
onde estava — e a única informação que faltava (a lista completa) o sistema
tinha à mão o tempo todo.

---

### 26 · Dois arquivos com o mesmo nome, e o Apps Script só aceita um

**Sintoma.** Reportado pela operação: `Configuracoes.gs` não podia ser criado
no projeto do Apps Script.

**Causa.** No repositório, `Back-End/Configuracoes.gs` e
`Front-End/Configuracoes.html` moram em pastas diferentes e convivem em paz.
No Apps Script **não existe pasta**: todos os arquivos ficam num projeto só, e
o nome é único **independente da extensão**. Com o `Configuracoes.html` já lá,
o `.gs` simplesmente não entra.

A colisão era invisível de onde estávamos olhando. Ela não aparece no
repositório, não aparece na suíte, e não aparece em nenhuma leitura do código:
aparece na hora de colar, quando já é tarde.

**Defesa.** O servidor virou `Config.gs`, e um teste confere que nenhum `.gs`
tenha o mesmo nome de um `.html` — e, de quebra, que nenhum nome se repita
ignorando maiúsculas, porque o Apps Script diferencia a caixa e quem copia à
mão não.

---

### 27 · A tela travada em "Lendo o cadastro…"

**Sintoma.** A aba Usuários de Configurações ficava parada na mensagem de
carregamento. Para sempre. Sem erro na tela.

**Causa.** Duas, e a primeira é o que torna a segunda tão difícil de achar.

**A primeira:** quando a função **não existe no servidor**,
`google.script.run.nomeDela` é `undefined`, e o `.apply` estoura *na hora* —
dentro de `chamar()`, antes de a chamada sair do navegador. Nesse instante o
`.senao` ainda **nem foi registrado**: ele é chamado logo depois, no
encadeamento. O erro escapava por fora do caminho de falha inteiro, e o único
vestígio era uma linha no console.

O sintoma não tem nada a ver com a causa. "A tela não carrega" não sugere
"faltou um arquivo `.gs`" a ninguém.

**A segunda:** a resposta que chega **depois de a pessoa trocar de tela**. O
Apps Script responde quando responde, e dá tempo de sobra para desistir e ir
para outro lugar. Quando a resposta chegava, quem ia desenhá-la procurava um
elemento que não existe mais: `Cannot set properties of null`. Dentro de
Configurações havia a versão irmã disso — trocar de **seção** zera o `dados`,
e a resposta atrasada tentava desenhar com um `dados` que não era o dela.

**Defesa.** Três:

1. `chamar()` embrulha o disparo. Função ausente vira uma mensagem que diz o
   nome dela, a causa provável e onde ver a lista inteira — entregue pelo
   `.senao`, adiada com `setTimeout` porque o `.senao` só existe depois que
   `chamar()` retorna.
2. A ponte conta as trocas de tela. A resposta só é entregue se a tela que
   perguntou ainda for a da vez. Não é erro engolido: é resposta para uma
   pergunta que ninguém está mais fazendo.
3. Em Configurações, cada função de desenho começa conferindo se a seção ainda
   é a dela.

**Como apareceu.** Clicando em tudo. Um roteiro que percorre as sete telas e
clica em 112 elementos, ouvindo `pageerror` — os dois erros de resposta
atrasada só aparecem quando se clica rápido, e nenhum teste de servidor
chegaria perto deles.

---

### 28 · Dois mil idas ao PropertiesService para gravar cinco mil linhas

**Sintoma.** No teste de estresse, gravar 5.000 casos de uma vez custava
**10.003 idas ao serviço** — duas por linha — e uns **dois minutos** dentro de
uma execução que tem seis. A importação de 2.000 corretoras levava 48 segundos.

**Causa.** `proximoIdentificador_` era chamada **por linha**, e cada chamada
fazia uma leitura e uma gravação no `PropertiesService`. No Apps Script cada
ida dessas custa dezenas de milissegundos: o trabalho de verdade era rápido, e
o pedágio consumia tudo.

**Defesa.** `proximosIdentificadores_(aba, quantos)` reserva o **bloco
inteiro** numa ida só: uma leitura, uma gravação, para cinco mil linhas ou para
uma. `proximoIdentificador_` virou o bloco de tamanho um — não existem duas
regras. Gravar 5.000 casos passou de 10.003 idas para **5**; a importação de
2.000, de 48 segundos para **445 ms**.

Se a gravação estourar no meio, os Ids reservados se perdem e a numeração fica
com buraco. É o que tem de acontecer: buraco não quebra nada, Id reemitido
quebra tudo — e foi o que aconteceu no PGO 5.x.

---

### 29 · Cem idas ao serviço para uma busca de cem resultados

**Sintoma.** `lerLinhasEspecificas_` — a segunda metade da busca, que lê as
linhas inteiras depois de a primeira ter achado em quais elas estão — fazia
**uma ida por linha**. Com o teto de 100 resultados, uma busca comum custava
cem idas: dois segundos e meio de pedágio na tela que a operação mais usa.

**Defesa.** Agrupar. Os números de linha viram BLOCOS contínuos, tolerando
buracos de até 50 linhas — porque ler cinquenta linhas à toa custa menos de um
décimo de milissegundo, e outra ida custa 25. Uma busca cujos resultados caem
perto sai numa leitura só.

A ordem de saída continua sendo a **pedida**, e não a da planilha: quem chamou
já ordenou por relevância, e reordenar aqui desfaria isso em silêncio.

---

### 30 · O painel mostrava um pedaço e parecia o total

**Sintoma.** Este não é lentidão: é **número errado**, e é o achado mais grave
do teste de estresse.

Os painéis leem só as últimas 5.000 linhas da base — de propósito, e está
documentado. Com 200 mil casos espalhados em um ano, uma janela de 30 dias tem
umas **15 mil linhas**: o painel mostrava **um terço do período**.

O Dashboard avisava — mas o aviso estava colado na FILA, dizendo "a fila mostra
as N mais recentes", o que dá a entender que os **cartões** em cima estavam
completos. E eles não estavam: saem do mesmo recorte.

O **Painel Analítico** calculava `truncada` e **nunca mostrava**. A **Minha
Performance** nem calculava — e é a tela sobre uma PESSOA, onde número
incompleto vira julgamento errado sobre alguém.

**Defesa.** Quatro:

1. `minhaPerformance` passou a calcular `truncada`, e as três telas devolvem
   também **quantas linhas leram**, para o aviso ser concreto.
2. Um aviso só, em `Moldura.avisoDeJanela`, usado pelas três. Três frases
   diferentes para o mesmo fato é como a operação aprende que uma delas não é
   séria.
3. Ele fica **no alto**, antes dos números. Depois, ele explicaria um número
   que a pessoa já leu como se fosse o total.
4. A janela virou configurável — `OPERACAO.LINHAS_DO_PAINEL` —, e o aviso diz
   onde mexer. "Os números podem estar incompletos" sozinho não ajuda ninguém.

**O que ele ensina.** Um recorte documentado no código não é um recorte
comunicado a quem lê o número. O comentário estava lá, correto, desde o
começo — e a tela continuava mentindo por omissão.

---

### 31 · "Desconfigurou a estilização" — e daqui não dava para ver nada

**Sintoma.** Relatado pela operação, exatamente assim: *"desconfigurou a
estilização da página, o que pode ser?"*. O sistema abria, o conteúdo estava
lá, e a aparência não.

**Por que é difícil.** CSS que não existe **não reclama** — só não pinta. Não
há erro no console, não há exceção, não há nada no log. E do lado do
repositório estava tudo certo: a prévia renderizava perfeitamente. O que estava
desatualizado era a **cópia no projeto do Apps Script** — o caso mais comum de
uma cópia manual, com o `Estilos` ficando para trás enquanto as telas avançam.

**O que a investigação achou de quebra.** Comparando as classes que as telas
escrevem com as que a folha define, apareceram **três buracos no próprio
repositório**:

| classe | situação |
|---|---|
| `.ver` | Usada em três telas e definida em lugar nenhum. Quem pinta o botão "Ver detalhes" é o `.acao` — `.ver` era **classe morta**. Removida |
| `.config-mesas` | O seletor de mesa encostava no botão "Criar campo": o cabeçalho é flex e não separa sozinho quem não tem largura própria |
| `.config-legado` | A caixa da planilha legada e a do diagnóstico não tinham a linha que as separa da lista — pareciam a continuação dela |

**Defesa.** Um bloco novo no diagnóstico, **A folha de estilos**, que roda
dentro do Apps Script e responde três coisas:

1. O `Estilos` está no projeto?
2. Ele está **inteiro**? Chaves desequilibradas ou `</style>` ausente
   denunciam a colagem de 70 KB que não foi até o fim.
3. Toda classe que as telas usam está **definida**? Se não, o laudo lista os
   nomes — e diz a causa provável, que é quase sempre a mesma.

Com isso, "está desconfigurado" vira "o `Estilos` deste projeto é mais antigo
que as telas, e faltam estas sete classes".

**O que ele ensina.** O defeito silencioso não é o que não tem erro: é o que
não tem **sintoma que aponte para a causa**. Aqui o sintoma ("está feio") e a
causa ("um arquivo ficou para trás") não têm nenhuma relação aparente, e
nenhuma ferramenta do lado do desenvolvedor enxergava o problema. A saída foi
levar a conferência para onde o problema mora.

---

## O que esta lista ensina

**Quinze dos vinte e cinco eram silenciosos.** Não davam erro, não travavam, não
apareciam no log. Gravavam dado errado e seguiam em frente.

Daí as duas práticas que o projeto não abre mão:

1. **Erro alto em vez de padrão silencioso.** Tipo desconhecido, campo sem
   coluna, cabeçalho repetido e Id repetido interrompem a operação. Dado errado
   calado é pior que operação parada.
2. **Olhar a tela.** Os itens 9, 10 e 13 nenhum teste pegaria sozinho — e o
   13 só apareceu numa foto de página inteira.
3. **Ouvir quem vai usar.** Os itens 15 a 17 e o 19 não são defeitos de
   código: são de leitura, e vieram do PO olhando a tela pronta. Painel que
   cansa deixa de ser olhado, e painel que ninguém olha não serve para nada.
   Teste não enxerga "está feio" nem "essa cor não devia estar aqui".
4. **Defesa velha pega bug novo.** O item 18 foi apontado pelo teste que
   nasceu do item 10, meses de trabalho depois, num arquivo que nem existia
   quando a regra foi escrita. Guarda que só serve para o bug que a criou não
   valeria o custo de mantê-la.
5. **Abrir no navegador é parte do teste.** Os itens 21 e 22 nenhum teste de
   servidor pegaria: nos dois, cada lado estava certo sozinho e o encontro
   entre eles é que estava errado. Só apareceram com o sistema aberto e dado
   de verdade na tela.
6. **Mensagem de erro também tem bug.** O item 23 recusava a linha certa pelo
   motivo errado. Sistema que aponta o campo errado é pior que sistema que só
   diz "deu erro": manda quem está conferindo procurar no lugar errado, com a
   confiança de quem foi informado.
7. **Estar certo não basta: a mensagem tem de encurtar o caminho até o
   conserto.** O item 25 dizia a verdade — o arquivo faltava mesmo — e deixava
   a pessoa exatamente onde estava. A informação que faltava, o sistema tinha
   à mão o tempo todo.
8. **O teste que roda fora do Apps Script não vê o projeto do Apps Script.**
   Os itens 25, 26 e o laudo da Etapa 12 são a mesma lição: a suíte lê a PASTA
   do repositório, e a instalação é outra coisa — no repositório há pastas, no
   Apps Script não. É por isso que existe um diagnóstico que roda lá dentro.
9. **O erro que escapa por fora do caminho de erro é o pior de todos.** No
   item 27 havia `.senao` em todas as 73 chamadas, e mesmo assim a tela
   travava: a falha acontecia *antes* de o `.senao` existir. Ter tratamento de
   erro em todo lugar não garante que o erro passe por ele.
10. **Clicar rápido é um teste.** Os dois defeitos de resposta atrasada só
    aparecem quando alguém desiste no meio — e é o que as pessoas fazem o dia
    inteiro. Um roteiro que percorre as telas clicando em tudo achou os dois
    em dois minutos.
11. **Volume não é só lentidão.** Os itens 28 e 29 eram tempo, e teriam
    aparecido no primeiro dia ruim. O 30 era NÚMERO ERRADO, e não apareceria
    nunca: a tela mostrava um terço do período com a cara de quem mostra
    tudo. Um sistema que fica lento avisa sozinho; um que fica errado, não.
12. **CSS que não existe não reclama.** O item 31 não tinha erro, não tinha
    exceção, não tinha log — só ficava feio. Defeito silencioso não é o que
    não dá erro: é o que não tem sintoma apontando para a causa.
13. **Medir o relógio errado não mede nada.** No Apps Script o custo é a IDA
    ao serviço, não a conta em JavaScript. Os itens 28 e 29 eram invisíveis no
    relógio do Node — o Node não paga pedágio. Contar as idas mostrou os dois
    na primeira execução.
