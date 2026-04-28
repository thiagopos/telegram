import { getRelatorio, getPSAdmissoes, getAmbulatorioHoje, getEmergenciais4h, getUltimaAtualizacao } from '../db/queries.js';

async function msgRelatorio() {
  const relatorio = await getRelatorio();
  let mensagem = `<strong>Relatório BETA</strong>\n\n`;

  relatorio.forEach((rel) => {
    mensagem += `<b>${rel.desc_clinica_mapped}</b>: <i>${
      rel.taxa_ocup !== null ? rel.total + " - " + rel.taxa_ocup + "%" : rel.total
    }</i>\n`;

    if (
      rel.desc_clinica_mapped === "Obs. Pediátrica" ||
      rel.desc_clinica_mapped === "Centro Cirúrgico" ||
      rel.desc_clinica_mapped === "Clínica Geral"
    )
      mensagem += "\n";
  });

  mensagem += '‎'

  return mensagem;
}

async function msgNivel() {
  const relatorio = await getRelatorio();
  let mensagem = `<strong>Relatório BETA</strong>\n\n`;

  let psQnd = relatorio.slice(0, 7).reduce((a, b) => a + b.total, 0);

  let psPer = Math.round((psQnd * 100) / 52);

  mensagem += `<i>Total internados PS:</i> <strong>${psQnd} - ${psPer}%</strong>\n`;

  psQnd = relatorio.slice(0, 6).reduce((a, b) => a + b.total, 0);

  if (psQnd <= 52) mensagem += "\n🟢 <strong>Rotina</strong>\n\n";
  if (psQnd >= 53 && psQnd <= 62) mensagem += "\n🟡 <strong>Nível 1</strong>\n\n";
  if (psQnd >= 63 && psQnd <= 72) mensagem += "\n🟠 <strong>Nível 2</strong>\n\n";
  if (psQnd >= 73) mensagem += "\n🔴 <strong>Nível 3</strong>\n";

  const psAdmissao = await getPSAdmissoes(); 

  mensagem+= 
  `
  Dados exclusivos do pronto-socorro:

  <strong>Admitidos hoje:</strong> ${psAdmissao[0].admitidos_ps}
  <strong>Altas hoje:</strong> ${psAdmissao[0].altas_ps}
  <strong>Admitidos ontem:</strong> ${psAdmissao[0].admitidos_ontem_ps}
  <strong>Altas ontem:</strong> ${psAdmissao[0].altas_ontem_ps}
  ‎
  `

  return mensagem;
}

export { msgRelatorio, msgNivel, msgAmbulatorio, msgEmergencial, msgStatusDados };

async function msgAmbulatorio() {
  const dados = await getAmbulatorioHoje();
  if (!dados || dados.length === 0) {
    return '🏥 <b>Ambulatório — Consultas do Dia</b>\n\nNenhuma consulta registrada para hoje.';
  }

  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR');

  let mensagem = `🏥 <b>Ambulatório — Consultas do Dia</b>\n<i>Data: ${dataFormatada}</i>\n\n`;

  const total = dados.reduce((acc, row) => acc + row.total, 0);

  dados.forEach((row) => {
    mensagem += `${row.desc_especialidade}: ${row.total}\n`;
  });

  mensagem += `___\n<b>Total geral:</b> ${total}`;

  return mensagem;
}

async function msgEmergencial() {
  const dados = await getEmergenciais4h();
  if (!dados) {
    return '🚨 <b>Emergências — Últimas 4 horas</b>\n\nErro ao buscar dados.';
  }

  const { porGravidade, porEspecialidade } = dados;

  const agora = new Date();
  const inicio = new Date(agora.getTime() - 4 * 60 * 60 * 1000);
  const fmt = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  const icones = {
    'EMERGENCIA': '🔴',
    'MUITO URGENTE': '🟠',
    'URGENTE': '🟡',
    'POUCO URGENTE': '🟢',
    'NAO URGENTE': '🔵',
    'BRANCO': '⚪',
  };

  const labels = {
    'EMERGENCIA': 'EMERGÊNCIA',
    'MUITO URGENTE': 'MUITO URGENTE',
    'URGENTE': 'URGENTE',
    'POUCO URGENTE': 'POUCO URGENTE',
    'NAO URGENTE': 'NÃO URGENTE',
    'BRANCO': 'BRANCO',
  };

  let mensagem = `🚨 <b>Emergências — Últimas 4 horas</b>\n<i>De: ${fmt(inicio)}  Até: ${fmt(agora)}</i>\n<i>(A = em atendimento, C = concluído)</i>\n\n`;

  let totalGeral = 0;
  let totalEmAndamento = 0;
  let totalConcluidos = 0;

  porGravidade.forEach((row) => {
    const icone = icones[row.gravidade] || '⚫';
    const label = labels[row.gravidade] || row.gravidade;
    mensagem += `${icone} ${label}: ${row.total} (A${row.em_atendimento} C${row.atendidos})\n`;
    totalGeral += row.total;
    totalEmAndamento += Number(row.em_atendimento);
    totalConcluidos += Number(row.atendidos);
  });

  mensagem += `___\n<b>Total:</b> ${totalGeral}  |  A${totalEmAndamento} C${totalConcluidos}`;

  if (porEspecialidade && porEspecialidade.length > 0) {
    mensagem += `\n\n<b>Por Especialidade (top 5):</b>\n`;
    porEspecialidade.forEach((row) => {
      mensagem += `${row.desc_especialidade}: ${row.total}\n`;
    });
  }

  return mensagem;
}

async function msgStatusDados() {
  const dados = await getUltimaAtualizacao();
  if (!dados || dados.length === 0) {
    return 'ℹ️ <b>Última atualização dos dados</b>\n\nNão foi possível obter informações.';
  }

  const agora = new Date();
  const dataHoje = agora.toLocaleDateString('pt-BR');

  function tempoRelativo(dt) {
    if (!dt) return 'desconhecido';
    const diff = Math.floor((agora - new Date(dt)) / 1000 / 60);
    if (diff < 1) return 'há menos de 1 min';
    if (diff === 1) return 'há 1 min';
    if (diff < 60) return `há ${diff} min`;
    const horas = Math.floor(diff / 60);
    if (horas === 1) return 'há 1 hora';
    return `há ${horas} horas`;
  }

  let mensagem = `ℹ️ <b>Última atualização dos dados</b>\n<i>${dataHoje}</i>\n\n`;

  let minDiff = Infinity;

  dados.forEach((row) => {
    const tempo = tempoRelativo(row.ultima_atualizacao);
    mensagem += `${row.origem}: ${tempo}\n`;

    if (row.ultima_atualizacao) {
      const diff = Math.floor((agora - new Date(row.ultima_atualizacao)) / 1000 / 60);
      if (diff < minDiff) minDiff = diff;
    }
  });

  mensagem += '\n';
  if (minDiff < 15) {
    mensagem += '🟢 Sistema SGHX: <b>dados recentes</b>';
  } else if (minDiff < 60) {
    mensagem += '🟡 Sistema SGHX: <b>dados com atraso</b>';
  } else {
    mensagem += '🔴 Sistema SGHX: <b>dados desatualizados</b>';
  }

  return mensagem;
}
