import { sql } from "./_db.js"

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      // mark as read: { id }
      const id = req.query?.id
      if (id) await sql`UPDATE inbound_emails SET read=true WHERE id=${id}`
      res.status(200).json({ ok: true })
      return
    }

    const rows = await sql`
      SELECT id, from_email, from_name, to_email, subject, body_text, read, received_at
      FROM inbound_emails
      ORDER BY received_at DESC
      LIMIT 100
    `
    const unread = rows.filter((r) => !r.read).length
    res.status(200).json({ messages: rows, unread })
  } catch (e) {
    res.status(500).json({ error: String(e.message) })
  }
}
