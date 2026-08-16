/**
 * Vercel Serverless Function
 * GET    /api/categories?kind=task|wishlist   -> lista categorias/álbuns
 * POST   /api/categories { kind, name, emoji, color }
 * DELETE /api/categories?id=123
 */

import { query } from "./lib/db.js";

const KINDS = ["task", "wishlist"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { kind } = req.query || {};
      const params = [];
      let sql = "SELECT * FROM categories";
      if (kind) {
        if (!KINDS.includes(kind)) {
          return res.status(400).json({ ok: false, error: "kind inválido" });
        }
        params.push(kind);
        sql += ` WHERE kind = $${params.length}`;
      }
      sql += " ORDER BY name ASC";
      const { rows } = await query(sql, params);
      return res.status(200).json({ ok: true, categories: rows });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const { kind, name } = body;
      if (!KINDS.includes(kind)) {
        return res.status(400).json({ ok: false, error: "kind inválido" });
      }
      if (!name || !String(name).trim()) {
        return res.status(400).json({ ok: false, error: "nome obrigatório" });
      }
      const emoji = body.emoji && String(body.emoji).trim() ? String(body.emoji).trim().slice(0, 8) : "📌";
      const color = body.color && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color : "#bb7ee0";
      const { rows } = await query(
        `INSERT INTO categories (kind, name, emoji, color) VALUES ($1, $2, $3, $4) RETURNING *`,
        [kind, String(name).trim().slice(0, 60), emoji, color]
      );
      return res.status(201).json({ ok: true, category: rows[0] });
    }

    if (req.method === "DELETE") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });
      await query(`DELETE FROM categories WHERE id = $1`, [id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
