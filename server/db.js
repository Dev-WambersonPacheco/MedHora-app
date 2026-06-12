import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:1594870263@127.0.0.1:5432/medhora'

const pool = new Pool({
  connectionString,
  options: '-c search_path=medhora_app,public'
})

export async function query(text, params = []) {
  return pool.query(text, params)
}

export async function withDbTransaction(callback) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function closeDb() {
  await pool.end()
}
