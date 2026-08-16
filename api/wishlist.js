/**
 * Vercel Serverless Function
 * GET    /api/wishlist?category_id=&priority=&purchased=   -> lista itens
 * POST   /api/wishlist { title, category_id, priority, link, price }
 * PATCH  /api/wishlist?id=123 { title, category_id, priority, link, price, purchased }
 * DELETE /api/wishlist?id=123
 */

import { query } from "./lib/db.js";

const PRIORITIES = ["baixa", "media", "alta"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { category_id, priority, purchased } = req.query || {};
      const clauses = [];
      const params = [];

      if (category_id) {
        params.push(Number(category_id));
        clauses.push(`category_id = $${params.length}`);
      }
      if (priority) {
        if (!PRIORITIES.includes(priority)) {
          return res.status(400).json({ ok: false, error: "priority inválida" });
        }
        params.push(priority);
        clauses.push(`priority = $${params.length}`);
      }
      if (purchased === "true" || purchased === "false") {
        params.push(purchased === "true");
        clauses.push(`purchased = $${params.length}`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const sql = `
        SELECT wishlist_items.*,
               categories.name  AS category_name,
               categories.emoji AS category_emoji,
               categories.color AS category_color
        FROM wishlist_items
        LEFT JOIN categories ON categories.id = wishlist_items.category_id
        ${where}
        ORDER BY purchased ASC,
                 CASE priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
                 wishlist_items.created_at DESC
      `;
      const { rows } = await query(sql, params);
      return res.status(200).json({ ok: true, items: rows });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const { title, category_id } = body;
      if (!title || !String(title).trim()) {
        return res.status(400).json({ ok: false, error: "título obrigatório" });
      }
      const priority = PRIORITIES.includes(body.priority) ? body.priority : "media";
      const link = body.link && String(body.link).trim() ? String(body.link).trim().slice(0, 500) : null;
      const price = body.price && String(body.price).trim() ? String(body.price).trim().slice(0, 30) : null;
      const { rows } = await query(
        `INSERT INTO wishlist_items (title, category_id, priority, link, price)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [String(title).trim().slice(0, 200), category_id ? Number(category_id) : null, priority, link, price]
      );
      return res.status(201).json({ ok: true, item: rows[0] });
    }

    if (req.method === "PATCH") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });

      const fields = req.body || {};
      const sets = [];
      const params = [];

      if (typeof fields.purchased === "boolean") {
        params.push(fields.purchased);
        sets.push(`purchased = $${params.length}`);
      }
      if (typeof fields.title === "string" && fields.title.trim()) {
        params.push(fields.title.trim().slice(0, 200));
        sets.push(`title = $${params.length}`);
      }
      if (fields.category_id !== undefined) {
        params.push(fields.category_id ? Number(fields.category_id) : null);
        sets.push(`category_id = $${params.length}`);
      }
      if (fields.priority !== undefined) {
        if (!PRIORITIES.includes(fields.priority)) {
          return res.status(400).json({ ok: false, error: "priority inválida" });
        }
        params.push(fields.priority);
        sets.push(`priority = $${params.length}`);
      }
      if (fields.link !== undefined) {
        params.push(fields.link ? String(fields.link).trim().slice(0, 500) : null);
        sets.push(`link = $${params.length}`);
      }
      if (fields.price !== undefined) {
        params.push(fields.price ? String(fields.price).trim().slice(0, 30) : null);
        sets.push(`price = $${params.length}`);
      }

      if (!sets.length) {
        return res.status(400).json({ ok: false, error: "nada para atualizar" });
      }

      params.push(id);
      const { rows } = await query(
        `UPDATE wishlist_items SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: "item não encontrado" });
      return res.status(200).json({ ok: true, item: rows[0] });
    }

    if (req.method === "DELETE") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });
      await query(`DELETE FROM wishlist_items WHERE id = $1`, [id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
