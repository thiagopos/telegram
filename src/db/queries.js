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
      A.tipo_solicitacao,                                      -- Tipo da solicitação
      DATE_FORMAT(A.dt_cadastro, '%d/%m/%Y %H:%i') AS dt_cadastro,  -- Data da solicitação    
      A.desc_clinica,                                          -- Clínica/setor do paciente
      A.desc_leito,                                            -- Leito do paciente
      C.nome_completo AS solicitado_por,                       -- Nome de quem solicitou
      C.doc_cpf AS solicitado_doc,                             -- CPF do solicitante (ajustado para nova estrutura de cad_usuario)
      F.doc_rh AS paciente_doc_rh,                             -- RH do paciente
      F.nome_completo AS paciente_nome_completo                -- Nome completo do paciente
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

export { getRelatorio, getPSAdmissoes, buscarSolicitacao, getAtestadoByCodigo };
