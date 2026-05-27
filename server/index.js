import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import { query, withDbTransaction } from './db.js'

dotenv.config()

const app = express()
const port = Number(process.env.PORT || 4000)
const SALT_ROUNDS = 10
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS || 1000 * 60 * 60 * 8)
const PROFILE_ROLES = new Set(['idoso', 'cuidador'])
const activeSessions = new Map()
const passwordRecoveryCodes = new Map()
const SMS_PROVIDER = String(process.env.SMS_PROVIDER || 'twilio').toLowerCase()
const TWILIO_ACCOUNT_SID = String(process.env.TWILIO_ACCOUNT_SID || '')
const TWILIO_AUTH_TOKEN = String(process.env.TWILIO_AUTH_TOKEN || '')
const TWILIO_PHONE_NUMBER = String(process.env.TWILIO_PHONE_NUMBER || '')

const corsOrigin = process.env.CORS_ORIGIN
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined))
app.use(express.json())

function cleanCpf(cpf = '') {
  return String(cpf).replace(/\D/g, '')
}

function cleanPhone(phone = '') {
  return String(phone).replace(/\D/g, '')
}

function normalizePhoneForSms(phone = '') {
  const digits = cleanPhone(phone)
  if (!digits) return ''
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  if (String(phone).trim().startsWith('+')) return String(phone).trim()
  return `+${digits}`
}

function toPublicUser(userRow) {
  return {
    cpf: userRow.cpf,
    name: userRow.name,
    phone: userRow.phone || '',
    email: userRow.email || '',
    caregiver: userRow.caregiver || null,
    role: normalizeRole(userRow.role),
    inviteCode: userRow.invite_code || null
  }
}

function getTodayKey() {
  const d = new Date()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${month}-${day}`
}

function isBcryptHash(value = '') {
  return /^\$2[aby]\$\d{2}\$/.test(value)
}

function normalizeRole(value = '') {
  const role = String(value || '').trim().toLowerCase()
  return PROFILE_ROLES.has(role) ? role : 'idoso'
}

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

function generateRecoveryCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function maskPhone(phone = '') {
  const digits = cleanPhone(phone).slice(0, 11)
  if (digits.length < 8) return 'telefone cadastrado'
  const lastFour = digits.slice(-4)
  return `(**) *****-${lastFour}`
}

async function sendSms({ to, body }) {
  if (SMS_PROVIDER !== 'twilio') {
    throw new Error('Provedor de SMS nao configurado. Defina SMS_PROVIDER=twilio para enviar SMS.')
  }

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    throw new Error('Configurações do Twilio ausentes. Defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER.')
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      To: normalizePhoneForSms(to),
      From: TWILIO_PHONE_NUMBER,
      Body: body
    }).toString()
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = payload?.message || payload?.error_message || 'Falha ao enviar SMS.'
    throw new Error(message)
  }

  return payload
}

function cleanupRecoveryCodes() {
  const now = Date.now()
  for (const [cpf, recovery] of passwordRecoveryCodes.entries()) {
    if (!recovery || recovery.expiresAt <= now) {
      passwordRecoveryCodes.delete(cpf)
    }
  }
}

function createSession(userRow) {
  const token = crypto.randomUUID()
  const now = Date.now()
  activeSessions.set(token, {
    cpf: userRow.cpf,
    role: normalizeRole(userRow.role),
    createdAt: now,
    expiresAt: now + SESSION_MAX_AGE_MS
  })
  return token
}

function getSessionFromRequest(req) {
  const token = String(req.header('x-medhora-token') || '').trim()
  if (!token) return null

  const session = activeSessions.get(token)
  if (!session) return null

  if (session.expiresAt <= Date.now()) {
    activeSessions.delete(token)
    return null
  }

  return { token, ...session }
}

function requireSelfAccess(req, res, cpf) {
  const session = getSessionFromRequest(req)
  if (!session || session.cpf !== cpf) {
    res.status(401).json({ error: 'Sessao invalida ou expirada.' })
    return null
  }

  return session
}

async function ensureUniqueInviteCode(existingCodes) {
  let code = generateInviteCode()
  while (existingCodes.has(code)) {
    code = generateInviteCode()
  }
  existingCodes.add(code)
  return code
}

async function ensureProfileSchema() {
  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'idoso'
  `)

  await query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS invite_code VARCHAR(16)
  `)

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_invite_code
    ON users(invite_code)
    WHERE invite_code IS NOT NULL
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_users_role
    ON users(role)
  `)

  await query(`
    CREATE TABLE IF NOT EXISTS caregiver_links (
      id BIGSERIAL PRIMARY KEY,
      elder_cpf VARCHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
      caregiver_cpf VARCHAR(11) NOT NULL REFERENCES users(cpf) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (elder_cpf, caregiver_cpf)
    )
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_caregiver_links_elder
    ON caregiver_links(elder_cpf)
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_caregiver_links_caregiver
    ON caregiver_links(caregiver_cpf)
  `)

  await query(`
    ALTER TABLE medications
    ADD COLUMN IF NOT EXISTS treatment_days INTEGER NOT NULL DEFAULT 1
  `)

  await query(`
    ALTER TABLE medications
    ADD COLUMN IF NOT EXISTS start_date DATE NOT NULL DEFAULT CURRENT_DATE
  `)

  await query(`
    ALTER TABLE medications
    ADD COLUMN IF NOT EXISTS end_date DATE NOT NULL DEFAULT CURRENT_DATE
  `)

  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'medications'
          AND column_name = 'time'
          AND data_type <> 'time without time zone'
      ) THEN
        ALTER TABLE medications
        ALTER COLUMN time TYPE TIME
        USING (
          CASE
            WHEN time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' THEN time::time
            WHEN time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$' THEN time::time
            ELSE '00:00'::time
          END
        );
      END IF;
    END $$;
  `)

  await query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'medication_intake'
          AND column_name = 'day_key'
          AND data_type <> 'date'
      ) THEN
        ALTER TABLE medication_intake
        ALTER COLUMN day_key TYPE DATE
        USING (
          CASE
            WHEN day_key::text ~ '^[0-9]{4}-[0-9]{1,2}-[0-9]{1,2}$' THEN day_key::date
            ELSE CURRENT_DATE
          END
        );
      END IF;
    END $$;
  `)

  await query(`
    UPDATE medications
    SET
      treatment_days = GREATEST(COALESCE(treatment_days, 1), 1),
      start_date = COALESCE(start_date, created_at::date, CURRENT_DATE),
      end_date = COALESCE(end_date, COALESCE(start_date, created_at::date, CURRENT_DATE) + (GREATEST(COALESCE(treatment_days, 1), 1) - 1))
    WHERE treatment_days IS NULL
       OR start_date IS NULL
       OR end_date IS NULL
  `)

  await query(`
    UPDATE medications
    SET
      treatment_days = 365,
      end_date = start_date + 364
    WHERE treatment_days = 1
      AND start_date = end_date
      AND created_at::date < CURRENT_DATE
  `)

  await query(`
    UPDATE medications
    SET amount = NULL
    WHERE amount IS NOT NULL
      AND amount <= 0
  `)

  await query(`
    UPDATE medications
    SET end_date = start_date
    WHERE end_date < start_date
  `)

  await query(`
    CREATE INDEX IF NOT EXISTS idx_medications_active_period
    ON medications(user_cpf, start_date, end_date)
  `)

  await query(`
    DO $$
    BEGIN
      ALTER TABLE medications
      ADD CONSTRAINT chk_medications_amount_positive
      CHECK (amount IS NULL OR amount > 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  await query(`
    DO $$
    BEGIN
      ALTER TABLE medications
      ADD CONSTRAINT chk_medications_treatment_days_positive
      CHECK (treatment_days > 0);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  await query(`
    DO $$
    BEGIN
      ALTER TABLE medications
      ADD CONSTRAINT chk_medications_valid_period
      CHECK (end_date >= start_date);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `)

  const usersResult = await query('SELECT cpf, invite_code FROM users ORDER BY cpf')
  const existingCodesResult = await query('SELECT invite_code FROM users WHERE invite_code IS NOT NULL')
  const existingCodes = new Set(existingCodesResult.rows.map((row) => String(row.invite_code).trim()).filter(Boolean))

  for (const row of usersResult.rows) {
    const inviteCode = String(row.invite_code || '').trim() || await ensureUniqueInviteCode(existingCodes)
    await query(
      `UPDATE users
       SET role = COALESCE(NULLIF(role, ''), 'idoso'),
           invite_code = $2
       WHERE cpf = $1`,
      [row.cpf, inviteCode]
    )
  }
}

function formatAmountText(value) {
  if (value === null || value === undefined || value === '') return ''

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return String(value).trim()

  const text = String(numeric)
  return text.includes('.') ? text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : text
}

function formatDose(amount, unit, legacyDose = '') {
  const amountText = formatAmountText(amount)
  const hasUnit = typeof unit === 'string' && unit.trim()
  if (amountText && hasUnit) {
    return `${amountText} ${unit}`.trim()
  }
  return String(legacyDose || '').trim()
}

function isValidTime(value = '') {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10)
}

function getPeriodRange(period = 'weekly') {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = period === 'monthly' ? 30 : 7
  const start = new Date(today)
  start.setDate(today.getDate() - (days - 1))

  return {
    days,
    startKey: toDateKey(start),
    endKey: toDateKey(today)
  }
}

async function getMedicationFeed(cpf, dayKey = getTodayKey()) {
  const result = await query(
    `SELECT
      m.id,
      m.name,
      m.amount,
      m.unit,
      m.treatment_days AS "treatmentDays",
      m.start_date AS "startDate",
      m.end_date AS "endDate",
      COALESCE(
        CASE
          WHEN m.amount IS NOT NULL AND m.unit IS NOT NULL THEN concat(m.amount::text, ' ', m.unit)
          ELSE NULL
        END,
        m.dose
      ) AS dose,
      TO_CHAR(m.time, 'HH24:MI') AS time,
      m.created_at AS "createdAt",
      COALESCE(mi.taken, FALSE) AS "takenToday"
    FROM medications m
    LEFT JOIN medication_intake mi
      ON mi.medication_id = m.id
      AND mi.user_cpf = m.user_cpf
      AND mi.day_key = $2::date
    WHERE m.user_cpf = $1
      AND $2::date BETWEEN m.start_date AND m.end_date
    ORDER BY m.time ASC`,
    [cpf, dayKey]
  )

  return result.rows.map((medication) => ({
    ...medication,
    dose: formatDose(medication.amount, medication.unit, medication.dose)
  }))
}

function toLinkedUser(userRow, summary = {}) {
  return {
    ...toPublicUser(userRow),
    linkedAt: userRow.linked_at || null,
    medicationCount: Number(summary.medicationCount || 0),
    pendingMedications: Number(summary.pendingMedications || 0),
    completedMedications: Number(summary.completedMedications || 0),
    medications: summary.medications || [],
    pendingItems: summary.pendingItems || [],
    reports: summary.reports || null
  }
}

async function getMedicationSummary(cpf, dayKey = getTodayKey()) {
  const result = await query(
    `SELECT
      COUNT(*)::int AS "medicationCount",
      COUNT(*) FILTER (WHERE COALESCE(mi.taken, FALSE) = FALSE)::int AS "pendingMedications",
      COUNT(*) FILTER (WHERE COALESCE(mi.taken, FALSE) = TRUE)::int AS "completedMedications"
    FROM medications m
    LEFT JOIN medication_intake mi
      ON mi.medication_id = m.id
      AND mi.user_cpf = m.user_cpf
      AND mi.day_key = $2::date
    WHERE m.user_cpf = $1
      AND $2::date BETWEEN m.start_date AND m.end_date`,
    [cpf, dayKey]
  )

  return result.rows[0] || { medicationCount: 0, pendingMedications: 0, completedMedications: 0 }
}

async function getTreatmentReport(cpf, period = 'weekly') {
  const normalizedPeriod = period === 'monthly' ? 'monthly' : 'weekly'
  const { days, startKey, endKey } = getPeriodRange(normalizedPeriod)

  const result = await query(
    `WITH days AS (
       SELECT generate_series($2::date, $3::date, interval '1 day')::date AS report_date
     ),
     scheduled AS (
       SELECT
         d.report_date,
         m.id,
         m.user_cpf,
         m.name,
         m.time
       FROM days d
       INNER JOIN medications m
         ON m.user_cpf = $1
        AND d.report_date BETWEEN m.start_date AND m.end_date
     ),
     daily AS (
       SELECT
         s.report_date,
         COUNT(*)::int AS scheduled,
         COUNT(*) FILTER (WHERE COALESCE(mi.taken, FALSE) = TRUE)::int AS taken,
         COUNT(*) FILTER (
           WHERE COALESCE(mi.taken, FALSE) = FALSE
             AND (
               s.report_date < CURRENT_DATE
               OR (s.report_date = CURRENT_DATE AND s.time < LOCALTIME)
             )
         )::int AS missed
       FROM scheduled s
       LEFT JOIN medication_intake mi
         ON mi.user_cpf = s.user_cpf
       AND mi.medication_id = s.id
       AND mi.day_key = s.report_date
       GROUP BY s.report_date
     ),
     pending_today AS (
       SELECT COUNT(*)::int AS total
       FROM scheduled s
       LEFT JOIN medication_intake mi
         ON mi.user_cpf = s.user_cpf
       AND mi.medication_id = s.id
       AND mi.day_key = s.report_date
       WHERE s.report_date = CURRENT_DATE
         AND COALESCE(mi.taken, FALSE) = FALSE
     )
     SELECT
       COALESCE(SUM(daily.scheduled), 0)::int AS "scheduledDoses",
       COALESCE(SUM(daily.taken), 0)::int AS "takenDoses",
       COALESCE(SUM(daily.missed), 0)::int AS "missedDoses",
       COALESCE((SELECT total FROM pending_today), 0)::int AS "pendingMedications",
       COALESCE(
         json_agg(
           json_build_object(
             'date', daily.report_date::text,
             'scheduled', daily.scheduled,
             'taken', daily.taken,
             'adherence', CASE
               WHEN daily.scheduled = 0 THEN 0
               ELSE ROUND((daily.taken::numeric / daily.scheduled::numeric) * 100)
             END
           )
           ORDER BY daily.report_date
         ) FILTER (WHERE daily.report_date IS NOT NULL),
         '[]'::json
       ) AS "adherenceTrend"
     FROM daily`,
    [cpf, startKey, endKey]
  )

  const row = result.rows[0] || {}
  const scheduledDoses = Number(row.scheduledDoses || 0)
  const takenDoses = Number(row.takenDoses || 0)

  return {
    period: normalizedPeriod,
    startDate: startKey,
    endDate: endKey,
    days,
    scheduledDoses,
    takenDoses,
    missedDoses: Number(row.missedDoses || 0),
    pendingMedications: Number(row.pendingMedications || 0),
    adherenceRate: scheduledDoses > 0 ? Math.round((takenDoses / scheduledDoses) * 100) : 0,
    adherenceTrend: row.adherenceTrend || []
  }
}

async function findUserByIdentifier(identifier) {
  const value = String(identifier || '').trim()
  if (!value) return null

  const cleanedCpf = cleanCpf(value)
  if (cleanedCpf.length === 11) {
    const result = await query(
      'SELECT cpf, name, phone, email, caregiver, role, invite_code FROM users WHERE cpf = $1 LIMIT 1',
      [cleanedCpf]
    )
    return result.rows[0] || null
  }

  const result = await query(
    `SELECT cpf, name, phone, email, caregiver, role, invite_code
     FROM users
     WHERE LOWER(email) = LOWER($1)
        OR invite_code = $1
        OR LOWER(name) = LOWER($1)
        OR name ILIKE $2
     ORDER BY CASE
       WHEN LOWER(email) = LOWER($1) THEN 1
       WHEN invite_code = $1 THEN 2
       WHEN LOWER(name) = LOWER($1) THEN 3
       ELSE 4
     END
     LIMIT 1`,
    [value, `%${value}%`]
  )

  return result.rows[0] || null
}

async function getLinkedProfiles(cpf, dayKey = getTodayKey()) {
  const caregiversResult = await query(
    `SELECT u.cpf, u.name, u.phone, u.email, u.caregiver, u.role, u.invite_code, cl.created_at AS linked_at
     FROM caregiver_links cl
     INNER JOIN users u ON u.cpf = cl.caregiver_cpf
     WHERE cl.elder_cpf = $1
     ORDER BY u.name ASC`,
    [cpf]
  )

  const eldersResult = await query(
    `SELECT u.cpf, u.name, u.phone, u.email, u.caregiver, u.role, u.invite_code, cl.created_at AS linked_at
     FROM caregiver_links cl
     INNER JOIN users u ON u.cpf = cl.elder_cpf
     WHERE cl.caregiver_cpf = $1
     ORDER BY u.name ASC`,
    [cpf]
  )

  const caregivers = await Promise.all(
    caregiversResult.rows.map(async (row) => {
      const summary = await getMedicationSummary(row.cpf, dayKey)
      const medications = await getMedicationFeed(row.cpf, dayKey)
      const weeklyReport = await getTreatmentReport(row.cpf, 'weekly')
      const monthlyReport = await getTreatmentReport(row.cpf, 'monthly')
      return toLinkedUser(row, {
        ...summary,
        medications,
        pendingItems: medications.filter((medication) => !medication.takenToday),
        reports: { weekly: weeklyReport, monthly: monthlyReport }
      })
    })
  )

  const elders = await Promise.all(
    eldersResult.rows.map(async (row) => {
      const summary = await getMedicationSummary(row.cpf, dayKey)
      const medications = await getMedicationFeed(row.cpf, dayKey)
      const weeklyReport = await getTreatmentReport(row.cpf, 'weekly')
      const monthlyReport = await getTreatmentReport(row.cpf, 'monthly')
      return toLinkedUser(row, {
        ...summary,
        medications,
        pendingItems: medications.filter((medication) => !medication.takenToday),
        reports: { weekly: weeklyReport, monthly: monthlyReport }
      })
    })
  )

  return { caregivers, elders }
}

async function getProfileDashboard(cpf, dayKey = getTodayKey()) {
  const userResult = await query(
    'SELECT cpf, name, phone, email, caregiver, role, invite_code FROM users WHERE cpf = $1 LIMIT 1',
    [cpf]
  )

  const user = userResult.rows[0]
  if (!user) return null

  const ownSummary = await getMedicationSummary(cpf, dayKey)
  const ownMedications = await getMedicationFeed(cpf, dayKey)
  const links = await getLinkedProfiles(cpf, dayKey)
  const linkedSummary = (normalizeRole(user.role) === 'cuidador' ? links.elders : links.caregivers)
    .reduce((acc, item) => {
      acc.medicationCount += Number(item.medicationCount || 0)
      acc.pendingMedications += Number(item.pendingMedications || 0)
      acc.completedMedications += Number(item.completedMedications || 0)
      return acc
    }, { medicationCount: 0, pendingMedications: 0, completedMedications: 0 })

  return {
    user: toPublicUser(user),
    summary: {
      medicationCount: Number(ownSummary.medicationCount || 0),
      pendingMedications: Number(ownSummary.pendingMedications || 0),
      completedMedications: Number(ownSummary.completedMedications || 0),
      linkedMedicationCount: Number(linkedSummary.medicationCount || 0),
      linkedPendingMedications: Number(linkedSummary.pendingMedications || 0),
      linkedCompletedMedications: Number(linkedSummary.completedMedications || 0)
    },
    medications: ownMedications,
    pendingItems: ownMedications.filter((medication) => !medication.takenToday),
    ...links
  }
}

async function linkCaregiverProfile(cpf, identifier) {
  const userResult = await query(
    'SELECT cpf, role FROM users WHERE cpf = $1 LIMIT 1',
    [cpf]
  )

  const currentUser = userResult.rows[0]
  if (!currentUser) {
    return { status: 404, error: 'Usuario nao encontrado.' }
  }

  const targetUser = await findUserByIdentifier(identifier)
  if (!targetUser) {
    return { status: 404, error: 'Usuario informado nao encontrado.' }
  }

  if (targetUser.cpf === currentUser.cpf) {
    return { status: 400, error: 'Nao e possivel vincular o proprio perfil.' }
  }

  const currentRole = normalizeRole(currentUser.role)
  const targetRole = normalizeRole(targetUser.role)
  const expectedTargetRole = currentRole === 'cuidador' ? 'idoso' : 'cuidador'

  if (targetRole !== expectedTargetRole) {
    return { status: 400, error: `O perfil informado deve ser do tipo ${expectedTargetRole}.` }
  }

  const elderCpf = currentRole === 'idoso' ? currentUser.cpf : targetUser.cpf
  const caregiverCpf = currentRole === 'cuidador' ? currentUser.cpf : targetUser.cpf

  await query(
    `INSERT INTO caregiver_links (elder_cpf, caregiver_cpf)
     VALUES ($1, $2)
     ON CONFLICT (elder_cpf, caregiver_cpf) DO NOTHING`,
    [elderCpf, caregiverCpf]
  )

  return { status: 201, linked: { elderCpf, caregiverCpf } }
}

async function unlinkCaregiverProfile(cpf, linkedCpf) {
  const deleted = await query(
    `DELETE FROM caregiver_links
     WHERE (elder_cpf = $1 AND caregiver_cpf = $2)
        OR (elder_cpf = $2 AND caregiver_cpf = $1)`,
    [cpf, linkedCpf]
  )

  if (deleted.rowCount === 0) {
    return { status: 404, error: 'Vinculo nao encontrado.' }
  }

  return { status: 204 }
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
})

app.get('/api/users/:cpf/dashboard', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return
  const dashboard = await getProfileDashboard(cpf, String(req.query?.dayKey || getTodayKey()))

  if (!dashboard) {
    return res.status(404).json({ error: 'Usuario nao encontrado.' })
  }

  return res.json(dashboard)
})

app.get('/api/users/:cpf/reports', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return

  const period = String(req.query?.period || 'weekly')
  const report = await getTreatmentReport(cpf, period)

  return res.json({ report })
})

app.post('/api/users/:cpf/relations/link', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return
  const identifier = String(req.body?.identifier || '').trim()

  if (!identifier) {
    return res.status(400).json({ error: 'Informe um codigo, CPF ou e-mail para vincular.' })
  }

  const result = await linkCaregiverProfile(cpf, identifier)
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  return res.status(result.status).json({ linked: true, relation: result.linked })
})

app.delete('/api/users/:cpf/relations/:linkedCpf', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  const linkedCpf = cleanCpf(req.params.linkedCpf)
  if (!requireSelfAccess(req, res, cpf)) return

  const result = await unlinkCaregiverProfile(cpf, linkedCpf)
  if (result.error) {
    return res.status(result.status).json({ error: result.error })
  }

  return res.status(result.status).send()
})

app.get('/api/medications/search', async (req, res) => {
  const q = String(req.query?.q || '').trim()

  if (q.length < 2) {
    return res.json({ medications: [] })
  }

  const pattern = `%${q}%`
  const result = await query(
    `SELECT
      id,
      nome_produto AS name,
      complemento_marca AS "brandComplement",
      principio_ativo AS "activeIngredient",
      tipo_regularizacao AS "regularizationType",
      numero_regularizacao AS "regularizationNumber",
      numero_processo AS "processNumber",
      empresa_detentora AS "holderCompany",
      situacao_regularizacao AS status,
      vencimento_regularizacao AS "expiration"
    FROM anvisa_medicamentos
    WHERE nome_produto ILIKE $1
       OR principio_ativo ILIKE $1
       OR complemento_marca ILIKE $1
    ORDER BY GREATEST(
      similarity(COALESCE(nome_produto, ''), $2),
      similarity(COALESCE(principio_ativo, ''), $2),
      similarity(COALESCE(complemento_marca, ''), $2)
    ) DESC,
    nome_produto ASC
    LIMIT 12`,
    [pattern, q]
  )

  return res.json({
    medications: result.rows.map((medication) => ({
      ...medication,
      dose: formatDose(medication.amount, medication.unit, medication.dose)
    }))
  })
})

app.post('/api/auth/login', async (req, res) => {
  const cpf = cleanCpf(req.body?.cpf)
  const password = String(req.body?.password || '')

  if (!cpf || !password) {
    return res.status(400).json({ error: 'CPF e senha sao obrigatorios.' })
  }

  // valida senha: apenas dígitos e no máximo 6 caracteres
  if (!/^\d{1,6}$/.test(password)) {
    return res.status(400).json({ error: 'Senha inválida. Deve conter apenas dígitos e ter no máximo 6 caracteres.' })
  }

  const result = await query(
    'SELECT cpf, password, name, phone, email, caregiver, role, invite_code FROM users WHERE cpf = $1 LIMIT 1',
    [cpf]
  )

  const user = result.rows[0]
  if (!user) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' })
  }

  const storedPassword = String(user.password || '')
  let isValidPassword = false

  if (isBcryptHash(storedPassword)) {
    isValidPassword = await bcrypt.compare(password, storedPassword)
  } else if (storedPassword === password) {
    isValidPassword = true

    // Migra senhas legadas em texto puro para hash bcrypt no primeiro login.
    const migratedHash = await bcrypt.hash(password, SALT_ROUNDS)
    await query('UPDATE users SET password = $2 WHERE cpf = $1', [cpf, migratedHash])
  }

  if (!isValidPassword) {
    return res.status(401).json({ error: 'CPF ou senha incorretos.' })
  }

  return res.json({ user: toPublicUser(user), token: createSession(user) })
})

app.post('/api/auth/recovery/request', async (req, res) => {
  const cpf = cleanCpf(req.body?.cpf)

  if (!cpf) {
    return res.status(400).json({ error: 'CPF é obrigatório.' })
  }

  const result = await query('SELECT cpf, phone FROM users WHERE cpf = $1 LIMIT 1', [cpf])
  const user = result.rows[0]

  if (!user?.phone) {
    return res.status(400).json({ error: 'Cadastre um telefone no perfil para recuperar a senha por SMS.' })
  }

  cleanupRecoveryCodes()

  const code = generateRecoveryCode()
  const expiresAt = Date.now() + 10 * 60 * 1000
  passwordRecoveryCodes.set(cpf, {
    code,
    phone: String(user.phone).trim(),
    expiresAt
  })

  await sendSms({
    to: user.phone,
    body: `MedHora: seu código de recuperação é ${code}. Ele expira em 10 minutos.`
  })

  return res.json({
    message: 'Código de recuperação enviado por SMS.',
    phoneHint: maskPhone(user.phone)
  })
})

app.post('/api/auth/recovery/confirm', async (req, res) => {
  const cpf = cleanCpf(req.body?.cpf)
  const code = String(req.body?.code || '').trim()
  const newPassword = String(req.body?.newPassword || '')

  if (!cpf || !code || !newPassword) {
    return res.status(400).json({ error: 'CPF, código e nova senha são obrigatórios.' })
  }

  if (!/^\d{1,6}$/.test(newPassword)) {
    return res.status(400).json({ error: 'Senha inválida. Deve conter apenas dígitos e ter no máximo 6 caracteres.' })
  }

  cleanupRecoveryCodes()

  const recovery = passwordRecoveryCodes.get(cpf)
  if (!recovery || recovery.expiresAt <= Date.now()) {
    passwordRecoveryCodes.delete(cpf)
    return res.status(400).json({ error: 'Código expirado ou inexistente. Solicite um novo SMS.' })
  }

  if (recovery.code !== code) {
    return res.status(400).json({ error: 'Código inválido. Verifique o SMS enviado.' })
  }

  const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)
  const updated = await query('UPDATE users SET password = $2 WHERE cpf = $1 RETURNING cpf, name, phone, email, caregiver, role, invite_code', [cpf, hashedPassword])

  passwordRecoveryCodes.delete(cpf)

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado.' })
  }

  return res.json({ message: 'Senha redefinida com sucesso.' })
})

app.post('/api/auth/logout', (req, res) => {
  const session = getSessionFromRequest(req)
  if (session?.token) {
    activeSessions.delete(session.token)
  }

  return res.status(204).send()
})

app.post('/api/auth/register', async (req, res) => {
  const cpf = cleanCpf(req.body?.cpf)
  const password = String(req.body?.password || '')
  const name = String(req.body?.name || '').trim().toUpperCase()
  const phone = String(req.body?.phone || '').trim()
  const role = normalizeRole(req.body?.role)

  if (!cpf || !password || !name || !phone) {
    return res.status(400).json({ error: 'Nome, CPF, telefone e senha sao obrigatorios.' })
  }

  // valida formato da senha: somente dígitos e até 6 caracteres
  if (!/^\d{1,6}$/.test(password)) {
    return res.status(400).json({ error: 'Senha inválida. Deve conter apenas dígitos e ter no máximo 6 caracteres.' })
  }

  if (!PROFILE_ROLES.has(role)) {
    return res.status(400).json({ error: 'Escolha um tipo de perfil valido.' })
  }

  const exists = await query('SELECT 1 FROM users WHERE cpf = $1', [cpf])
  if (exists.rowCount > 0) {
    return res.status(409).json({ error: 'CPF ja cadastrado.' })
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)
  const inviteCode = generateInviteCode()

  await query(
    `INSERT INTO users (cpf, password, name, phone, role, invite_code)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [cpf, hashedPassword, name, phone, role, inviteCode]
  )
  await query(
    `UPDATE users
     SET phone = $2, role = $3, invite_code = $4
     WHERE cpf = $1`,
    [cpf, phone, role, inviteCode]
  )

  const userResult = await query(
    'SELECT cpf, name, phone, email, caregiver, role, invite_code FROM users WHERE cpf = $1 LIMIT 1',
    [cpf]
  )

  return res.status(201).json({ user: toPublicUser(userResult.rows[0]), token: createSession(userResult.rows[0]) })
})

app.patch('/api/users/:cpf', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().toUpperCase() : null
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : null
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : null
  const hasCaregiver = Object.prototype.hasOwnProperty.call(req.body || {}, 'caregiver')
  const caregiverPayload = hasCaregiver ? JSON.stringify(req.body.caregiver ?? null) : null

  if (!phone) {
    return res.status(400).json({ error: 'Telefone é obrigatório.' })
  }

  const updated = await query(
    `UPDATE users
     SET
      name = COALESCE($2, name),
      phone = COALESCE($3, phone),
      email = COALESCE($4, email),
      caregiver = CASE WHEN $5 THEN $6::jsonb ELSE caregiver END
     WHERE cpf = $1
     RETURNING cpf, name, phone, email, caregiver, role, invite_code`,
    [cpf, name, phone, email, hasCaregiver, caregiverPayload]
  )

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Usuario nao encontrado.' })
  }

  return res.json({ user: toPublicUser(updated.rows[0]) })
})

app.get('/api/users/:cpf/medications', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return
  const dayKey = String(req.query?.dayKey || getTodayKey())

  const result = await query(
    `SELECT
      m.id,
      m.name,
      m.amount,
      m.unit,
      m.treatment_days AS "treatmentDays",
      m.start_date AS "startDate",
      m.end_date AS "endDate",
      COALESCE(
        CASE
          WHEN m.amount IS NOT NULL AND m.unit IS NOT NULL THEN concat(m.amount::text, ' ', m.unit)
          ELSE NULL
        END,
        m.dose
      ) AS dose,
      TO_CHAR(m.time, 'HH24:MI') AS time,
      m.created_at AS "createdAt",
      COALESCE(mi.taken, FALSE) AS "takenToday"
    FROM medications m
    LEFT JOIN medication_intake mi
      ON mi.medication_id = m.id
      AND mi.user_cpf = m.user_cpf
      AND mi.day_key = $2::date
    WHERE m.user_cpf = $1
      AND $2::date BETWEEN m.start_date AND m.end_date
    ORDER BY m.time ASC`,
    [cpf, dayKey]
  )

  return res.json({
    medications: result.rows.map((medication) => ({
      ...medication,
      dose: formatDose(medication.amount, medication.unit, medication.dose)
    }))
  })
})

app.post('/api/users/:cpf/medications', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return
  const name = String(req.body?.name || '').trim().toUpperCase()
  const amountRaw = String(req.body?.amount ?? '').trim()
  const unit = String(req.body?.unit || '').trim().toLowerCase()
  const treatmentDays = Number(req.body?.treatmentDays || req.body?.durationDays || 0)
  const rawTimes = Array.isArray(req.body?.times)
    ? req.body.times
    : req.body?.time
      ? [req.body.time]
      : []
  const times = [...new Set(rawTimes.map((time) => String(time || '').trim()).filter(Boolean))]
  const amount = amountRaw === '' ? null : Number(amountRaw)
  const allowedUnits = new Set(['mg', 'ml', 'g', 'ui', 'comprimido(s)', 'gota(s)', 'cápsula(s)', 'capsula(s)', 'unidade(s)'])
  const normalizedUnit = unit.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (!name || !Number.isFinite(amount) || amount <= 0 || !unit || times.length === 0 || !Number.isInteger(treatmentDays) || treatmentDays <= 0) {
    return res.status(400).json({ error: 'Nome, quantidade, unidade, horario e dias de tratamento sao obrigatorios.' })
  }

  if (!allowedUnits.has(normalizedUnit)) {
    return res.status(400).json({ error: 'Unidade invalida.' })
  }

  if (times.some((time) => !isValidTime(time))) {
    return res.status(400).json({ error: 'Informe horarios no formato HH:mm.' })
  }

  if (treatmentDays > 365) {
    return res.status(400).json({ error: 'O tratamento deve ter no maximo 365 dias.' })
  }

  const inserted = await withDbTransaction(async (client) => {
    const created = []

    for (const time of times) {
      const id = crypto.randomUUID()
      const dose = formatDose(amountRaw, unit)
      const result = await client.query(
        `INSERT INTO medications (id, user_cpf, name, dose, amount, unit, time, treatment_days, start_date, end_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7::time, $8, CURRENT_DATE, CURRENT_DATE + ($8::int - 1))
         RETURNING id, name, amount, unit, dose, TO_CHAR(time, 'HH24:MI') AS time, treatment_days AS "treatmentDays", start_date AS "startDate", end_date AS "endDate", created_at AS "createdAt"`,
        [id, cpf, name, dose, amount, unit, time, treatmentDays]
      )

      created.push({
        ...result.rows[0],
        dose: formatDose(result.rows[0].amount, result.rows[0].unit, result.rows[0].dose)
      })
    }

    return created
  })

  return res.status(201).json({
    medication: inserted[0] || null,
    medications: inserted
  })
})

app.delete('/api/users/:cpf/medications/:id', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  const { id } = req.params
  if (!requireSelfAccess(req, res, cpf)) return

  const deleted = await query(
    'DELETE FROM medications WHERE id = $1 AND user_cpf = $2',
    [id, cpf]
  )

  if (deleted.rowCount === 0) {
    return res.status(404).json({ error: 'Medicamento nao encontrado.' })
  }

  return res.status(204).send()
})

app.post('/api/users/:cpf/medications/:id/toggle-taken', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  if (!requireSelfAccess(req, res, cpf)) return
  const medicationId = String(req.params.id)
  const dayKey = String(req.body?.dayKey || getTodayKey())

  const existing = await query(
    `SELECT taken
     FROM medication_intake
     WHERE user_cpf = $1 AND medication_id = $2 AND day_key = $3::date
     LIMIT 1`,
    [cpf, medicationId, dayKey]
  )

  if (existing.rowCount === 0) {
    await query(
      `INSERT INTO medication_intake (user_cpf, medication_id, day_key, taken)
       VALUES ($1, $2, $3::date, TRUE)`,
      [cpf, medicationId, dayKey]
    )
    return res.json({ taken: true })
  }

  const nextValue = !existing.rows[0].taken
  await query(
    `UPDATE medication_intake
     SET taken = $4
     WHERE user_cpf = $1 AND medication_id = $2 AND day_key = $3::date`,
    [cpf, medicationId, dayKey, nextValue]
  )

  return res.json({ taken: nextValue })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno no servidor.' })
})

async function bootstrap() {
  await ensureProfileSchema()

  app.listen(port, () => {
    console.log(`MedHora API em http://localhost:${port}`)
  })
}

bootstrap().catch((error) => {
  console.error('Falha ao inicializar a API:', error)
  process.exit(1)
})
