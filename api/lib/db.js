/**
 * Conexão com o Postgres (Neon/Vercel Postgres) + criação preguiçosa do
 * schema. Nada de migrations separadas — como é um DB pequeno e pessoal,
 * as tabelas são garantidas (CREATE TABLE IF NOT EXISTS) na primeira
 * consulta de cada instância da função serverless.
 *
 * Variável de ambiente esperada: POSTGRES_URL (ou DATABASE_URL).
 * Configure em Vercel → Storage → Postgres (a Vercel injeta sozinha).
 */

import pg from "pg";

const { Pool, types } = pg;

// Sem isso, colunas DATE viram objetos Date (=> vira timestamp ISO
// completo ao serializar em JSON). O front-end espera "YYYY-MM-DD" puro
// pra agrupar tarefas por dia, então mantemos a string crua do Postgres.
types.setTypeParser(1082, (value) => value);

let pool;
function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "POSTGRES_URL não configurada. Adicione um Postgres em Vercel → Storage e faça redeploy."
      );
    }
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("sslmode=disable")
        ? false
        : { rejectUnauthorized: false },
      max: 3,
    });
  }
  return pool;
}

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          kind TEXT NOT NULL CHECK (kind IN ('task', 'wishlist')),
          name TEXT NOT NULL,
          emoji TEXT NOT NULL DEFAULT '📌',
          color TEXT NOT NULL DEFAULT '#bb7ee0',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
          due_date DATE,
          done BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS wishlist_items (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          link TEXT,
          price TEXT,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
          purchased BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date);
        CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category_id);
        CREATE INDEX IF NOT EXISTS idx_wishlist_category ON wishlist_items (category_id);
      `)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export async function query(text, params) {
  await ensureSchema();
  return getPool().query(text, params);
}
