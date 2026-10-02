# -*- coding: utf-8 -*-
"""
============================================================================
PGO — gerar-excel.py · o código inteiro numa planilha, um arquivo por aba
============================================================================
    python3 Evolucao/Testes/gerar-excel.py

Gera `Evolucao/pacote/PGO-codigo-completo.xlsx`: uma aba por arquivo, com o
número da linha ao lado do código, para conferir e copiar de onde não dá para
clonar o repositório.

É a única ferramenta do projeto em Python — openpyxl é o que sabe escrever
.xlsx, e vale mais usar a biblioteca certa do que reimplementar o formato.

----------------------------------------------------------------------------
ESTA PLANILHA É O TRANSPORTE DE VERDADE — E É POR ISSO QUE ELA TEM DE SER FIEL
----------------------------------------------------------------------------
O PO instala e atualiza o PGO copiando daqui para o Apps Script: é o caminho
que ele tem. Então a planilha não é um enfeite de leitura, e cada cuidado
abaixo existe porque sem ele o código colado quebra:

  · UMA ABA POR ARQUIVO, com o nome do arquivo. São vinte e uma, e é o modelo
    combinado com o PO: juntar tudo em três abas dava arquivos de milhares de
    linhas, impossíveis de manter e de revisar.
  · O losango ◆ no nome da aba marca o que MUDOU nesta rodada — é por ele que
    se sabe o que precisa ser colado de novo. O Excel não aceita "*" em nome
    de aba; dentro da aba, no número da linha, o "*" é o que se usa.
  · Toda célula de código é gravada como TEXTO (`data_type = 's'`). Sem isso,
    uma linha que começa com "=" — e há dezenas, por causa do `===` do
    JavaScript — viraria fórmula, e o que a pessoa colaria seria o resultado
    dela.
  · O conferidor `conferir-excel.py` compara aba por aba com o arquivo do
    repositório, caractere a caractere, e roda os .gs no `node --check`. É o
    que garante que a planilha entregue é o código de verdade, e não uma
    versão de alguns commits atrás.
============================================================================
"""

import os
import subprocess
import sys

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DESTINO = os.path.join(RAIZ, 'Evolucao', 'pacote', 'PGO-codigo-completo.xlsx')

# As cores do tema padrão do próprio sistema, para a planilha parecer dele.
AZUL = '0B77CE'
AZUL_CLARO = 'E8F1FB'
CINZA = '59687F'
LINHA = 'D8E1ED'

FONTE_CODIGO = Font(name='Consolas', size=10)
FONTE_NUMERO = Font(name='Consolas', size=9, color=CINZA)
FONTE_TITULO = Font(name='Arial', size=11, bold=True, color='FFFFFF')
BORDA_BAIXO = Border(bottom=Side(style='thin', color=LINHA))


AMARELO = 'FFF3C4'      # a linha que mudou
VERDE_CLARO = 'E3F3E6'  # a linha que nasceu nesta rodada

# Onde sai a versão SEM as alterações — o código como estava no último commit.
DESTINO_ANTES = os.path.join(RAIZ, 'Evolucao', 'pacote', 'PGO-codigo-ANTES.xlsx')


def como_estava_no_commit(caminho_relativo):
    """
    O conteúdo do arquivo no último commit, ou None se ele nasceu agora.

    É daqui que sai tanto a planilha "sem as alterações" quanto a marcação do
    que mudou. Comparar com o commit, e não com uma cópia guardada à mão, é o
    que garante que a marca corresponde ao que de fato foi alterado.
    """
    try:
        return subprocess.check_output(
            ['git', 'show', 'HEAD:' + caminho_relativo],
            cwd=RAIZ, stderr=subprocess.DEVNULL).decode('utf-8')
    except subprocess.CalledProcessError:
        return None


def linhas_que_mudaram(antes, agora):
    """
    Quais linhas de AGORA são novas ou diferentes, pelo número.

    Devolve um dicionário {numero_da_linha: 'nova' ou 'mudou'}. Arquivo que não
    existia no commit tem TODAS as linhas como novas — é o caso de um canal
    recém-criado, e marcar linha por linha ali só polui.
    """
    if antes is None:
        return {}

    import difflib
    de = antes.split('\n')
    para = agora.split('\n')
    marcas = {}

    for etiqueta, _i1, _i2, j1, j2 in difflib.SequenceMatcher(
            None, de, para, autojunk=False).get_opcodes():
        if etiqueta == 'equal':
            continue
        for j in range(j1, j2):
            marcas[j + 1] = 'nova' if etiqueta == 'insert' else 'mudou'

    return marcas


def arquivos_do_codigo():
    """Os arquivos que a pessoa precisa ter no Apps Script, em ordem de leitura."""
    grupos = [
        ('Back-End', '.gs', 'servidor'),
        ('Front-End', '.html', 'tela'),
    ]
    achados = []
    for pasta, extensao, papel in grupos:
        caminho = os.path.join(RAIZ, pasta)
        for nome in sorted(os.listdir(caminho)):
            if nome.endswith(extensao):
                achados.append((pasta, nome, papel))
    # A conferência avulsa vai junto: é o que a pessoa roda quando algo falta.
    achados.append(('Evolucao', 'conferir-projeto.gs', 'conferência'))
    return achados


def escrever_aba_do_arquivo(planilha, pasta, nome, papel, marcar=True):
    """
    Uma aba por arquivo. Com `marcar`, o que mudou desde o último commit sai
    sinalizado: `*` no nome da aba e na linha, e fundo colorido.
    """
    relativo = pasta + '/' + nome
    caminho = os.path.join(RAIZ, pasta, nome)
    with open(caminho, encoding='utf-8') as arquivo:
        agora = arquivo.read()

    antes = como_estava_no_commit(relativo) if marcar else agora
    nasceu_agora = marcar and antes is None
    marcas = linhas_que_mudaram(antes, agora) if marcar else {}
    mexido = nasceu_agora or bool(marcas)

    # O marcador vai na FRENTE do nome, onde o olho bate primeiro ao correr as
    # abas. Não dá para usar `*`: o Excel recusa asterisco em nome de aba
    # ("Invalid character * found in sheet title") — ele é curinga de busca
    # lá dentro. O losango cheio faz o mesmo serviço e é aceito.
    #
    # Dentro da aba, no número da linha, o `*` é permitido e é o que se usa.
    titulo = ('◆ ' + nome) if mexido else nome
    aba = planilha.create_sheet(title=titulo[:31])

    aba['A1'] = 'Linha'
    aba['B1'] = relativo + ('   ← ALTERADO nesta rodada' if mexido else '')
    if nasceu_agora:
        aba['B1'] = relativo + '   ← ARQUIVO NOVO nesta rodada'
    for celula in (aba['A1'], aba['B1']):
        celula.font = FONTE_TITULO
        celula.fill = PatternFill('solid', fgColor=AZUL)
        celula.alignment = Alignment(vertical='center')
    aba.row_dimensions[1].height = 22

    linhas = agora.split('\n')

    for numero, conteudo in enumerate(linhas, start=1):
        marca = marcas.get(numero, '')

        # O `*` fica GRUDADO no número da linha: quem rola o arquivo à procura
        # do que mudou varre uma coluna estreita, e não o texto inteiro.
        alvo = aba.cell(row=numero + 1, column=1,
                        value=('* ' + str(numero)) if marca else numero)
        alvo.font = FONTE_NUMERO
        alvo.alignment = Alignment(horizontal='right')

        codigo = aba.cell(row=numero + 1, column=2)
        codigo.value = conteudo
        # Uma linha que comece com "=" viraria FÓRMULA ao ser aberta no Excel,
        # e o que a pessoa copiaria seria o resultado dela — não o código. Hoje
        # há 62 linhas assim (o `===` do JavaScript), então isto não é
        # precaução para o futuro: é o que mantém a planilha colável.
        codigo.data_type = 's'

        # Fundo para quem confere de relance, `*` para quem usa Ctrl+F. Os
        # dois, porque cor sozinha não se procura e asterisco sozinho não
        # salta. Amarelo é linha mexida; verde é linha que nasceu agora.
        if marca:
            cor = VERDE_CLARO if marca == 'nova' else AMARELO
            alvo.fill = PatternFill('solid', fgColor=cor)
            codigo.fill = PatternFill('solid', fgColor=cor)
        codigo.font = FONTE_CODIGO
        codigo.alignment = Alignment(vertical='top')

    aba.column_dimensions['A'].width = 7
    aba.column_dimensions['B'].width = 120
    aba.freeze_panes = 'A2'
    return len(linhas)


def escrever_leia_me(planilha, inventario):
    aba = planilha.create_sheet(title='LEIA-ME', index=0)
    aba.column_dimensions['A'].width = 30
    aba.column_dimensions['B'].width = 14
    aba.column_dimensions['C'].width = 78

    linhas = [
        ('PGO — Prisma Gestão Operacional', '', ''),
        ('Operação RECC · Porto Seguro', '', ''),
        ('', '', ''),
        ('PARA QUE SERVE ESTA PLANILHA', '', ''),
        ('', '', 'Ler, revisar e comparar o código. Uma aba por arquivo, com o '
                 'número da linha ao lado.'),
        ('', '', ''),
        ('PARA INSTALAR OU ATUALIZAR: UMA ABA POR ARQUIVO', '', ''),
        ('', '', 'Cada aba é UM arquivo do Apps Script, com o mesmo nome. Em '
                 'cada uma:'),
        ('', '', '   selecione a COLUNA B inteira (clique no cabeçalho "B"), '
                 'copie, e cole no'),
        ('', '', '   arquivo de mesmo nome no Apps Script. A coluna A é só o '
                 'número da linha —'),
        ('', '', '   não copie ela.'),
        ('', '', ''),
        ('', '', 'No Apps Script o arquivo se chama "Index", e não '
                 '"Index.html": sem extensão,'),
        ('', '', 'sem acento, com as maiúsculas iguais. Os .gs entram como '
                 'Script; os .html, como HTML.'),
        ('', '', ''),
        ('', '', 'A ORDEM NÃO IMPORTA, mas NENHUM ARQUIVO PODE FICAR DE FORA: '
                 'um .gs que falta faz'),
        ('', '', 'o projeto inteiro parar de carregar. Depois de colar todos, '
                 'rode oQueFaltaNoProjeto()'),
        ('', '', 'de conferir-projeto.gs — ele diz qual ficou para trás.'),
        ('', '', ''),
        ('O QUE O LOSANGO ◆ NO NOME DA ABA QUER DIZER', '', ''),
        ('', '', '◆ na frente do nome = este arquivo MUDOU nesta rodada. São '
                 'esses que precisam ser'),
        ('', '', 'colados de novo; os outros estão iguais ao que você já tem '
                 'no Apps Script.'),
        ('', '', ''),
        ('', '', 'Dentro da aba, a linha que mudou tem "*" grudado no número e '
                 'fundo amarelo; a que'),
        ('', '', 'nasceu agora, fundo verde. (No nome da aba o Excel não '
                 'aceita "*" — ele é curinga'),
        ('', '', 'de busca lá dentro —, por isso o losango.)'),
        ('', '', ''),
        ('SE A PLANILHA JÁ ESTÁ EM USO, NÃO REINSTALE', '', ''),
        ('', '', 'Cole o código novo por cima e rode atualizarPGO() no editor. Ela '
                 'não apaga nada:'),
        ('', '', 'usuários, casos, corretoras e o que estiver configurado continuam '
                 'onde estão.'),
        ('', '', 'Depois rode diagnosticoRECC() e leia o laudo.'),
        ('', '', ''),
        ('', '', 'instalarRECC() RECUSA rodar sobre planilha com dado, de propósito '
                 '— não dá para'),
        ('', '', 'apagar a operação sem querer.'),
        ('', '', ''),
        ('DEPOIS DE INSTALAR', '', ''),
        ('', '', 'instalarRECC()        cria as 13 abas e cadastra você como o '
                 'primeiro administrador'),
        ('', '', 'diagnosticoRECC()     confere o sistema inteiro e diz o que falta'),
        ('', '', 'oQueFaltaNoProjeto()  de conferir-projeto.gs: diz qual arquivo '
                 'ficou para trás na cópia'),
        ('', '', ''),
        ('OS ARQUIVOS', '', ''),
    ]

    for texto_a, texto_b, texto_c in linhas:
        aba.append([texto_a, texto_b, texto_c])

    cabecalho = aba.max_row + 1
    aba.cell(row=cabecalho, column=1, value='Arquivo')
    aba.cell(row=cabecalho, column=2, value='Linhas')
    aba.cell(row=cabecalho, column=3, value='Onde fica / o que é')
    for coluna in range(1, 4):
        celula = aba.cell(row=cabecalho, column=coluna)
        celula.font = FONTE_TITULO
        celula.fill = PatternFill('solid', fgColor=AZUL)

    for pasta, nome, papel, quantas in inventario:
        aba.append([nome, quantas, pasta + '/  ·  ' + papel])

    for linha in aba.iter_rows(min_row=1, max_row=aba.max_row):
        for celula in linha:
            if celula.font.color is None or celula.font.color.rgb != 'FFFFFFFF':
                if celula.row < cabecalho:
                    ehTitulo = celula.column == 1 and celula.value
                    celula.font = Font(name='Arial', size=11,
                                       bold=bool(ehTitulo), color=CINZA if not ehTitulo else '141F33')
                else:
                    celula.font = Font(name='Arial', size=10)
            celula.alignment = Alignment(vertical='center')

    aba.cell(row=1, column=1).font = Font(name='Arial', size=16, bold=True, color=AZUL)
    aba.cell(row=2, column=1).font = Font(name='Arial', size=11, color=CINZA)
    aba.freeze_panes = 'A' + str(cabecalho + 1)
    return aba


def gerar():
    """
    Gera as DUAS planilhas: a de hoje, com o que mudou marcado, e a de antes.

    Duas, e não uma com abas dobradas: o PO pediu "com e sem as alterações", e
    quem compara código abre os dois arquivos lado a lado. Abas alternadas
    dentro do mesmo arquivo obrigariam a pular de uma para outra o tempo todo.
    """
    planilha = Workbook()
    planilha.remove(planilha.active)

    inventario = []
    for pasta, nome, papel in arquivos_do_codigo():
        quantas = escrever_aba_do_arquivo(planilha, pasta, nome, papel)
        inventario.append((pasta, nome, papel, quantas))

    escrever_leia_me(planilha, inventario)

    os.makedirs(os.path.dirname(DESTINO), exist_ok=True)
    planilha.save(DESTINO)

    gerar_a_de_antes()
    return inventario


def gerar_a_de_antes():
    """
    O código como estava no último commit — a versão SEM as alterações.

    Arquivo que nasceu nesta rodada não entra: ele não existia antes, e uma
    aba vazia diria o contrário. Quem some da lista é justamente o que é novo,
    e o LEIA-ME de lá diz isso.
    """
    planilha = Workbook()
    planilha.remove(planilha.active)

    aviso = planilha.create_sheet(title='LEIA-ME', index=0)
    aviso['A1'] = 'O código ANTES das alterações desta rodada'
    aviso['A1'].font = FONTE_TITULO
    aviso['A1'].fill = PatternFill('solid', fgColor=AZUL)
    aviso['A2'] = ('Esta planilha é o retrato do último commit. Compare com '
                   'PGO-codigo-completo.xlsx, onde o que mudou está marcado '
                   'com * e fundo colorido.')
    aviso['A3'] = ('Arquivos que NASCERAM nesta rodada não aparecem aqui — '
                   'eles não existiam antes.')
    aviso.column_dimensions['A'].width = 110

    quantos = 0
    for pasta, nome, _papel in arquivos_do_codigo():
        conteudo = como_estava_no_commit(pasta + '/' + nome)
        if conteudo is None:
            continue

        aba = planilha.create_sheet(title=nome[:31])
        aba['A1'] = 'Linha'
        aba['B1'] = pasta + '/' + nome + '   (antes das alterações)'
        for celula in (aba['A1'], aba['B1']):
            celula.font = FONTE_TITULO
            celula.fill = PatternFill('solid', fgColor=AZUL)
        aba.row_dimensions[1].height = 22

        for numero, linha in enumerate(conteudo.split('\n'), start=1):
            alvo = aba.cell(row=numero + 1, column=1, value=numero)
            alvo.font = FONTE_NUMERO
            alvo.alignment = Alignment(horizontal='right')
            codigo = aba.cell(row=numero + 1, column=2)
            codigo.value = linha
            codigo.data_type = 's'
            codigo.font = FONTE_CODIGO
            codigo.alignment = Alignment(vertical='top')

        aba.column_dimensions['A'].width = 7
        aba.column_dimensions['B'].width = 120
        aba.freeze_panes = 'A2'
        quantos += 1

    planilha.save(DESTINO_ANTES)
    return quantos


if __name__ == '__main__':
    inventario = gerar()
    total = sum(item[3] for item in inventario)
    print('')
    print('Planilha gerada em ' + DESTINO)
    print('  ' + str(len(inventario) + 1) + ' abas  (LEIA-ME + '
          + str(len(inventario)) + ', uma por arquivo)')
    print('  ' + '{:,}'.format(total).replace(',', '.') + ' linhas de código')
    print('  ' + str(round(os.path.getsize(DESTINO) / 1024)) + ' KB')
    print('')
    print('E a versão SEM as alterações em ' + DESTINO_ANTES)
    print('  ' + str(round(os.path.getsize(DESTINO_ANTES) / 1024)) + ' KB')
    print('')
