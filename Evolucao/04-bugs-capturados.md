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

**Sobre os nomes de arquivo daqui:** eles são os da época. Em 2026-09-15 os 35
arquivos foram agrupados em 19 — `Planilha.gs` virou uma seção do `Base.gs`,
`Moldura.html` uma peça do `Comuns.html`, e assim por diante. Esta lista não
foi reescrita de propósito: ela conta o que aconteceu, e trocar os nomes faria
o registro mentir sobre onde o defeito morava. O mapa de hoje está no
[01-arquitetura.md](01-arquitetura.md); o banner de cada seção diz de qual
arquivo ela veio.

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

### 32 · A tela que espera para sempre

**Sintoma.** A aba Usuários fica em "Lendo o cadastro…" e não sai. Sem erro,
sem mensagem, sem nada no console.

**Causa.** Há falha que **não chega ao `withFailureHandler`**. Quando a função
não existe no servidor, quando a execução morre do outro lado, quando a
resposta não atravessa a fronteira — em alguns desses casos nada volta: nem
sucesso, nem erro. O `.senao` nunca é chamado, porque não há o que chamar.

O sistema já sabia dizer quando a função não existe (achado 27). O que ele não
sabia era **desistir**.

**Defesa.** Um relógio. Se em quarenta segundos nada voltou, a ponte desiste e
chama o `.senao` ela mesma, com um recado que nomeia a função e aponta o
`diagnosticoRECC()`. Quarenta é folga enorme: a operação mais cara do sistema,
medida com 200 mil casos, leva nove segundos.

**O que ele ensina.** Uma tela parada é o pior estado possível — ela não
funciona **e não avisa**. Entre esperar para sempre e desistir explicando,
desistir é sempre melhor. Tratar o erro em todo lugar não basta se existe um
caminho em que o erro nunca acontece: só o silêncio.

### 33 · O teste que fabricava o que ia conferir

**Sintoma.** Nenhum. E é esse o ponto.

**Causa.** O teste `o pacote junta tudo, e nada fica de fora` começava assim:

```js
const destino = path.join(raiz, 'Evolucao', 'pacote');
require('./gerar-pacote').gerar(destino);      // <- regera
const codigo = fs.readFileSync(path.join(destino, 'Codigo.gs'), 'utf8');
```

Ele **gerava o pacote por cima do que estava no repositório** e conferia o que
tinha acabado de gerar. Então provava uma coisa só: que o gerador funciona.
Sobre o arquivo que alguém vai baixar e colar, não provava nada — o pacote
commitado podia estar semanas atrasado e o teste passaria igual, verdinho.

Havia ainda um segundo efeito, menor e visível: depois de toda rodada de
teste o `git status` ficava sujo, com um arquivo versionado alterado só no
carimbo "Gerado em". Foi esse sintoma bobo que fez olhar para o teste — o
defeito de verdade estava atrás dele.

**Defesa.** Duas mudanças. O teste do gerador passou a escrever numa pasta
**descartável** (`fs.mkdtempSync`), nunca por cima do repositório. E nasceu um
segundo teste, `o pacote guardado no repositório ainda é o código de hoje`,
que gera uma cópia fresca, tira a linha do carimbo dos dois lados e compara:
se divergirem, ele falha dizendo o comando que resolve.

**O que ele ensina.** É a armadilha do bloco que se aprova sozinho, da Etapa
12, aparecendo de novo — desta vez dentro da própria suíte. **Conferir o que
você acabou de fabricar não é conferir nada.** O teste tem de olhar para o
artefato que vai ser usado, não para um gêmeo recém-nascido dele.

---

---

### 34 · O obrigatório que recusava o valor que o sistema tinha guardado

**Sintoma.** Nenhum, na tela. E ia ficar assim até a importação existir.

**Causa.** O campo Status da RET ganhou `valorPadrao: 'Não trabalhado'`, como a
operação pediu. Mas o `validarValores_` conferia obrigatoriedade **antes** de
aplicar o padrão:

```js
if (bruto === undefined || bruto === null) bruto = '';
var problema = conferirCampo_(descricao, bruto);   // <- confere primeiro
```

Um cadastro que chegasse sem status era recusado — por falta de um valor que o
próprio servidor tinha à mão. Na tela não aparecia: o `aplicarPadroes` do
`Comuns.html` já preenche a caixa antes de a pessoa ver. O padrão parecia
funcionar porque **dois lugares diferentes faziam o mesmo trabalho**, e só um
deles estava certo.

Quem ia pagar a conta é a importação: uma base de 300 inadimplentes não traz
coluna de status, não passa por tela nenhuma, e as 300 linhas seriam recusadas
uma a uma por um campo que tem padrão declarado.

**Defesa.** O padrão passou a ser aplicado antes de conferir, e só na criação
(`validarValores_(..., ehCasoNovo)`). Na edição continua recusando: repor o
padrão num campo que a pessoa acabou de limpar seria desfazer o gesto dela em
silêncio. Três testes seguram isso — o obrigatório sem padrão que é recusado, o
obrigatório com padrão que é preenchido, e a edição que reclama em vez de
adivinhar.

**O que ele ensina.** **Regra escrita em dois lugares é uma regra e um enfeite,
e de fora não se sabe qual é qual.** Enquanto o único caminho até o servidor
passava pela tela, o enfeite bastava. O primeiro caminho novo revelaria a
diferença — e revelaria em produção, numa carga de 300 casos.

---

### 35 · `quem.Email` num objeto cujo campo é `quem.email`

**Sintoma.** A coluna "Quem mudou o status" gravava vazio. Sem erro, sem log.

**Causa.** Duas formas do mesmo dado no mesmo escopo. `usuarioAtual_()` devolve
`{ cadastrado, email, usuario, cargo, nivel, permissoes }` — `email` minúsculo
— e dentro dele `usuario` é a LINHA da aba USUARIOS, onde a coluna se chama
`Email`, com maiúscula. Escrevi `quem.Email`. Em JavaScript isso é `undefined`,
o `|| ''` transformou em string vazia, e a célula recebeu vazio com toda a
educação do mundo.

**Defesa.** Um teste que confere o conteúdo da coluna, não a existência dela:
`igual(primeira['Quem mudou o status'], 'primeiro.adm@exemplo.com')`. E um
comentário no ponto exato dizendo que os dois objetos existem e por que o
minúsculo é o certo ali.

**O que ele ensina.** O `|| ''` é uma conveniência que **apaga a diferença
entre "não tem" e "não existe esse campo"**. Um teste que só perguntasse "a
coluna foi escrita?" passaria. O que pega é perguntar **o que** foi escrito.

---

### 36 · O teste que escrevia na coluna 24

**Sintoma.** `A aba "BASE_MESA" tem cabeçalho repetido: _Origem` — num teste de
sequência de Id, que não mexe em cabeçalho nenhum.

**Causa.** O teste "o simulador realmente corrompe quando o formato é Geral"
usava a última coluna da BASE_MESA como cobaia, e a chamava de `24`, escrito à
mão. No dia em que a Mesa Diamante ganhou as colunas da importação, a última
passou a ser a 26 — e a 24 virou `_ExcluidoEm`. O teste escrevia `_Origem` ali,
deixava a aba com dois cabeçalhos iguais, e a falha estourava vários testes
depois, falando de uma coisa que não tinha nada a ver com ele.

**Defesa.** O teste procura a coluna pelo nome, como o sistema faz:

```js
const cabecalhos = aba.getRange(1, 1, 1, aba.getMaxColumns()).getValues()[0];
const cobaia = cabecalhos.indexOf('_Origem') + 1;
```

**O que ele ensina.** **A regra da casa vale para o teste do mesmo jeito que
vale para o sistema.** "Coluna se acha pelo nome, nunca pela posição" é o
pedido central deste projeto, e estava escrito em quase todo lugar — menos num
teste, onde custava uma linha a menos. O preço veio na forma de um erro que
apontava para o arquivo errado.

---

### 37 · O cabeçalho da tela dizendo outro nome que o menu

**Sintoma.** O menu na lateral dizia "Trabalho". O título da página, dois
centímetros ao lado, dizia "Dashboard".

**Causa.** Renomear tela virou configuração (`MENU.TITULOS`), e o menu passou a
obedecer. O cabeçalho da página, não: ele lia o `titulo` da tabela de rotas do
`Aplicacao.html`, escrito à mão em 2024 e nunca mais olhado.

```js
+ '<h2>' + Moldura.escapar(definicao.titulo) + '</h2>'   // <- da rota
```

**Defesa.** Um `tituloDaTela(chave)` que lê o menu que o servidor montou, e um
teste que cobra as duas pontas: que o cabeçalho não volte a ler o título da
rota, e que o servidor entregue no menu o nome gravado — inclusive voltando ao
de fábrica quando o nome é apagado.

**O que ele ensina.** É o item 34 outra vez, num lugar diferente: **quando uma
informação passa a ser configurável, todo lugar que a exibia precisa ser
revisitado**, não só o que motivou a mudança. O pedido era "quero renomear o
Dashboard", e o Dashboard renomeou — no menu.

---

### 38 · A lista que eu esvaziava e voltava a encher

**Sintoma.** A importação sugeria gravar na coluna "Data do 1º contato" —
justamente um carimbo que só o sistema escreve.

**Causa.** Eu montava a lista de destinos possíveis em duas voltas:

```js
esquema.colunas.forEach(...)      // pula as preenchidas pelo sistema
estrutura.cabecalhos.forEach(...) // acrescenta "tudo que ainda não entrou"
```

A primeira volta excluía o carimbo. A segunda existia para pegar as colunas que
o administrador criou em Configurações, e o critério dela era "ainda não está na
lista" — o que descrevia exatamente o carimbo que eu tinha acabado de excluir.
A segunda volta desfazia a primeira.

**Defesa.** Uma função só respondendo "quais colunas a importação pode
preencher" (`colunasQueAImportacaoPreenche_`), usada tanto para sugerir quanto
para oferecer na tela. Duas perguntas idênticas, uma resposta.

**O que ele ensina.** **Uma exclusão feita num passo e desfeita no seguinte não
parece um erro em nenhum dos dois** — cada volta, lida sozinha, está certa. Só o
resultado está errado, e só um teste que olha o resultado pega isso.

---

### 39 · Duas chamadas com a assinatura trocada, na mesma tarde

**Sintoma.** `A aba "[object Object]" não existe nesta planilha.`

**Causa.** `lerColunaInteira_(nomeDaAba, cabecalho)` — nome da aba e cabeçalho.
Escrevi `lerColunaInteira_(estrutura, posicao)` nos dois lugares em que a usei,
porque era assim que a função ao lado, `posicaoDaColuna_(estrutura, cabecalho)`,
recebia. Duas funções vizinhas, duas convenções.

**Defesa.** A mensagem de erro já era boa: ela imprime o que recebeu, e
`"[object Object]"` aponta direto para o tipo errado. Foi o que resolveu os dois
casos em segundos. Nada mudou no código além das chamadas.

**O que ele ensina.** Menos sobre o bug e mais sobre a mensagem: **um erro que
imprime o valor recebido se explica sozinho.** Se ele dissesse apenas "aba não
encontrada", os dois casos teriam custado uma investigação cada.

---

### 40 · A lista de analistas vazia numa operação cheia de analistas

**Sintoma.** A tela de Importação, aberta no navegador: *"Nenhum analista
cadastrado e ativo neste canal, então os casos entram sem responsável."* Com
três analistas cadastrados e ativos.

**Causa.** Eu filtrava assim:

```js
return !dela || dela === normalizarParaComparar_(canal.nome);
```

`Canal que atende` é um campo de DIGITAR LIVRE em Configurações › Usuários, e a
operação escreve nele o que faz sentido para ela — "Vida Individual", "Vida em
Grupo". O nome do canal no PGO é "RET". As duas coisas nunca iam bater, e a
função que parecia certa lendo o código devolvia lista vazia lendo o cadastro
de verdade.

Nenhum teste pegou porque **os meus testes cadastravam as pessoas com
`canalQueAtende: ret.nome`** — eu escrevi o teste com a mesma suposição errada
que escrevi o código.

**Defesa.** A regra que importa é outra, e é sobre não perder o caso: o nome tem
de estar cadastrado e ATIVO, senão o caso fica no nome de ninguém e some da fila
de todo mundo. A que canal a pessoa atende virou SUGESTÃO — quem atende este
canal aparece primeiro e marcado, quem não atende continua na lista, discreto.
Isso também é mais fiel ao pedido do PO: enquanto a operação se forma, um
analista da RET pode receber um lote da Mesa, e quem decide isso é a coordenação.

Os testes novos cadastram alguém com `canalQueAtende: 'Vida em Grupo'` — um
texto que não é nome de canal nenhum — que é o caso real.

**O que ele ensina.** Duas coisas. **Campo de digitar livre não serve de chave
para nada**: quem escreve nele não sabe que alguém vai comparar aquilo com uma
constante. E, mais desconfortável: **um teste escrito pela mesma cabeça que
escreveu o código herda as suposições dele.** O que quebrou a suposição foi
abrir a tela e ler a frase.

---

### 41 · A varredura que olhava sempre a tela errada

**Sintoma.** A Produtividade RECC abria com um recado vermelho — *"A função
produtividadeDaEquipe não existe no servidor"* — e a varredura que clica em
tudo dizia, na mesma rodada, **"136 cliques, nenhum erro"**.

**Causa.** Duas, empilhadas, e a segunda é a grave.

A primeira: renomeei a função do servidor e a ponte da prévia ficou com o nome
antigo. Defeito da prévia, não do sistema — mas a prévia é o que a operação
clica para acompanhar a obra.

A segunda: o roteiro fazia isto, por tela:

```js
await pagina.click('[data-tela="' + tela + '"]');   // abre a tela
for (const seletor of CLICAVEIS) { ... }            // clica em tudo
const naTela = await pagina.evaluate(...)           // confere o texto
```

E o **primeiro** item de `CLICAVEIS` é `[data-tela]` — o próprio menu. O
roteiro abria a Produtividade, saía clicando nos outros itens do menu, parava
em outra tela qualquer, e só então lia o texto. **A conferência inteira olhava
sempre a última tela clicada**, nunca a do laço. Oito telas visitadas, e o
texto de uma só conferido, oito vezes.

Quem pegou foi a **foto da tela para o README**.

**Defesa.** Três mudanças. A conferência da tela recém-aberta passou para
**antes** dos cliques. Ela procura a **classe** da caixa de erro
(`.erro-carga`, `.config-alerta`) em vez de uma frase — frase depende de eu ter
previsto o texto; classe não. E o recado da conferência do fim passou a dizer
"depois dos cliques a partir de X", porque afirmar "na tela X" era mentir
sobre onde o texto foi encontrado.

Provei quebrando de propósito: com a ponte renomeada à mão, a varredura agora
falha e imprime o recado inteiro.

**O que ele ensina.** **Uma varredura que diz "nenhum erro" olhando o lugar
errado é pior que varredura nenhuma** — ela dá a licença de parar de procurar.
E o defeito não estava no que ela procurava, estava em ONDE: a lista de frases
proibidas até continha a frase certa. É o achado 33 mais uma vez, agora do lado
de fora da suíte.

---

### 42 · O teste da prévia que procurava a palavra no arquivo inteiro

**Sintoma.** O mesmo do item 41, do outro lado: o teste
`a prévia responde por TODA função que as telas chamam` passava verde enquanto
a prévia não respondia por `produtividadeDaEquipe`.

**Causa.**

```js
return previa.indexOf("'" + nome + "'") < 0
  && previa.indexOf(nome + ': function') < 0;
```

Ele procurava o nome em **qualquer lugar** do `gerar-previa.js`. E o nome
estava lá — numa linha que apenas COLETAVA o dado para a prévia
(`chamar('produtividadeDaEquipe')`), trezentas linhas longe da ponte. O teste
provou que alguém escreveu aquela palavra no arquivo, e não que a ponte
responde.

**Defesa.** A busca passou a ser feita **só dentro da ponte** — o trecho entre
`function pontePreparada(` e `function gerar(`.

**O que ele ensina.** **Procurar num arquivo inteiro é quase sempre procurar
no lugar errado.** O teste tinha o nome certo, a intenção certa e o escopo
errado — e escopo errado num teste não deixa sintoma nenhum.

### 43 · O carimbo que dependia de qual porta a pessoa usou

**Sintoma.** Na foto da Produtividade RECC, o cartão **"Já contatados" dizia
0** enquanto a rosca "Situação dos casos", logo abaixo na mesma tela, mostrava
um caso em "1º contato realizado" e outro em "2º contato realizado". Dois
números da mesma tela, discordando.

**Causa.** O sistema tem **três portas** para um caso chegar a uma situação, e
só uma delas carimbava:

| porta | carimbava? |
|---|---|
| diálogo de situação (`alterarSituacaoDoCaso`) | sim |
| formulário inteiro, pelo lápis (`editarCaso`) | **não** |
| cadastro de um caso novo (`cadastrarCaso`) | **não** |

`carimbarOStatus_` tinha **um único ponto de chamada**, dentro do diálogo. O
analista que trocasse a situação pelo formulário — que é o mesmo gesto, na
mesma tela, a um clique de distância — não deixava carimbo nenhum. E como
"Já contatados" sai do carimbo, e não do status (decisão certa, item 11 do
progresso), a conta ficava pela metade.

**Por que os testes não pegaram.** Havia dois testes do carimbo, e os dois
bons: um provava que o carimbo é data de verdade, outro que voltar ao mesmo
status não reescreve. **Os dois usavam o diálogo** — justamente a porta que
funcionava. O mecanismo estava provado; a cobertura das portas, não.

**Defesa.** O carimbo virou uma função por onde **toda** porta passa:
`carimbarSeOStatusMudou_` na edição e `carimbarOStatusDeNascimento_` no
cadastro. E quatro testes novos, sendo um deles a pergunta direta — *as duas
portas deixam o MESMO registro?* — que compara caso a caso em vez de conferir
coluna por coluna.

**O que ele ensina.** **Um ponto de chamada só não é um ponto único: é um
caminho coberto e os outros não.** O motor certo, chamado de um lugar só, dá
exatamente o mesmo resultado que motor nenhum para quem entra por outra porta.
E o que denunciou foi, de novo, a foto da tela: dois números discordando lado a
lado, que nenhum teste comparava porque nenhum teste sabia que eles deviam
bater.

### 44 · O teste de estresse que media com dado que o sistema recusa

**Sintoma.** O estresse terminava **REPROVADO** em duas operações:

```
Cadastrar UM caso — ESTOUROU: Confira 1 campo(s):
  Canal de origem — não é uma das opções da lista
```

**Causa.** A massa de teste trazia a lista de canais escrita à mão:

```js
// Os valores TÊM de ser os do catálogo (…).
// Vieram de chamar('formularioDoCanal'), não de memória.
const CORRETORAS = ['E-mail', 'Chat', 'Telefone', 'Site', 'Corretora', 'Ouvidoria', 'URA'];
```

O comentário era **verdadeiro no dia em que foi escrito**. Depois o catálogo
virou o da RECC — `URA | Central | Base de Inadimplentes | Piloto Formulário -
Cancelamento` — e a lista daqui ficou com a genérica antiga.

**Por que demorou a aparecer.** A carga dos 50 mil casos usa
`inserirVariosRegistros_`, que **grava sem validar** — é o caminho da
importação, e é assim de propósito. Então 50 mil casos entraram com
`Canal de origem: E-mail`, um valor que o sistema recusa, **sem uma reclamação
sequer**. Só o `cadastrarCaso` de uma linha só, lá no fim da corrida, passa
pela validação — e foi ele quem bateu de frente.

Ou seja: durante um bom tempo o estresse mediu desempenho sobre uma massa que
o sistema jamais teria aceitado.

**Defesa.** As listas passaram a ser lidas do próprio formulário, na hora de
rodar (`opcoesDosSeletores`), campo de seletor por campo de seletor. Mude o
catálogo em Configurações e a massa muda junto.

**O que ele ensina.** **Comentário que jura a origem do dado envelhece igual ao
dado.** "Veio de `formularioDoCanal`" descreve um acontecimento passado, e
lê-se como se fosse uma garantia atual. A única forma de a frase continuar
verdadeira é o código ir buscar de verdade, toda vez.

### 45 · O renomeio que apagou uma função sem dizer nada

**Sintoma.** Ao trocar "Tombamento" por "Importação", quinze testes ficaram
vermelhos — e a mensagem mandava para o lugar errado:

```
FALHA cola do Excel: separado por TAB, com o cabeçalho junto
      Canal "corretoras" não existe ou está desativado.
```

"corretoras" não é canal nenhum. É o TIPO de uma importação de cadastro.

**Causa.** Já existia um `conferirImportacao` no `Cadastros.gs` — a importação
de corretoras e SUSEPs, que nasceu muito antes. O renomeio transformou o
`conferirTombamento` do `Casos.gs` no mesmo nome.

**No Apps Script todo `.gs` divide um escopo global só.** Não há módulo, não há
import: os arquivos são avaliados em ordem alfabética, um atrás do outro, na
mesma gaveta. `Cadastros.gs` vem antes de `Casos.gs`, então a segunda definição
**apagou a primeira** — sem erro, sem aviso, sem log. A tela de Corretoras
passou a chamar, sem saber, a importação de casos; e esta foi procurar um canal
chamado "corretoras".

Havia uma segunda colisão idêntica: `opcoesDaImportacao`.

**Defesa.** As funções de importar CASO ganharam nome próprio
(`conferirImportacaoDeCasos`, `opcoesDaImportacaoDeCasos`) — a de cadastro é
mais antiga e manteve o nome. E, mais importante, duas guardas novas varrem
todos os `.gs` procurando **nome repetido**: uma para `function`, outra para
`const`/`var`/`let`. A segunda é ainda mais urgente que a primeira: `const`
repetido no mesmo escopo é `SyntaxError` no V8, e o projeto inteiro para de
carregar — a tela abre em branco.

**O que ele ensina.** **Renomear é criar um nome, e nome novo pode já existir.**
Um renomeio parece uma operação de texto e é, na verdade, uma declaração: em
escopo global único, declarar de novo é apagar. A busca que faltou não era
"onde está o nome antigo" — essa eu fiz e fiz bem —, era **"o nome novo já está
ocupado?"**, que ninguém pensa em fazer.

É o achado 26 outra vez (lá eram nomes de ARQUIVO únicos independentemente da
extensão), agora um nível abaixo: os nomes de FUNÇÃO também são únicos no
projeto inteiro, e nada no Apps Script avisa quando deixam de ser.

### 46 · O teste novo que passou verde com o defeito na tela

**Sintoma.** Nenhum, em teste. Na foto: a seção **Calendário**, recém-criada em
Configurações, apareceu com **o mesmo ícone do Trabalho**.

**Causa.** `Moldura.icone` tem um padrão:

```js
var desenho = DESENHOS[tela] || DESENHOS.trabalho;
```

Chave sem desenho não quebra, não avisa, e sai parecendo outra coisa. Havia um
teste exatamente para isso — *cada item do menu tem o seu próprio desenho* —,
escrito depois de a Importação ter entrado repetindo o ícone do Trabalho. Ele
olhava só o **menu**; as seções de Configurações não estavam no escopo dele.

**E aqui está o que importa.** Eu estendi o teste para as seções, e a extensão
**passou verde com o ícone do Calendário removido de propósito**. Porque ela
comparava as seções **entre si** — e o desenho herdado era o do Trabalho, que é
item de MENU e não está nessa lista. Não havia repetição *entre as seções*, e
mesmo assim havia defeito.

**Defesa.** Parar de procurar repetição e procurar **o defeito**: nenhuma seção
pode estar usando o desenho padrão. Uma chave inventada devolve o padrão, então
basta comparar cada seção com ele:

```js
const oPadrao = Moldura.icone('chave-que-nao-existe-em-lugar-nenhum');
const semDesenhoProprio = secoes.filter((s) => Moldura.icone(s.chave) === oPadrao);
```

**O que ele ensina.** **Um teste novo também precisa ser testado contra o
defeito que o motivou.** Escrevi essa extensão logo depois de ver o bug na
tela, com o bug fresco na cabeça, e ainda assim escrevi uma que não o pegava.
Escrever o teste e vê-lo passar é meia prova: a outra metade é quebrar o código
de propósito e ver o vermelho. Sem ela, o que se ganhou não foi uma guarda —
foi a sensação de ter uma.

### 47 · O alerta que estava no DOM e não se via

**Sintoma.** Na foto da fila do VG: o "9" de meses de vigência e o "19.8" de
margem, os dois abaixo do limite, **em cinza**. O alerta vermelho que o PO
pediu simplesmente não aparecia.

**Causa.** Não era o servidor, nem a tela. Era **especificidade de CSS**:

```css
table.fila.agrupada .apoio { color: var(--tenue); }   /* 0-3-1, linha 839 */
.fila .em-alerta { color: var(--ruim); }              /* 0-2-0, linha 680 */
```

A classe ia para o DOM, a dica aparecia no `title`, o negrito aplicava — só a
COR perdia. Corrigi para `table.fila.agrupada .em-alerta` e **ainda perdia**:
0-3-1 contra 0-3-1 é empate, e empate se decide pela ORDEM — a regra do apoio
vem 160 linhas depois. Só mirando as duas classes juntas
(`.apoio.em-alerta`, 0-4-1) é que o vermelho venceu.

**Defesa.** Uma passagem nova no `clicar-em-tudo.js` que **mede a cor
calculada** de todo `.em-alerta`, canal por canal, e reprova o que não sair
vermelho.

E ela também não nasceu certa: a primeira versão ficava dentro do laço das
telas, onde nunca havia um alerta na tela — o Trabalho abre no PRIMEIRO canal
e o alerta mora no terceiro. Passou verde com o CSS quebrado de propósito. A
versão que ficou visita canal por canal, e **reprova se não encontrar um único
alerta**: conferência que não confere nada é pior que nenhuma, porque sai
verde.

**O que ele ensina.** **Classe no DOM não é cor na tela.** Um teste que
pergunta "a classe está lá?" responde sim enquanto o usuário olha para cinza.
A única pergunta que vale é a que o olho faz — e para fazê-la é preciso um
navegador de verdade e `getComputedStyle`.

---

### 48 · O decimal que saía em inglês, desde sempre

**Sintoma.** Na mesma foto: a margem de contribuição como **"19.8"**, com
ponto.

**Causa.** O `paraTexto_` formata data, hora e dinheiro com carinho — e o
número cai num `String(valor)` no fim da função. Está assim desde o primeiro
dia.

**Por que só apareceu agora.** Nenhum canal tinha mostrado um decimal na fila.
A RET só leva número inteiro para lá ("tentativas de contato"), e inteiro sai
igual em português e em inglês. O VG foi o primeiro canal com uma coluna
decimal na fila, e o defeito de três meses apareceu na primeira foto.

**O que ele ensina.** **Dado novo revela código velho.** O defeito não foi
introduzido pelo VG: o VG só foi o primeiro a passar por ali. Vale contar
quantos caminhos do código NUNCA foram exercitados pelo dado que existe — é
onde mora a próxima leva.

---

### 49 · O teste que cravava "dois canais"

**Sintoma.** Ao criar o VG, **nove testes** quebraram de uma vez. Nenhum deles
apontava para um defeito: todos diziam alguma variação de `esperado 2, obtido
3`.

E um deles derrubou outros quatro por tabela. O teste "desligar o último canal
ativo é recusado" desligava UM canal e esperava a recusa no segundo — premissa
de quando existiam exatamente dois. Com três, ele desligou dois, a recusa não
veio, e **a Mesa Diamante ficou desligada** para todo o resto da suíte. Quatro
testes depois falharam com "canal não existe ou está desativado", apontando
para bem longe da causa.

**Defesa.** Cada contagem passou a sair da FONTE — da aba `CANAIS`, do
`RECC_ESQUEMA`, do formulário — em vez de um número escrito à mão. E o teste
do desligamento passou a desligar *todos menos um*, seja lá quantos existam.

**O que ele ensina.** **Número cravado num teste é uma promessa de que alguém
vai lembrar de atualizá-lo.** Ninguém lembra. Pior: quando ele quebra, o
vermelho diz "o sistema mudou", e não "o sistema quebrou" — e são coisas
opostas que se parecem muito no console.

---

### 50 · "Concluído" adivinhado pelo nome

**Sintoma.** Nenhum vermelho, nenhum erro. Em Minha Performance, um caso
**Retido** da RET contava como *ainda em aberto*; um **Sem retorno** da Mesa
também. E a meta da RET contava como feito só o status "Concluído" — que a RET
não usa. O progresso da meta da RET ficava praticamente em zero, e parecia
certo.

**Causa.** `contarConcluidos_` decidia o que é concluído pelo NOME: status que
começa com "conclu". Servia para a Mesa do primeiro dia, que tinha dois
"Concluído…". Quando a RET nasceu com Reteve e Não reteve, a regra continuou
valendo — calada.

**Como apareceu.** O PO perguntou por que a RET tinha uma opção "Concluído",
se esse status não existe lá: "um caso concluído é cancelado, pago, não retido,
retido ou sem sucesso de contato". Procurando quem usava "concluído", achei a
regra do nome.

**Defesa.** A coluna `Final` no catálogo, marcada em Configurações, e a conta
lendo dela. Sem a coluna (planilha que ainda não rodou a atualização), vale a
regra antiga — para o número não despencar no intervalo entre colar o código e
rodar `atualizarPGO()`.

---

### 51 · O cartão no plural que a troca de nome não achava

**Sintoma.** Teste da atualização: depois de trocar "Concluído na célula" por
"Concluído na mesa", o cartão da Produtividade da Mesa passou a contar certo —
e continuou se chamando **"Concluídos na célula"**.

**Causa.** A troca acha o título pelo nome do status. O cartão estava no
plural.

**Defesa.** O plural vai declarado na regra da troca, ao lado do nome. Uma
regra de "pluralizar" automática acertaria este e erraria o próximo.

---

### 52 · O substituto da prévia que respondia o que o servidor não responde

**Sintoma.** No navegador, proposta pela metade ("70000") acendia o selo
verde. No servidor de verdade ela devolve VAZIA, e o teste da suíte provava.

**Causa.** O substituto do `google.script.run` na prévia respondia a qualquer
proposta com a resposta guardada, sem conferir o formato.

**O que ele ensina.** **A prévia é tão confiável quanto o substituto dela.** Um
substituto que responde mais do que o servidor faz a tela parecer certa onde
ela não está — ou errada onde está certa, que custa a mesma investigação.

---

### 53 · A barra do CNPJ que virava dois documentos

**Sintoma.** Teste novo, primeira execução: o CNPJ `12.345.678/0001-90`
digitado no campo da Mesa chegava à planilha como **`12345678;000190`** — dois
"documentos" de oito e seis dígitos. O laudo da conferência aprovava (a conta
de dígitos tira o `;`), e a célula ficava errada.

**Causa.** `converterParaIdentificador_` trata `;` **e `/`** como separador de
lista. É a regra dos telefones — "11 9999-0000 / 11 8888-0000" são dois — e
estava certa enquanto nenhum documento tinha barra. O CPF não tem; o CNPJ tem.

**Como apareceu.** Escrevendo o teste do pedido ("aceite com pontos, traços e
demais caracteres"), com o CNPJ do jeito que ele é escrito no mundo.

**Defesa.** Campo do tipo `documento` é UM documento: vai para a planilha com
`apenasDigitos_`, antes da conversão da coluna. Cadastro e edição passam pelo
mesmo ponto. Os telefones continuam aceitando lista.

---

### 54 · O caso importado que não tinha mês

**Sintoma.** Nenhum — ainda. Relendo a regra nova da importação ("a mesma
proposta no mesmo mês não vai para a divisão") antes de testar: a primeira
leva de outubro entrava; a **segunda leva de outubro, com a mesma proposta,
também entraria**, e iria para outra pessoa. Exatamente o que o PO viu
acontecer.

**Causa.** O mês do caso vem da coluna de data do canal ("data de recepção do
protocolo"). A importação não inventa essa data, então o caso importado sem ela
fica na base **sem mês nenhum** — e caso sem mês não é repetição de ninguém.

**Defesa.** Do lado da base, caso sem a data do canal vale pela **Data da
importação**, que toda linha importada tem. É a mesma conta que o lado do
arquivo já fazia (sem data, vale o mês de hoje, o mês em que ele entra). Teste:
"caso SEM data conta pelo mês em que entrou — e repete o da base", que fica
vermelho sem a reserva.

---

### 55 · O "ver detalhes" que lia a auditoria inteira

**Sintoma.** Nenhum vermelho, e o sistema rápido — com a base de teste. Medido
com 50 mil casos e 100 mil linhas de auditoria, abrir um caso lia **1,45
milhão de células** (~1,7 s só nisso), e o número crescia a cada cadastro e a
cada edição da operação.

**Causa.** `historicoDoCaso_` lia a aba `AUDITORIA` inteira para achar as três
ou quatro linhas de um caso. E o "atualizado em" chamava a mesma função de
novo: duas leituras inteiras por clique.

**Como apareceu.** O PO pediu para verificar se dava para deixar mais rápido
"sem afetar a qualidade". Medi as idas ao serviço e as células de cada ação da
tela, e esta era a única que crescia com o tempo de uso.

**Defesa.** A regra da busca: **ler a coluna antes de ler as linhas** — só
`RegistroId`, e depois só as linhas daquele caso (155 mil células, ~0,6 s, e
cresce uma coluna por vez). O "atualizado em" sai do mesmo histórico. Teste com
três mil linhas de outros casos: lê menos que duas células por linha da
auditoria, e o histórico sai igual, na mesma ordem.

---

### 56 · O modal que dizia "Abrindo…" para sempre

**Sintoma.** Palavra do PO: "quando cliquei em alterar cadastro a tela
travou". Nenhum erro no console, nenhuma tela branca.

**Causa.** Duas coisas juntas, na versão em uso. Aberto pelo lápis, o modal do
caso ia direto para a edição — e o subtítulo, que dizia "Abrindo…", só era
trocado pela tela de LEITURA. Na edição ele ficava "Abrindo…" para sempre, com
o formulário já pronto embaixo. E num caso importado da base antiga com a
proposta pela metade (só o número, sem o código), salvar era RECUSADO: o modal
não fechava, e o motivo aparecia só no rodapé. Um modal que diz "Abrindo…" e
não fecha ao salvar é, para quem está usando, uma tela travada.

**Como apareceu.** Reproduzindo no navegador, com o servidor de verdade e 1,5 s
de atraso por chamada — o tempo do Apps Script —, os mesmos cliques na versão
em uso e na nova. O simulador sem atraso não mostrava nada de errado.

**Defesa.** A tela de leitura saiu (pedido do PO) e, com ela, o estado que não
atualizava o subtítulo: o modal abre já em "Trabalhar no caso · canal". O
"Salvar alterações" nasce travado e só destrava com o formulário preenchido;
se o caso não abre, o motivo aparece NO MEIO do modal. Testado também com uma
função faltando no servidor: a tela avisa qual é, em vez de parar.

**O que continua.** A recusa em si — salvar o formulário inteiro de um caso com
a proposta ou a apólice pela metade — é a regra de validação, e mudar regra é
decisão do PO. Enquanto isso, "Alterar status" na fila resolve o gesto mais
comum sem passar pelo formulário.

---

### 57 · A data que o navegador lia de trás para frente

**Sintoma.** Uma analista registrou datas como mm/dd/aaaa. Nenhum erro: 05/10
virou 10 de maio, que é uma data válida, e foi gravado assim. E a primeira
data do formulário aparecia **vazia**, embora o servidor mandasse "hoje".

**Causa.** O campo era o calendário do navegador (`type="date"`), que mostra e
pede a data no formato do **idioma do navegador** — num Chrome em inglês,
mm/dd/aaaa. E esse campo só aceita valor em `aaaa-mm-dd`: o "06/10/2026" que o
servidor manda como padrão era descartado em silêncio.

**Como apareceu.** Pelo PO, vendo a planilha. O teste não pegava porque o
simulador não tem idioma de navegador, e o servidor recebia uma data válida.

**Defesa.** Toda data, nos formulários e no de/até dos filtros, é texto com
máscara `dd/mm/aaaa` — o mesmo em qualquer navegador, e o padrão de hoje entra
direto. Teste que varre as telas e cobra que nenhuma usa mais `type="date"`,
e a verificação no navegador de verdade, digitando.

---

### 58 · O 31 de fevereiro que virava 3 de março

**Sintoma.** Nenhum, ainda — apareceu junto do 57. Com a data digitada,
"31/02/2026" pode chegar ao servidor, e seria gravado como **03/03/2026**.

**Causa.** `new Date(2026, 1, 31)` não reclama: rola para o mês seguinte.
Enquanto o calendário do navegador escolhia o dia, esse valor nunca chegava.

**Defesa.** `converterParaData_` confere se o dia existe no calendário
(`diaQueExiste_`) e devolve vazio — e vazio é recusado com "precisa ser uma
data no formato dd/mm/aaaa". Na tela, o de/até só recarrega com duas datas que
existem.

---

### 59 · A caixa de busca que não fazia nada

**Sintoma.** Palavra do PO: "tem um campo de busca na tela superior que não
funciona". Digitar e apertar Enter não acontecia nada.

**Causa.** A caixa era desenho: nasceu na casca, antes do Buscar Caso, e nunca
foi ligada a nada.

**Defesa.** Enter leva ao Buscar Caso já procurando o termo; a caixa só
aparece para quem tem o Buscar Caso no menu. Teste que cobra a ligação.

---

### 60 · Salvar a Mesa religava a conferência de SUSEP

**Sintoma.** Nenhum visível na hora. Bastava salvar a Mesa Diamante em
Configurações › Canais de trabalho — para trocar uma descrição — e o
formulário da Mesa voltava a consultar a lista de SUSEPs bloqueadas, que o PO
tinha pedido para tirar.

**Causa.** A tela de Configurações não tem o campo "confere SUSEP bloqueada",
e o servidor gravava SIM sempre que o campo não vinha. O comentário cuidava de
um lado só: "a tela que não mandar o campo não pode **desligar** a
conferência" — e ela ligava.

**Como apareceu.** Na varredura de Configurações pedida pelo PO, comparando o
que a tela manda com o que o servidor grava, campo a campo.

**Defesa.** Campo que a tela não manda fica como está, nos dois sentidos — a
mesma regra dos campos novos do SLA. Teste que salva a Mesa como a tela salva e
cobra que ela continua sem conferir.

---

### 61 · "Últimos 7 dias" na caixa, 279 na conta

**Sintoma.** Depois de filtrar "Por data" (01/01 até hoje) e voltar para "Por
dias", a caixa mostrava "Últimos 7 dias" e o resumo dizia "últimos 279 dias".
Os números eram dos 279.

**Causa.** Ao trocar a maneira de escolher, o seletor levava junto os dias do
período anterior — 279, ou 31 vindo de um mês —, que não são opção da lista.
A caixa, sem a opção, mostrava a primeira.

**Como apareceu.** Na foto da verificação no navegador desta rodada: o texto do
resumo não batia com a caixa.

**Defesa.** Os dias só são aproveitados quando são um dos atalhos; senão vale o
padrão da configuração. Vale para as três telas que filtram. Teste da peça e
verificação no navegador.

---

### 62 · O "x" da busca e o selo cortado

**Sintoma.** Dois defeitos do próprio código desta rodada, pegos antes de
sair. O "x" do campo de busca apagava o texto, mas a fila continuava filtrada
pelo termo apagado até a pessoa clicar fora. E o selo do SLA aparecia como
"Fora do prazo · 4h1…" — o corte comia justamente o quanto passou.

**Causa.** O "x" não dispara o `change`, só o `search`. O selo herdou o estilo
do destaque da fila, que não quebra linha.

**Defesa.** A busca ouve o `search` (e não vai duas vezes ao servidor quando o
Enter dispara os dois); o selo quebra linha. Os dois conferidos no navegador.

---

### 63 · O "Excluir" que era um bloco vermelho sem texto

**Sintoma.** Palavra do PO: "avalie se os botões estão com as cores certas".
Em Configurações, o botão "Excluir campo" aparecia como um retângulo vermelho
sem nada escrito.

**Causa.** O botão vazado de perigo dizia a cor do TEXTO (vermelho) e não a
do fundo. A regra do botão de perigo cheio, mais adiante no arquivo, pintava
o fundo de vermelho: vermelho escrito em vermelho.

**Como apareceu.** Na foto da Parte 1, ao criar o "Excluir lista" e o
"Excluir item" com o mesmo estilo.

**Defesa.** O vazado de perigo diz o fundo também. Teste do estilo, e a
verificação no navegador confere que o texto e o fundo têm cores diferentes.

---

### 64 · A lista nova que a tela não mostrava

**Sintoma.** Palavra do PO: "as listas que podem ser usadas como select não é
possível criá-las e tive que criar uma à mão".

**Causa.** A tela de listas montava o seletor com os tipos que JÁ tinham algum
item. Uma lista sem item não existia em lugar nenhum, então não havia como
criá-la pela tela — nem escolhê-la no campo.

**Defesa.** A lista ganhou um registro próprio na aba CATALOGO (tipo LISTA),
que a mantém visível mesmo vazia, com o nome legível. Testes de criar,
renomear e excluir, e a verificação no navegador do caminho inteiro.

---

### 65 · A etiqueta "Companhia" por cima da Sucursal

**Sintoma.** Na foto da Parte 2, a lista de SUSEPs bloqueadas tinha a
etiqueta "Companhia" desenhada por cima do número da sucursal, o cabeçalho
"COORDENADOR" por cima de "DESDE", e a SUSEP cortada em "RET…". É o tipo de
sobreposição que o PO apontou nas telas.

**Causa.** As tabelas de cadastro usavam a largura FIXA da fila do Trabalho,
que reserva 292 px para os três botões de ação de lá. Num cadastro, com
"Editar  Liberar", sobrava pouco para as outras colunas, e o que não cabia
transbordava para a vizinha. "COORDENADOR" × "DESDE" já existia; a coluna
nova "Bloqueada por" apertou o resto até a etiqueta invadir.

**Como apareceu.** Olhando a foto — o teste e o roteiro de navegador
passavam. Depois de consertar, uma segunda foto mostrou o lápis de editar
cortado na borda do cartão, e uma terceira, em 1280 px, a SUSEP partida em
"RET9 / 0A".

**Defesa.** As tabelas de cadastro medem cada coluna pelo conteúdo, o nome
quebra só no espaço (código não parte) e as ações ficam presas à direita
quando a tabela rola. O roteiro de navegador da Parte 2 confere, em 1440,
1280 e 390 px, que nenhuma célula invade a vizinha, que nenhuma SUSEP parte
e que nenhum botão de ação fica cortado — e foi visto falhando com o CSS
antigo.

---

### 66 · A coluna nova que travaria a segunda base

**Sintoma.** Nenhum para o PO, porque foi pego antes: 14 testes da planilha
de cadastros de fora ficaram vermelhos ao criar a coluna `BloqueadaPor`.

**Causa.** A conferência da segunda base cobra todas as colunas do contrato.
Uma planilha de cadastros montada antes desta rodada não tem a coluna nova e
passaria a ser recusada — ao ligar de novo, ou ao clicar em Conferir.

**Defesa.** A coluna é marcada como opcional na base de fora: a conferência
avisa, e não recusa. Sem ela, os bloqueios aparecem "sem tipo", e bloquear
pelo PGO diz exatamente onde criar a coluna — lá, e não com `atualizarPGO()`,
que não mexe em planilha de outro dono. Teste dos dois lados.

---

### 67 · A etiqueta da situação por cima da coluna vizinha

**Sintoma.** Palavra do PO: "notei que nas telas tem elementos que estão
sobrepondo". Na fila do Trabalho, de 1440 px para baixo, "Aguardando
transmissão" passava por cima do número e do produto em "Dados da proposta".

**Causa.** A etiqueta não quebrava linha, e a fila agrupada tem colunas de
largura fixa. O que não cabia transbordava para a coluna do lado.

**Como apareceu.** O conferidor de responsividade dizia "nenhuma quebra": ele
procurava página rolando e elemento saindo da janela, e não elemento em cima
de outro, dentro da janela.

**Defesa.** A etiqueta quebra em duas linhas dentro da própria coluna. O
`conferir-responsividade.js` passou a procurar sobreposição — cada pedaço de
texto e cada controle visível vira um retângulo recortado pela caixa que o
corta, e dois não podem se cruzar —, e foi visto acusando o defeito com o CSS
antigo em 1280, 1024 e 900 px.

---

### 68 · As funções de estrutura abertas ao navegador

**Sintoma.** Nenhum para o PO: achado na varredura da Parte 4.

**Causa.** `atualizarPGO()` e `migrarParaCanais()` são feitas para o editor do
Apps Script e não conferiam quem chamava ("quem abre o editor já tem acesso a
tudo"). Só que toda função sem "_" no fim também pode ser chamada pelo
navegador, por qualquer pessoa com o sistema aberto — e nesta rodada o
`atualizarPGO()` passou a apagar coluna (vazia).

**Defesa.** A porta do editor: como o aplicativo roda "como você", no editor
quem chama e quem executa são a mesma conta; pelo navegador, não. Fora do
editor, só administrador passa. Testes com a operação, com alguém sem
cadastro, com outro administrador e com o dono.

---

### 69 · O `:has()` que a própria regra do projeto proibia

**Sintoma.** Nenhum visível no Chrome atual. Em navegador anterior a 2022 (e
Firefox até o fim de 2023), o modal sairia centrado na tela inteira e o
cadastro ocuparia a largura toda.

**Causa.** As regras que centralizam o modal à direita do menu e o cadastro no
meio usavam `:has()` — exatamente a armadilha 9 do `03-manutencao.md`.

**Defesa.** O roteador marca o miolo com `data-tela`, e o `body` com
`com-casca` e `menu-encolhido`; o CSS lê as marcas. Medido no navegador: o
centro do modal e o do cadastro continuam no centro da área de trabalho, com
o menu aberto e encolhido. Um teste confere que nenhuma regra usa `:has()`.

---

### 70 · O "vence em 0min" que parecia erro

**Sintoma.** Na prévia, um caso da RET mostrava **"Prazo de retorno · vence em
0min"** em amarelo, o fim de semana inteiro.

**Causa.** O prazo de três dias úteis acabava exatamente no fim do expediente
de sexta. Dentro do prazo (o limite ainda vale), faltando zero minutos — e o
texto era escrito igual para qualquer saldo, inclusive zero.

**Defesa.** Saldo zero diz **"no limite do prazo"**. O teste da borda passou a
conferir o texto, além da cor: o primeiro minuto de expediente seguinte já é
vermelho, e a frase é a que avisa disso.

---

### 71 · "48 horas úteis" lido como "4 dias úteis e 5h"

**Sintoma.** Na Mesa, o selo de um caso encaminhado há 90 minutos dizia
"faltam 4 dias úteis e 5h" para um prazo que o PO pediu em **horas**.

**Causa.** O formatador de duração era o do SLA de 6 horas, que passa a falar em
dias úteis quando o saldo passa de um expediente. Para um prazo de 48 horas, o
dia de 10h15 obrigava quem lia a refazer a conta de cabeça.

**Defesa.** Prazo em **horas** fala em horas ("faltam 46h30", "34h além"); em
**dias**, em dias úteis. O SLA da Mesa e o resumo da Produtividade seguem a
mesma regra.

---

### 72 · O teste do escape que não escapava de nada

**Sintoma.** Nenhum para o PO: achado ao quebrar o código de propósito.

**Causa.** O teste do selo conferia que a tela contém `escapar(sinal.texto)`.
Só que o texto aparece duas vezes — no atributo `title` e dentro do selo — e o
`title` bastava para o teste passar. Tirar o escape de dentro do selo, onde o
texto vira HTML, continuava verde.

**Defesa.** O teste confere as DUAS linhas separadamente, e a quebra de
propósito (tirar o escape de dentro do selo) ficou na lista das dezoito.

---

### 73 · O e-mail parecido que entrava como o administrador

**Sintoma.** Nenhum visível — achado na varredura. `primeiroadm@`,
`primeiro_adm@`, `primeiro-adm@` e até `primeiro.adm@exemplocom` entravam no
sistema como `primeiro.adm@exemplo.com`, com o nível dele.

**Causa.** O login comparava e-mails com `normalizarParaComparar_`, feita para
comparar NOMES: ela tira acento, ponto, traço e sublinhado. Com o app aberto a
qualquer conta Google, bastava um domínio escolhido a dedo
(`iago@peliteroportoseguro.com.br`) para entrar como
`iago.pelitero@portoseguro.com.br`.

**Defesa.** `emailParaComparar_`: só tira o espaço das pontas e a caixa. Vale
no login e no cadastro de usuário — que agora aceita `joao.silva@` e
`joaosilva@` como as duas pessoas que são. Testes com as cinco variações.

---

### 74 · O campo que a pessoa apagava e continuava lá

**Sintoma.** Apagar a Área responsável, a SUSEP ou o título do e-mail no
"Trabalhar no caso" e salvar: a tela dizia que salvou, e o valor continuava na
planilha. Na Mesa, um caso encaminhado por engano nunca mais contava como
"finalizado na célula".

**Causa.** Na validação, vazio era sempre "não mexer" — certo no cadastro,
errado na edição.

**Defesa.** Na edição, campo que VEIO no formulário vazio é apagado, inclusive
os que se gravam em várias colunas (a proposta, o produto). Campo que não veio,
ou travado, fica como estava. E a tela não manda como vazio o valor que o
controle não conseguiu mostrar (uma data num formato que o calendário não lê):
salvar não apaga o que a pessoa nem viu.

---

### 75 · A busca que escondia os casos do próprio analista

**Sintoma.** Quem vê só os próprios casos buscava "Silva", tinha 3 casos com
esse nome e via **zero** — com o aviso "a busca achou 123 casos".

**Causa.** A busca cortava nos 100 mais recentes e só depois recortava o
alcance. Os 100 lugares iam para casos de outras pessoas, e o aviso ainda
contava casos que ela não podia ver.

**Defesa.** O alcance vem antes do corte, lendo só a coluna do responsável
(`linhasNoMeuAlcance_`).

---

### 76 · A auditoria que guardava o CPF buscado

**Causa.** Cada busca gravava o termo digitado na `AUDITORIA` — em geral um CPF
ou um nome de segurado —, e o contrato da auditoria é "sem dado pessoal".

**Defesa.** Grava só quantos resultados vieram.

---

### 77 · O diagnóstico aberto a qualquer pessoa logada

**Causa.** `diagnosticoRECC()` e `verificarEstruturaRECC()` não conferiam quem
chamava ("é para o editor"). Mas toda função sem `_` também é chamada pelo
navegador — é o achado 68 de novo. O laudo descreve a planilha e cita e-mails
do cadastro.

**Defesa.** A mesma porta do editor do `atualizarPGO`: no editor rodam sem
cadastro nenhum (servem quando o sistema não abre); pelo navegador, só
administrador. As duas funções de acionador (`arquivarAuditoriaAgendada` e
`atualizarAnalisesAgendadas`) ficam abertas de propósito: um acionador de tempo
não tem quem esteja logado, e as duas obedecem às próprias regras.

---

### 78 · "Rode Normalizar base", que não existia

**Sintoma.** Cinco mensagens — o erro de Id repetido e quatro do diagnóstico —
mandavam rodar "Normalizar base". Não havia menu, botão nem função com esse
nome.

**Causa.** A rotina era `normalizarIdentificadoresDaAba_`: termina com `_`, não
aparece na lista do editor e pede parâmetro. E ela só aponta Id repetido, não
conserta — a mensagem prometia o que ela não fazia.

**Defesa.** `normalizarBase()`, sem parâmetro, na lista do editor, atrás da
porta do editor: dá Id a quem está sem em todas as abas, num bloco só. As
mensagens dizem o que ela faz e o que fazer com o repetido: apagar o Id da
cópia e rodar de novo.

---

### 79 · Duas pessoas no mesmo caso, e a segunda apagava a primeira

**Causa.** O formulário volta inteiro. Quem abriu o caso antes regravava os
valores velhos dos campos que a outra pessoa tinha acabado de mudar.

**Defesa.** O caso abre com uma versão — um resumo do conteúdo da linha — e
salvar devolve essa versão. Se a linha mudou no meio do caminho, nada é
gravado, e a mensagem diz para abrir de novo.

---

### 80 · O README que mandava nomear o arquivo errado

**Sintoma.** Quem seguisse o passo a passo nomearia `Comuns.html` como
`Formulario`, e o sistema não abriria: o `Index` inclui `Comuns`.

**Causa.** O nome era de antes de as peças serem juntadas. Junto com ele:
"13 abas" (são 16), "nenhum canal é semeado" (são três), "dez blocos" no
diagnóstico (são doze), seis mensagens apontando para seções que mudaram de
nome ("Configurações › Segurança", "› Campos", "› Canais") e concordâncias
que sobraram da troca de mesa por canal ("nenhum canal cadastrada").

**Defesa.** O passo a passo de instalação foi reescrito para quem chega de
fora, com a regra do Google sobre de quem o e-mail é reconhecido. Um teste
confere que nenhuma mensagem aponta para seção que não existe.

---

### 81 · Contar um item de lista lendo a base inteira

**Causa.** Antes de renomear ou excluir um item de lista, o sistema contava em
quantos casos ele está — lendo todas as colunas de todas as linhas de todas as
bases, duas vezes. Com 60 mil casos, 3 segundos no computador; no Apps Script,
várias vezes isso.

**Defesa.** Lê só as colunas dos campos que usam aquela lista: 0,07 segundo, a
mesma conta. Lista que nenhum campo usa continua procurada na linha inteira.

---

### 82 · A tela que desistia de uma importação ainda em andamento

**Causa.** Toda chamada desistia em 40 segundos e dizia "provavelmente falta um
arquivo .gs". Uma importação de 2.000 linhas num horário cheio podia passar
disso: a tela dava como perdida, o servidor terminava, e quem tentasse de novo
importava duas vezes.

**Defesa.** `Servidor.chamarSemPressa` para o que trabalha de verdade
(importar, arquivar, gerar análise, diagnosticar), com o teto do Apps Script. E
a mensagem de desistência avisa que a ação pode ter sido feita.

---

### 83 · O laudo do atualizarPGO que repetia tudo

**Sintoma.** Rodando numa planilha em dia: oitenta linhas de "X.Y já existe",
depois o laudo inteiro da migração de canais colado embaixo — com o seu próprio
"Nada a fazer" — e a frase "Agora rode diagnosticoRECC()" duas vezes.

**Defesa.** Um laudo só, na ordem em que se lê: FEITO, DECISÃO SUA e, por
último, JÁ ESTAVA EM DIA, agrupado por aba ("CATALOGO já tinha: Id, Tipo,
Nome…"). As mesmas 90 conferências, em 31 linhas.

---

### 84 · O campo condicional que abria escondido

**Sintoma.** Abrir um caso em "Trabalhar no caso" com o status que mostra o campo
(Canal de origem = Central, e o "Nome de quem transferiu" gravado) e não ver o
campo. Ele só aparecia depois de a pessoa mexer no campo que manda.

**Causa.** O formulário é ligado ANTES de receber o caso, com todos os campos em
branco — e as condições escondem tudo. Ao preencher, ninguém reaplicava a
regra. Desde o primeiro dia da regra.

**Defesa.** `preencher` reaplica as condições ao terminar. E ao abrir um caso a
regra só mostra e esconde, sem esvaziar: o campo escondido pode ter um valor que
veio da importação, e mostrar o caso não é pedir para apagá-lo. Só a pessoa
trocando o campo que manda esvazia o que deixou de valer.

---

### 85 · O campo escondido que o servidor continuava cobrando

**Causa.** A condição de "aparece só quando…" era só da tela. O servidor não a
conhecia: um campo obrigatório que estava escondido recusava o salvamento com
"é obrigatório", e um valor mandado para um campo escondido era gravado mesmo
assim.

**Defesa.** O servidor avalia a mesma condição, com a mesma conta da tela (sem
acento e sem caixa): campo que não é a vez dele não é cobrado nem gravado. Vale
com o valor que o campo que manda VAI TER — o que a tela mandou, senão o que o
caso já tem, senão, no cadastro, o padrão (o "Não trabalhado" da RET).

---

### 86 · O valor que ficava para trás ao sair do Retido

**Causa.** Passar um caso de Retido para Não retido pelo diálogo de status não
esvaziava o Status proposta: o valor ficava na planilha, invisível, e voltava
sozinho no dia em que o caso voltasse a Retido — já com o carimbo da vez
anterior.

**Defesa.** Quando o campo que manda deixa o valor que mostrava o dependente, o
dependente é esvaziado — nos três caminhos (formulário, diálogo e cadastro), e o
carimbo da condição sai junto. Só a TRANSIÇÃO limpa; o campo que já estava
escondido, com valor de importação, não é tocado.

---

### 87 · A tela antiga que apagaria a condição de parada

**Sintoma.** Nenhum — achado pelo teste da própria rodada.

**Causa.** A tela de Sinalizadores sempre manda os quatro campos da condição de
parada. Uma tela em cache, de antes de eles existirem, não manda nenhum — e o
servidor lia "nada" como "tirar a condição".

**Defesa.** Pedido sem nenhum dos quatro campos mantém a condição que o
sinalizador já tem. Pedido com algum (mesmo vazio) é a tela nova falando, e vale.

---

### 88 · A Descrição que abria vazia — e sumia ao salvar

**Sintoma.** Relatado pelo PO: "na aba Trabalho, ao clicar em Trabalhar no caso,
a Descrição não vem junto para ser editada".

**Causa.** O campo se chama "descrição" em CAMPOS (veio do contrato); na
planilha, a coluna pode estar escrita "Descrição" ou "DESCRIÇÃO". Gravar acha a
coluna sem ligar para maiúscula, acento e espaço — por isso cadastrar sempre
funcionou. Mas o registro lido da planilha tem as chaves exatamente como estão
no cabeçalho, e a edição lia `registro[campo.Cabecalho]`: nada. O campo abria
vazio, e como campo esvaziado na edição é apagado na planilha, **salvar o caso
apagava a descrição**. O diagnóstico não via: ele também compara sem grafia, e
dizia que o campo apontava para uma coluna que existe.

**Defesa.** A edição lê pela grafia que está na aba (`valorPelaGrafiaDaAba_`),
para o campo simples e para os que moram em várias colunas (proposta, apólice,
produto). Teste no servidor e ponta a ponta: cabeçalho "Descrição" na planilha,
a caixa abre preenchida, e salvar sem mexer não apaga.

**Depois, com o aval do PO, a raiz.** O mesmo jeito de ler pelo nome exato
existia para as colunas que o canal declara (status, data de entrada,
finalização…), as dos sinalizadores e os carimbos de status — cerca de 45
leituras. Em vez de mexer em cada uma, o nome é trocado pela grafia da planilha
**onde nasce**: no canal que a chamada usa (`comAGrafiaDaAba_`, em
`canalPeloId_`, onde a base já vai ser lida — custo zero), nos sinalizadores e
nos carimbos de status (uma vez por canal), e nas chaves do que o formulário
grava (`comAsChavesDaAba_`). Testes trocam "status" por "Status", "Status
proposta" por "STATUS PROPOSTA", a data de entrada e um carimbo de status, e
conferem a troca de status, os carimbos, o selo, a parada do Retido e a limpeza
ao sair dele. E o `diagnosticoRECC` passou a mostrar a grafia diferente, como
atenção.

---

### 89 · O alarme que dizia "ignorada" para a coluna que o sistema usa

**Sintoma.** Relatado pelo PO: "por que fica aparecendo as colunas que criei fora do
contrato e sinalizando que são ignoradas? Se for preenchido não vai aparecer?"

**Causa.** O laudo da planilha comparava as colunas SÓ com o contrato fixo
(`RECC_ESQUEMA`). Toda coluna fora dele — inclusive as que o próprio sistema cria
quando o PO cadastra um campo em Configurações › Cadastrar Caso — entrava em "a
mais", dava ATENÇÃO no diagnóstico e ouvia: "o sistema ignora o que não conhece"
e "coluna que o sistema não preenche fica vazia para sempre". As duas frases
erravam: o campo criado pelo PO é conhecido (o formulário grava nele, o caso o
mostra), e a coluna escrita à mão, com valor, aparece em "Trabalhar no caso". Além
disso, a lista de leitura de "Trabalhar no caso" chamava essas colunas de "escrito
pelo sistema". Um teste antigo (`a coluna criada pelo administrador consta como fora
do contrato`) exigia exatamente o comportamento errado.

**Defesa.** `conferirEstrutura_` consulta os CAMPOS (`colunasDosCamposPorAba_`,
campo desligado e campo de várias colunas inclusive) e separa `doFormulario` de
`aMais`. A coluna do formulário não é citada; a que é só do PO é citada como
**sua**, no nível OK — informação, sem alarme —, com o texto certo; e a lista de
leitura do caso diz "colunas que o formulário não pergunta (as do sistema e as que
você criou)". O teste antigo passou a exigir o contrário.

---

### 90 · A SUSEP só de letras recusada pelo tipo do campo

**Sintoma.** Relatado pelo PO: "encontrei um problema na SUSEP ao não aceitar apenas
letras". `7dmd8gs` e `77777777` passavam; `jamjamm` voltava com "SUSEP — precisa ter
ao menos um dígito".

**Causa.** O campo SUSEP de fábrica é texto, mas o tipo de qualquer campo se troca em
Configurações › Cadastrar Caso. Com ele como **identificador** (ou documento, ou
número), a conferência do servidor aplicava a regra do tipo: pedia ao menos um dígito.
Documento ainda passava a SUSEP por "só dígitos" (`7dmd8gs` virava `78`), e uma
máscara no campo apagava as letras enquanto a pessoa digitava. Reproduzido no
simulador com os três tipos e com máscara, 12 combinações.

**Defesa.** `ehASusep_` (Base.gs): o campo SUSEP é conferido e gravado como texto
qualquer que seja o tipo escolhido — `conferirCampo_` não aplica a regra do tipo, o
"só dígitos" do documento não vale para ela, `tiposDeclaradosPeloAdministrador_`
declara a coluna como texto (canal sem contrato), e a tela não põe máscara nela. Os
outros campos continuam conferidos pelo tipo deles.

---

### 91 · Editar um item em Ajustes Gerais apagava o canal dele

**Sintoma.** Achado durante o pedido do carimbo das tentativas, antes de o PO
reclamar: um status editado em Ajustes Gerais (só o rótulo, ou a cor) passava a
aparecer em **todos** os canais.

**Causa.** A tela não mandava o canal do item ao salvar, e o servidor gravava
`CanalId` vazio — que o sistema lê como "item de todos os canais". Item novo criado
pela tela também nascia sem canal, porque a tela não tinha onde escolher.

**Defesa.** O painel do item ganhou o menu **Canal** (Todos os canais, RET, Mesa,
VG), que vem com o canal atual; a tela manda o que está nele. Quem chama o servidor
sem mandar o canal (de fora da tela) mantém o que o item já tinha. Os status que já
perderam o canal não são "consertados" sozinhos — o sistema não tem como saber de
qual canal eram —, e o diagnóstico passou a listá-los (atenção, em Os canais).

---

### 92 · O menu dos cards marcava a opção errada, e o card de coluna filtrava o status

**Sintoma.** Com dois cards "Já passaram por" no mesmo canal, os dois mostravam a
mesma opção em "O que contar". E no Trabalho, clicar num card "Já passaram por"
deixava a fila vazia.

**Causa.** O menu comparava só a regra (`preenchido`) quando ela não era de status —
a coluna, que é o que distingue um "Já passaram por" do outro, ficava de fora. Card
cuja opção sumira (status desligado) caía calado na primeira opção. No Trabalho, a
tela tratava como "filtrável pelo status" todo card que não fosse total nem
finalizados na célula, e filtrava a fila por um status com o nome do card.

**Defesa.** `opcoesDoQueContar` compara regra, filtro **e** coluna, agrupa o menu e
mostra "Não está mais disponível: …" para o card órfão, sem trocar a configuração
dele. Cada card sai do servidor dizendo a regra (`dimensao`), e só o de status filtra.

---

### 93 · O carimbo na coluna sua virava "Wed Oct 14 2026 14:50:59 GMT"

**Sintoma.** Pego pelo teste do carimbo das tentativas, antes de sair: apontar o
carimbo para uma coluna criada direto na planilha gravava a data como o texto cru
do JavaScript.

**Causa.** Coluna sua não tem tipo declarado, e o sistema a trata como texto — o
`Date` do carimbo era convertido com `String()`. O menu novo oferece as colunas
suas, então o caminho passou a ser fácil de pegar.

**Defesa.** `carimboParaAColuna_`: coluna de data recebe a data; as outras recebem
`dd/MM/yyyy HH:mm`, o mesmo texto do `@AGORA`. Vale para o carimbo de status e para
o de item de lista.

---

### 94 · O card de valor perdia a coluna ao salvar de novo

**Sintoma.** Pego pelo ponta a ponta, antes de sair: criar o card "Tentativa: 1ª
tentativa…" funcionava; salvar a lista outra vez recusava o card ("precisa da coluna
e do valor") e o menu dele aparecia como "não está mais disponível".

**Causa.** A tela copia cada card ao abrir Painéis (`copiarCard`), e a cópia levava
regra, filtro e cor — não a coluna, que só o card novo usa.

**Defesa.** A cópia leva a coluna. O ponta a ponta cria o card, confere a opção
marcada depois de recarregar, salva de novo e confere a planilha; a suíte confere a
linha da cópia. Desfazer a correção deixa os dois vermelhos.

---

### 95 · O Trabalho que estourava os 40 segundos

**Sintoma.** Relatado pelo PO: "a aba Trabalho vem demorando para carregar e, quando
carrega, traz um erro informando o problema de 40 s para responder".

**Causa.** Não eram as leituras da planilha — o estresse mede 4 a 7 idas ao
serviço, e o processamento no Node leva uns 200 ms. Era o TAMANHO da resposta:
desde o pedido "mostrar 5, mas poder mostrar todos na hora", o servidor mandava a
fila INTEIRA, e cada célula levava junto o nome da coluna, "é status" e o alerta
— 1,1 KB por caso. Com 5.000 casos no período, 6 MB. O Apps Script leva dezenas
de segundos para atravessar isso até o navegador, e a tela desiste nos 40
(`SEGUNDOS_ATE_DESISTIR`). O simulador conta idas e células, e não o tamanho do
que volta: por isso o estresse aprovava.

**Defesa.** Decisão do PO, entre as opções: (A) a fila vai **compacta** —
`compactarFila_` manda só os valores, e `TelaTrabalho.expandirFila` remonta o
formato de antes a partir de `colunas`; (B) a tela recebe os **100 mais recentes**
(`RECC_FILA_NA_ABERTURA`), e "Todos" vai ao servidor. O aviso de prazo deixou de
depender da fila que veio: `casosPertoDeVencer_` olha todos os casos e manda a
lista com até 100, mais o número inteiro. Com 5.000 casos: abertura de 6 MB para
**85 KB**; "Todos", 1,8 MB. Os testes leem a fila pela mesma função da tela
(`comAFilaDaTela`), e um deles mede o tamanho da resposta.

---

### 96 · O formulário que não chegava virava "Cannot read properties of null"

**Sintoma.** Achado pela varredura geral, pedida pelo PO ("um teste em todo o
sistema para capturar bugs, erros e quebras"): treze funções de gravar — salvar
corretora, bloquear SUSEP, legado, campo (criar e salvar), item de lista, nível,
canal (criar e salvar), identidade, análise, sinalizador e usuário — estouravam com
o erro cru do JavaScript quando o formulário vinha vazio. A busca e o reordenar
campos estouravam com "x.map is not a function" quando a lista vinha em outro
formato, e salvar cards, com um card vazio na lista.

**Causa.** As funções liam `dados.nome`, `dados.id`… direto. A tela de hoje sempre
manda o objeto — mas uma **página antiga guardada no navegador** depois de uma
atualização (o caso do PO com a Descrição) manda o que a versão dela mandava, e a
pessoa leria o erro cru.

**Defesa.** `dadosDaTela_` (Base.gs), logo depois da permissão: sem o objeto, o
recado manda recarregar a página (Ctrl+F5), e nada é gravado. `listaDaTela_` para
as listas; o card vazio diz o número dele. A permissão continua vindo primeiro —
quem não pode gravar ouve "não tem permissão", e não "recarregue". Varredura:
**28 defeitos na 1ª passada e 15 na 2ª → zero**.

---

### 97 · A fatia do gráfico da Produtividade também estourava os 40 segundos

**Sintoma.** Achado pela 3ª passada da varredura (o volume): com 5.000 casos,
clicar numa fatia de gráfico da Produtividade devolvia **6,6 MB** — o mesmo defeito
do Trabalho (item 95), em outra tela.

**Causa.** `detalharComponente` montava a lista inteira com `montarFila_`, no
formato de 1,1 KB por caso.

**Defesa.** O mesmo remédio, escolhido pelo PO: a lista vai compacta e com os
**100 mais recentes** (`RECC_FILA_NA_ABERTURA`), a tela remonta com
`TelaTrabalho.expandirFila`, e **"Mostrar todos (N)"** busca o resto. Com 5.000
casos, a maior resposta do sistema passou a ser **98 KB**. O ponta a ponta clica
na fatia, confere as 100 linhas e o botão, e pede "todos".

---

### 98 · A tentativa de contato escolhida na lista ia em branco para a planilha

**Sintoma.** Relato do PO: "ajustei o PGO para que quando o status for retido ou
for sem sucesso de contato ele mostre a caixinha da tentativa de contato. Nela
apaguei e coloquei outras opções, mas notei que ele não está carimbando a opção
da lista na planilha. Tanto no botão da aba Trabalho quanto em cadastrar caso".
A pessoa escolhia "Caixa postal", salvava sem erro nenhum, e a coluna
"tentativas de contato" continuava vazia.

**Causa.** O contrato da BASE_RET (`RECC_ESQUEMA`, Base.gs) dizia que essa coluna
guarda **número** — herança de quando ela seria "quantas tentativas". O campo
virou seletor de lista, mas "o contrato manda": todo valor passava por
`converterParaOTipoDaColuna_`, que transforma texto que não é número em vazio.
Não era só a lista nova do PO: nem os itens de fábrica ("1ª tentativa") chegavam
a ser gravados, desde sempre. Ninguém tinha visto porque não havia erro.

**Defesa.** A coluna passou a ser **texto** no contrato. E a família inteira
ganhou guarda: `valorQueNaoCabeNaColuna_` (Casos.gs) confere, antes de gravar,
se o valor sobrevive à conversão da coluna — se um valor preenchido viraria
vazio, a gravação é **recusada com o nome da coluna** ("a coluna X da planilha
guarda número, e 'Caixa postal' ficaria em branco nela"), no cadastro, no
"Trabalhar no caso" e no "Alterar status". O mesmo engano numa coluna futura
aparece no primeiro clique, e não meses depois.

---

### 99 · O campo que o status pedia sumia no diálogo "Alterar status"

**Sintoma.** Achado pelo ponta a ponta desta mesma rodada, antes da entrega: ao
escolher "Sem sucesso de contato" no diálogo, o servidor mandava a tentativa de
contato para a tela — e a tela a desenhava **escondida**.

**Causa.** O campo ia com a condição dele ("aparece quando o Status for…"). No
formulário de cadastro, o Status é um campo; no diálogo, é o seletor do próprio
diálogo. O formulário procurava o campo "status" para decidir, não achava, e
escondia — o mesmo campo que o servidor tinha acabado de pedir.

**Defesa.** Quem decide o que o diálogo mostra é o servidor, para o status
escolhido: `camposDaSituacao` manda os campos **sem** `mostrarSe` e
`obrigatorioSe`. A suíte ganhou o teste que desenha o que o servidor mandou e
confere que nada sai escondido; o ponta a ponta abre o diálogo, escolhe os dois
status e grava.

### 100 · O card do status renomeado ficava preso, com zero, e esvaziava a fila

**Sintoma.** Relato do PO: "clico e a fila fica vazia", "o número do card está
errado", "ao escolher ou editar nas Configurações ele não remove o card e fica
preso".

**Causa.** O card de situação guarda o **nome** do status em `PAINEIS.Filtro`.
Renomear o status em Ajustes Gerais não mexia no card: ele passava a contar um
status que não existia (zero), e clicar filtrava a fila por esse nome (vazia). E
salvar a lista de cards conferia **todos** os cards — o órfão era recusado, e com
ele qualquer outra mudança: não dava nem para removê-lo.

**Defesa.** `renomearNosCartoes_` leva o nome novo aos cards; o card órfão some do
Trabalho, aparece marcado em Configurações e só o card novo ou alterado é conferido
ao salvar. A suíte renomeia um status e confere os cards, e salva uma lista com um
órfão dentro.

### 101 · O clique no card filtrava pelo título, e só o card de status filtrava

**Sintoma.** Achado ao reproduzir o 100: um card chamado "Aguardando" de valor de
campo não filtrava nada; um card de status renomeado só na tela filtrava pelo nome
da tela.

**Causa.** A tela mandava o **título** do card como filtro de status. O título é
do PO; o que o card conta mora em outro lugar.

**Defesa.** A tela manda o **Id**; o servidor aplica à fila a mesma regra com que
contou (`filtrarPeloCartao_`). A suíte clica num card de valor, num de status com
outro nome e num de coluna preenchida, e confere a fila; o ponta a ponta clica no
card e conta as linhas.

### 102 · O editor de cards gravava duas, três vezes por clique

**Sintoma.** Achado ao reproduzir o 100: depois de acrescentar ou remover um card,
um Salvar disparava várias gravações ao mesmo tempo — e a última a chegar vencia.

**Causa.** Cada redesenho da lista chamava a função que liga **todos** os botões da
tela, e o Salvar e o "+ card" ganhavam um ouvinte a mais por redesenho.

**Defesa.** A ligação foi dividida: a troca de tela e de canal, a lista de cards e
os botões. O redesenho liga só a lista. A suíte confere que a tela liga o Salvar uma
vez só, e que remover um card não duplica a gravação.

### 103 · O "Por data" da abertura escondia os casos sem data de recepção

**Sintoma.** Achado ao testar a Etapa 44: na RET, os casos importados sem data de
recepção não apareciam no Trabalho nem nos cartões.

**Causa.** Na Etapa 43 a abertura passou de "últimos 30 dias" para "Por data" com
as datas já preenchidas. O "Por dias" deixava passar o caso sem data; o "Por data",
não — e a abertura mudou de regra sem ninguém pedir.

**Defesa.** O período da abertura leva a marca `abertura`, e `guardaOsSemData_`
mantém os sem data nela (Trabalho, Produtividade, detalhamento e Minha
Performance). Escolhidas outras datas, ou um mês, vale só quem tem data dentro.

### 104 · A data com hora importada trocava o dia pelo mês

**Sintoma.** Achado ao montar a Etapa 47: a "Data do 1º contato" trazida de uma base
antiga como "03/10/2026" era gravada como **10 de março**, e "25/10/2026" ficava em
branco. A coluna de data sem hora (a data de recepção) convertia certo.

**Causa.** `converterParaDataEHora_` entregava o texto a `new Date()`, que lê no
padrão americano, mês antes do dia. A outra planilha chega na importação como texto
(`getDisplayValues`), no formato brasileiro — então toda coluna de data e hora
importada passava por ali: os carimbos de contato, os de status, a data da
transmissão do Status proposta.

**Defesa.** "dd/MM/yyyy", com ou sem "HH:mm[:ss]", é lido primeiro, com o mesmo
`diaQueExiste_` da data sem hora (31/02 fica vazio, e não 3 de março). A suíte
importa uma "Data do 1º contato" com dia acima de 12 e confere o dia gravado e a
conta das tentativas.

### 105 · O card removido voltava, desmarcado e no topo, ao recarregar

**Sintoma.** Relato do PO, em Configurações › Painéis › Cards do Trabalho: ao remover
os seis primeiros cards e salvar, eles somem — e, quando a tela recarrega, voltam.

**Causa.** Salvar não apaga o card removido: desliga (`Ativo NAO`) e põe `Ordem` 0,
para nenhum dado se perder. Só que o editor lista **também** os desligados — de
propósito, para dar como religar um card que a pessoa escondeu em "Mostrar" — e não
distinguia o escondido do removido. O removido voltava, com "Mostrar" desmarcado, e
a Ordem 0 o punha no topo: os "seis primeiros". Os cards que o `atualizarPGO`
desligou ao montar os 4 da RET faziam o mesmo.

**Defesa.** `cartaoFoiRemovido_` separa os dois pela ordem: o escondido guarda a
posição (1, 2, 3…), o removido tem Ordem 0 e não entra na lista do editor. A linha
segue na planilha. A suíte remove os seis primeiros, salva, recarrega e confere que
não voltam; confere que o escondido continua no lugar e se religa; e que os
desligados pelo `atualizarPGO` também saem. Não precisa migrar nada: os que já
estavam desligados com Ordem 0 somem do editor na hora.

### 106 · O diagnóstico pedia para desligar o campo que já estava desligado

**Sintoma.** Relato do PO: depois de apagar a coluna "agente da central" da planilha, o
diagnóstico "sinaliza que precisa incluir a coluna do agente da central".

**Causa.** O bloco dos campos conferia **todos** os campos da aba CAMPOS contra a
planilha, ligados ou não. O `atualizarPGO` da Etapa 49 desliga o campo e diz que a
coluna pode ser apagada; apagada, o laudo dava FALHA — "Desligue o campo… ou acrescente a
coluna" —, a primeira opção já feita, a segunda desfazendo o pedido do PO.

**Defesa.** Só o campo **ligado** sem coluna é FALHA: é ele que estouraria no cadastro. O
desligado vira uma linha informativa. A suíte apaga as três colunas depois do
`atualizarPGO`, confere o laudo sem FALHA, confere que um campo ligado sem coluna
continua reprovado, e que excluir a linha do campo não faz nada recriá-lo.

### 107 · O prazo da Mesa contava até o dia em que alguém salvou, e não até a finalização

**Sintoma.** Relato do PO: caso da Mesa Diamante finalizado dentro das 48 horas, com a
data e o horário da finalização preenchidos, aparecia **estourado**.

**Causa.** Duas. O selo do prazo lia primeiro a *Data da última mudança de status* — o
momento em que o caso foi SALVO como Concluído — e só na falta dela a *Data da
finalização*; o analista que registrava depois o que fez antes ganhava vermelho. E,
concluindo pelo formulário com a finalização digitada no mesmo salvamento, o carimbo do
Concluído conferia só se a coluna estava vazia **na planilha**, e trocava a data digitada
pela de agora.

**Defesa.** No canal que fecha pela finalização, a data e o horário da finalização vêm
antes de tudo, no selo e no SLA; o carimbo não sobrescreve o que veio no mesmo
salvamento. A suíte conta o selo com e sem a finalização, com a hora dos dois lados do
limite, ajustada depois, e confere que a RET não muda.

### 108 · Depois do erro dos 40 segundos, o segundo clique gravava o caso em dobro

**Sintoma.** Achado da análise de 29/10: com a planilha ocupada, a tela dizia que o servidor
não respondeu em 40 segundos; a pessoa clicava de novo, e o caso aparecia duas vezes.

**Causa.** A tela desiste no relógio dela, mas o servidor continua e termina de gravar. O
botão voltava ativo com o formulário preenchido, e nada distinguia o segundo clique de um
caso novo. A mensagem ainda apontava para "um arquivo .gs que não foi copiado".

**Defesa.** Código de envio por formulário, o mesmo até dar certo, e o servidor que não grava
duas vezes o mesmo código (Etapa 59). A suíte grava duas vezes com o mesmo código e confere
uma linha só — em cadastrar, editar, status e importar.

### 109 · O diagnóstico não conferia o fuso do projeto, só o da planilha

**Sintoma.** Achado da análise de 29/10, ainda sem relato da operação: com o projeto do Apps
Script fora de São Paulo, toda data digitada recuaria um dia.

**Causa.** `converterParaData_` monta a data com `new Date(ano, mês, dia)`, que usa o fuso
do PROJETO; a leitura formata no de São Paulo. O instalador acerta o fuso da planilha, mas o
do projeto não se acerta por código — e ninguém conferia.

**Defesa.** O diagnóstico confere `Session.getScriptTimeZone()` (FALHA fora de São Paulo), o
`atualizarPGO` avisa, e o manifesto com o fuso certo vai no pacote (Etapa 60).

---

## O que esta lista ensina

**São noventa e nove achados, e a maioria era silenciosa.** Não davam erro, não
travavam, não apareciam no log. Gravavam dado errado — ou desenhavam a tela
errada — e seguiam em frente.

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
13. **Entre esperar para sempre e desistir explicando, desistir ganha.** O
    item 32 fecha a série dos silêncios: ter tratamento de erro não adianta
    quando o caminho é "nada volta". Só um relógio resolve isso.
14. **Medir o relógio errado não mede nada.** No Apps Script o custo é a IDA
    ao serviço, não a conta em JavaScript. Os itens 28 e 29 eram invisíveis no
    relógio do Node — o Node não paga pedágio. Contar as idas mostrou os dois
    na primeira execução.
15. **Conferir o que você acabou de fabricar não é conferir nada.** O item 33
    é a armadilha do verificador que se aprova sozinho, da Etapa 12, aparecendo
    dentro da própria suíte. O teste tem de olhar para o artefato que vai ser
    usado — não para uma cópia que ele mesmo gerou na linha anterior.
16. **A mesma regra escrita em dois lugares é uma regra e um enfeite.** No item
    34 a tela e o servidor preenchiam o mesmo padrão, e só o da tela estava
    funcionando. Enquanto todo caminho passava pela tela ninguém notou. Um
    caminho novo — a importação, que não tem tela — encontraria a diferença em
    produção, numa carga de 300 casos recusada linha por linha.
17. **"Foi escrito?" e "o que foi escrito?" são perguntas diferentes.** O item
    35 passaria num teste que só conferisse a existência da coluna. O `|| ''`
    apaga a diferença entre não ter valor e não existir o campo, e o único jeito
    de ver isso é olhar o conteúdo.
18. **A regra da casa vale para o teste também.** O item 36 é o pedido central
    do projeto — coluna se acha pelo nome, nunca pela posição — desobedecido
    dentro da suíte que existe para cobrá-lo. E cobrou caro: o erro apontava um
    arquivo que não tinha culpa nenhuma.
19. **Configuração nova pede varredura, não remendo.** O item 37 é o 34 num
    lugar diferente: no dia em que o nome da tela virou dado, os DOIS lugares
    que o exibiam passaram a ter de ler do mesmo lugar. Só um foi alterado, e a
    tela ficou dizendo os dois nomes ao mesmo tempo.
20. **Passo que desfaz o anterior não erra em nenhum dos dois.** No item 38 a
    primeira volta excluía e a segunda trazia de volta. Lidas separadamente, as
    duas estão certas. Só o resultado está errado — e só quem testa o resultado
    descobre.
21. **Erro que imprime o valor recebido se explica sozinho.** O item 39 foi
    resolvido pelo próprio texto da mensagem, em segundos, duas vezes. "Aba não
    encontrada" teria custado duas investigações; `A aba "[object Object]"` não
    custou nenhuma.
22. **O teste herda a suposição de quem escreveu o código.** No item 40 eu
    comparei um campo livre com uma constante, e depois escrevi o teste
    preenchendo esse campo com a constante. Os dois passaram. O que quebrou a
    suposição foi abrir a tela e ler a frase que ela mostrava — é o item 5
    desta lista outra vez, e é por isso que ele continua valendo.
23. **"Nenhum erro" tem de dizer onde olhou.** Os itens 41 e 42 são o mesmo
    defeito em dois lugares: uma conferência olhando a tela errada e um teste
    procurando no arquivo errado. Nos dois, o que estava sendo procurado era o
    certo. **Escopo errado não deixa sintoma** — a verificação passa, e a
    licença de parar de procurar é dada do mesmo jeito.
24. **Gerar as imagens do README é conferência, não enfeite.** Foi a foto da
    tela que pegou os dois. Ela é a única verificação que olha a tela inteira
    sem saber o que procurar — e por isso ela agora sai de um gerador
    (`gerar-imagens.js`), e não da mão de alguém.
25. **Dois números da mesma tela que deviam bater são um teste que ninguém
    escreveu.** O item 43 ficou visível porque o cartão e a rosca discordavam
    lado a lado. Nenhum teste comparava os dois, porque cada um estava certo
    sozinho — e é sempre assim: o defeito mora no encontro, e o encontro é
    exatamente o que ninguém testa.
26. **Motor único chamado de um lugar só não é motor único.** No item 43 a
    função do carimbo estava certa, bem escrita e bem comentada. Ela só era
    chamada de uma das três portas — e para quem entrava pelas outras duas, o
    efeito foi o mesmo que ela não existir.
27. **Caminho que não valida esconde dado inválido até alguém validar.** No
    item 44 a importação gravou 50 mil linhas recusáveis sem uma reclamação —
    e está certa em não reclamar, porque importação é assim. O preço é que o
    dado errado fica invisível até passar por uma porta que confere, e aí o
    erro aparece muito longe de onde nasceu.
28. **Ao renomear, procure também pelo nome NOVO.** O item 45 passou pela busca
    completa do nome antigo e mesmo assim quebrou, porque o nome de chegada já
    pertencia a outra função. Meia busca parece busca inteira: some o que se
    procurava, e o estrago está no que não se procurou.
29. **Quebre o código de propósito para provar o teste.** O item 46 é o mais
    incômodo da lista: um teste escrito minutos depois de ver o defeito, para
    pegar aquele defeito, que não o pegava. Só apareceu porque desliguei o
    ícone de novo e o vermelho não veio. Todo teste desta suíte que vale
    alguma coisa passou por isso.
30. **Classe no DOM não é cor na tela.** O item 47 tinha a classe certa, a dica
    certa e o negrito certo — e o número continuava cinza, porque outra regra
    de CSS vencia por ordem. A pergunta que vale é a que o olho faz, e só um
    navegador de verdade a responde.
31. **Dado novo revela código velho.** O item 48 estava lá desde o primeiro
    dia: nenhum canal tinha mostrado um decimal na fila. Vale perguntar
    quantos caminhos do código nunca foram exercitados pelo dado que existe —
    é onde mora a próxima leva de achados.
32. **Número cravado num teste é uma promessa que ninguém cumpre.** No item 49
    nove testes quebraram sem defeito nenhum, e um deles derrubou quatro por
    tabela. Vermelho que diz "mudou" quando devia dizer "quebrou" custa mais
    caro que teste nenhum: ensina a olhar o console com pressa.
33. **Regra pelo nome é regra que ninguém vê.** O item 50 não deu erro em
    momento nenhum: só contou errado, por meses, porque decidia "concluído"
    pelas letras do status. O que é regra de negócio mora numa coluna que
    alguém marca, e não num prefixo que alguém um dia escolheu.
34. **Trocar um nome é trocar em todo lugar que guarda o nome.** No item 51
    eram quatro: catálogo, casos gravados, cartões e destacadas — e o quinto,
    o plural, só o teste achou.
35. **A prévia é tão confiável quanto o substituto dela.** No item 52 a tela
    estava certa e a prévia dizia que não.
36. **Teste com o dado do mundo, não com o dado do código.** O item 53 só
    apareceu porque o CNPJ do teste foi escrito com a barra, como ele é. Com
    "12345678000190" o teste passaria, e a Mesa gravaria errado no primeiro dia.
37. **Releia a regra nova pelo caminho que não passa pela tela.** No item 54 a
    regra estava certa para o caso cadastrado e furada para o importado — que é
    justamente onde o PO viu o problema.
38. **O que é rápido hoje pode ser o que cresce amanhã.** O item 55 não pesava
    na base de teste; pesava em quanto a operação já tinha trabalhado. Medir
    com o volume de daqui a um ano é o que separa "rápido" de "rápido por
    enquanto".
39. **"Travou" é um sintoma, não um diagnóstico.** No item 56 não havia laço,
    erro nem função faltando: havia um texto que não mudava e um botão que não
    fechava. Só apareceu reproduzindo com o atraso de verdade do Apps Script —
    no simulador instantâneo, tudo parecia certo.
40. **Teste que passa com a quebra é teste a reescrever, não a comemorar.** Na
    Parte 2, duas das dezesseis quebras de propósito passaram verde: a
    importação era conferida pela leitura, que já normaliza, e não pela
    planilha; e a permissão do arquivamento era conferida pela mensagem de um
    erro que vinha DEPOIS de o arquivamento já ter rodado.
41. **O conferidor só acha o que foi ensinado a procurar.** O item 67 passou
    por noventa e seis combinações de tela "sem nenhuma quebra", porque a
    pergunta era se algo saía da janela, e não se algo estava em cima de
    outra coisa. Quando o PO aponta um sintoma que a ferramenta diz não
    existir, é a ferramenta que precisa aprender.
42. **O que aparece duas vezes no código só está testado se cada uma for
    testada.** O item 72 passava porque a primeira ocorrência de `escapar(...)`
    satisfazia a busca. Quebre a segunda de propósito: se continuar verde, o
    teste está olhando a ocorrência errada.
43. **Função feita para comparar uma coisa não serve para comparar outra.** O
    item 73 usava, para e-mail, a função de comparar nomes — que existe
    justamente para ignorar o que, num e-mail, identifica a pessoa.
44. **Mensagem que manda rodar algo é promessa.** O item 78 citava uma
    ferramenta que não existia, e o item 80 um arquivo com o nome errado. Quem
    lê uma instrução do sistema segue ao pé da letra — e é no dia de emergência
    que ela é lida.
45. **Regra que só a tela conhece é regra que o servidor desconhece.** O item 85
    era a condição do campo escondido: certa para quem usa o formulário, errada
    para a importação e para qualquer chamada direta. Toda regra de tela precisa
    de uma cópia no servidor — e de um teste que garanta que as duas concordam.
46. **Limpar por estado apaga dado; limpar por ação, não.** No item 84 a primeira
    ideia era esvaziar todo campo escondido. Dado importado mora justamente em
    campo que a tela esconde. O que se esvazia é o que a PESSOA acabou de
    tornar sem sentido, e só nesse momento.
47. **Comparar sem grafia num lado só é meio contrato.** No item 88 a gravação e
    o diagnóstico comparavam sem maiúscula e acento; a leitura, não. Cada lado
    estava certo sozinho, e juntos apagavam a descrição. Quando uma regra de
    comparação existe, ela vale para quem grava, quem lê e quem confere.
48. **Alarme que erra ensina a ignorar o alarme.** No item 89 o laudo dava "atenção"
    por uma coluna que o próprio sistema tinha criado, com uma explicação falsa. A
    operação passou a ler "atenção" como ruído — e o próximo atenção de verdade
    chegaria no meio dele. Todo aviso precisa distinguir o que o sistema NÃO sabe do
    que ele só não esperava.
49. **Configuração que o PO pode mudar não decide o que o dado é.** No item 90 o
    tipo do campo SUSEP era editável, e a regra do tipo vencia o que a SUSEP é. O
    que vem da natureza do dado (a SUSEP tem letra) mora no código; o que é gosto
    da operação mora na configuração.
50. **Tela que salva o objeto inteiro precisa mandar o objeto inteiro.** Nos itens
    91 e 94 a tela mandava menos campos do que o servidor grava — o canal do item,
    a coluna do card — e o servidor gravava vazio no lugar. Campo que a tela não
    manda tem de ser mantido pelo servidor, ou ir junto.
51. **O que volta também pesa.** No item 95 o estresse contava idas e células
    lidas e aprovava; o que estourava era o tamanho da resposta. "Mandar tudo para
    a tela decidir" é barato com 30 casos e caro com 5.000 — e a base só cresce.
52. **Teste de pedido confere o prometido; varredura confere o resto.** Os itens
    96 e 97 não eram de pedido nenhum, e nenhum teste perguntava "e se vier
    vazio?" ou "e com 5.000 casos?". Uma ferramenta que descobre as funções
    sozinha e chama cada uma com o inesperado pega o que ninguém pensou em
    testar — e pega a função nova no dia em que ela nasce.
53. **O que aponta por nome precisa saber quando o nome muda.** No item 100 o card
    guardava o nome do status, e renomear o status não avisava o card. Toda
    referência por nome precisa de duas coisas: quem renomeia leva o nome junto, e
    quem lê sabe mostrar — sem travar — a referência que ficou órfã.
54. **Trocar a forma de uma tela não pode trocar a regra dela.** No item 103 a
    abertura mudou de "últimos 30 dias" para "Por data" com as mesmas datas, e a
    regra do caso sem data mudou junto. Mudança de aparência precisa de um teste
    que confira que o que a tela mostra continua o mesmo.
55. **Dois tipos parecidos, duas portas de conversão.** No item 104 a data sem hora
    tinha a leitura brasileira, e a data com hora não — cada uma tinha a sua função,
    e só uma foi ensinada. Quando dois tipos guardam a mesma coisa (um dia), o teste
    de um precisa existir para o outro.
56. **"Desligado" com dois sentidos é um botão que mente.** No item 105 a mesma
    marca (`Ativo NAO`) valia para "escondi" e para "removi", e a tela só sabia um.
    Quando um estado de dado nasce de duas ações diferentes, a diferença tem de
    estar gravada — aqui, na ordem — para a tela poder tratar cada uma como a
    pessoa a entendeu.
57. **Um laudo não pode mandar desfazer o que outro laudo mandou fazer.** No item 106 o
    `atualizarPGO` dizia "pode apagar a coluna" e o diagnóstico, depois, "acrescente a
    coluna". Quando uma ferramenta autoriza um passo, as outras precisam ter sido
    ensaiadas DEPOIS dele — foi o ensaio que faltou.
58. **A data que a pessoa informa vale mais que a data em que o sistema a viu.** No item
    107, "quando salvou" passava na frente de "quando finalizou". Carimbo é o plano B
    para quando ninguém disse nada — nunca a resposta a quem disse.
59. **Desistir do lado da tela não desfaz nada do lado do servidor.** No item 108 o relógio
    de 40 segundos era tratado como "não gravou". Toda gravação que pode ser repetida
    precisa de um jeito de reconhecer a repetição.
60. **Dois relógios precisam ser conferidos como dois.** No item 109 o "fuso" era um só
    para o diagnóstico, e eram dois: o da planilha e o do projeto.
