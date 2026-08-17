import db from './index.js';

async function getPSAdmissoes() {
  try {
    const [rows] = await db.query(
      `SELECT
      -- Quantos desses pacientes estão internados no pronto-socorro
     (SELECT COUNT(*) 
      FROM cad_internacao 
      WHERE DATE(dt_entrada) = CURDATE() - INTERVAL 1 DAY
        AND dt_saida IS NULL
        AND desc_clinica IN ('OBSERVAÇÃO FEMININO', 'OBSERVAÇÃO MASCULINO', 'EMERGENCIA 1', 'EMERGENCIA 2', 'EMERGENCIA 3', 'OBSERVAÇÃO INDIFERENCIADA')) AS admitidos_ontem_ps,
   
     -- Quantas altas no dia de hoje no pronto-socorro
     (SELECT COUNT(*) 
      FROM cad_internacao 
      WHERE DATE(dt_alta) = CURDATE() - INTERVAL 1 DAY
        AND desc_clinica IN ('OBSERVAÇÃO FEMININO', 'OBSERVAÇÃO MASCULINO', 'EMERGENCIA 1', 'EMERGENCIA 2', 'EMERGENCIA 3', 'OBSERVAÇÃO INDIFERENCIADA')) AS altas_ontem_ps,
        
     -- Quantos desses pacientes estão internados no pronto-socorro
     (SELECT COUNT(*) 
      FROM cad_internacao 
      WHERE DATE(dt_entrada) = CURDATE()
        AND dt_saida IS NULL
        AND desc_clinica IN ('OBSERVAÇÃO FEMININO', 'OBSERVAÇÃO MASCULINO', 'EMERGENCIA 1', 'EMERGENCIA 2', 'EMERGENCIA 3', 'OBSERVAÇÃO INDIFERENCIADA')) AS admitidos_ps,
   
     -- Quantas altas no dia de hoje no pronto-socorro
     (SELECT COUNT(*) 
      FROM cad_internacao 
      WHERE DATE(dt_alta) = CURDATE()
        AND desc_clinica IN ('OBSERVAÇÃO FEMININO', 'OBSERVAÇÃO MASCULINO', 'EMERGENCIA 1', 'EMERGENCIA 2', 'EMERGENCIA 3', 'OBSERVAÇÃO INDIFERENCIADA')) AS altas_ps;`
    );
    return rows;
  } catch (error) {
    console.error("Erro em getPSAdmissoes()", error);
    return null;
  }
}

// Puxar relatório completo
async function getRelatorio() {
  try {
    const [rows] = await db.query(
      `WITH clinic_mapping AS (
        SELECT
          desc_clinica,
          CASE
          WHEN desc_clinica = 'EMERGENCIA 1' THEN 'Emergencia 1'
          WHEN desc_clinica = 'EMERGENCIA 2' THEN 'Emergencia 2'
          WHEN desc_clinica = 'EMERGENCIA 3' THEN 'Emergencia 3'
          WHEN desc_clinica = 'OBSERVAÇÃO FEMININO' THEN 'Obs. Feminino'
          WHEN desc_clinica = 'OBSERVAÇÃO MASCULINO' THEN 'Obs. Masculino'
          WHEN desc_clinica = 'OBSERVAÇÃO INDIFERENCIADA' THEN 'Obs. Indiferenciada'
          WHEN desc_clinica = 'OBSERVAÇÃO PEDIÁTRICA' THEN 'Obs. Pediátrica'
          WHEN desc_clinica = 'CENTRO OBSTÉTRICO' THEN 'Centro Obstétrico'
          WHEN desc_clinica = 'CENTRO CIRÚRGICO' THEN 'Centro Cirúrgico'
          WHEN desc_clinica = 'OBSTETRÍCIA CIRÚRGICA' THEN 'Obstetrícia Cirúrgica'
          WHEN desc_clinica = 'OBSTETRÍCIA CLÍNICA' THEN 'Obstetrícia Clínica'
          WHEN desc_clinica = 'CLÍNICA PEDIÁTRICA' THEN 'Pediatria Clínica'
          WHEN desc_clinica = 'CIRURGIA GERAL' THEN 'Cirurgia Geral'
          WHEN desc_clinica = 'NEUROCIRURGIA' THEN 'Neurocirurgia'
          WHEN desc_clinica = 'ORTOPEDIA' THEN 'Ortopedia'
          WHEN desc_clinica = 'CLÍNICA GERAL' THEN 'Clínica Geral'
          WHEN desc_clinica = 'UNIDADE INTERMEDIÁRIA NEONATAL' THEN 'UI Neonatal'
          WHEN desc_clinica = 'UTI NEONATAL' THEN 'UTI Neonatal'
          WHEN desc_clinica = 'UTI PEDIÁTRICA' THEN 'UTI Pediátrica'
          WHEN desc_clinica = 'UTI ADULTO CIRURGICA' THEN 'UTI Adulto C'
          WHEN desc_clinica = 'UTI ADULTO' THEN 'UTI Adulto'   
            ELSE desc_clinica
          END AS desc_clinica_mapped,
          CASE
          WHEN desc_clinica = 'EMERGENCIA 1' THEN 5
          WHEN desc_clinica = 'EMERGENCIA 2' THEN 9
          WHEN desc_clinica = 'EMERGENCIA 3' THEN 4
          WHEN desc_clinica = 'OBSERVAÇÃO FEMININO' THEN 15
          WHEN desc_clinica = 'OBSERVAÇÃO MASCULINO' THEN 16
          WHEN desc_clinica = 'OBSERVAÇÃO INDIFERENCIADA' THEN null
          WHEN desc_clinica = 'OBSERVAÇÃO PEDIÁTRICA' THEN 11
          WHEN desc_clinica = 'CENTRO OBSTÉTRICO' THEN null
          WHEN desc_clinica = 'CENTRO CIRÚRGICO' THEN null
          WHEN desc_clinica = 'OBSTETRÍCIA CIRÚRGICA' THEN 44
          WHEN desc_clinica = 'OBSTETRÍCIA CLÍNICA' THEN 10
          WHEN desc_clinica = 'CLÍNICA PEDIÁTRICA' THEN 28
          WHEN desc_clinica = 'CIRURGIA GERAL' THEN 26
          WHEN desc_clinica = 'NEUROCIRURGIA' THEN 27
          WHEN desc_clinica = 'ORTOPEDIA' THEN 19
          WHEN desc_clinica = 'CLÍNICA GERAL' THEN 58
          WHEN desc_clinica = 'UNIDADE INTERMEDIÁRIA NEONATAL' THEN 24
          WHEN desc_clinica = 'UTI NEONATAL' THEN 10
          WHEN desc_clinica = 'UTI PEDIÁTRICA' THEN 10
          WHEN desc_clinica = 'UTI ADULTO CIRURGICA' THEN 10
          WHEN desc_clinica = 'UTI ADULTO' THEN 20
          END AS max
        FROM
          cad_internacao
        WHERE
          dt_saida IS NULL
      )
      SELECT
        desc_clinica_mapped,
        COUNT(*) AS total,
        MAX(max) AS max,
        CASE
          WHEN max IS NULL THEN NULL
          ELSE ROUND(((COUNT(*) / NULLIF(MAX(max), 0)) * 100), 0)
        END AS taxa_ocup
      FROM
        clinic_mapping
      GROUP BY
        desc_clinica_mapped
        
      ORDER BY
        CASE desc_clinica_mapped     
        WHEN 'Emergencia 1' THEN 1
        WHEN 'Emergencia 2' THEN 2
        WHEN 'Emergencia 3' THEN 3
        WHEN 'Obs. Feminino' THEN 4
        WHEN 'Obs. Masculino' THEN 5
        WHEN 'Obs. Indiferenciada' THEN 6
        WHEN 'Obs. Pediátrica' THEN 7
        WHEN 'Centro Obstétrico' THEN 8
        WHEN 'Centro Cirúrgico' THEN 9
        WHEN 'Obstetrícia Cirúrgica' THEN 10
        WHEN 'Obstetrícia Clínica' THEN 11
        WHEN 'Pediatria Clínica' THEN 12
        WHEN 'Cirurgia Geral' THEN 13
        WHEN 'Neurocirurgia' THEN 14
        WHEN 'Ortopedia' THEN 15
        WHEN 'Clínica Geral' THEN 16
        WHEN 'UI Neonatal' THEN 17
        WHEN 'UTI Neonatal' THEN 18
        WHEN 'UTI Pediátrica' THEN 19
        WHEN 'UTI Adulto C' THEN 20
        WHEN 'UTI Adulto' THEN 21
        ELSE 22
        END;`
    );
    return rows;
  } catch (error) {
    console.error("Erro em getRelatorio()", error);
    return null;
  }
}

async function buscarSolicitacao(codigo_uuid) {
  try {
    const sql = `
    SELECT 
      A.tipo_solicitacao,
      A.desc_status,
      DATE_FORMAT(A.dt_cadastro, '%d/%m/%Y %H:%i') AS dt_cadastro,
      A.desc_clinica,
      A.desc_leito,
      C.nome_completo AS solicitado_por,
      C.doc_cpf AS solicitado_doc,
      F.doc_rh AS paciente_doc_rh,
      F.nome_completo AS paciente_nome_completo
    FROM simeon_ps_solicitacao_validacao A
      LEFT JOIN simeon_ps_solicitacao_sadt B ON B.codigo_uuid = A.codigo_uuid
      LEFT JOIN cad_usuario C ON C.id_usuario = A.id_usuario
      LEFT JOIN cad_paciente F ON F.id_paciente = A.id_paciente
    WHERE A.codigo_uuid = ?
    LIMIT 1`;
    
    const [resultado] = await db.query(sql, [codigo_uuid]);
    return resultado && resultado.length > 0 ? resultado[0] : null;
  } catch (error) {
    console.error("Erro em buscarSolicitacao():", error);
    return null;
  }
}

async function getAtestadoByCodigo(codigo_uuid) {
  try {
    const sql = `
    SELECT *
    FROM simeon_ps_solicitacao_atestado
    WHERE codigo_uuid = ?
    LIMIT 1`;

    const [resultado] = await db.query(sql, [codigo_uuid]);
    return resultado && resultado.length > 0 ? resultado[0] : null;
  } catch (error) {
    console.error('Erro em getAtestadoByCodigo():', error);
    return null;
  }
}

async function getAmbulatorioHoje() {
  try {
    const [rows] = await db.query(
      `SELECT
        COALESCE(
          (SELECT le.desc_especialidade FROM lista_especialidade le
           WHERE le.cod_sigla1 = a.desc_especialidade
              OR le.cod_sigla2 = a.desc_especialidade
              OR le.cod_sigla3 = a.desc_especialidade
           LIMIT 1),
          a.desc_especialidade
        ) AS desc_especialidade,
        COUNT(*) AS total
      FROM cad_ambulatorio a
      WHERE DATE(a.dt_consulta) = CURDATE()
      GROUP BY 1
      ORDER BY total DESC`
    );
    return rows;
  } catch (error) {
    console.error('Erro em getAmbulatorioHoje()', error);
    return null;
  }
}

async function getEmergenciais4h() {
  try {
    const [[porGravidade], [porEspecialidade]] = await Promise.all([
      db.query(
        `SELECT
          gravidade,
          COUNT(*) AS total,
          SUM(CASE WHEN status IN ('AGUARDANDO','ATENDIMENTO') THEN 1 ELSE 0 END) AS em_atendimento,
          SUM(CASE WHEN status = 'ATENDIDO' THEN 1 ELSE 0 END) AS atendidos
        FROM cad_atendimento
        WHERE dt_admissao >= NOW() - INTERVAL 4 HOUR
        GROUP BY gravidade
        ORDER BY FIELD(gravidade,
          'EMERGENCIA','MUITO URGENTE','URGENTE',
          'POUCO URGENTE','NAO URGENTE','BRANCO')`
      ),
      db.query(
        `SELECT
          COALESCE(
            (SELECT le.desc_especialidade FROM lista_especialidade le
             WHERE le.cod_sigla1 = a.desc_especialidade
                OR le.cod_sigla2 = a.desc_especialidade
                OR le.cod_sigla3 = a.desc_especialidade
             LIMIT 1),
            a.desc_especialidade
          ) AS desc_especialidade,
          COUNT(*) AS total
        FROM cad_atendimento a
        WHERE a.dt_admissao >= NOW() - INTERVAL 4 HOUR
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 5`
      ),
    ]);
    return { porGravidade, porEspecialidade };
  } catch (error) {
    console.error('Erro em getEmergenciais4h()', error);
    return null;
  }
}

async function getUltimaAtualizacao() {
  try {
    const [rows] = await db.query(
      `SELECT
        'Ambulatório' AS origem,
        MAX(dt_atualizacao) AS ultima_atualizacao
      FROM cad_ambulatorio
      UNION ALL
      SELECT
        'Atendimento PS',
        MAX(dt_atualizacao)
      FROM cad_atendimento
      UNION ALL
      SELECT
        'Internados',
        MAX(dt_atualizacao)
      FROM cad_paciente
      ORDER BY ultima_atualizacao DESC`
    );
    return rows;
  } catch (error) {
    console.error('Erro em getUltimaAtualizacao()', error);
    return null;
  }
}

async function buscarSolicitacaoPorId(id) {
  try {
    const sql = `
    SELECT
      A.codigo_uuid,
      A.tipo_solicitacao,
      A.desc_status,
      DATE_FORMAT(A.dt_cadastro, '%d/%m/%Y %H:%i') AS dt_cadastro,
      A.desc_clinica,
      A.desc_leito,
      C.nome_completo AS solicitado_por,
      C.doc_cpf AS solicitado_doc,
      F.doc_rh AS paciente_doc_rh,
      F.nome_completo AS paciente_nome_completo
    FROM simeon_ps_solicitacao_validacao A
      LEFT JOIN simeon_ps_solicitacao_sadt B ON B.codigo_uuid = A.codigo_uuid
      LEFT JOIN cad_usuario C ON C.id_usuario = A.id_usuario
      LEFT JOIN cad_paciente F ON F.id_paciente = A.id_paciente
    WHERE A.id_validacao = ?
    LIMIT 1`;

    const [resultado] = await db.query(sql, [id]);
    return resultado && resultado.length > 0 ? resultado[0] : null;
  } catch (error) {
    console.error('Erro em buscarSolicitacaoPorId():', error);
    return null;
  }
}

// Data inicial do filtro "2026 para frente" aplicado nas buscas por CID
export const CID_DATA_INICIO = '2026-01-01';

// Estatísticas por CID: internados (dt_saida NULL) e total de registros no banco
async function getCidStats(cids, dataInicio = CID_DATA_INICIO) {
  try {
    const [rows] = await db.query(
      `SELECT
        cod_cid,
        COUNT(*) AS total_registros,
        COUNT(DISTINCT doc_rh) AS total_pacientes,
        SUM(CASE WHEN dt_saida IS NULL THEN 1 ELSE 0 END) AS internados
      FROM cad_internacao
      WHERE cod_cid IN (?)
        AND dt_entrada >= ?
      GROUP BY cod_cid
      ORDER BY cod_cid`,
      [cids, dataInicio]
    );
    return rows;
  } catch (error) {
    console.error('Erro em getCidStats():', error);
    return null;
  }
}

// Detalhes de TODOS os pacientes com os CIDs para exportação de arquivo
async function getCidDetalhes(cids, dataInicio = CID_DATA_INICIO) {
  try {
    const [rows] = await db.query(
      `SELECT
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
        AND i.dt_entrada >= ?
      ORDER BY i.cod_cid, i.dt_entrada DESC`,
      [cids, dataInicio]
    );
    return rows;
  } catch (error) {
    console.error('Erro em getCidDetalhes():', error);
    return null;
  }
}

export {
  getRelatorio,
  getPSAdmissoes,
  buscarSolicitacao,
  getAtestadoByCodigo,
  getAmbulatorioHoje,
  getEmergenciais4h,
  getUltimaAtualizacao,
  buscarSolicitacaoPorId,
  getCidStats,
  getCidDetalhes,
};
