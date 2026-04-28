import axios from 'axios';

const TIMEOUT_MS = 5000;

const SISTEMAS = [
  { nome: 'SGHX',               url: 'http://hmacn-sghx.saude.sp/' },
  { nome: 'Simeon Hospital',    url: 'http://smshmacn397:3000/sistema' },
  { nome: 'Impressoras',        url: 'http://smshmacn369:5000/' },
  { nome: 'Simeon Recepção',    url: 'http://smshmacn397/_recepcao' },
  { nome: 'Simeon Histórico',   url: 'http://smshmacn369:3000/' },
  { nome: 'Biodados',           url: 'http://smshmacn397:4000/' },
];

async function verificarSistema({ nome, url }) {
  const inicio = Date.now();
  try {
    await axios.get(url, {
      timeout: TIMEOUT_MS,
      maxRedirects: 3,
      validateStatus: () => true,
    });
    return { nome, acessivel: true, latencia: Date.now() - inicio };
  } catch (err) {
    return { nome, acessivel: false, erro: err.code || 'ERRO_DESCONHECIDO' };
  }
}

export async function verificarTodos() {
  return Promise.all(SISTEMAS.map(verificarSistema));
}
