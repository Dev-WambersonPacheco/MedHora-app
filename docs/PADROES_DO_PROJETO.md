# MedHora - Padroes de Projeto

Este documento concentra os padroes de projeto e organizacao observados no MedHora.

## Padroes Aplicados

| Padrao | Onde aparece | Objetivo |
| --- | --- | --- |
| Layered Architecture | Separacao entre `src/`, `server/` e PostgreSQL | Evitar acesso direto ao banco pelo frontend |
| API Client | `src/services/api.js` | Centralizar chamadas HTTP e token de sessao |
| Context Provider | `AuthContext.jsx` e `MedicationContext.jsx` | Compartilhar estado global no React |
| Controller por rota | Handlers Express em `server/index.js` | Receber request, validar e responder |
| Data Access Helper | `query(...)` e `withDbTransaction(...)` em `server/db.js` | Concentrar acesso ao PostgreSQL |
| DTO/Public Mapper | `toPublicUser(...)`, `toLinkedUser(...)` | Evitar retorno de campos sensiveis |
| Schema-first simples | `server/schema.sql` | Declarar estrutura relacional do banco |

## Organizacao Atual

### Layered Architecture

O frontend se comunica apenas com a API. A API concentra validacoes, autorizacao e persistencia. O banco fica isolado no backend.

Beneficios:

- Reduz vazamento de credenciais do banco.
- Facilita evolucao para mobile consumindo a mesma API.
- Mantem regras sensiveis fora do navegador.

### API Client

O arquivo `src/services/api.js` centraliza chamadas HTTP e envio do token `x-medhora-token`.

Beneficios:

- Evita duplicacao de URL, headers e tratamento basico de resposta.
- Deixa telas e contextos focados em fluxo de usuario.
- Facilita troca de origem da API por ambiente.

### Context Provider

Os contextos React compartilham estado de autenticacao e medicamentos entre paginas.

Beneficios:

- Evita prop drilling.
- Centraliza login/logout e estado do usuario.
- Mantem lista de medicamentos sincronizada entre telas.

### Controller por Rota

O backend usa handlers Express para receber requests, validar dados e responder.

Beneficios:

- Fluxo simples para a fase atual do projeto.
- Boa legibilidade enquanto o numero de rotas ainda e controlado.
- Permite migrar depois para modulos por dominio.

### Data Access Helper

`server/db.js` concentra conexao, queries e transacoes.

Beneficios:

- Evita criar conexoes espalhadas pelo backend.
- Facilita tratamento de transacoes.
- Cria um ponto unico para ajustes de pool e configuracao.

### DTO/Public Mapper

Funcoes como `toPublicUser(...)` e `toLinkedUser(...)` transformam dados internos em respostas seguras.

Beneficios:

- Evita retorno acidental de senha/hash.
- Padroniza o formato enviado ao frontend.
- Reduz acoplamento entre schema do banco e contrato da API.

### Schema-first Simples

O arquivo `server/schema.sql` declara tabelas, indices e constraints.

Beneficios:

- Facilita recriar ambiente local.
- Torna a estrutura relacional explicita.
- Serve como base para futuras migrations versionadas.

## Evolucao Recomendada

Quando o backend crescer, separar `server/index.js` por dominios:

```text
server/modules/
  auth/
  users/
  medications/
  caregiver-links/
  reminders/
  routines/
  reports/
  audit/
```

Cada modulo pode evoluir com:

- Rotas do dominio.
- Validadores.
- Servicos de regra de negocio.
- Repositorios/data access quando houver complexidade real.
- Testes focados no comportamento do dominio.
