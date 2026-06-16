import { sql, readJsonBody } from "./_db.js"

// Inbound email webhook. Dormant until you point a domain's MX records at an
// inbound provider (e.g. Cloudflare Email Routing, Resend Inbound, Postmark)
// and configure that provider to POST parsed emails here.
//
// Optional shared-secret check via INBOUND_WEBHOOK_SECRET.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" })
    return
  }

  const secret = process.env.INBOUND_WEBHOOK_SECRET
  if (secret) {
    const provided = req.headers["x-webhook-secret"] || req.query?.secret
    if (provided !== secret) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
  }

  const payload = await readJsonBody(req)

  // Normalize across common providers
  const fromRaw = payload.from || payload.sender || payload.From || ""
  const fromEmail =
    (typeof fromRaw === "object" ? fromRaw.email || fromRaw.address : fromRaw)?.match?.(/[^<\s]+@[^>\s]+/)?.[0] ||
    (typeof fromRaw === "string" ? fromRaw : "") ||
    "unknown@unknown"
  const fromName = (typeof fromRaw === "object" ? fromRaw.name : null) || payload.from_name || null
  const toEmail = payload.to || payload.recipient || payload.To || null
  const subject = payload.subject || payload.Subject || "(no subject)"
  const bodyText = payload.text || payload["body-plain"] || payload.TextBody || null
  const bodyHtml = payload.html || payload["body-html"] || payload.HtmlBody || null

  try {
    const rows = await sql`
      INSERT INTO inbound_emails (from_email, from_name, to_email, subject, body_text, body_html, raw)
      VALUES (${fromEmail}, ${fromName}, ${typeof toEmail === "string" ? toEmail : JSON.stringify(toEmail)},
              ${subject}, ${bodyText}, ${bodyHtml}, ${JSON.stringify(payload)})
      RETURNING id
    `
    res.status(200).json({ ok: true, id: rows[0]?.id })
  } catch (e) {
    res.status(500).json({ error: String(e.message) })
  }
}
