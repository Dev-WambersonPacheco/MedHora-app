import { Client } from 'pg'
import fs from 'fs'
import path from 'path'

const conn = process.env.DATABASE_URL
if (!conn) {
  console.error('DATABASE_URL nao fornecida')
  process.exit(2)
}

const sqlPath = path.resolve(process.cwd(), 'server', 'schema.sql')
const sql = fs.readFileSync(sqlPath, 'utf8')

async function run() {
  const client = new Client({ connectionString: conn })
  try {
    await client.connect()
    console.log('Conectado ao banco, aplicando schema...')
    await client.query(sql)
    console.log('Schema aplicado com sucesso.')
  } catch (err) {
    console.error('Erro ao aplicar schema:', err.message)
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
