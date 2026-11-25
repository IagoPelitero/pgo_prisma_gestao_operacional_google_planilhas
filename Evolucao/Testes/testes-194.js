/**
 * ============================================================================
 * PGO — testes-194.js · a descrição dos canais (Etapa 94)
 * ============================================================================
 * Pedido do PO: embaixo do nome de cada canal, "Retenção de clientes do VI"
 * (RET), "Atendimento aos corretores de elite" (Mesa) e "Piloto de retenção
 * Vida Empresarial" (VG). A instalação nova já nasce assim; a planilha em uso
 * troca no atualizarPGO — só a descrição que ainda é a antiga.
 * ============================================================================
 */

const { secao, teste, igual, contem, carregar } = require('./ferramentas');

const NOVAS = { BASE_RET: 'Retenção de clientes do VI', BASE_MESA: 'Atendimento aos corretores de elite',
  BASE_VG: 'Piloto de retenção Vida Empresarial' };

function instalado() {
  const { chamar } = carregar('primeiro.adm@exemplo.com');
  chamar('instalarRECC()');
  const descricoes = () => {
    const porAba = {};
    chamar('lerRegistros_')('CANAIS').forEach((c) => { porAba[c.Aba] = String(c.Descricao); });
    return porAba;
  };
  const gravar = (aba, texto) => {
    const canal = chamar('lerRegistros_')('CANAIS').find((c) => c.Aba === aba);
    chamar('atualizarRegistro_')('CANAIS', canal.Id, { Descricao: texto });
    chamar('esquecerCacheDaConfiguracao_()');
  };
  const migrar = () => {
    const pulados = []; const paraVoce = [];
    const feito = chamar('trocarAsDescricoesDosCanais_')(pulados, paraVoce);
    chamar('esquecerCacheDaConfiguracao_()');
    return { feito: feito.join(' | '), paraVoce: paraVoce.join(' | ') };
  };
  return { chamar, descricoes, gravar, migrar };
}

function rodarTestesDa194() {
  console.log('\nEtapa 94: a descrição dos canais');
  secao('Instalação nova e planilha em uso');

  teste('a instalação nova já nasce com as descrições do PO', () => {
    const t = instalado();
    const d = t.descricoes();
    Object.keys(NOVAS).forEach((aba) => igual(d[aba], NOVAS[aba], aba));
  });

  teste('o seletor de canal recebe a descrição nova', () => {
    const t = instalado();
    const ret = t.chamar('canaisVisiveis_()').find((c) => c.aba === 'BASE_RET');
    igual(ret.descricao, 'Retenção de clientes do VI');
  });

  teste('a planilha em uso (com as antigas) troca as três no atualizarPGO', () => {
    const t = instalado();
    t.gravar('BASE_RET', 'Relacionamento estratégico de clientes');
    t.gravar('BASE_MESA', 'Atendimento a casos prioritários');
    t.gravar('BASE_VG', 'Vida em Grupo');
    const r = t.migrar();
    contem(r.feito, 'Retenção de clientes do VI');
    const d = t.descricoes();
    Object.keys(NOVAS).forEach((aba) => igual(d[aba], NOVAS[aba], aba));
    igual(r.paraVoce, '');
  });

  teste('a vazia também ganha a nova', () => {
    const t = instalado();
    t.gravar('BASE_VG', '');
    t.migrar();
    igual(t.descricoes().BASE_VG, NOVAS.BASE_VG);
  });

  teste('a que alguém mudou em Configurações fica como está, com aviso', () => {
    const t = instalado();
    t.gravar('BASE_MESA', 'Mesa do Diamante — texto meu');
    const r = t.migrar();
    igual(t.descricoes().BASE_MESA, 'Mesa do Diamante — texto meu');
    contem(r.paraVoce, 'NÃO foi trocada');
  });

  teste('rodar de novo não faz nada', () => {
    const t = instalado();
    t.gravar('BASE_RET', 'Relacionamento estratégico de clientes');
    t.migrar();
    const segunda = t.migrar();
    igual(segunda.feito, '');
    igual(segunda.paraVoce, '');
  });
}

module.exports = { rodarTestesDa194 };
