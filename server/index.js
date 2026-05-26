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

app.use(cors())
app.use(express.json())

function cleanCpf(cpf = '') {
  return String(cpf).replace(/\D/g, '')
}

function toPublicUser(userRow) {
  return {
    cpf: userRow.cpf,
    name: userRow.name,
    phone: userRow.phone || '',
    email: userRow.email || '',
    caregiver: userRow.caregiver || null
  }
}

function getTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function isBcryptHash(value = '') {
  return /^\$2[aby]\$\d{2}\$/.test(value)
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

app.get('/api/health', (_, res) => {
  res.json({ ok: true })
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

  const result = await query(
    'SELECT cpf, password, name, phone, email, caregiver FROM users WHERE cpf = $1 LIMIT 1',
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

  return res.json({ user: toPublicUser(user) })
})

app.post('/api/auth/register', async (req, res) => {
  const cpf = cleanCpf(req.body?.cpf)
  const password = String(req.body?.password || '')
  const name = String(req.body?.name || '').trim().toUpperCase()

  if (!cpf || !password || !name) {
    return res.status(400).json({ error: 'Nome, CPF e senha sao obrigatorios.' })
  }

  const exists = await query('SELECT 1 FROM users WHERE cpf = $1', [cpf])
  if (exists.rowCount > 0) {
    return res.status(409).json({ error: 'CPF ja cadastrado.' })
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

  const inserted = await query(
    `INSERT INTO users (cpf, password, name)
     VALUES ($1, $2, $3)
     RETURNING cpf, name, phone, email, caregiver`,
    [cpf, hashedPassword, name]
  )

  return res.status(201).json({ user: toPublicUser(inserted.rows[0]) })
})

app.patch('/api/users/:cpf', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().toUpperCase() : null
  const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : null
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : null
  const hasCaregiver = Object.prototype.hasOwnProperty.call(req.body || {}, 'caregiver')
  const caregiverPayload = hasCaregiver ? JSON.stringify(req.body.caregiver ?? null) : null

  const updated = await query(
    `UPDATE users
     SET
      name = COALESCE($2, name),
      phone = COALESCE($3, phone),
      email = COALESCE($4, email),
      caregiver = CASE WHEN $5 THEN $6::jsonb ELSE caregiver END
     WHERE cpf = $1
     RETURNING cpf, name, phone, email, caregiver`,
    [cpf, name, phone, email, hasCaregiver, caregiverPayload]
  )

  if (updated.rowCount === 0) {
    return res.status(404).json({ error: 'Usuario nao encontrado.' })
  }

  return res.json({ user: toPublicUser(updated.rows[0]) })
})

app.get('/api/users/:cpf/medications', async (req, res) => {
  const cpf = cleanCpf(req.params.cpf)
  const dayKey = String(req.query?.dayKey || getTodayKey())

  const result = await query(
    `SELECT
      m.id,
      m.name,
      m.amount,
      m.unit,
      COALESCE(
        CASE
          WHEN m.amount IS NOT NULL AND m.unit IS NOT NULL THEN concat(m.amount::text, ' ', m.unit)
          ELSE NULL
        END,
        m.dose
      ) AS dose,
      m.time,
      m.created_at AS "createdAt",
      COALESCE(mi.taken, FALSE) AS "takenToday"
    FROM medications m
    LEFT JOIN medication_intake mi
      ON mi.medication_id = m.id
      AND mi.user_cpf = m.user_cpf
      AND mi.day_key = $2
    WHERE m.user_cpf = $1
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
  const name = String(req.body?.name || '').trim().toUpperCase()
  const amountRaw = String(req.body?.amount ?? '').trim()
  const unit = String(req.body?.unit || '').trim().toLowerCase()
  const rawTimes = Array.isArray(req.body?.times)
    ? req.body.times
    : req.body?.time
      ? [req.body.time]
      : []
  const times = [...new Set(rawTimes.map((time) => String(time || '').trim()).filter(Boolean))]
  const amount = amountRaw === '' ? null : Number(amountRaw)
  const allowedUnits = new Set(['mg', 'ml', 'g', 'ui', 'comprimido(s)', 'gota(s)', 'cápsula(s)', 'capsula(s)', 'unidade(s)'])
  const normalizedUnit = unit.normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  if (!name || !Number.isFinite(amount) || amount <= 0 || !unit || times.length === 0) {
    return res.status(400).json({ error: 'Nome, quantidade, unidade e horario sao obrigatorios.' })
  }

  if (!allowedUnits.has(normalizedUnit)) {
    return res.status(400).json({ error: 'Unidade invalida.' })
  }

  const inserted = await withDbTransaction(async (client) => {
    const created = []

    for (const time of times) {
      const id = crypto.randomUUID()
      const dose = formatDose(amountRaw, unit)
      const result = await client.query(
        `INSERT INTO medications (id, user_cpf, name, dose, amount, unit, time)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, amount, unit, dose, time, created_at AS "createdAt"`,
        [id, cpf, name, dose, amount, unit, time]
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
  const medicationId = String(req.params.id)
  const dayKey = String(req.body?.dayKey || getTodayKey())

  const existing = await query(
    `SELECT taken
     FROM medication_intake
     WHERE user_cpf = $1 AND medication_id = $2 AND day_key = $3
     LIMIT 1`,
    [cpf, medicationId, dayKey]
  )

  if (existing.rowCount === 0) {
    await query(
      `INSERT INTO medication_intake (user_cpf, medication_id, day_key, taken)
       VALUES ($1, $2, $3, TRUE)`,
      [cpf, medicationId, dayKey]
    )
    return res.json({ taken: true })
  }

  const nextValue = !existing.rows[0].taken
  await query(
    `UPDATE medication_intake
     SET taken = $4
     WHERE user_cpf = $1 AND medication_id = $2 AND day_key = $3`,
    [cpf, medicationId, dayKey, nextValue]
  )

  return res.json({ taken: nextValue })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno no servidor.' })
})

app.listen(port, () => {
  console.log(`MedHora API em http://localhost:${port}`)
})
