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
      const args = [];

      if (category_id) {
        args.push(Number(category_id));
        clauses.push("category_id = ?");
      }
      if (priority) {
        if (!PRIORITIES.includes(priority)) {
          return res.status(400).json({ ok: false, error: "priority inválida" });
        }
        args.push(priority);
        clauses.push("priority = ?");
      }
      if (purchased === "true" || purchased === "false") {
        args.push(purchased === "true" ? 1 : 0);
        clauses.push("purchased = ?");
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
      const { rows } = await query(sql, args);
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
         VALUES (?, ?, ?, ?, ?) RETURNING *`,
        [String(title).trim().slice(0, 200), category_id ? Number(category_id) : null, priority, link, price]
      );
      return res.status(201).json({ ok: true, item: rows[0] });
    }

    if (req.method === "PATCH") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });

      const fields = req.body || {};
      const sets = [];
      const args = [];

      if (typeof fields.purchased === "boolean") {
        args.push(fields.purchased ? 1 : 0);
        sets.push("purchased = ?");
      }
      if (typeof fields.title === "string" && fields.title.trim()) {
        args.push(fields.title.trim().slice(0, 200));
        sets.push("title = ?");
      }
      if (fields.category_id !== undefined) {
        args.push(fields.category_id ? Number(fields.category_id) : null);
        sets.push("category_id = ?");
      }
      if (fields.priority !== undefined) {
        if (!PRIORITIES.includes(fields.priority)) {
          return res.status(400).json({ ok: false, error: "priority inválida" });
        }
        args.push(fields.priority);
        sets.push("priority = ?");
      }
      if (fields.link !== undefined) {
        args.push(fields.link ? String(fields.link).trim().slice(0, 500) : null);
        sets.push("link = ?");
      }
      if (fields.price !== undefined) {
        args.push(fields.price ? String(fields.price).trim().slice(0, 30) : null);
        sets.push("price = ?");
      }

      if (!sets.length) {
        return res.status(400).json({ ok: false, error: "nada para atualizar" });
      }

      args.push(id);
      const { rows } = await query(
        `UPDATE wishlist_items SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
        args
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: "item não encontrado" });
      return res.status(200).json({ ok: true, item: rows[0] });
    }

    if (req.method === "DELETE") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });
      await query(`DELETE FROM wishlist_items WHERE id = ?`, [id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
