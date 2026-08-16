/**
 * Conexão com o banco (Turso — SQLite na nuvem, free tier sem cartão de
 * crédito: https://turso.tech) + criação preguiçosa do schema. Nada de
 * migrations separadas — como é um DB pequeno e pessoal, as tabelas são
 * garantidas (CREATE TABLE IF NOT EXISTS) na primeira consulta de cada
 * instância da função serverless.
 *
 * Variáveis de ambiente esperadas:
 *   TURSO_DATABASE_URL  -> ex: libsql://seu-banco-sua-org.turso.io
 *   TURSO_AUTH_TOKEN    -> token gerado com `turso db tokens create`
 *
 * Pra rodar local sem precisar de conta nenhuma, TURSO_DATABASE_URL pode
 * apontar pra um arquivo local (ex: "file:local.db") — nesse modo
 * TURSO_AUTH_TOKEN não é necessário.
 */

import { createClient } from "@libsql/client";

let client;
function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL não configurada. Crie um banco grátis em turso.tech e configure as env vars na Vercel."
      );
    }
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getClient()
      .batch(
        [
          `CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL CHECK (kind IN ('task', 'wishlist')),
            name TEXT NOT NULL,
            emoji TEXT NOT NULL DEFAULT '📌',
            color TEXT NOT NULL DEFAULT '#bb7ee0',
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
          `CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category_id INTEGER,
            priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
            due_date TEXT,
            done INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
          `CREATE TABLE IF NOT EXISTS wishlist_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            link TEXT,
            price TEXT,
            category_id INTEGER,
            priority TEXT NOT NULL DEFAULT 'media' CHECK (priority IN ('baixa', 'media', 'alta')),
            purchased INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          )`,
          `CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks (due_date)`,
          `CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks (category_id)`,
          `CREATE INDEX IF NOT EXISTS idx_wishlist_category ON wishlist_items (category_id)`,
        ],
        "write"
      )
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

// Converte as linhas do libSQL (array-like, indexadas por posição) em
// objetos simples usando os nomes de coluna do result set.
function rowsToObjects(result) {
  return result.rows.map((row) => {
    const obj = {};
    result.columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

export async function query(sql, args = []) {
  await ensureSchema();
  const result = await getClient().execute({ sql, args });
  return { rows: rowsToObjects(result) };
}
