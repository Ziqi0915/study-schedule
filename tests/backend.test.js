import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
test('accounts keep separate notebooks that persist across restarts and reject stale writes', async () => {
 const dir=await mkdtemp(join(tmpdir(),'notebook-'))
 let proc
 async function start(){proc=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:'4321',DATABASE_PATH:join(dir,'db.sqlite')}});await once(proc.stdout,'data')}
 async function stop(){proc.kill();await once(proc,'exit')}
 const call=(method,path,{body,cookie,headers={}}={})=>fetch('http://localhost:4321/api/'+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body&&JSON.stringify(body)})
 const sessionOf=res=>res.headers.getSetCookie().find(c=>c.startsWith('schedule_sid=')).split(';')[0]
 const book={plans:{'2026-10-13':[{id:1,time:'09:00',title:'Read',done:false}]},journals:{'2026-10-13':'My private diary'},moods:{'2026-10-13':'🌱'}}
 try {
  await start()
  assert.equal((await call('GET','me')).status,401)
  assert.equal((await call('GET','notebook')).status,401)
  assert.equal((await call('POST','register',{body:{username:'ziqi',password:'short'}})).status,400)
  const registered=await call('POST','register',{body:{username:'ziqi',password:'correct horse'}})
  assert.equal(registered.status,201)
  const ziqi=sessionOf(registered)
  assert.equal((await call('POST','register',{body:{username:'ZIQI',password:'another password'}})).status,409)
  assert.equal((await call('POST','login',{body:{username:'ziqi',password:'wrong password'}})).status,401)
  assert.deepEqual(await (await call('GET','notebook',{cookie:ziqi})).json(),{book:null,revision:0})
  assert.equal((await call('PUT','notebook',{cookie:ziqi,body:{book,revision:0}})).status,200)
  assert.equal((await call('PUT','notebook',{cookie:ziqi,body:{book,revision:0}})).status,409)
  assert.equal((await call('PUT','notebook',{cookie:ziqi,body:{book:{plans:[],journals:{}},revision:1}})).status,400)
  assert.equal((await call('PUT','notebook',{cookie:ziqi,body:{book,revision:1},headers:{Origin:'https://evil.example'}})).status,403)
  const other=sessionOf(await call('POST','register',{body:{username:'other',password:'other password'}}))
  assert.equal((await (await call('GET','notebook',{cookie:other})).json()).book,null)
  await stop();await start()
  const login=await call('POST','login',{body:{username:'Ziqi',password:'correct horse'}})
  assert.equal(login.status,200)
  assert.deepEqual(await (await call('GET','notebook',{cookie:sessionOf(login)})).json(),{book,revision:1})
  assert.equal((await call('GET','me',{cookie:ziqi})).status,200)
  assert.equal((await call('POST','logout',{cookie:ziqi,body:{}})).status,200)
  assert.equal((await call('GET','me',{cookie:ziqi})).status,401)
 }finally{if(proc.exitCode===null)await stop();await rm(dir,{recursive:true,force:true})}
})
