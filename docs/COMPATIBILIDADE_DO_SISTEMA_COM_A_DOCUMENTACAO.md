# MedHora - Compatibilidade entre Sistema e Documentacao

Este documento confirma a compatibilidade entre o sistema implementado e a documentacao tecnica do projeto.

Documentos separados por tema:

- Requisitos: `docs/REQUISITOS.md`.
- Diagramas: `docs/DIAGRAMAS.md`.
- Arquitetura: `docs/ARQUITETURA.md`.
- Padroes de projeto: `docs/PADROES_DO_PROJETO.md`.

## Escopo Validado

- Frontend: React + Vite em `src/`.
- Backend: Express em `server/index.js`.
- Banco de dados: PostgreSQL com schema `medhora_app` em `server/schema.sql`.
- Integracao HTTP centralizada em `src/services/api.js`.
- Seguranca basica: CORS por ambiente, senha com hash bcrypt e sessoes persistidas no PostgreSQL.

## Compatibilidade por Documento

| Documento | Compatibilidade | Observacao |
| --- | --- | --- |
| `REQUISITOS.md` | Compativel | Requisitos implementados e pendentes refletem o estado atual do codigo |
| `DIAGRAMAS.md` | Compativel | Diagramas representam frontend, API Express e PostgreSQL atuais |
| `ARQUITETURA.md` | Compativel | Camadas, telas, dados, operacao e roadmap seguem a estrutura do projeto |
| `PADROES_DO_PROJETO.md` | Compativel | Padroes listados aparecem nos arquivos atuais do frontend e backend |

## Seguranca Confirmada

| Item | Status | Observacao |
| --- | --- | --- |
| Hash de senha | Implementado | `bcryptjs` com `SALT_ROUNDS = 10` |
| Comparacao segura de senha | Implementado | `bcrypt.compare(...)` |
| Migracao de senha legada | Implementado | Senha em texto puro e convertida para hash no primeiro login |
| Token de sessao | Implementado | `crypto.randomUUID()` e header `x-medhora-token` |
| Expiracao de sessao | Implementado | `SESSION_MAX_AGE_MS` e tabela `app_sessions` |
| Logout invalida token | Implementado | Remove token de `app_sessions` |
| CORS por ambiente | Implementado | `CORS_ORIGIN` |
| Criptografia de dados em repouso | Nao implementado | Dados como CPF, telefone e medicamentos nao sao criptografados no banco |
| HTTPS no Express | Nao implementado diretamente | Deve ser provido por proxy/deploy em producao |

## Pontos de Incompatibilidade ou Pendencia

| Ponto | Impacto | Recomendacao |
| --- | --- | --- |
| Auditoria ausente | Dificulta rastrear acoes sensiveis | Criar `audit_logs` e registrar eventos criticos |
| Migracoes ausentes | Risco em deploy e evolucao de schema | Adicionar migrations versionadas |
| PUT ausente | Nao e erro, mas deve estar documentado | Manter `PATCH` para atualizacao parcial |
| Credenciais locais no exemplo | Risco de exposicao acidental | Usar placeholders em `.env.example` |

## Conclusao

A documentacao foi separada em requisitos, diagramas, arquitetura e padroes de projeto. O sistema continua compativel nos fluxos principais de autenticacao, medicamentos, vinculos, dashboard, relatorios, CORS e hash de senhas. As pendencias documentadas correspondem ao estado real do codigo: auditoria, migrations e planejamento mobile.
