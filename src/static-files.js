import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp'};

export function createStaticHandler(root){
  root=path.resolve(root);
  const cache=new Map(),limit=16*1024*1024;let bytes=0;
  return async(req,res)=>{
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,{Allow:'GET, HEAD'}).end();return;}
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
      if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
      const info=await stat(file);
      if(!info.isFile()){res.writeHead(404).end();return;}
      const etag=`"${info.size.toString(16)}-${info.mtimeMs.toString(16)}-${info.ctimeMs.toString(16)}"`;
      const headers={'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache',ETag:etag};
      if(req.headers['if-none-match']===etag){res.writeHead(304,headers).end();return;}
      if(req.method==='HEAD'){res.writeHead(200,{...headers,'Content-Length':info.size}).end();return;}
      let entry=cache.get(file);
      if(entry?.etag!==etag){
        const data=await readFile(file);entry={etag,data};
        // Recheck after await: simultaneous requests must not double-count bytes.
        const previous=cache.get(file);if(previous){bytes-=previous.data.length;cache.delete(file);}
        if(data.length<=limit){
          while(cache.size&&(cache.size>=16||bytes+data.length>limit)){const key=cache.keys().next().value;bytes-=cache.get(key).data.length;cache.delete(key);}
          cache.set(file,entry);bytes+=data.length;
        }
      }
      res.writeHead(200,{...headers,'Content-Length':entry.data.length});res.end(entry.data);
    }catch{res.writeHead(404).end('Not found');}
  };
}
