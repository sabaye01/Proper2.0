import { sql } from "./_db.js"

export default async function handler(req, res) {
  try {
    const rows = await sql`
      SELECT id, to_email, from_email, subject, category, status, error, created_at
      FROM email_log
      ORDER BY created_at DESC
      LIMIT 100
    `
    res.status(200).json({ emails: rows })
  } catch (e) {
    res.status(500).json({ error: String(e.message) })
  }
}
