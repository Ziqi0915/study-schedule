import { createServer } from 'node:http'
import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { timingSafeEqual } from 'node:crypto'
const token = process.env.NOTEBOOK_TOKEN
if (!token || token.length < 24) throw new Error('Set NOTEBOOK_TOKEN to at least 24 characters')
const path = process.env.DATABASE_PATH || './data/notebook.sqlite'
mkdirSync(dirname(path), { recursive: true })
const db = new DatabaseSync(path)
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS notebook (id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL, revision INTEGER NOT NULL)')
const origin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
const equal = value => { const a=Buffer.from(value || ''), b=Buffer.from(`Bearer ${token}`); return a.length===b.length && timingSafeEqual(a,b) }
const server = createServer(async (req,res) => {
  const reply=(code,data)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
  if(req.headers.origin && req.headers.origin!==origin) return reply(403,{error:'Origin not allowed'})
  res.setHeader('Access-Control-Allow-Origin',origin)
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type')
  res.setHeader('Access-Control-Allow-Methods','GET, PUT, OPTIONS')
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  if(req.url!=='/api/notebook')return reply(404,{error:'Not found'})
  if(!equal(req.headers.authorization))return reply(401,{error:'Unauthorized'})
  if(req.method==='GET'){const row=db.prepare('SELECT * FROM notebook WHERE id=1').get();return reply(200,{book:row?JSON.parse(row.data):null,revision:row?.revision||0})}
  if(req.method!=='PUT')return reply(405,{error:'Method not allowed'})
  try {
    let raw=''; for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>2_000_000)return reply(413,{error:'Notebook too large'})}
    const {book,revision}=JSON.parse(raw)
    if(!book || typeof book.plans!=='object' || !book.plans || Array.isArray(book.plans) || !book.journals || typeof book.journals!=='object' || Array.isArray(book.journals) || !Number.isInteger(revision))return reply(400,{error:'Invalid notebook'})
    if(Object.values(book.journals).some(v=>typeof v!=='string') || Object.values(book.plans).some(v=>!Array.isArray(v)||v.some(t=>!t||typeof t.title!=='string'||typeof t.time!=='string'||typeof t.done!=='boolean')))return reply(400,{error:'Invalid entries'})
    const current=db.prepare('SELECT revision FROM notebook WHERE id=1').get()?.revision||0
    if(current!==revision)return reply(409,{error:'Notebook changed on another device; reconnect to load latest version'})
    db.prepare('INSERT INTO notebook VALUES (1,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,revision=excluded.revision').run(JSON.stringify(book),current+1)
    reply(200,{revision:current+1})
  }catch{reply(400,{error:'Invalid request'})}
})
server.listen(Number(process.env.PORT||3001),process.env.HOST||'127.0.0.1',()=>console.log('Notebook API ready on port '+(process.env.PORT||3001)))
