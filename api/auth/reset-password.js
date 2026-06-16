import crypto from "crypto"
import bcrypt from "bcryptjs"
import { sql, readJsonBody } from "../_db.js"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" })
    return
  }

  const { token, password } = await readJsonBody(req)
  if (!token || !password) {
    res.status(400).json({ ok: false, error: "Token and new password are required" })
    return
  }
  if (String(password).length < 8) {
    res.status(400).json({ ok: false, error: "Password must be at least 8 characters" })
    return
  }

  const tokenHash = crypto.createHash("sha256").update(String(token)).digest("hex")

  try {
    const rows = await sql`
      SELECT id, user_id, expires_at, used FROM password_resets
      WHERE token_hash = ${tokenHash}
    `
    const reset = rows[0]
    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      res.status(400).json({ ok: false, error: "This reset link is invalid or has expired" })
      return
    }

    const hash = await bcrypt.hash(String(password), 12)
    await sql`UPDATE users SET password_hash = ${hash} WHERE id = ${reset.user_id}`
    await sql`UPDATE password_resets SET used = true WHERE id = ${reset.id}`

    res.status(200).json({ ok: true, message: "Password updated. You can now sign in." })
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) })
  }
}
