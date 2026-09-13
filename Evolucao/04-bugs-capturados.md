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

---

## O que esta lista ensina

**Onze dos treze eram silenciosos.** Não davam erro, não travavam, não
apareciam no log. Gravavam dado errado e seguiam em frente.

Daí as duas práticas que o projeto não abre mão:

1. **Erro alto em vez de padrão silencioso.** Tipo desconhecido, campo sem
   coluna, cabeçalho repetido e Id repetido interrompem a operação. Dado errado
   calado é pior que operação parada.
2. **Olhar a tela.** Os itens 9 e 10 nenhum teste pegaria. Teste não enxerga
   "está feio" nem "essa cor não devia estar aqui".
