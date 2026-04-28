CREATE TABLE `cad_ambulatorio` (
  `id_ambulatorio` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `doc_rh` varchar(10) DEFAULT NULL,
  `doc_temp` varchar(10) DEFAULT NULL,
  `doc_fa` varchar(20) DEFAULT NULL,
  `dt_consulta` datetime NOT NULL,
  `desc_especialidade` varchar(60) NOT NULL,
  `tipo_consulta` varchar(50) NOT NULL,
  `excedente` int NOT NULL DEFAULT '0',
  `dt_atualizacao` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_ambulatorio`),
  KEY `idx_cad_ambulatorio_doc_rh` (`doc_rh`),
  KEY `idx_cad_ambulatorio_doc_temp` (`doc_temp`),
  KEY `idx_cad_ambulatorio_id_paciente` (`id_paciente`),
  KEY `idx_cad_ambulatorio_dt_consulta` (`dt_consulta`),
  KEY `idx_cad_ambulatorio_doc_fa` (`doc_fa`)
) ENGINE=InnoDB AUTO_INCREMENT=828 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `biomedica_lista_exames` (
  `id_exame` int NOT NULL AUTO_INCREMENT,
  `id_controle` int DEFAULT NULL,
  `codigo_lis` varchar(12) DEFAULT NULL,
  `desc_clinica` varchar(60) DEFAULT NULL,
  `dt_pedido` datetime DEFAULT NULL,
  `nome_paciente` varchar(120) DEFAULT NULL,
  `dt_nascimento` date DEFAULT NULL,
  `sexo` enum('M','F') DEFAULT NULL,
  `idade` varchar(3) DEFAULT NULL,
  `flags` varchar(100) DEFAULT NULL,
  `status` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id_exame`)
) ENGINE=InnoDB AUTO_INCREMENT=37310 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cad_atendimento` (
  `id_atendimento` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `senha` varchar(10) NOT NULL,
  `prioridade` enum('PRIORITARIA','NORMAL') NOT NULL,
  `dt_admissao` datetime NOT NULL,
  `dt_alta` datetime DEFAULT NULL,
  `doc_rh` varchar(10) DEFAULT NULL,
  `doc_fa` varchar(10) DEFAULT NULL,
  `doc_temp` varchar(10) DEFAULT NULL,
  `desc_especialidade` varchar(50) NOT NULL,
  `nome_medico` varchar(120) DEFAULT NULL,
  `gravidade` enum('BRANCO','NAO URGENTE','POUCO URGENTE','URGENTE','MUITO URGENTE','EMERGENCIA') NOT NULL,
  `status` enum('AGUARDANDO','ATENDIMENTO','ATENDIDO') NOT NULL,
  `situacao` varchar(50) DEFAULT NULL,
  `dt_atualizacao` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_atendimento`)
) ENGINE=InnoDB AUTO_INCREMENT=55332 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cad_internacao` (
  `id_internacao` int NOT NULL AUTO_INCREMENT,
  `doc_rh` varchar(10) DEFAULT NULL,
  `id_paciente` int DEFAULT NULL,
  `desc_especialidade` varchar(60) DEFAULT NULL,
  `desc_clinica` varchar(40) DEFAULT NULL,
  `desc_leito` varchar(20) DEFAULT NULL,
  `dt_entrada` datetime DEFAULT NULL,
  `dt_alta` datetime DEFAULT NULL,
  `dt_saida` datetime DEFAULT NULL,
  `cod_cid` varchar(10) DEFAULT NULL,
  `desc_cid` varchar(500) DEFAULT NULL,
  `doc_fa` varchar(20) DEFAULT NULL,
  `caso_policial` int DEFAULT NULL,
  `tipo_alta` varchar(50) DEFAULT NULL,
  `dt_ultima_consulta_extrato` datetime DEFAULT NULL,
  PRIMARY KEY (`id_internacao`)
) ENGINE=InnoDB AUTO_INCREMENT=38619 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cad_internacao_especialidade` (
  `id_internacao_especialidade` int NOT NULL AUTO_INCREMENT,
  `id_especialidade` int DEFAULT NULL,
  `id_internacao` int DEFAULT NULL,
  PRIMARY KEY (`id_internacao_especialidade`)
) ENGINE=InnoDB AUTO_INCREMENT=66864 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cad_internacao_extrato` (
  `id_internacao` int NOT NULL,
  `doc_rh` varchar(50) NOT NULL,
  `dt_movimentacao` datetime NOT NULL,
  `tipo_movimento` varchar(60) NOT NULL,
  `hospital_transferencia` varchar(60) DEFAULT NULL,
  `especialidade` varchar(60) NOT NULL,
  `leito` varchar(60) DEFAULT NULL,
  `quarto` varchar(60) DEFAULT NULL,
  `unidade` varchar(60) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cad_internacao_pendencia` (
  `id_pendencia` int NOT NULL AUTO_INCREMENT,
  `id_paciente` int NOT NULL,
  `id_internacao` int NOT NULL,
  `doc_rh` varchar(10) NOT NULL,
  `pts` varchar(4) DEFAULT NULL,
  `desc_observacao` text,
  `desc_dieta` text,
  `desc_pendencia` text,
  `cod_cid` varchar(10) DEFAULT NULL,
  `desc_cid` varchar(255) DEFAULT NULL,
  `dt_atualizacao` datetime DEFAULT NULL,
  PRIMARY KEY (`id_pendencia`),
  UNIQUE KEY `id_internacao_UNIQUE` (`id_internacao`),
  UNIQUE KEY `id_pendencia_UNIQUE` (`id_pendencia`)
) ENGINE=InnoDB AUTO_INCREMENT=1293 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `cad_paciente` (
  `id_paciente` int NOT NULL AUTO_INCREMENT,
  `doc_rh` varchar(10) DEFAULT NULL,
  `doc_fa` varchar(12) DEFAULT NULL,
  `nome_completo` varchar(120) DEFAULT NULL,
  `nome_social` varchar(120) DEFAULT NULL,
  `nome_mae` varchar(120) DEFAULT NULL,
  `nome_pai` varchar(120) DEFAULT NULL,
  `dt_nascimento` date DEFAULT NULL,
  `naturalidade` varchar(80) DEFAULT NULL,
  `nacionalidade` varchar(30) DEFAULT NULL,
  `sexo` varchar(30) DEFAULT NULL,
  `cor` varchar(30) DEFAULT NULL,
  `estado_civil` varchar(50) DEFAULT NULL,
  `sem_documento` int DEFAULT NULL,
  `doc_cpf` varchar(14) DEFAULT NULL,
  `doc_cns` varchar(20) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `sem_endereco` int DEFAULT NULL,
  `end_logradouro` varchar(120) DEFAULT NULL,
  `end_numero` varchar(10) DEFAULT NULL,
  `end_complemento` varchar(30) DEFAULT NULL,
  `end_cep` varchar(9) DEFAULT NULL,
  `end_bairro` varchar(120) DEFAULT NULL,
  `end_municipio` varchar(80) DEFAULT NULL,
  `end_uf` varchar(2) DEFAULT NULL,
  `validacao` int DEFAULT NULL,
  `dt_atualizacao` datetime DEFAULT NULL,
  PRIMARY KEY (`id_paciente`)
) ENGINE=InnoDB AUTO_INCREMENT=608731 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


