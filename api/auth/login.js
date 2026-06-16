import bcrypt from "bcryptjs"
import { sql, readJsonBody } from "../_db.js"
import { signSession, setSessionCookie } from "../_auth.js"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" })
    return
  }

  const { email, password } = await readJsonBody(req)
  if (!email || !password) {
    res.status(400).json({ ok: false, error: "Email and password are required" })
    return
  }
  const normalizedEmail = String(email).trim().toLowerCase()

  try {
    const rows = await sql`
      SELECT id, email, password_hash, name, role FROM users WHERE lower(email) = ${normalizedEmail}
    `
    const user = rows[0]
    // Always run a compare to reduce timing differences, even when user is missing.
    const hash = user?.password_hash || "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv"
    const valid = await bcrypt.compare(String(password), hash)

    if (!user || !valid) {
      res.status(401).json({ ok: false, error: "Invalid email or password" })
      return
    }

    await sql`UPDATE users SET last_login_at = now() WHERE id = ${user.id}`
    const token = signSession({ uid: user.id, email: user.email, role: user.role, name: user.name })
    setSessionCookie(res, token)
    res.status(200).json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) })
  }
}
