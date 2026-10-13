import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const path = process.env.DATABASE_PATH || './data/notebook.sqlite'
const sessionDays = Number(process.env.SESSION_DAYS || 30)
const allowRegistration = process.env.ALLOW_REGISTRATION !== 'false'
const secureCookie = process.env.COOKIE_SECURE === 'true'
const extraOrigins = (process.env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
const cookieName = 'schedule_sid'

mkdirSync(dirname(path), { recursive: true })
const db = new DatabaseSync(path)
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS notebooks (user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, data TEXT NOT NULL, revision INTEGER NOT NULL);`)

async function hashPassword(password) {
  const salt = randomBytes(16)
  return `scrypt$${salt.toString('hex')}$${(await scryptAsync(password, salt, 64)).toString('hex')}`
}
async function verifyPassword(password, stored) {
  const [, salt, hash] = stored.split('$')
  const expected = Buffer.from(hash, 'hex')
  return timingSafeEqual(await scryptAsync(password, Buffer.from(salt, 'hex'), expected.length), expected)
}
// Compared against when the username does not exist, so response time does not reveal which accounts exist.
const dummyHash = await hashPassword(randomBytes(16).toString('hex'))

const failures = new Map()
const lockMs = 15 * 60_000
const isLocked = key => { const f = failures.get(key); return f && f.count >= 5 && Date.now() - f.first < lockMs }
function recordFailure(key) {
  const f = failures.get(key)
  if (!f || Date.now() - f.first >= lockMs) failures.set(key, { count: 1, first: Date.now() })
  else f.count++
}

const hashToken = token => createHash('sha256').update(token).digest('hex')
const sessionCookie = (value, maxAge) => `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secureCookie ? '; Secure' : ''}`
const readSession = req => new RegExp(`(?:^|;\\s*)${cookieName}=([^;]+)`).exec(req.headers.cookie || '')?.[1]
function startSession(userId) {
  const token = randomBytes(32).toString('base64url')
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
  db.prepare('INSERT INTO sessions VALUES (?, ?, ?)').run(hashToken(token), userId, Date.now() + sessionDays * 86_400_000)
  return sessionCookie(token, sessionDays * 86_400)
}
function currentUser(req) {
  const token = readSession(req)
  if (!token) return null
  return db.prepare('SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE token_hash = ? AND expires_at > ?').get(hashToken(token), Date.now()) || null
}

function sameOrigin(req) {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).host === req.headers.host || extraOrigins.includes(origin) } catch { return false }
}
async function readJson(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (Buffer.byteLength(raw) > 2_000_000) throw Object.assign(new Error('Too large'), { status: 413 })
  }
  return JSON.parse(raw || '{}')
}
const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v)
function validBook(book) {
  if (!isMap(book) || !isMap(book.plans) || !isMap(book.journals)) return false
  if (book.moods !== undefined && (!isMap(book.moods) || Object.values(book.moods).some(v => typeof v !== 'string'))) return false
  if (Object.values(book.journals).some(v => typeof v !== 'string')) return false
  return Object.values(book.plans).every(list => Array.isArray(list) && list.every(t => isMap(t) && typeof t.title === 'string' && typeof t.time === 'string' && typeof t.done === 'boolean'))
}
function readCredentials(body) {
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  return { username, password }
}

const server = createServer(async (req, res) => {
  const reply = (code, data, headers = {}) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }); res.end(JSON.stringify(data)) }
  const route = `${req.method} ${new URL(req.url, 'http://localhost').pathname}`
  if (!sameOrigin(req)) return reply(403, { error: '来源不被允许' })
  if (req.method !== 'GET' && !(req.headers['content-type'] || '').startsWith('application/json')) return reply(415, { error: '请求格式无效' })
  try {
    if (route === 'POST /api/register') {
      if (!allowRegistration) return reply(403, { error: '暂未开放注册' })
      const { username, password } = readCredentials(await readJson(req))
      if (!/^[\p{L}\p{N}_.-]{2,32}$/u.test(username)) return reply(400, { error: '用户名需为 2–32 位，可用中英文、数字、下划线、点和短横线' })
      if (password.length < 8 || password.length > 128) return reply(400, { error: '密码长度需为 8–128 位' })
      if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) return reply(409, { error: '这个用户名已被注册' })
      const { lastInsertRowid } = db.prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)').run(username, await hashPassword(password), Date.now())
      return reply(201, { user: { username } }, { 'Set-Cookie': startSession(Number(lastInsertRowid)) })
    }
    if (route === 'POST /api/login') {
      const { username, password } = readCredentials(await readJson(req))
      const key = `${req.socket.remoteAddress}|${username.toLowerCase()}`
      if (isLocked(key)) return reply(429, { error: '尝试次数过多，请 15 分钟后再试' })
      const user = db.prepare('SELECT id, username, password_hash FROM users WHERE username = ?').get(username)
      const ok = await verifyPassword(password, user?.password_hash || dummyHash)
      if (!user || !ok) { recordFailure(key); return reply(401, { error: '用户名或密码错误' }) }
      failures.delete(key)
      return reply(200, { user: { username: user.username } }, { 'Set-Cookie': startSession(user.id) })
    }
    if (route === 'POST /api/logout') {
      const token = readSession(req)
      if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token))
      return reply(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) })
    }

    const user = currentUser(req)
    if (route === 'GET /api/me') return user ? reply(200, { user: { username: user.username } }) : reply(401, { error: '请先登录' })
    if (route === 'GET /api/notebook' || route === 'PUT /api/notebook') {
      if (!user) return reply(401, { error: '登录已过期，请重新登录' })
      const row = db.prepare('SELECT data, revision FROM notebooks WHERE user_id = ?').get(user.id)
      if (req.method === 'GET') return reply(200, { book: row ? JSON.parse(row.data) : null, revision: row?.revision || 0 })
      const { book, revision } = await readJson(req)
      if (!validBook(book) || !Number.isInteger(revision)) return reply(400, { error: '笔记内容格式无效' })
      const current = row?.revision || 0
      if (current !== revision) return reply(409, { error: '笔记已在其他设备上更新' })
      db.prepare('INSERT INTO notebooks VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, revision = excluded.revision').run(user.id, JSON.stringify(book), current + 1)
      return reply(200, { revision: current + 1 })
    }
    reply(404, { error: 'Not found' })
  } catch (e) {
    reply(e.status || 400, { error: e.status === 413 ? '笔记内容过大' : '请求无效' })
  }
})
server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('Notebook API ready on port ' + (process.env.PORT || 3001)))
