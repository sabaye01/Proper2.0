import jwt from "jsonwebtoken"

const SECRET = process.env.AUTH_SECRET || ""
const COOKIE = "ps_session"
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export function signSession(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: MAX_AGE })
}

export function setSessionCookie(res, token) {
  res.setHeader("Set-Cookie", [
    `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}`,
  ])
}

export function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", [
    `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  ])
}

export function parseCookies(req) {
  const header = req.headers.cookie || ""
  const out = {}
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=")
    if (idx > -1) {
      const k = part.slice(0, idx).trim()
      const v = part.slice(idx + 1).trim()
      if (k) out[k] = decodeURIComponent(v)
    }
  })
  return out
}

export function getSession(req) {
  if (!SECRET) return null
  const token = parseCookies(req)[COOKIE]
  if (!token) return null
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
}

// Returns the session if valid, otherwise writes a 401 and returns null.
export function requireAuth(req, res, roles) {
  const session = getSession(req)
  if (!session) {
    res.status(401).json({ ok: false, error: "Not authenticated" })
    return null
  }
  if (roles && roles.length && !roles.includes(session.role)) {
    res.status(403).json({ ok: false, error: "Forbidden" })
    return null
  }
  return session
}
