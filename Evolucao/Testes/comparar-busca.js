/**
 * ============================================================================
 * PGO — comparar-busca.js · o Buscar Caso dá os MESMOS resultados (Etapa 88, B2)
 * ============================================================================
 *   node Evolucao/Testes/comparar-busca.js [raiz] [--salvar arquivo.json]
 *   node Evolucao/Testes/comparar-busca.js [raiz] --comparar arquivo.json
 *
 * Uma planilha com os formatos difíceis — CPF e CNPJ com e sem pontuação,
 * proposta com hífen, protocolo, SUSEP, nomes com acento, e-mail, data, caso
 * oculto — e uma bateria de termos, procurada como administrador e como quem
 * só vê os próprios casos. Sai, por termo, o que a tela recebe (as origens, os
 * casos e os avisos) e quantas buscas do localizador custou. Rodada na versão
 * de antes (outra `raiz`, uma cópia do repositório) e na de agora, as duas
 * saídas têm de ser iguais nos resultados.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

const TERMOS = [
  'RET-0007', 'ret 0007', '0007', 'Cliente Fictício 21', 'cliente ficticio 21', 'JOÃO ÁVILA', 'joao avila',
  'Ávila', '123.456.789-01', '12345678901', '456.789', '7-0000123', '70000123', '0000123',
  'RET00J', 'ret00j', 'Corretora ABC', 'abc', 'cliente21@exemplo.invalid', 'exemplo.invalid',
  '12.345.678/0001-90', '12345678000190', 'Oculto da Silva', 'Seg Mesa 7', 'VG Assunto 3',
  'zzzznaoexiste', 'naoexiste 999', 'Diego', 'Pendente', '2026',
  // O identificador acha o que a linha toda não acha (letras no meio dos dígitos).
  'cpf 123.456.789-01', 'CNPJ 12345678000190', 'doc 456.789.000-11', 'x0000123',
  // Data, hífen solto, espaço, acento só na busca, termo curto.
  '03/10/2026', '-', '  RET-0007  ', 'Fictício', 'ã', 'R', '7-'
];

function montar(raiz) {
  const { carregar, comoUsuario } = require(path.join(raiz, 'Evolucao', 'Testes', 'ferramentas'));
  const { medidor } = require(path.join(raiz, 'Evolucao', 'Testes', 'simulador'));
  const t = carregar('primeiro.adm@exemplo.com');
  t.chamar('instalarRECC()');
  const operacao = t.chamar('lerRegistros_')('CATALOGO').find((i) => i.Tipo === 'NIVEL_ACESSO' && i.Nome === 'Operação');
  t.chamar('salvarUsuario')({ nome: 'Diego Castilho', email: 'diego@exemplo.com', nivelAcessoId: operacao.Id, canalId: '', ativo: true });
  const ret = [];
  for (let i = 0; i < 400; i++) {
    ret.push({ 'data de recepção do protocolo': new Date(2026, 9, 1 + (i % 28)), status: i % 5 ? 'Pendente' : 'Pago',
      'nome do cliente': i === 50 ? 'João Ávila' : 'Cliente Fictício ' + i, analista: i % 4 ? 'Ana Martins' : 'Diego Castilho',
      protocolo: 'RET-' + String(i).padStart(4, '0'), CPF: i === 60 ? '123.456.789-01' : String(10000000000 + i),
      'e-mail': 'cliente' + i + '@exemplo.invalid', SUSEP: i % 7 ? 'RET0' + (i % 3) + 'A' : 'RET00J',
      'número da proposta': i === 70 ? '7-0000123' : String(i % 9) + '-' + String(1000000 + i).slice(1) });
  }
  ret.push({ 'data de recepção do protocolo': new Date(2026, 9, 3), status: 'Pendente', 'nome do cliente': 'Oculto da Silva',
    analista: 'Ana Martins', protocolo: 'RET-9999', _Visivel: 'NAO' });
  t.chamar('inserirVariosRegistros_')('BASE_RET', ret);
  t.chamar('inserirVariosRegistros_')('BASE_MESA', Array.from({ length: 60 }, (_, i) => ({ Status: 'Em andamento',
    'Nome do segurado': 'Seg Mesa ' + i, Analista: i % 2 ? 'Ana Martins' : 'Diego Castilho', 'Documento (CPF)': i === 5 ? '456.789.000-11' : '',
    SUSEP: i % 4 ? '' : 'RET00J', Corretora: i % 4 ? '' : 'Corretora ABC' })));
  t.chamar('inserirVariosRegistros_')('BASE_VG', Array.from({ length: 40 }, (_, i) => ({ 'TK/Assunto': 'VG Assunto ' + i,
    Status: 'Pendente', Analista: 'Ana Martins', CNPJ: i === 3 ? '12.345.678/0001-90' : '', SUSEP: i === 4 ? 'RET00J' : '' })));
  return { t, comoUsuario, medidor };
}

function procurarTudo(raiz) {
  const { t, comoUsuario, medidor } = montar(raiz);
  const saida = {};
  [['adm', null], ['diego', 'diego@exemplo.com']].forEach(([quem, email]) => {
    TERMOS.forEach((termo) => {
      const fazer = () => {
        medidor.zerar();
        let r; let erro = '';
        try { r = t.chamar('buscarCasos')(termo, [], false); } catch (e) { erro = e.message; }
        const m = medidor.retrato();
        const localizador = m.buscasRapidas;
        return { erro, localizador, celulas: m.celulasLidas, resultado: r ? r.origens.map((o) => ({ nome: o.nome, aviso: o.aviso,
          casos: o.casos.map((c) => String(c.id)).sort() })) : null, total: r ? r.total : null };
      };
      saida[quem + ' · ' + termo] = email ? comoUsuario(t.ambiente, email, fazer) : fazer();
    });
  });
  return saida;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const raiz = args[0] && !args[0].startsWith('--') ? path.resolve(args[0]) : path.join(__dirname, '..', '..');
  const arg = (nome) => { const i = args.indexOf(nome); return i >= 0 ? args[i + 1] : null; };
  const agora = procurarTudo(raiz);
  const salvar = arg('--salvar');
  if (salvar) { fs.writeFileSync(salvar, JSON.stringify(agora, null, 1)); console.log('Guardado em ' + salvar); }
  const comparar = arg('--comparar');
  if (comparar) {
    const antes = JSON.parse(fs.readFileSync(comparar, 'utf8'));
    let diferentes = 0; let localizAntes = 0; let localizAgora = 0; let celAntes = 0; let celAgora = 0; let maisCaras = 0;
    Object.keys(antes).forEach((chave) => {
      const a = antes[chave]; const b = agora[chave];
      localizAntes += a.localizador; localizAgora += b.localizador;
      celAntes += a.celulas || 0; celAgora += b.celulas || 0;
      if (b.localizador > a.localizador || (a.celulas !== undefined && b.celulas > a.celulas)) {
        maisCaras++; console.log('MAIS CARA: ' + chave + ' · localizador ' + a.localizador + ' → ' + b.localizador
          + ' · células ' + a.celulas + ' → ' + b.celulas);
      }
      if (JSON.stringify([a.erro, a.resultado, a.total]) !== JSON.stringify([b.erro, b.resultado, b.total])) {
        diferentes++; console.log('DIFERENTE: ' + chave + '\n  antes ' + JSON.stringify(a.resultado) + '\n  agora ' + JSON.stringify(b.resultado));
      }
    });
    console.log(Object.keys(antes).length + ' buscas · ' + diferentes + ' com resultado diferente · ' + maisCaras
      + ' mais caras · localizador ' + localizAntes + ' → ' + localizAgora + ' · células ' + celAntes + ' → ' + celAgora);
  }
}

module.exports = { procurarTudo, TERMOS };
