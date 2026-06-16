import crypto from "crypto"
import { sql, readJsonBody } from "../_db.js"
import { sendMail } from "../_email.js"
import { rateLimit, clientIp, tooMany } from "../_ratelimit.js"

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Method not allowed" })
    return
  }

  const { email } = await readJsonBody(req)
  if (!email) {
    res.status(400).json({ ok: false, error: "Email is required" })
    return
  }
  const normalizedEmail = String(email).trim().toLowerCase()

  // Rate limit reset requests per IP and per email to prevent inbox spam.
  const ip = clientIp(req)
  const ipLimit = await rateLimit(`reset:ip:${ip}`, { limit: 5, windowSec: 900 })
  if (!ipLimit.allowed) return tooMany(res, ipLimit.retryAfter)
  const emailLimit = await rateLimit(`reset:email:${normalizedEmail}`, { limit: 3, windowSec: 900 })
  if (!emailLimit.allowed) return tooMany(res, emailLimit.retryAfter)

  // Always respond success to avoid leaking which emails are registered.
  const genericResponse = { ok: true, message: "If an account exists, a reset link has been sent." }

  try {
    const rows = await sql`SELECT id, name FROM users WHERE lower(email) = ${normalizedEmail}`
    const user = rows[0]
    if (!user) {
      res.status(200).json(genericResponse)
      return
    }

    const token = crypto.randomBytes(32).toString("hex")
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const expires = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

    await sql`
      INSERT INTO password_resets (user_id, token_hash, expires_at)
      VALUES (${user.id}, ${tokenHash}, ${expires.toISOString()})
    `

    const proto = (req.headers["x-forwarded-proto"] || "https").split(",")[0]
    const host = req.headers["x-forwarded-host"] || req.headers.host
    const link = `${proto}://${host}/?reset_token=${token}&email=${encodeURIComponent(normalizedEmail)}`

    await sendMail({
      to: normalizedEmail,
      subject: "Reset your Proper Staffing password",
      category: "password-reset",
      html: `<h2>Reset your password</h2><p>We received a request to reset your password. This link expires in 1 hour.</p><p><a href="${link}" style="display:inline-block;background:#111827;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p><p>If you didn&apos;t request this, you can safely ignore this email.</p><p>&mdash; Proper Staffing</p>`,
    })

    res.status(200).json(genericResponse)
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message) })
  }
}
