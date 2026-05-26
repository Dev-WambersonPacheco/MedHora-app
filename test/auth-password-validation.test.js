import { test } from 'node:test'
import assert from 'node:assert/strict'

const BASE = process.env.VITE_API_URL || 'http://localhost:4000/api'

test('register rejects non-digit password', async () => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'T', cpf: '99988877766', password: 'abc123', role: 'idoso' })
  })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(/Senha inválida/i.test(json.error))
})

test('register rejects too long numeric password', async () => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'T', cpf: '99988877755', password: '1234567', role: 'idoso' })
  })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(/Senha inválida/i.test(json.error))
})

test('login rejects non-digit password', async () => {
  // Attempt login for an existing user; create a test user first if needed
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf: '99988877766', password: 'abc123' })
  })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(/Senha inválida/i.test(json.error))
})
