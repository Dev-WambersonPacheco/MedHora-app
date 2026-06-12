# MedHora - Arquitetura Web e Mobile

Este documento define a base tecnica para evoluir o MedHora como app seguro, acessivel e multiplataforma para idosos e cuidadores.

Documento complementar: `docs/SYSTEM_COMPATIBILITY.md` confirma a compatibilidade entre requisitos, diagramas, arquitetura, padroes de projeto e o codigo implementado.

## Objetivo

O MedHora deve permitir que idosos organizem medicamentos e rotina diaria, enquanto cuidadores acompanham vinculos autorizados, pendencias e alertas importantes.

Principios do projeto:

- O app nunca acessa PostgreSQL direto pelo frontend.
- Toda regra sensivel fica no backend.
- Cada acesso a dados de saude depende de autenticacao e vinculo explicito.
- A interface deve priorizar clareza, contraste, botoes grandes e poucos passos.
- Web e mobile devem compartilhar regras de negocio e modelos de dados.

## Camadas

### Frontend

Estado atual: React + Vite como PWA.

Direcao recomendada:

- Manter o PWA como primeira entrega web.
- Reaproveitar regras, textos e componentes ao migrar ou expandir para Expo/React Native.
- Concentrar chamadas HTTP em `src/services/api.js`.
- Evitar regra de permissao critica apenas no cliente.

Responsabilidades:

- Login, cadastro e copia temporaria do token de sessao.
- Fluxos de medicamentos, rotina, perfil e cuidador.
- Feedback visual simples para idosos.
- Notificacoes locais quando suportadas pelo navegador/dispositivo.

### Backend

Estado atual: Express em `server/index.js`.

Responsabilidades:

- Autenticacao.
- Hash de senha.
- Validacao de entrada.
- Permissao por usuario autenticado.
- Vinculo cuidador/idoso.
- Consulta e persistencia no PostgreSQL.
- Ponto unico para futuras integracoes de notificacao, auditoria e mobile.

### Banco de Dados

Estado atual: PostgreSQL com schema `medhora_app`.

Responsabilidades:

- Persistir usuarios, medicamentos, tomadas e vinculos.
- Garantir integridade por chaves estrangeiras.
- Indexar consultas por usuario, dia e vinculos.
- Preparar historico/auditoria para acoes sensiveis.

## Estrutura de Pastas Recomendada

Estrutura atual com evolucao sugerida:

```text
server/
  db.js
  index.js
  schema.sql
  modules/
    auth/
    users/
    medications/
    caregiver-links/
    audit/
src/
  components/
  context/
  data/
  pages/
    Login.jsx
    CreateAccount.jsx
    Home.jsx
    AddMedication.jsx
    MedicationList.jsx
    Reminders.jsx
    Caregiver.jsx
    Profile.jsx
  services/
    api.js
  utils/
docs/
  ARCHITECTURE.md
```

O backend ainda pode continuar em um unico arquivo durante a fase inicial. A separacao por modulos deve acontecer quando as rotas crescerem, para reduzir risco de regressao.

## Mapa de Telas

### Autenticacao

- Login: CPF e senha.
- Criar conta: nome, CPF, senha e tipo de perfil.
- Recuperacao de acesso: fora do escopo atual.

### Idoso

- Inicio: resumo do dia e medicamentos pendentes.
- Adicionar medicamento: busca, dose, unidade e horarios.
- Medicamentos pendentes: marcar como tomado e remover com confirmacao.
- Rotina: lembretes e tarefas do dia.
- Perfil: dados pessoais, codigo de convite, cuidadores vinculados.

### Cuidador

- Inicio: resumo dos idosos acompanhados.
- Cuidador: painel de acompanhamento e lembretes.
- Perfil: codigo de convite, idosos vinculados, desvincular perfil.
- Alertas: proxima etapa para centralizar pendencias criticas.

### Sistema

- Auditoria: futuro painel para acoes sensiveis.
- Configuracoes: privacidade, notificacoes e encerramento de sessoes.

## Modelo de Dados

### users

Representa idoso ou cuidador.

Campos principais:

- `cpf`: identificador primario.
- `password`: hash da senha.
- `name`: nome do usuario.
- `phone`, `email`: contato.
- `role`: `idoso` ou `cuidador`.
- `invite_code`: codigo para criar vinculo.
- `created_at`: data de criacao.

### caregiver_links

Representa o vinculo autorizado entre idoso e cuidador.

Campos principais:

- `elder_cpf`: CPF do idoso.
- `caregiver_cpf`: CPF do cuidador.
- `created_at`: data do vinculo.

Regras:

- Um usuario nao pode se vincular a si mesmo.
- Cuidador so vincula idoso.
- Idoso so vincula cuidador.
- O vinculo pode ser removido por qualquer ponta autenticada.

### medications

Representa uma dose programada.

Campos principais:

- `id`: identificador unico.
- `user_cpf`: dono do medicamento.
- `name`: nome do medicamento.
- `amount`: quantidade.
- `unit`: unidade.
- `time`: horario.
- `created_at`: data de cadastro.

### medication_intake

Representa o status de tomada em um dia.

Campos principais:

- `user_cpf`: dono da tomada.
- `medication_id`: medicamento.
- `day_key`: dia de controle.
- `taken`: tomado ou pendente.

### app_sessions

Representa sessoes validas do backend.

Campos principais:

- `token`: identificador da sessao.
- `user_cpf`: usuario autenticado.
- `role`: perfil da sessao.
- `created_at`: data de criacao.
- `expires_at`: data de expiracao.

### caregiver_reminders

Representa lembretes criados pelo cuidador.

Campos principais:

- `id`: identificador unico.
- `user_cpf`: cuidador dono do lembrete.
- `title`, `description`: conteudo do lembrete.
- `reminder_date`, `reminder_time`: data e hora do alerta.
- `priority`: prioridade `alta`, `media` ou `baixa`.

### routines

Representa rotinas do usuario.

Campos principais:

- `id`: identificador unico.
- `user_cpf`: dono da rotina.
- `category`: tipo de rotina.
- `title`, `description`: conteudo da rotina.
- `time`: horario inicial.
- `frequency`: `daily` ou `interval`.
- `repeat_every_hours`: intervalo quando aplicavel.

### audit_logs

Proxima tabela recomendada.

Campos sugeridos:

- `id`
- `actor_cpf`
- `target_cpf`
- `action`
- `metadata`
- `created_at`

Acoes que devem gerar log:

- Login bem-sucedido.
- Alteracao de perfil.
- Criacao e remocao de vinculo.
- Cadastro, remocao e alteracao de medicamento.
- Marcacao de medicamento como tomado.
- Logout e expiracao de sessao.

## Regras de Seguranca

### Autenticacao

Estado atual:

- Senhas novas usam bcrypt.
- Senhas legadas em texto puro sao migradas para hash no primeiro login.
- Sessao usa token gerado no servidor e enviado no header `x-medhora-token`.
- Sessao do backend e persistida em `app_sessions` no PostgreSQL.

Proximos reforcos:

- Expirar sessoes por tempo.
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

## Fluxo Cuidador e Idoso

1. O usuario cria conta como `idoso` ou `cuidador`.
2. O backend gera `invite_code`.
3. Uma ponta informa CPF, email ou codigo de convite da outra.
4. O backend valida que os perfis sao complementares.
5. O vinculo e salvo em `caregiver_links`.
6. O cuidador passa a ver resumo, pendencias e proximas doses do idoso vinculado.
7. Qualquer ponta pode desvincular o acesso.
8. A remocao do vinculo interrompe o acesso aos dados compartilhados.

## Notificacoes

Estado atual:

- Notificacoes locais no frontend quando o navegador permite.
- Lembretes do cuidador persistidos no PostgreSQL.
- Rotinas do idoso persistidas no PostgreSQL.

Direcao recomendada:

- Manter lembretes e rotinas sincronizados pela API.
- Criar servico backend de agendamento.
- Para mobile, usar Expo Notifications ou FCM/APNs.
- Separar notificacoes de medicamento, rotina e alerta critico.
- Evitar enviar nome completo do medicamento em notificacoes sensiveis, se o usuario escolher modo privado.

## Operacao e Deploy

### Ambientes

Criar ambientes separados:

- `development`: maquina local.
- `staging`: homologacao.
- `production`: usuarios reais.

Variaveis minimas:

- `DATABASE_URL`
- `PORT`
- `SESSION_SECRET` ou chave equivalente quando houver JWT/sessao assinada.
- `CORS_ORIGIN`
- chaves de notificacao mobile quando aplicavel.

### Banco

Antes de producao:

- Usar migracoes versionadas.
- Remover dados de exemplo.
- Configurar backup automatico.
- Configurar usuario de banco com menor privilegio.
- Validar indices para dashboard e listagem de medicamentos.

### Observabilidade

Itens recomendados:

- Logs estruturados no backend.
- Registro de erros de API.
- Monitoramento de disponibilidade.
- Auditoria de acoes sensiveis.
- Alertas para falha de banco e falha de notificacao.

## Roadmap Tecnico

### Fase 1 - Base segura para PWA

- Centralizar regras no backend.
- Expirar sessoes.
- Endpoint de logout.
- Validacoes fortes no servidor.
- Confirmacoes em exclusoes sensiveis.
- Auditoria basica.

### Fase 2 - Privacidade e cuidador

- Persistir lembretes do cuidador no banco.
- Permitir configuracao de privacidade das notificacoes.
- Melhorar painel de alertas do cuidador.
- Registrar historico de alteracoes importantes.

### Fase 3 - Mobile

- Extrair contratos de API.
- Criar app Expo.
- Reaproveitar design tokens e regras de formulario.
- Integrar notificacoes push.
- Testar acessibilidade em telas pequenas.

### Fase 4 - Producao

- Migracoes versionadas.
- CI com lint/build/test.
- Deploy web.
- Deploy API.
- Backup e monitoramento.
- Politica de privacidade e termos de uso.
