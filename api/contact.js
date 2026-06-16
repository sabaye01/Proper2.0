import { sql, readJsonBody } from "./_db.js"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }
  const b = await readJsonBody(req)
  if (!b.email) {
    res.status(400).json({ error: "email is required" })
    return
  }
  try {
    const rows = await sql`
      INSERT INTO contacts (role, name, email, phone, organization, message, source)
      VALUES (${b.role || "lead"}, ${b.name || null}, ${b.email}, ${b.phone || null},
              ${b.organization || null}, ${b.message || null}, ${b.source || "website"})
      RETURNING id, created_at
    `
    res.status(200).json({ ok: true, id: rows[0]?.id })
  } catch (e) {
    res.status(500).json({ error: String(e.message) })
  }
}
