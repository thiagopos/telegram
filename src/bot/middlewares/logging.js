import { upsertUser, insertAction } from '../../db/sqlite.js';

export default async function loggingMiddleware(ctx, next) {
  try {
    const from = ctx.from || {};
    // Persist minimal user info and avoid console.log
    if (from && from.id) {
      upsertUser({ id: from.id, first_name: from.first_name, last_name: from.last_name });
    }

    // If the message corresponds to a menu command we record it as an action
    const text = ctx.message && ctx.message.text ? String(ctx.message.text) : null;
    const menuOptions = [
      '📝 Relatório Geral',
      '🚦 Relatório PS',
      '🏥 Ambulatório Hoje',
      '🚑 Emergências 4h',
      '🔍 Validação QR Code',
      '🔢 Buscar por ID',
      'ℹ️ Status Dados',
      '🖥️ Diagnóstico SGHX',
      '🩺 Buscar CID',
    ];
    if (text && menuOptions.includes(text) && from && from.id) {
      insertAction(from.id, text);
    }
  } catch (e) {
    // suppress logging errors to avoid console output
  }

  ctx.processed = false;
  return next();
}
