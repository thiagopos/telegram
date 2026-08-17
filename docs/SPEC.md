# Especificação do Projeto — Telegram Bot SGHX

**Versão:** 2.0 (planejamento de atualizações)
**Data:** Abril de 2026
**Repositório:** `FASE5/telegram`

---

## 1. Visão Geral

Bot Telegram desenvolvido em Node.js (ESM) com Telegraf, integrado ao banco de dados MySQL do sistema hospitalar SGHX. Fornece ao time de saúde acesso rápido a informações operacionais via chat, sem necessidade de acessar o sistema web diretamente.

### 1.1 Tecnologias Principais

| Componente | Tecnologia |
|---|---|
| Runtime | Node.js 18+ (ESM) |
| Bot framework | Telegraf |
| Banco de dados principal | MySQL 2 (pool de conexões) |
| Persistência local (logs) | SQLite via sql.js |
| Leitura de QR Code | jsQR + Jimp (pré-processamento) |
| HTTP Client | Axios |
| Processo manager | PM2 (`ecosystem.config.cjs`) |
| Variáveis de ambiente | dotenv |

---

## 2. Arquitetura Atual

```
src/
├── index.js                   # Entry-point: inicializa SQLite e sobe o bot
├── bot/
│   ├── bot.js                 # Definição de handlers e teclado de menu
│   └── middlewares/
│       └── logging.js         # Middleware: registra usuários e ações no SQLite
├── config/
│   └── index.js               # Exporta variáveis de ambiente (BOT_TOKEN, DB_*)
├── db/
│   ├── index.js               # Pool MySQL (mysql2/promise)
│   ├── queries.js             # Queries SQL ao banco SGHX
│   └── sqlite.js              # Banco SQLite local (users, actions)
└── services/
    ├── qrReader.js            # Leitura de QR Code de imagem (Buffer)
    ├── reportService.js       # Formatação das mensagens de relatório
    └── telegram.js            # Download de arquivo via URL (axios)
```

### 2.1 Fluxo de Uso Atual

```
Usuário Telegram
      │
      ▼
  /start  ──────────────►  Teclado de menu (3 opções)
      │
      ├─► 📝 Relatório Geral  ──►  getRelatorio()  ──►  msgRelatorio()  ──►  Reply HTML
      │
      ├─► 🚦 Relatório PS     ──►  getPSAdmissoes() ──►  msgNivel()     ──►  Reply HTML
      │
      └─► 🔍 Validação        ──►  Aguarda foto  ──►  readQRCodeFromBuffer()
                                                   ──►  buscarSolicitacao()
                                                   ──►  [getAtestadoByCodigo()]
                                                   ──►  Reply HTML
```

---

## 3. Banco de Dados SGHX — Tabelas Relevantes

Todas as tabelas abaixo residem no banco MySQL remoto configurado via variáveis de ambiente.

### 3.1 `cad_paciente`
Cadastro mestre de pacientes. Campos chave: `id_paciente`, `doc_rh`, `doc_fa`, `nome_completo`, `dt_nascimento`, `dt_atualizacao`.

### 3.2 `cad_ambulatorio`
Consultas ambulatoriais agendadas/realizadas.
- `id_ambulatorio`, `id_paciente`, `doc_rh`, `dt_consulta`, `desc_especialidade`, `tipo_consulta`, `excedente`, `dt_atualizacao`
- Índices relevantes: `idx_cad_ambulatorio_dt_consulta`, `idx_cad_ambulatorio_doc_rh`

### 3.3 `cad_atendimento`
Atendimentos no Pronto-Socorro (PS/emergência).
- `id_atendimento`, `id_paciente`, `senha`, `prioridade`, `dt_admissao`, `dt_alta`, `desc_especialidade`, `nome_medico`, `gravidade`, `status`, `situacao`, `dt_atualizacao`
- Campo `gravidade`: `BRANCO` | `NAO URGENTE` | `POUCO URGENTE` | `URGENTE` | `MUITO URGENTE` | `EMERGENCIA`
- Campo `status`: `AGUARDANDO` | `ATENDIMENTO` | `ATENDIDO`

### 3.4 `cad_internacao`
Internações hospitalares.
- `id_internacao`, `doc_rh`, `id_paciente`, `desc_especialidade`, `desc_clinica`, `desc_leito`, `dt_entrada`, `dt_alta`, `cod_cid`, `desc_cid`, `tipo_alta`

### 3.5 `cad_internacao_pendencia`
Pendências associadas a internações.

### 3.6 `biomedica_lista_exames`
Exames laboratoriais/biomédicos solicitados.

---

## 4. Funcionalidades Atuais

### 4.1 Relatório Geral (`📝 Relatório Geral`)
- Fonte: `queries.getRelatorio()`
- Exibe ocupação hospitalar por clínica/leito
- Formatado como mensagem HTML no Telegram

### 4.2 Relatório PS (`🚦 Relatório PS`)
- Fonte: `queries.getPSAdmissoes()`
- Exibe nível de atividade do PS (Rotina / Nível 1 / 2 / 3) com base no volume de admissões
- Compara totais do dia atual vs. dia anterior

### 4.3 Validação por QR Code (`🔍 Validação`)
- Usuário envia foto contendo QR Code
- Bot faz download da imagem, executa leitura com jsQR + Jimp (6 variações de pré-processamento × 4 rotações = até 24 tentativas)
- Decodifica o valor UUID do QR Code
- Consulta `buscarSolicitacao(uuid)` no MySQL
- Se for atestado médico: busca detalhes adicionais via `getAtestadoByCodigo(uuid)`
- Retorna dados formatados em HTML (tipo, paciente, RH, local, datas, motivo, CID etc.)

### 4.4 Logging Local (SQLite)
- Middleware registra todo usuário que interage com o bot (`users`)
- Registra uso de cada opção de menu (`actions`)
- Persiste em `data/telegram-logs.sqlite`

---

## 5. Atualizações Planejadas

---

### 5.1 Lista Ambulatorial do Dia por Especialidade

#### 5.1.1 Objetivo
Exibir um resumo quantitativo dos pacientes com consulta ambulatorial agendada para o dia corrente, agrupados por especialidade. Permite ao time ter visão rápida do volume de trabalho ambulatorial do dia.

#### 5.1.2 Regras de Negócio
- Filtrar `cad_ambulatorio` onde `DATE(dt_consulta) = CURDATE()`
- Agrupar por `desc_especialidade`
- Ordenar por quantidade decrescente
- Exibir total geral ao final
- Não exibir dados de pacientes nominalmente — apenas contagens

#### 5.1.3 Query SQL (proposição)
```sql
SELECT
    desc_especialidade,
    COUNT(*) AS total
FROM cad_ambulatorio
WHERE DATE(dt_consulta) = CURDATE()
GROUP BY desc_especialidade
ORDER BY total DESC;
```

#### 5.1.4 Formato da Mensagem (Telegram HTML)
```
📋 <b>Ambulatório — Consultas do Dia</b>
<i>Data: DD/MM/AAAA</i>

<b>Especialidade</b>          <b>Qtd</b>
──────────────────────────────
Ortopedia                  42
Cardiologia                28
Clínica Geral              21
...

──────────────────────────────
Total geral: 91
```

#### 5.1.5 Alterações no Código
| Arquivo | Alteração |
|---|---|
| `src/db/queries.js` | Adicionar `getAmbulatorioHoje()` |
| `src/services/reportService.js` | Adicionar `msgAmbulatorio()` |
| `src/bot/bot.js` | Adicionar handler `🏥 Ambulatório Hoje` + incluir no teclado |
| `src/bot/middlewares/logging.js` | Incluir nova opção na lista de opções logáveis |

---

### 5.2 Lista de Atendimento Emergencial — Últimas 4 Horas

#### 5.2.1 Objetivo
Apresentar um painel de atendimentos no Pronto-Socorro nas **últimas 4 horas**, segmentado por gravidade e especialidade, com contagens, para apoiar a gestão de fluxo de pacientes urgentes.

#### 5.2.2 Regras de Negócio
- Filtrar `cad_atendimento` onde `dt_admissao >= NOW() - INTERVAL 4 HOUR`
- Agrupar primariamente por `gravidade` (seguindo a ordem de criticidade do protocolo de Manchester)
- Agrupar secundariamente por `desc_especialidade`
- Informar também o total de pacientes ainda em atendimento (`status IN ('AGUARDANDO','ATENDIMENTO')`) vs. já atendidos (`status = 'ATENDIDO'`)
- Ordenar gravidades pela criticidade: `EMERGENCIA` > `MUITO URGENTE` > `URGENTE` > `POUCO URGENTE` > `NAO URGENTE` > `BRANCO`

#### 5.2.3 Queries SQL (proposição)

**Resumo por gravidade:**
```sql
SELECT
    gravidade,
    COUNT(*) AS total,
    SUM(CASE WHEN status IN ('AGUARDANDO','ATENDIMENTO') THEN 1 ELSE 0 END) AS em_atendimento,
    SUM(CASE WHEN status = 'ATENDIDO' THEN 1 ELSE 0 END) AS atendidos
FROM cad_atendimento
WHERE dt_admissao >= NOW() - INTERVAL 4 HOUR
GROUP BY gravidade
ORDER BY FIELD(gravidade,
    'EMERGENCIA','MUITO URGENTE','URGENTE',
    'POUCO URGENTE','NAO URGENTE','BRANCO');
```

**Detalhamento por especialidade dentro da janela:**
```sql
SELECT
    desc_especialidade,
    gravidade,
    COUNT(*) AS total
FROM cad_atendimento
WHERE dt_admissao >= NOW() - INTERVAL 4 HOUR
GROUP BY desc_especialidade, gravidade
ORDER BY total DESC;
```

#### 5.2.4 Formato da Mensagem (Telegram HTML)
```
🚨 <b>Emergências — Últimas 4 horas</b>
<i>De: DD/MM HH:MM  Até: DD/MM HH:MM</i>

🔴 EMERGÊNCIA          3   (em atend: 2 / concl: 1)
🟠 MUITO URGENTE       8   (em atend: 5 / concl: 3)
🟡 URGENTE            15   (em atend: 9 / concl: 6)
🟢 POUCO URGENTE      12   (em atend: 4 / concl: 8)
🔵 NÃO URGENTE         6   (em atend: 1 / concl: 5)
⚪ BRANCO              2   (em atend: 0 / concl: 2)
──────────────────────────────────────────
Total: 46  |  Em andamento: 21  |  Concluídos: 25

<b>Por Especialidade (top 5):</b>
Clínica Médica         18
Ortopedia              10
Pediatria               7
Cardiologia             5
Cirurgia Geral          4
```

#### 5.2.5 Alterações no Código
| Arquivo | Alteração |
|---|---|
| `src/db/queries.js` | Adicionar `getEmergenciais4h()` retornando `{ porGravidade, porEspecialidade }` |
| `src/services/reportService.js` | Adicionar `msgEmergencial()` com formatação HTML e ícones de cor por gravidade |
| `src/bot/bot.js` | Adicionar handler `🚑 Emergências 4h` + incluir no teclado |
| `src/bot/middlewares/logging.js` | Incluir nova opção na lista de opções logáveis |

---

### 5.3 Indicador de Última Atualização dos Dados

#### 5.3.1 Objetivo
Informar ao usuário quando os dados no SGHX foram atualizados pela última vez, garantindo transparência sobre a "frescura" das informações exibidas. Útil para saber se o sistema está ativo e sincronizando.

#### 5.3.2 Regras de Negócio
- Consultar o campo `dt_atualizacao` nas tabelas que possuem esse campo: `cad_ambulatorio`, `cad_atendimento`, `cad_paciente`
- Retornar o `MAX(dt_atualizacao)` de cada tabela
- Exibir a mais recente entre todas
- Calcular e exibir o tempo decorrido desde essa atualização (ex.: "há 3 minutos", "há 2 horas")
- Este indicador pode ser exibido como rodapé em todos os relatórios, ou como opção de menu independente (`ℹ️ Status Dados`)

#### 5.3.3 Query SQL (proposição)
```sql
SELECT
    'Ambulatório'  AS origem,
    MAX(dt_atualizacao) AS ultima_atualizacao
FROM cad_ambulatorio
UNION ALL
SELECT
    'Atendimento PS',
    MAX(dt_atualizacao)
FROM cad_atendimento
UNION ALL
SELECT
    'Pacientes',
    MAX(dt_atualizacao)
FROM cad_paciente
ORDER BY ultima_atualizacao DESC
LIMIT 1;
```

> **Alternativa:** buscar apenas a mais recente em uma única chamada:
> ```sql
> SELECT GREATEST(
>     (SELECT MAX(dt_atualizacao) FROM cad_ambulatorio),
>     (SELECT MAX(dt_atualizacao) FROM cad_atendimento),
>     (SELECT MAX(dt_atualizacao) FROM cad_paciente)
> ) AS ultima_atualizacao_global;
> ```

#### 5.3.4 Formato da Mensagem
```
ℹ️ <b>Última atualização dos dados</b>

Ambulatório:    28/04/2026 14:32  (há 5 min)
Atendimento PS: 28/04/2026 14:35  (há 2 min)
Pacientes:      28/04/2026 14:20  (há 17 min)

🟢 Sistema SGHX: <b>dados recentes</b>
```

> Critério de "frescura": se a atualização mais recente foi há menos de 15 minutos → `🟢 dados recentes`; entre 15–60 min → `🟡 dados com atraso`; acima de 60 min → `🔴 dados desatualizados`.

#### 5.3.5 Alterações no Código
| Arquivo | Alteração |
|---|---|
| `src/db/queries.js` | Adicionar `getUltimaAtualizacao()` |
| `src/services/reportService.js` | Adicionar `msgStatusDados()` com lógica de "frescura" e formatação de tempo relativo |
| `src/bot/bot.js` | Adicionar handler `ℹ️ Status Dados` + incluir no teclado |

---

### 5.4 Diagnóstico de Conectividade com SGHX

#### 5.4.1 Objetivo
Verificar se o sistema web SGHX (`http://hmacn-sghx.saude.sp/`) está acessível a partir do servidor onde o bot está rodando. Permite ao time identificar rapidamente se há problema de rede ou indisponibilidade do sistema antes de reportar erros.

#### 5.4.2 Regras de Negócio
- Realizar uma requisição HTTP GET para `http://hmacn-sghx.saude.sp/`
- Timeout máximo: **5 segundos**
- Avaliar a resposta:
  - HTTP 2xx ou 3xx (ou qualquer resposta válida do servidor) → **sistema acessível**
  - Timeout, recusa de conexão, ENOTFOUND, ECONNREFUSED → **sistema inacessível**
- Nunca expor informações de rede internas ou credentials na mensagem de resposta ao usuário
- O diagnóstico testa apenas conectividade de rede — não autentica nem acessa dados sensíveis

#### 5.4.3 Implementação

Novo arquivo: `src/services/diagnosticoService.js`

```js
import axios from 'axios';

const SGHX_URL = 'http://hmacn-sghx.saude.sp/';
const TIMEOUT_MS = 5000;

export async function verificarSGHX() {
  const inicio = Date.now();
  try {
    await axios.get(SGHX_URL, {
      timeout: TIMEOUT_MS,
      maxRedirects: 3,
      validateStatus: () => true, // aceita qualquer status HTTP como "acessível"
    });
    const latencia = Date.now() - inicio;
    return { acessivel: true, latencia };
  } catch (err) {
    return { acessivel: false, erro: err.code || err.message };
  }
}
```

#### 5.4.4 Formato da Mensagem
```
🖥️ <b>Diagnóstico — Sistema SGHX</b>

🟢 Sistema ACESSÍVEL
Latência: 142ms
URL verificada: http://hmacn-sghx.saude.sp/
```
ou
```
🖥️ <b>Diagnóstico — Sistema SGHX</b>

🔴 Sistema INACESSÍVEL
Erro: ECONNREFUSED
URL verificada: http://hmacn-sghx.saude.sp/
```

#### 5.4.5 Alterações no Código
| Arquivo | Alteração |
|---|---|
| `src/services/diagnosticoService.js` | **Criar** — função `verificarSGHX()` |
| `src/bot/bot.js` | Adicionar handler `🖥️ Diagnóstico SGHX` + incluir no teclado |

---

### 5.5 Busca por ID do Pedido (texto digitado)

#### 5.5.1 Objetivo
Permitir ao usuário buscar um pedido/solicitação diretamente pelo **ID numérico** (sem precisar de QR Code), digitando o número manualmente. Ampliar o acesso à validação para situações onde não há imagem disponível.

#### 5.5.2 Fluxo de Uso
```
Usuário seleciona "🔢 Buscar por ID"
      │
      ▼
Bot responde: "Digite o ID do pedido:"
      │
      ▼
Usuário digita o número (ex: 12345)
      │
      ▼
Bot consulta buscarSolicitacaoPorId(id)
      │
      ├─► Encontrado  ──►  Mesmo formato de saída da validação por QR Code
      └─► Não encontrado ──►  "Nenhum registro localizado para o ID informado."
```

#### 5.5.3 Gerenciamento de Estado de Conversa
- Utilizar um `Map` em memória (`waitingForId`) chaveado por `ctx.from.id` (user ID do Telegram) para controlar quais usuários estão aguardando entrada de ID
- Fluxo:
  1. Handler `🔢 Buscar por ID` → define `waitingForId.set(userId, true)` → solicita digitação
  2. No handler `bot.on('message')`: verificar `waitingForId.get(userId)` antes de processar texto
  3. Validar que o texto é numérico; se não → pedir novamente ou cancelar
  4. Executar a query; retornar resultado; remover `waitingForId.delete(userId)`

#### 5.5.4 Validação da Entrada
- Aceitar apenas dígitos (`/^\d+$/`)
- Sanitizar antes de enviar à query (usar parâmetros preparados no mysql2, nunca interpolação direta)
- Limite: rejeitar IDs com mais de 10 dígitos

#### 5.5.5 Query SQL (proposição)
A query existente `buscarSolicitacao(uuid)` usa UUID. Será necessária uma nova query por ID numérico. Verificar nas tabelas de solicitações qual campo é o identificador numérico da solicitação (ex.: `id_solicitacao` ou campo equivalente). Proposta:

```sql
-- A ser adaptada conforme estrutura real da tabela de solicitações
SELECT
    s.codigo_uuid,
    s.tipo_solicitacao,
    p.doc_rh AS paciente_doc_rh,
    p.nome_completo AS paciente_nome_completo,
    i.desc_clinica,
    i.desc_leito,
    s.dt_cadastro,
    s.solicitado_por
FROM tabela_solicitacoes s
LEFT JOIN cad_paciente p ON p.id_paciente = s.id_paciente
LEFT JOIN cad_internacao i ON i.id_internacao = s.id_internacao
WHERE s.id_solicitacao = ?;
```

> ⚠️ **Nota:** A estrutura exata da tabela de solicitações não está incluída no `example.sql` atual. Antes de implementar, levantar a DDL completa da tabela de solicitações e atestados junto ao time de banco de dados.

#### 5.5.6 Formato da Saída
Idêntico ao retorno da validação por QR Code (campos: tipo, RH, paciente, local, data, solicitado por; e detalhes de atestado quando aplicável).

#### 5.5.7 Alterações no Código
| Arquivo | Alteração |
|---|---|
| `src/db/queries.js` | Adicionar `buscarSolicitacaoPorId(id)` com parâmetro preparado |
| `src/bot/bot.js` | Adicionar handler `🔢 Buscar por ID`; gerenciar estado `waitingForId`; atualizar handler `bot.on('message')` para capturar texto quando estado ativo |
| `src/bot/middlewares/logging.js` | Incluir `🔢 Buscar por ID` na lista de opções logáveis |

---

### 5.6 Busca por CID-10 com Contagem de Internados

#### 5.6.1 Objetivo
Permitir ao usuário informar um ou mais códigos **CID-10** e receber: (a) a quantidade de **pacientes internados** (`dt_saida IS NULL`) com o CID, e (b) a quantidade total de **registros no banco** com o mesmo CID. Ao final, o bot pergunta se o usuário deseja emitir um arquivo (CSV) com os dados completos dos pacientes com os CIDs.

#### 5.6.2 Regras de Negócio
- Entrada: um ou mais CIDs separados por vírgula (ex.: `A15.3, X99.9, J18.9`).
- Formato do CID: **letra + 2 dígitos**, com subcategoria decimal opcional (`.`). Ex.: `I64`, `S06`, `A15.3`.
- **Entrada inválida**: `X99,9` está errado — a separação decimal é ponto (`.`), e vírgula (`,`) separa CIDs diferentes. CIDs não identificados são reportados e a operação é cancelada.
- Filtro temporal: **2026 em diante** (`dt_entrada >= '2026-01-01'`) aplicado a todas as contagens e à exportação.
- Se o total de registros encontrados ultrapassar o limite configurado (padrão: **1.000**), a busca é restringida aos **últimos 3 meses** — o usuário é informado na própria mensagem.
- Contagens por CID (tabela `cad_internacao`):
  - **Internados**: registros com `dt_saida IS NULL`.
  - **Total no banco**: todos os registros (e pacientes distintos por `doc_rh`).
- Se não houver nenhum registro com um CID informado, o bot informa explicitamente: *"Nenhum registro localizado com o CID X (desde 2026)"*.
- A pergunta de emissão de arquivo só aparece se houver pelo menos um registro com os CIDs.
- O arquivo (CSV, separador `;`, com BOM UTF-8 para Excel) contém **todos** os pacientes com os CIDs (internados e já com alta), desde 2026.
- Colunas do CSV: `cod_cid`, `doc_rh`, `dt_entrada`, `desc_especialidade`, `desc_clinica`, `idade` e `sexo`.
  - `cod_cid` identifica o CID de cada linha (necessário quando a busca tem múltiplos CIDs).
  - `idade` calculada via `TIMESTAMPDIFF(YEAR, cad_paciente.dt_nascimento, CURDATE())`.
  - `sexo` vindo de `cad_paciente`.

#### 5.6.3 Queries SQL (proposição)

**Estatísticas por CID:**
```sql
SELECT
  cod_cid,
  COUNT(*) AS total_registros,
  COUNT(DISTINCT doc_rh) AS total_pacientes,
  SUM(CASE WHEN dt_saida IS NULL THEN 1 ELSE 0 END) AS internados
FROM cad_internacao
WHERE cod_cid IN (?)
  AND dt_entrada >= '2026-01-01'
GROUP BY cod_cid
ORDER BY cod_cid;
```

**Detalhes dos pacientes (exportação):**
```sql
SELECT
  i.cod_cid,
  i.doc_rh,
  DATE_FORMAT(i.dt_entrada, '%d/%m/%Y %H:%i') AS dt_entrada,
  i.desc_especialidade,
  i.desc_clinica,
  TIMESTAMPDIFF(YEAR, p.dt_nascimento, CURDATE()) AS idade,
  p.sexo
FROM cad_internacao i
LEFT JOIN cad_paciente p ON p.id_paciente = i.id_paciente
WHERE i.cod_cid IN (?)
  AND i.dt_entrada >= '2026-01-01'
ORDER BY i.cod_cid, i.dt_entrada DESC;
```

#### 5.6.4 Formato da Mensagem (Telegram HTML)
```
🩺 Busca por CID

A15.3
🏥 Internados: 5
📚 Total no banco: 12 registros (8 pacientes distintos)

X99.9
⚠️ Nenhum registro localizado com o CID X99.9 (desde 2026).

🔎 Período: 2026 em diante

[ ✅ Sim ]  [ ❌ Não ]  → "Deseja emitir um arquivo com os dados completos dos pacientes com esses CIDs?"
```

#### 5.6.5 Fluxo de Uso
```
Usuário seleciona "🩺 Buscar CID"
      │
      ▼
Bot responde: "Envie um ou mais CIDs separados por vírgula (ex.: A15.3, X99.9, J18.9)"
      │
      ▼
Usuário digita os CIDs (ex.: "A15.3, I64")
      │
      ▼
parseCids() valida o formato (letra + 2 dígitos, ponto opcional)
      ├─► Inválido ──► "❌ Nenhum CID válido identificado... Operação cancelada."
      ▼
montarRespostaCid(cids) → mensagem com contagens por CID
      │ (se total de registros > 1.000, janela passa a ser os últimos 3 meses — usuário é informado)
      ▼
Há registros? ──Não──► "Não há registros com os CIDs informados. Nenhum arquivo será emitido."
      │ Sim
      ▼
Teclado inline: "Deseja emitir um arquivo com os dados completos dos pacientes com esses CIDs?"
      ├─► ✅ Sim ──► gerarArquivoCids() ──► envia CSV (cod_cid, doc_rh, dt_entrada, especialidade, clínica, idade, sexo)
      └─► ❌ Não ──► "Ok, nenhum arquivo será emitido. Operação finalizada."
```

#### 5.6.6 Alterações no Código
| Arquivo | Alteração |
|---|---|
| `src/db/queries.js` | Adicionar `getCidStats(cids)` e `getCidDetalhes(cids)` com parâmetros preparados |
| `src/services/cidService.js` | **Criar** — `parseCids()`, `montarRespostaCid()`, `gerarArquivoCids()` / `montarCsv()` |
| `src/bot/bot.js` | Adicionar handler `🩺 Buscar CID`; estados `waitingForCid` e `waitingForCidExport`; handler `callback_query` para confirmação de arquivo |
| `src/bot/middlewares/logging.js` | Incluir `🩺 Buscar CID` na lista de opções logáveis |


---

## 6. Menu Atualizado (Teclado Inline)

Com todas as novas funcionalidades, o teclado de menu precisa ser reorganizado para acomodar as novas opções sem ficar poluído.

### 6.1 Layout Proposto
```
[ 📝 Relatório Geral    ]  [ 🚦 Relatório PS     ]
[ 🏥 Ambulatório Hoje   ]  [ 🚑 Emergências 4h   ]
[ 🔍 Validação QR Code  ]  [ 🔢 Buscar por ID    ]
[ ℹ️ Status Dados        ]  [ 🖥️ Diagnóstico SGHX ]
[ 🩺 Buscar CID          ]
```

### 6.2 Implementação em `bot.js`
```js
Markup.keyboard([
  ['📝 Relatório Geral',   '🚦 Relatório PS'],
  ['🏥 Ambulatório Hoje',  '🚑 Emergências 4h'],
  ['🔍 Validação QR Code', '🔢 Buscar por ID'],
  ['ℹ️ Status Dados',       '🖥️ Diagnóstico SGHX'],
  ['🩺 Buscar CID'],
]).resize()
```

---

## 7. Ordem de Implementação Sugerida

A sequência abaixo minimiza riscos e facilita testes incrementais:

| # | Feature | Dependências | Prioridade |
|---|---|---|---|
| 1 | **5.4 Diagnóstico SGHX** | Nenhuma (usa só axios já instalado) | Alta |
| 2 | **5.3 Status de Atualização** | Conexão MySQL já existente | Alta |
| 3 | **5.1 Ambulatório do Dia** | Query simples na tabela já conhecida | Média |
| 4 | **5.2 Emergências 4h** | Query na tabela `cad_atendimento` já usada | Média |
| 5 | **5.5 Busca por ID** | Necessita levantar DDL da tabela de solicitações | Média |
| 6 | **6. Menu atualizado** | Após todas as features implementadas | Baixa |

---

## 8. Considerações de Segurança

- **Injeção SQL:** todas as queries com parâmetros de usuário devem usar placeholders (`?`) do `mysql2` — nunca interpolação de strings.
- **Dados sensíveis:** mensagens de erro técnico (stack traces, detalhes de rede) não devem ser enviadas ao usuário final — apenas mensagens genéricas amigáveis.
- **Autenticação do bot:** o `BOT_TOKEN` deve permanecer exclusivamente na variável de ambiente; nunca hardcoded.
- **Diagnóstico de rede:** a função `verificarSGHX()` não deve expor informações de roteamento interno ou credenciais.
- **ID digitado pelo usuário:** validar formato numérico e usar parâmetro preparado antes de qualquer query.
- **Estado em memória (`waitingForId`):** o `Map` vive apenas no processo Node.js; em caso de restart, os estados são limpos automaticamente (sem risco de persistência indevida).

---

## 9. Pontos em Aberto

- [ ] Levantar DDL completa da tabela de solicitações (usada em `buscarSolicitacao`) para implementar corretamente a busca por ID numérico (item 5.5).
- [ ] Confirmar se `http://hmacn-sghx.saude.sp/` responde a GET sem autenticação ou se necessita de header específico para o diagnóstico de conectividade.
- [ ] Definir se o indicador de status de dados (item 5.3) será rodapé automático em todos os relatórios ou opção de menu separada.
- [ ] Avaliar necessidade de rate limiting por usuário para as novas queries pesadas (especialmente emergências e ambulatório).
- [ ] Verificar se o ambiente de produção tem acesso HTTP de saída ao endereço SGHX (firewall/proxy corporativo).
