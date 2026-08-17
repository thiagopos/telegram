import { getCidStats, getCidDetalhes, CID_DATA_INICIO } from '../db/queries.js';

// Regex CID-10: letra + 2 dígitos, com ponto opcional (ex.: A15.3, I64, S06)
const CID_REGEX = /^[A-Za-z]\d{2}(\.\d{1,2})?$/;

const COLUNAS = ['cod_cid', 'doc_rh', 'dt_entrada', 'desc_especialidade', 'desc_clinica', 'idade', 'sexo'];

// Se o total de registros encontrados ultrapassar este limite,
// a busca é restringida aos últimos 3 meses (o usuário é informado)
const LIMITE_REGISTROS = 1000;

function dataUltimosTresMeses() {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatarData(dataISO) {
  if (!dataISO) return '';
  const [a, m, d] = String(dataISO).split('-');
  return `${d}/${m}/${a}`;
}

function somarTotal(rows) {
  return (rows || []).reduce((acc, r) => acc + (Number(r.total_registros) || 0), 0);
}

/**
 * Interpreta a entrada do usuário: um ou mais CIDs separados por vírgula.
 * Exemplos válidos: "A15.3", "I64, S06", "A15.3, X99.9, J18.9".
 * "X99,9" é inválido (a separação decimal é ponto, não vírgula).
 */
export function parseCids(texto) {
  const partes = String(texto || '')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const cids = [];
  const invalidos = [];

  for (const parte of partes) {
    const candidato = parte.toUpperCase();
    if (CID_REGEX.test(candidato)) {
      if (!cids.includes(candidato)) cids.push(candidato);
    } else {
      invalidos.push(parte);
    }
  }

  return { cids, invalidos };
}

function formatDateTime(value) {
  if (!value) return '';
  // Já formatado pelo SQL (DATE_FORMAT) — passa direto
  if (typeof value === 'string') return value;
  const d = new Date(value);
  if (isNaN(d)) return String(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function escapeCsv(valor) {
  const s = valor === null || valor === undefined ? '' : String(valor);
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Monta o CSV (separador ';', com BOM para Excel) a partir das linhas de detalhes. */
export function montarCsv(rows) {
  const linhas = [COLUNAS.join(';')];
  for (const r of rows) {
    linhas.push(
      [r.cod_cid, r.doc_rh, formatDateTime(r.dt_entrada), r.desc_especialidade, r.desc_clinica, r.idade, r.sexo]
        .map(escapeCsv)
        .join(';')
    );
  }
  return '\uFEFF' + linhas.join('\r\n');
}

/**
 * Monta a mensagem de estatísticas por CID.
 * Janela padrão: 2026 em diante. Se o total de registros ultrapassar
 * LIMITE_REGISTROS, a busca é restringida aos últimos 3 meses e o usuário é informado.
 * Retorna a mensagem, o total de registros e a data de início efetivamente usada.
 */
export async function montarRespostaCid(cids) {
  let dataFiltro = CID_DATA_INICIO;
  let periodoCurto = 'desde 2026';
  let periodoRodape = '2026 em diante';
  let aviso = null;

  let rows = await getCidStats(cids, dataFiltro);
  let totalRegistros = somarTotal(rows);

  // Lista enorme? Restringe aos últimos 3 meses e informa o usuário
  if (totalRegistros > LIMITE_REGISTROS) {
    dataFiltro = dataUltimosTresMeses();
    periodoCurto = 'últimos 3 meses';
    periodoRodape = `últimos 3 meses (desde ${formatarData(dataFiltro)})`;
    aviso = `⚠️ Muitos registros (${totalRegistros}) desde 2026. Lista limitada aos últimos 3 meses (desde ${formatarData(dataFiltro)}).`;
    rows = await getCidStats(cids, dataFiltro);
    totalRegistros = somarTotal(rows);
  }

  const porCid = new Map((rows || []).map((r) => [r.cod_cid, r]));
  let mensagem = '🩺 <b>Busca por CID</b>\n\n';

  for (const cid of cids) {
    const r = porCid.get(cid);
    if (!r) {
      mensagem += `<b>${cid}</b>\n⚠️ Nenhum registro localizado com o CID ${cid} (${periodoCurto}).\n\n`;
      continue;
    }
    mensagem += `<b>${cid}</b>\n`;
    mensagem += `🏥 Internados: <b>${r.internados}</b>\n`;
    mensagem += `📚 Total no banco: <b>${r.total_registros}</b> registros (${r.total_pacientes} pacientes distintos)\n\n`;
  }

  if (aviso) mensagem += aviso + '\n\n';
  mensagem += `🔎 <i>Período: ${periodoRodape}</i>`;
  return { mensagem, totalRegistros, dataFiltro };
}

/** Gera o Buffer CSV com os dados completos dos pacientes com os CIDs na janela informada. Retorna null se não houver dados. */
export async function gerarArquivoCids(cids, dataInicio) {
  const rows = await getCidDetalhes(cids, dataInicio);
  if (!rows || rows.length === 0) return null;
  return Buffer.from(montarCsv(rows), 'utf8');
}
