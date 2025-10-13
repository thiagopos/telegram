import { getRelatorio } from '../db/queries.js';
import { getPSAdmissoes } from '../db/queries.js';

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

export { msgRelatorio, msgNivel };
