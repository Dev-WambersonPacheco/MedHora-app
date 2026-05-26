import { test } from 'node:test'
import assert from 'node:assert/strict'

const BASE = process.env.VITE_API_URL || 'http://localhost:4000/api'

function uniqueCpf(prefix = '999') {
  const suffix = String(Date.now()).slice(-8)
  return `${prefix}${suffix}`.slice(0, 11).padEnd(11, '0')
}

test('register rejects non-digit password', async () => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'T', cpf: uniqueCpf('991'), phone: '11999990000', password: 'abc123', role: 'idoso' })
  })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(/Senha inválida/i.test(json.error))
})

test('register rejects too long numeric password', async () => {
  const res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'T', cpf: uniqueCpf('992'), phone: '11999990001', password: '1234567', role: 'idoso' })
  })
  assert.equal(res.status, 400)
  const json = await res.json()
  assert.ok(/Senha inválida/i.test(json.error))
})

test('login returns 401 for wrong credentials', async () => {
  const cpf = uniqueCpf('993')
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'T', cpf, phone: '11999990002', password: '123456', role: 'idoso' })
  })

  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf, password: '654321' })
  })
  assert.equal(res.status, 401)
  const json = await res.json()
  assert.ok(/CPF ou senha incorretos/i.test(json.error))
})
