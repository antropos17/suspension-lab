import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createStaticHandler} from '../src/static-files.js';

test('static server revalidates changed files, supports HEAD and refuses traversal',async()=>{
 const root=path.resolve('work/server-fixture');await mkdir(root,{recursive:true});
 await writeFile(path.join(root,'index.html'),'before');await writeFile(path.join(root,'worker.js'),'self.onmessage=()=>{};');
 const server=http.createServer(createStaticHandler(root));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  let res=await fetch(url);assert.equal(await res.text(),'before');const etag=res.headers.get('etag');
  res=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(res.status,304);
  await writeFile(path.join(root,'index.html'),'after a build');
  res=await fetch(url,{headers:{'If-None-Match':etag}});assert.equal(res.status,200);assert.equal(await res.text(),'after a build');assert.notEqual(res.headers.get('etag'),etag);
  res=await fetch(url+'/worker.js',{method:'HEAD'});assert.match(res.headers.get('content-type'),/javascript/);assert.equal(await res.text(),'');
  assert.equal((await fetch(url+'/%2e%2e%2fpackage.json')).status,403);
  assert.equal((await fetch(url+'/missing')).status,404);
  assert.equal((await fetch(url,{method:'POST'})).status,405);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
