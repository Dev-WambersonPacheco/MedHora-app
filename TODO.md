# MedHora App - TODO

## Setup
- [x] Criar package.json com dependências (React, Vite, React Router, Lucide)
- [x] Criar vite.config.js
- [x] Criar index.html
- [x] Criar public/manifest.json (PWA)
- [x] Criar public/sw.js (Service Worker)

## Core
- [x] src/main.jsx - Entry point
- [x] src/App.jsx - Rotas
- [x] src/index.css - Estilos globais

## Contexts
- [x] src/context/AuthContext.jsx
- [x] src/context/MedicationContext.jsx

## Utils
- [x] src/utils/notifications.js

## Components
- [x] src/components/BottomNav.jsx + css
- [x] src/components/Header.jsx + css

## Pages
- [x] src/pages/Login.jsx + css
- [x] src/pages/CreateAccount.jsx + css
- [x] src/pages/Home.jsx + css
- [x] src/pages/AddMedication.jsx + css
- [x] src/pages/MedicationList.jsx + css
- [x] src/pages/Reminders.jsx + css
- [x] src/pages/Caregiver.jsx + css
- [x] src/pages/Profile.jsx + css

## Testing
- [x] npm install
- [x] npm run dev
- [x] Validar telas no browser

## Banco de Dados
- [x] Conectar o projeto ao PostgreSQL local com o usuário postgres
- [x] Criar e usar o schema medhora_app como dono do app

## Arquitetura e Segurança
- [x] Documentar arquitetura web/mobile, fluxo cuidador/idoso e modelo de dados em docs/ARCHITECTURE.md
- [x] Manter frontend consumindo PostgreSQL somente via API
- [x] Criar perfis idoso/cuidador com vínculo explícito
- [x] Adicionar confirmação antes de excluir medicamento
- [x] Expirar sessões e invalidar token no logout
- [x] Persistir lembretes do cuidador no PostgreSQL
- [x] Persistir rotinas do idoso no PostgreSQL
- [x] Persistir sessoes do backend no PostgreSQL
- [ ] Criar logs de auditoria para ações sensíveis
- [ ] Adicionar migrações versionadas para produção
- [x] Configurar CORS por ambiente antes do deploy
- [ ] Planejar app Expo/React Native consumindo a mesma API

## Acompanhamento de Tratamento
- [x] Mostrar idosos cadastrados na tela inicial do cuidador
- [x] Adicionar acesso rápido ao status de medicamentos por idoso
- [x] Separar Horários do cuidador por Próximos, Concluídos e Não tomados
- [x] Separar Horários do idoso por Não tomados, Tomados e Próximos
- [x] Permitir navegação lateral por toque entre abas de horários
- [x] Exigir duração em dias no cadastro de medicamentos
- [x] Controlar período ativo do medicamento por data inicial e final
- [x] Gerar relatório semanal e mensal para cuidadores
