/**
 * Vercel Serverless Function
 * GET    /api/tasks?category_id=&priority=&done=&date=   -> lista tarefas
 * POST   /api/tasks { title, category_id, priority, due_date }
 * PATCH  /api/tasks?id=123 { title, category_id, priority, due_date, done }
 * DELETE /api/tasks?id=123
 */

import { query } from "./lib/db.js";

const PRIORITIES = ["baixa", "media", "alta"];

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { category_id, priority, done, date } = req.query || {};
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
      if (done === "true" || done === "false") {
        params.push(done === "true");
        clauses.push(`done = $${params.length}`);
      }
      if (date) {
        params.push(date);
        clauses.push(`due_date = $${params.length}`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const sql = `
        SELECT tasks.*,
               categories.name  AS category_name,
               categories.emoji AS category_emoji,
               categories.color AS category_color
        FROM tasks
        LEFT JOIN categories ON categories.id = tasks.category_id
        ${where}
        ORDER BY (due_date IS NULL) ASC, due_date ASC,
                 CASE priority WHEN 'alta' THEN 0 WHEN 'media' THEN 1 ELSE 2 END,
                 tasks.created_at DESC
      `;
      const { rows } = await query(sql, params);
      return res.status(200).json({ ok: true, tasks: rows });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const { title, category_id, due_date } = body;
      if (!title || !String(title).trim()) {
        return res.status(400).json({ ok: false, error: "título obrigatório" });
      }
      const priority = PRIORITIES.includes(body.priority) ? body.priority : "media";
      const { rows } = await query(
        `INSERT INTO tasks (title, category_id, priority, due_date)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [
          String(title).trim().slice(0, 200),
          category_id ? Number(category_id) : null,
          priority,
          due_date || null,
        ]
      );
      return res.status(201).json({ ok: true, task: rows[0] });
    }

    if (req.method === "PATCH") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });

      const fields = req.body || {};
      const sets = [];
      const params = [];

      if (typeof fields.done === "boolean") {
        params.push(fields.done);
        sets.push(`done = $${params.length}`);
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
      if (fields.due_date !== undefined) {
        params.push(fields.due_date || null);
        sets.push(`due_date = $${params.length}`);
      }

      if (!sets.length) {
        return res.status(400).json({ ok: false, error: "nada para atualizar" });
      }

      params.push(id);
      const { rows } = await query(
        `UPDATE tasks SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (!rows.length) return res.status(404).json({ ok: false, error: "tarefa não encontrada" });
      return res.status(200).json({ ok: true, task: rows[0] });
    }

    if (req.method === "DELETE") {
      const id = Number((req.query || {}).id);
      if (!id) return res.status(400).json({ ok: false, error: "id inválido" });
      await query(`DELETE FROM tasks WHERE id = $1`, [id]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String((err && err.message) || err) });
  }
}
