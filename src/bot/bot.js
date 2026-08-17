import { Telegraf, Markup } from 'telegraf';
import { msgRelatorio, msgNivel, msgAmbulatorio, msgEmergencial, msgStatusDados } from '../services/reportService.js';
import { readQRCodeFromBuffer } from '../services/qrReader.js';
import { downloadFileBuffer } from '../services/telegram.js';
import { buscarSolicitacao, getAtestadoByCodigo, buscarSolicitacaoPorId } from '../db/queries.js';
import { verificarTodos } from '../services/diagnosticoService.js';
import { parseCids, montarRespostaCid, gerarArquivoCids } from '../services/cidService.js';
import loggingMiddleware from './middlewares/logging.js';
import { BOT_TOKEN } from '../config/index.js';

const bot = new Telegraf(BOT_TOKEN);

// Estado de conversa: usuários aguardando entrada de ID
const waitingForId = new Map();

// Estado de conversa: usuários aguardando entrada de CID(s)
const waitingForCid = new Map();

// Estado de conversa: usuários aguardando confirmação de emissão de arquivo por CID
const waitingForCidExport = new Map();

// Middleware para registrar mensagens
bot.use(loggingMiddleware);

// Manipulador de comando /start
bot.start((ctx) => {
  return ctx.reply(
    'Selecione uma das opções no menu',
    Markup.keyboard([
      ['📝 Relatório Geral',   '🚦 Relatório PS'],
      ['🏥 Ambulatório Hoje',  '🚑 Emergências 4h'],
      ['🔍 Validação QR Code', '🔢 Buscar por ID'],
      ['ℹ️ Status Dados',       '🖥️ Diagnóstico SGHX'],
      ['🩺 Buscar CID'],
    ]).resize()
  );
});

// Manipuladores de mensagens para cada opção do botão
bot.hears('📝 Relatório Geral', async (ctx) => {
  ctx.processed = true;
  const resposta = await msgRelatorio();
  return ctx.reply(resposta, {
    parse_mode: 'HTML',
  });
});

bot.hears('🚦 Relatório PS', async (ctx) => {
  ctx.processed = true;
  const resposta = await msgNivel();
  return ctx.reply(resposta, {
    parse_mode: 'HTML',
  });
});

bot.hears('🔍 Validação QR Code', async (ctx) => {
  ctx.processed = true;
  const resposta = `Envie uma imagem onde seja possível visualizar o <strong><i>QRCODE</i></strong> claramente.`;
  return ctx.reply(resposta, {
    parse_mode: 'HTML',
  });
});

bot.hears('🏥 Ambulatório Hoje', async (ctx) => {
  ctx.processed = true;
  const resposta = await msgAmbulatorio();
  return ctx.reply(resposta, { parse_mode: 'HTML' });
});

bot.hears('🚑 Emergências 4h', async (ctx) => {
  ctx.processed = true;
  const resposta = await msgEmergencial();
  return ctx.reply(resposta, { parse_mode: 'HTML' });
});

bot.hears('ℹ️ Status Dados', async (ctx) => {
  ctx.processed = true;
  const resposta = await msgStatusDados();
  return ctx.reply(resposta, { parse_mode: 'HTML' });
});

bot.hears('🖥️ Diagnóstico SGHX', async (ctx) => {
  ctx.processed = true;
  const resultados = await verificarTodos();
  let resposta = `🖥️ <b>Diagnóstico — Sistemas</b>\n\n`;
  resultados.forEach((r) => {
    if (r.acessivel) {
      resposta += `🟢 ${r.nome}: OK (${r.latencia}ms)\n`;
    } else {
      resposta += `🔴 ${r.nome}: INACESSÍVEL (${r.erro})\n`;
    }
  });
  return ctx.reply(resposta, { parse_mode: 'HTML' });
});

bot.hears('🔢 Buscar por ID', async (ctx) => {
  ctx.processed = true;
  waitingForId.set(ctx.from.id, true);
  return ctx.reply('Digite o ID do pedido:');
});

bot.hears('🩺 Buscar CID', async (ctx) => {
  ctx.processed = true;
  waitingForCid.set(ctx.from.id, true);
  return ctx.reply(
    'Envie um ou mais <b>CIDs</b> separados por vírgula.\n\n' +
    'Exemplos: <code>A15.3, X99.9, J18.9</code>\n' +
    '<i>CIDs começam com letra e podem ter ponto (A15.3) ou não (I64).</i>',
    { parse_mode: 'HTML' }
  );
});

// helper para formatar datas em dd/mm/aaaa hh:mm
function formatDateTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d)) return value; // fallback
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Listener de mensagens: processa fotos para leitura de QR code e ignora textos comuns
bot.on('message', async (ctx) => {
  if (!ctx.processed) {
    if (ctx.message.photo) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id;
      const fileUrl = await bot.telegram.getFileLink(fileId);

      const buffer = await downloadFileBuffer(fileUrl.href || fileUrl);

      try {
        const qrCodeValue = await readQRCodeFromBuffer(buffer);
        if (qrCodeValue) {
          const dados = await buscarSolicitacao(qrCodeValue);

          let validacao = 'Nenhum registro localizado.';

          if (dados && dados.tipo_solicitacao) {
            const isAtestado = dados.tipo_solicitacao && dados.tipo_solicitacao.toUpperCase() === 'ATESTADO MÉDICO';

            // Montagem condicional: só adiciona campos quando existirem
            const parts = [];
            if (dados.tipo_solicitacao) parts.push(`<strong>🧾${dados.tipo_solicitacao}</strong>`);
            if (dados.desc_status) {
              const statusIcon = dados.desc_status === 'CANCELADA' ? '🔴' : '🟢';
              parts.push(`<strong>${statusIcon} Status:</strong> ${dados.desc_status}`);
            }
            if (dados.paciente_doc_rh) parts.push(`<strong>🆔 RH:</strong> ${dados.paciente_doc_rh}`);
            if (dados.paciente_nome_completo) parts.push(`<strong>👤 Paciente:</strong> ${dados.paciente_nome_completo}`);

            // Adiciona o local (internação) somente se não for atestado e existir informação
            if (!isAtestado && (dados.desc_clinica || dados.desc_leito)) {
              const local = `${dados.desc_clinica || ''} ${dados.desc_leito || ''}`.trim();
              if (local) parts.push(`<strong>📍 Local:</strong> ${local}`);
            }

            if (dados.dt_cadastro) parts.push(`<strong>📅 Data da solicitação:</strong> ${dados.dt_cadastro}`);
            if (dados.solicitado_por) parts.push(`<strong>🙋 Solicitado por:</strong> ${dados.solicitado_por}`);

            // Combine parts with separadores de linha
            validacao = parts.join('\n\n');

            // If it's an atestado, fetch extra details
            if (isAtestado) {
              try {
                const atestado = await getAtestadoByCodigo(qrCodeValue);
                if (atestado) {
                  let atestadoMsg = `\n\n`;
                  if (atestado.motivo_atestado) atestadoMsg += `<strong>📝 Motivo:</strong> ${atestado.motivo_atestado}\n\n`;
                  if (atestado.dias_afastado) atestadoMsg += `<strong>⏳ Dias afastado:</strong> ${atestado.dias_afastado}\n\n`;
                  if (atestado.cod_cid) atestadoMsg += `<strong>🆔 Cod CID:</strong> ${atestado.cod_cid}\n\n`;          

                  if (atestado.nome_acompanhante) atestadoMsg += `<strong>👥 Nome acompanhante:</strong> ${atestado.nome_acompanhante}\n`;
                  if (atestado.cpf_acompanhante) atestadoMsg += `<strong>🧾 CPF acompanhante:</strong> ${atestado.cpf_acompanhante}\n`;
                  if (atestado.desc_observacao) atestadoMsg += `<strong>💬 Observação:</strong> ${atestado.desc_observacao}\n`;

                  validacao += atestadoMsg;
                }
              } catch (err) {
                console.error('Erro ao buscar atestado:', err);
              }
            }
          }

          return ctx.reply(validacao, {
            parse_mode: 'HTML',
          });
        } else {
          return ctx.reply('Não foi possível ler um QR Code válido na imagem. Por favor, envie uma nova imagem.');
        }
      } catch (err) {
        console.error(err);
        return ctx.reply('Não foi possível ler um QR Code válido na imagem. Por favor, envie uma nova imagem.');
      }
    } else if (ctx.message.text) {
      const userId = ctx.from.id;

      if (waitingForCid.get(userId)) {
        const texto = ctx.message.text.trim();
        const { cids, invalidos } = parseCids(texto);

        // Rejeita a entrada inteira se houver QUALQUER item inválido
        // (ex.: "X99,9" → o item "9" é inválido; o usuário queria dizer "X99.9")
        if (cids.length === 0 || invalidos.length > 0) {
          waitingForCid.delete(userId);
          waitingForCidExport.delete(userId);
          const motivo = invalidos.length > 0
            ? 'Um ou mais itens não estão no formato de CID válido.'
            : 'Nenhum CID válido identificado.';
          return ctx.reply(
            '❌ ' + motivo + '\n' +
            'Formato esperado: <b>letra + 2 dígitos</b>, com ponto opcional (ex.: <code>A15.3</code>, <code>I64</code>).\n' +
            'A vírgula separa CIDs e a subcategoria usa ponto (ex.: <code>X99.9</code>, não <code>X99,9</code>).\n' +
            (invalidos.length ? 'Inválidos: <code>' + invalidos.join(', ') + '</code>\n' : '') +
            'Operação cancelada.',
            { parse_mode: 'HTML' }
          );
        }

        waitingForCid.delete(userId);
        waitingForCidExport.delete(userId);

        const { mensagem, totalRegistros, dataFiltro } = await montarRespostaCid(cids);
        await ctx.reply(mensagem, { parse_mode: 'HTML' });

        if (totalRegistros <= 0) {
          return ctx.reply('Não há registros com os CIDs informados. Nenhum arquivo será emitido.');
        }

        waitingForCidExport.set(userId, { cids, dataFiltro });
        return ctx.reply(
          '📄 Deseja emitir um arquivo com os dados completos dos pacientes com esses CIDs?',
          Markup.inlineKeyboard([
            Markup.button.callback('✅ Sim', 'cid_export_yes'),
            Markup.button.callback('❌ Não', 'cid_export_no'),
          ])
        );
      }

      if (waitingForId.get(userId)) {
        const texto = ctx.message.text.trim();

        if (!/^\d+$/.test(texto) || texto.length > 10) {
          waitingForId.delete(userId);
          return ctx.reply('ID inválido. O ID deve conter apenas números (até 10 dígitos). Operação cancelada.');
        }

        waitingForId.delete(userId);
        const id = parseInt(texto, 10);
        const dados = await buscarSolicitacaoPorId(id);

        if (!dados || !dados.tipo_solicitacao) {
          return ctx.reply('Nenhum registro localizado para o ID informado.');
        }

        const isAtestado = dados.tipo_solicitacao.toUpperCase() === 'ATESTADO MÉDICO';
        const parts = [];
        if (dados.tipo_solicitacao) parts.push(`<strong>🧾 ${dados.tipo_solicitacao}</strong>`);
        if (dados.desc_status) {
          const statusIcon = dados.desc_status === 'CANCELADA' ? '🔴' : '🟢';
          parts.push(`<strong>${statusIcon} Status:</strong> ${dados.desc_status}`);
        }
        if (dados.paciente_doc_rh) parts.push(`<strong>🆔 RH:</strong> ${dados.paciente_doc_rh}`);
        if (dados.paciente_nome_completo) parts.push(`<strong>👤 Paciente:</strong> ${dados.paciente_nome_completo}`);
        if (!isAtestado && (dados.desc_clinica || dados.desc_leito)) {
          const local = `${dados.desc_clinica || ''} ${dados.desc_leito || ''}`.trim();
          if (local) parts.push(`<strong>📍 Local:</strong> ${local}`);
        }
        if (dados.dt_cadastro) parts.push(`<strong>📅 Data da solicitação:</strong> ${dados.dt_cadastro}`);
        if (dados.solicitado_por) parts.push(`<strong>🙋 Solicitado por:</strong> ${dados.solicitado_por}`);

        let validacao = parts.join('\n\n');

        if (isAtestado && dados.codigo_uuid) {
          try {
            const atestado = await getAtestadoByCodigo(dados.codigo_uuid);
            if (atestado) {
              let atestadoMsg = `\n\n`;
              if (atestado.motivo_atestado) atestadoMsg += `<strong>📝 Motivo:</strong> ${atestado.motivo_atestado}\n\n`;
              if (atestado.dias_afastado) atestadoMsg += `<strong>⏳ Dias afastado:</strong> ${atestado.dias_afastado}\n\n`;
              if (atestado.cod_cid) atestadoMsg += `<strong>🆔 Cod CID:</strong> ${atestado.cod_cid}\n\n`;
              if (atestado.nome_acompanhante) atestadoMsg += `<strong>👥 Nome acompanhante:</strong> ${atestado.nome_acompanhante}\n`;
              if (atestado.cpf_acompanhante) atestadoMsg += `<strong>🧾 CPF acompanhante:</strong> ${atestado.cpf_acompanhante}\n`;
              if (atestado.desc_observacao) atestadoMsg += `<strong>💬 Observação:</strong> ${atestado.desc_observacao}\n`;
              validacao += atestadoMsg;
            }
          } catch (err) {
            console.error('Erro ao buscar atestado por ID:', err);
          }
        }

        return ctx.reply(validacao, { parse_mode: 'HTML' });
      }

      return ctx.reply('Por favor, use o menu para acessar as funcionalidades.');
    }
  }
});

// Callback do teclado inline: confirmação de emissão de arquivo por CID
bot.on('callback_query', async (ctx) => {
  const userId = ctx.from && ctx.from.id;
  const data = ctx.callbackQuery && ctx.callbackQuery.data;
  const pending = userId ? waitingForCidExport.get(userId) : null;

  if (data === 'cid_export_yes') {
    if (pending) waitingForCidExport.delete(userId);
    await ctx.answerCbQuery('Gerando arquivo...');
    if (!pending) return ctx.reply('Sessão expirada. Faça uma nova busca por CID.');

    try {
      const buffer = await gerarArquivoCids(pending.cids, pending.dataFiltro);
      if (!buffer) {
        return ctx.reply('Nenhum dado encontrado para gerar o arquivo.');
      }

      const agora = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const nomeArquivo = `pacientes_por_cid_${agora.getFullYear()}${pad(agora.getMonth() + 1)}${pad(agora.getDate())}_${pad(agora.getHours())}${pad(agora.getMinutes())}.csv`;

      await ctx.replyWithDocument({ source: buffer, filename: nomeArquivo });
      return ctx.reply('✅ Arquivo emitido com sucesso.');
    } catch (err) {
      console.error('Erro ao gerar arquivo por CID:', err);
      return ctx.reply('❌ Erro ao gerar o arquivo. Tente novamente.');
    }
  }

  if (data === 'cid_export_no') {
    if (pending) waitingForCidExport.delete(userId);
    await ctx.answerCbQuery();
    return ctx.reply('Ok, nenhum arquivo será emitido. Operação finalizada.');
  }

  return ctx.answerCbQuery();
});

export default bot;
