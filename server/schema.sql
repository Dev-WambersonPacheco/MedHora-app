CREATE SCHEMA IF NOT EXISTS medhora_app AUTHORIZATION pacheco;
SET search_path TO medhora_app, public;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS users (
  cpf VARCHAR(11) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(120),
  caregiver JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medications (
  id VARCHAR(64) PRIMARY KEY,
  user_cpf VARCHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  dose VARCHAR(80),
  amount NUMERIC(10,3),
  unit VARCHAR(32),
  time VARCHAR(5) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS medication_intake (
  user_cpf VARCHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
  medication_id VARCHAR(64) NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  day_key VARCHAR(20) NOT NULL,
  taken BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_cpf, medication_id, day_key)
);

CREATE INDEX IF NOT EXISTS idx_medications_user_cpf ON medications(user_cpf);
CREATE INDEX IF NOT EXISTS idx_medication_intake_day_key ON medication_intake(day_key);

CREATE TABLE IF NOT EXISTS anvisa_medicamentos (
  id BIGSERIAL PRIMARY KEY,
  nome_produto TEXT NOT NULL,
  complemento_marca TEXT,
  principio_ativo TEXT,
  tipo_regularizacao TEXT,
  numero_regularizacao TEXT,
  numero_processo TEXT,
  empresa_detentora TEXT,
  situacao_regularizacao TEXT,
  vencimento_regularizacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_anvisa_medicamentos_nome_trgm ON anvisa_medicamentos USING gin (nome_produto gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_anvisa_medicamentos_principio_trgm ON anvisa_medicamentos USING gin (principio_ativo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_anvisa_medicamentos_complemento_trgm ON anvisa_medicamentos USING gin (complemento_marca gin_trgm_ops);

INSERT INTO users (cpf, password, name, caregiver)
VALUES (
  '12345678900',
  '$2b$10$lb2vyjWxmhEIweZabER8m.9D8DjplEQGwVgjb3cqnMHrF8SkQLgUC',
  'SEBASTIAO',
  '{"name":"MARIA OLIVEIRA","role":"Cuidadora Responsavel","phone":"(92) 98765-4321","email":"maria.oliveira@gmail.com","address":"Itacoatiara - AM"}'::jsonb
)
ON CONFLICT (cpf) DO NOTHING;
