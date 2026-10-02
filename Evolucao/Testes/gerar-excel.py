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
UM AVISO QUE PRECISA ESTAR AQUI E NA PRIMEIRA ABA
----------------------------------------------------------------------------
Excel NÃO é bom transporte de código. Copiar uma coluna de volta para o Apps
Script costuma trazer o que o Excel achou que era melhor: aspas retas viram
curvas, uma linha em branco some, o recuo se perde. Para INSTALAR, o caminho
é `Evolucao/pacote/` — três arquivos de texto, prontos para colar.

Esta planilha serve para LER, revisar e comparar. É para isso que ela é boa.
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


def escrever_aba_para_colar(planilha, ordem, nome, comoChamarNoAppsScript):
    """
    Uma aba por arquivo DO PACOTE, pronta para copiar e colar no Apps Script.

    POR QUE ELAS EXISTEM. O PO instala copiando do Excel — é o transporte
    dele. Mas as abas por arquivo-fonte são VINTE, e colar vinte vezes é vinte
    chances de pular uma, inverter duas ou errar um nome. O pacote junta tudo
    em três arquivos; estas abas põem esses três DENTRO do Excel que ele já
    baixa, e a conta cai de vinte colagens para três.

    A coluna A tem SÓ o código, da primeira linha à última, sem número de
    linha ao lado. É de propósito: a pessoa clica no cabeçalho da coluna A,
    copia, e o que vai para a área de transferência é o arquivo inteiro e nada
    mais. Com o número na coluna de ao lado, selecionar a coluna errada — ou
    as duas — colaria lixo no projeto.

    O recado fica na coluna B, longe do que vai ser copiado.
    """
    # `ordem - 1` porque o LEIA-ME ainda não existe: ele é criado por último,
    # no índice 0, e empurra estas três para 1, 2 e 3. Criando-as já em 1, 2 e
    # 3, a primeira aba de leitura ficava na frente delas.
    titulo = ('%d · COLAR %s' % (ordem, nome))[:31]
    aba = planilha.create_sheet(title=titulo, index=ordem - 1)

    caminho = os.path.join(RAIZ, 'Evolucao', 'pacote', nome)
    with open(caminho, encoding='utf-8') as arquivo:
        linhas = arquivo.read().split('\n')

    for numero, conteudo in enumerate(linhas, start=1):
        celula = aba.cell(row=numero, column=1)
        celula.value = conteudo
        celula.data_type = 's'
        celula.font = FONTE_CODIGO
        celula.alignment = Alignment(vertical='top')

    recado = aba.cell(row=1, column=2)
    recado.value = ('PASSO ' + str(ordem) + ' de 3 — clique no cabeçalho da '
                    'COLUNA A, copie, e cole no Apps Script num arquivo '
                    'chamado "' + comoChamarNoAppsScript + '" (sem extensão, '
                    'com as maiúsculas iguais). Não copie esta coluna B.')
    recado.font = FONTE_TITULO
    recado.fill = PatternFill('solid', fgColor=AZUL)
    recado.alignment = Alignment(vertical='center', wrap_text=True)

    aba.column_dimensions['A'].width = 110
    aba.column_dimensions['B'].width = 60
    aba.row_dimensions[1].height = 46
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
        ('PARA INSTALAR OU ATUALIZAR: AS TRÊS PRIMEIRAS ABAS', '', ''),
        ('', '', 'As abas 1, 2 e 3 são o sistema inteiro, já juntado em três '
                 'arquivos. Em cada uma:'),
        ('', '', '   clique no cabeçalho da COLUNA A, copie, e cole no Apps '
                 'Script.'),
        ('', '', ''),
        ('', '', '   1 · COLAR Codigo.gs       ->  arquivo .gs chamado "Codigo"'),
        ('', '', '   2 · COLAR Index.html      ->  arquivo HTML chamado "Index"'),
        ('', '', '   3 · COLAR SemAcesso.html  ->  arquivo HTML chamado "SemAcesso"'),
        ('', '', ''),
        ('', '', 'No Apps Script o arquivo se chama "Index", e não "Index.html": sem '
                 'extensão, sem acento,'),
        ('', '', 'com as maiúsculas iguais.'),
        ('', '', ''),
        ('', '', 'As outras abas são UMA POR ARQUIVO-FONTE, para ler e revisar. Dá '
                 'para instalar por elas'),
        ('', '', 'também — são vinte colagens em vez de três, e vinte chances de '
                 'pular uma.'),
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

    # As três abas de COLAR vêm ANTES das de leitura, logo depois do LEIA-ME:
    # é o que a pessoa faz primeiro ao abrir o arquivo.
    for ordem, (nome, noAppsScript) in enumerate(
            [('Codigo.gs', 'Codigo'), ('Index.html', 'Index'),
             ('SemAcesso.html', 'SemAcesso')], start=1):
        escrever_aba_para_colar(planilha, ordem, nome, noAppsScript)

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
    print('  ' + str(len(inventario) + 4) + ' abas  (LEIA-ME + 3 de COLAR + '
          + str(len(inventario)) + ' de leitura)')
    print('  ' + '{:,}'.format(total).replace(',', '.') + ' linhas de código')
    print('  ' + str(round(os.path.getsize(DESTINO) / 1024)) + ' KB')
    print('')
    print('E a versão SEM as alterações em ' + DESTINO_ANTES)
    print('  ' + str(round(os.path.getsize(DESTINO_ANTES) / 1024)) + ' KB')
    print('')
