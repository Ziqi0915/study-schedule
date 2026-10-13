import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
test('authenticated storage persists across restarts and rejects stale writes', async () => {
 const dir=await mkdtemp(join(tmpdir(),'notebook-'))
 const token='test-token-more-than-twenty-four-characters'
 let proc
 async function start(){proc=spawn(process.execPath,['server/index.js'],{env:{...process.env,NOTEBOOK_TOKEN:token,PORT:'4321',DATABASE_PATH:join(dir,'db.sqlite')}});await once(proc.stdout,'data')}
 async function stop(){proc.kill();await once(proc,'exit')}
 const call=(method,body,auth=true)=>fetch('http://localhost:4321/api/notebook',{method,headers:{...(auth?{Authorization:`Bearer ${token}`} : {}),'Content-Type':'application/json'},body:body&&JSON.stringify(body)})
 try {
  await start()
  assert.equal((await call('GET',null,false)).status,401)
  const book={plans:{'2026-10-13':[{id:1,time:'09:00',title:'Read',done:false}]},journals:{'2026-10-13':'My private diary'}}
  assert.equal((await call('PUT',{book,revision:0})).status,200)
  assert.equal((await call('PUT',{book,revision:0})).status,409)
  assert.equal((await call('PUT',{book:{plans:[],journals:{}},revision:1})).status,400)
  await stop();await start()
  const saved=await (await call('GET')).json();assert.deepEqual(saved.book,book);assert.equal(saved.revision,1)
 }finally{if(proc.exitCode===null)await stop();await rm(dir,{recursive:true,force:true})}
})
