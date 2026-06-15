# MedHora - Requisitos

Este documento concentra os requisitos funcionais e nao funcionais do MedHora.

## Requisitos Funcionais

| ID | Requisito | Status | Evidencia no sistema |
| --- | --- | --- | --- |
| RF01 | Permitir cadastro de usuario idoso ou cuidador | Implementado | `POST /api/auth/register` em `server/index.js` |
| RF02 | Permitir login por CPF e senha | Implementado | `POST /api/auth/login` em `server/index.js` |
| RF03 | Invalidar sessao no logout | Implementado | `POST /api/auth/logout` |
| RF04 | Recuperar senha | Fora do escopo atual | Fluxo de recuperacao removido do backend e do frontend |
| RF05 | Atualizar perfil do usuario | Implementado | `PATCH /api/users/:cpf` |
| RF06 | Criar vinculo cuidador/idoso | Implementado | `POST /api/users/:cpf/relations/link` |
| RF07 | Remover vinculo cuidador/idoso | Implementado | `DELETE /api/users/:cpf/relations/:linkedCpf` |
| RF08 | Cadastrar medicamento com dose, unidade, horarios e duracao | Implementado | `POST /api/users/:cpf/medications` |
| RF09 | Listar medicamentos ativos do dia | Implementado | `GET /api/users/:cpf/medications` |
| RF10 | Excluir medicamento | Implementado | `DELETE /api/users/:cpf/medications/:id` |
| RF11 | Marcar medicamento como tomado ou pendente | Implementado | `POST /api/users/:cpf/medications/:id/toggle-taken` |
| RF12 | Buscar medicamentos na base ANVISA local | Implementado | `GET /api/medications/search` |
| RF13 | Exibir dashboard com resumo do usuario e vinculos | Implementado | `GET /api/users/:cpf/dashboard` |
| RF14 | Gerar relatorio semanal e mensal de tratamento | Implementado | `GET /api/users/:cpf/reports` |
| RF15 | Criar lembretes do cuidador | Implementado | Persistido em `caregiver_reminders` no PostgreSQL |
| RF16 | Criar rotinas/lembretes do idoso | Implementado | Persistido em `routines` no PostgreSQL |

## Requisitos Nao Funcionais

| ID | Requisito | Status | Evidencia no sistema |
| --- | --- | --- | --- |
| RNF01 | Frontend nao acessa PostgreSQL diretamente | Implementado | Frontend usa `src/services/api.js`; banco fica em `server/db.js` |
| RNF02 | API deve proteger rotas por sessao | Implementado | `requireSelfAccess(...)` em `server/index.js` |
| RNF03 | Senhas devem ser protegidas | Implementado | `bcrypt.hash(...)` e `bcrypt.compare(...)` |
| RNF04 | CORS deve ser configuravel por ambiente | Implementado | `CORS_ORIGIN` em `server/index.js` |
| RNF05 | Banco deve manter integridade relacional | Implementado | FKs em `server/schema.sql` |
| RNF06 | Medicamentos devem ter periodo ativo valido | Implementado | `start_date`, `end_date` e constraints no schema |
| RNF07 | API deve retornar dados publicos do usuario, sem senha | Implementado | `toPublicUser(...)` |
| RNF08 | Sessoes persistidas no backend | Implementado | Tabela `app_sessions` no PostgreSQL |
| RNF09 | Auditoria de acoes sensiveis | Pendente | Previsto em `docs/ARCHITECTURE.md`, ainda sem tabela/rotas |
| RNF10 | Migracoes versionadas de banco | Pendente | Existe `server/schema.sql`, mas nao ha pasta de migrations |
| RNF11 | App mobile Expo/React Native consumindo a mesma API | Pendente | Previsto no roadmap, ainda nao implementado |

## Regras de Seguranca

### Autenticacao

Estado atual:

- Senhas novas usam bcrypt.
- Senhas legadas em texto puro sao migradas para hash no primeiro login.
- Sessao usa token gerado no servidor e enviado no header `x-medhora-token`.
- Sessao do backend e persistida em `app_sessions` no PostgreSQL.
- Sessao expira conforme `SESSION_MAX_AGE_MS`.

Proximos reforcos:

- Criar rotina de limpeza periodica para sessoes expiradas.
- Exigir senha mais forte do que PIN numerico em contas reais.
- Adicionar limite de tentativas de login por CPF/IP.

### Autorizacao

Regras obrigatorias:

- Usuario acessa os proprios dados.
- Cuidador acessa dados do idoso apenas quando houver vinculo.
- Idoso consegue remover cuidador vinculado.
- Dados sensiveis nunca devem ser retornados sem necessidade.

### Validacao

Validar no cliente para orientar o usuario, mas validar no servidor para proteger o sistema.

Campos minimos:

- CPF com 11 digitos.
- Senha com politica definida.
- Perfil limitado a `idoso` ou `cuidador`.
- Horario no formato `HH:mm`.
- Dose numerica positiva.
- Unidade em lista permitida.

### Privacidade

Regras:

- Notificacoes devem evitar detalhes sensiveis na tela bloqueada.
- O cuidador so ve idosos vinculados.
- O idoso deve entender quem pode ver seus dados.
- Backups devem ter acesso restrito.

## Compatibilidade HTTP

| Metodo | Existe no backend | Uso atual |
| --- | --- | --- |
| GET | Sim | Healthcheck, dashboard, relatorios, busca e listagem |
| POST | Sim | Login, cadastro, logout, vinculos, criacao e marcacao |
| PUT | Nao | O projeto usa `PATCH` para atualizacao parcial |
| PATCH | Sim | Atualizacao de perfil |
| DELETE | Sim | Remocao de vinculo e medicamento |

## Pontos de Pendencia

| Ponto | Impacto | Recomendacao |
| --- | --- | --- |
| Auditoria ausente | Dificulta rastrear acoes sensiveis | Criar `audit_logs` e registrar eventos criticos |
| Migracoes ausentes | Risco em deploy e evolucao de schema | Adicionar migrations versionadas |
| PUT ausente | Nao e erro, mas deve estar documentado | Manter `PATCH` para atualizacao parcial |
| Credenciais locais no exemplo | Risco de exposicao acidental | Usar placeholders em `.env.example` |
