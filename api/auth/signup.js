import bcrypt from "bcryptjs"
import { sql, readJsonBody } from "../_db.js"
import { signSession, setSessionCookie } from "../_auth.js"

const ROLES = ["para", "facility", "admin"]

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" })
    return
  }

  const { email, password, name, role } = await readJsonBody(req)

  if (!email || !password) {
    res.status(400).json({ ok: false, error: "Email and password are required" })
    return
  }
  if (String(password).length < 8) {
    res.status(400).json({ ok: false, error: "Password must be at least 8 characters" })
    return
  }
  const normalizedEmail = String(email).trim().toLowerCase()
  // Self-signup is limited to worker/facility. Admins are provisioned manually.
  const safeRole = ROLES.includes(role) && role !== "admin" ? role : "para"

  try {
    const existing = await sql`SELECT id FROM users WHERE lower(email) = ${normalizedEmail}`
    if (existing.length) {
      res.status(409).json({ ok: false, error: "An account with this email already exists" })
      return
    }

    const hash = await bcrypt.hash(String(password), 12)
    const rows = await sql`
      INSERT INTO users (email, password_hash, name, role)
      VALUES (${normalizedEmail}, ${hash}, ${name || null}, ${safeRole})
      RETURNING id, email, name, role
    `
    const user = rows[0]
    const token = signSession({ uid: user.id, email: user.email, role: user.role, name: user.name })
    setSessionCookie(res, token)
    res.status(201).json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) })
  }
}
