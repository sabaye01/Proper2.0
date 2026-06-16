import { getSession } from "../_auth.js"

export default async function handler(req, res) {
  const session = getSession(req)
  if (!session) {
    res.status(200).json({ ok: true, user: null })
    return
  }
  res.status(200).json({
    ok: true,
    user: { id: session.uid, email: session.email, name: session.name, role: session.role },
  })
}
