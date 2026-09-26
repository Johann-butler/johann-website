// JOHANN AUTH v1: SEPARATE TEST WORKER. Bind DB to johann-lab-db.
// Secret: RESEND_API_KEY. Optional: AUTH_ALLOWED_EMAIL (restrict test account).
// From address must be verified in Resend. Never put secrets in source.
const ORIGIN='https://johann-butler.de';
const FROM='Johann <johann@johann-butler.de>';
const enc=new TextEncoder();
const hex=b=>Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const random=()=>crypto.randomUUID()+crypto.randomUUID().replaceAll('-','');
const norm=s=>typeof s==='string'?s.trim().toLowerCase():'';
const emailOK=s=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
async function limit(db,key,max,windowMs){const now=Date.now(),id=await hash(key);await db.prepare('INSERT OR IGNORE INTO auth_limits(id,count,reset_at) VALUES(?,0,?)').bind(id,now+windowMs).run();await db.prepare('UPDATE auth_limits SET count=CASE WHEN reset_at<? THEN 1 ELSE count+1 END,reset_at=CASE WHEN reset_at<? THEN ? ELSE reset_at END WHERE id=?').bind(now,now,now+windowMs,id).run();const r=await db.prepare('SELECT count FROM auth_limits WHERE id=?').bind(id).first();return r.count<=max}
async function userFor(request,db){const a=request.headers.get('Authorization')||'';if(!/^Bearer [A-Za-z0-9-]{60,110}$/.test(a))return null;const token=a.slice(7),h=await hash(token),r=await db.prepare('SELECT u.id,u.email,s.token_hash FROM auth_sessions s JOIN auth_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.deleted_at IS NULL').bind(h,Date.now()).first();return r||null}
export default {async fetch(request,env){
 const cors={'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
 const out=(x,s=200)=>Response.json(x,{status:s,headers:cors});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST'||request.headers.get('Origin')!==ORIGIN)return out({error:'Zugriff verweigert.'},403);
 if(Number(request.headers.get('Content-Length')||0)>900000)return out({error:'Anfrage zu groß.'},413);
 let b;try{b=await request.json()}catch{return out({error:'Ungültige Anfrage.'},400)}
 if(!b||typeof b!=='object'||Array.isArray(b))return out({error:'Ungültige Anfrage.'},400);
 const action=b.action,ip=request.headers.get('CF-Connecting-IP')||'unknown';
 try{
 if(action==='auth_request'){
  const email=norm(b.email);if(!emailOK(email))return out({error:'Bitte eine gültige E-Mail-Adresse eingeben.'},400);
  if(env.AUTH_ALLOWED_EMAIL&&email!==norm(env.AUTH_ALLOWED_EMAIL))return out({ok:true,message:'Falls dieser Zugang freigegeben ist, erhältst du einen Code.'});
  if(!await limit(env.DB,'req-ip:'+ip,12,3600000)||!await limit(env.DB,'req-mail:'+email,4,3600000))return out({error:'Bitte später erneut versuchen.'},429);
  if(!env.RESEND_API_KEY)return out({error:'E-Mail-Versand noch nicht eingerichtet.'},503);
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%1000000).padStart(6,'0'),id=crypto.randomUUID(),now=Date.now();
  const digest=await hash(id+'|'+code+'|'+(env.AUTH_CODE_PEPPER||''));
  await env.DB.prepare('INSERT INTO auth_codes(id,email,code_hash,expires_at,created_at) VALUES(?,?,?,?,?)').bind(id,email,digest,now+600000,now).run();
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:FROM,to:[email],subject:'Dein Johann-Anmeldecode',text:'Dein Code: '+code+'\nEr ist 10 Minuten gültig. Wenn du ihn nicht angefordert hast, ignoriere diese E-Mail.'})});
  if(!r.ok){console.error('auth mail HTTP',r.status);return out({error:'Code konnte nicht versendet werden.'},502)}
  return out({ok:true,message:'Falls diese Adresse zugelassen ist, erhältst du einen Code.'});
 }
 if(action==='auth_verify'){
  const email=norm(b.email),code=String(b.code||'');if(!emailOK(email)||!/^\d{6}$/.test(code))return out({error:'Ungültiger Code.'},400);
  if(!await limit(env.DB,'verify-ip:'+ip,20,3600000)||!await limit(env.DB,'verify-email:'+email,12,3600000))return out({error:'Zu viele Versuche.'},429);
  const c=await env.DB.prepare('SELECT * FROM auth_codes WHERE email=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1').bind(email,Date.now()).first();
  if(!c||c.attempts>=5)return out({error:'Code ungültig oder abgelaufen.'},401);
  await env.DB.prepare('UPDATE auth_codes SET attempts=attempts+1 WHERE id=?').bind(c.id).run();
  if(await hash(c.id+'|'+code+'|'+(env.AUTH_CODE_PEPPER||''))!==c.code_hash)return out({error:'Code ungültig oder abgelaufen.'},401);
  const used=await env.DB.prepare('UPDATE auth_codes SET used_at=? WHERE id=? AND used_at IS NULL AND attempts<=5').bind(Date.now(),c.id).run();if(!used.meta?.changes)return out({error:'Code bereits verwendet.'},401);
  let u=await env.DB.prepare('SELECT id,email FROM auth_users WHERE email=? AND deleted_at IS NULL').bind(email).first();
  if(!u){const uid=crypto.randomUUID();await env.DB.prepare('INSERT OR IGNORE INTO auth_users(id,email,created_at) VALUES(?,?,?)').bind(uid,email,Date.now()).run();u=await env.DB.prepare('SELECT id,email FROM auth_users WHERE email=? AND deleted_at IS NULL').bind(email).first()}
  const token=random(),h=await hash(token);await env.DB.prepare('INSERT INTO auth_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(h,u.id,Date.now()+86400000,Date.now()).run();
  return out({ok:true,token,email:u.email,expiresInHours:24});
 }
 const u=await userFor(request,env.DB);if(!u)return out({error:'Bitte erneut anmelden.'},401);
 if(action==='auth_me')return out({ok:true,email:u.email});
 if(action==='auth_logout'){await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(u.token_hash).run();return out({ok:true})}
 if(action==='vault_get'){const v=await env.DB.prepare('SELECT salt,iv,ciphertext,updated_at FROM auth_vault WHERE user_id=?').bind(u.id).first();return out({ok:true,vault:v||null})}
 if(action==='vault_put'){
  const {salt,iv,ciphertext}=b;if(typeof salt!=='string'||! /^[A-Za-z0-9+/=]{20,80}$/.test(salt)||typeof iv!=='string'||! /^[A-Za-z0-9+/=]{12,40}$/.test(iv)||typeof ciphertext!=='string'||ciphertext.length>400000||! /^[A-Za-z0-9+/=]+$/.test(ciphertext))return out({error:'Ungültiges verschlüsseltes Archiv.'},400);
  await env.DB.prepare('INSERT INTO auth_vault(user_id,salt,iv,ciphertext,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET salt=excluded.salt,iv=excluded.iv,ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').bind(u.id,salt,iv,ciphertext,Date.now()).run();return out({ok:true});
 }
 if(action==='vault_delete'){await env.DB.prepare('DELETE FROM auth_vault WHERE user_id=?').bind(u.id).run();return out({ok:true})}
 if(action==='auth_delete'){
  await env.DB.prepare('DELETE FROM auth_users WHERE id=?').bind(u.id).run();return out({ok:true});
 }
 return out({error:'Unbekannte Aktion.'},400);
 }catch(e){console.error('auth internal error',e?.name||'unknown');return out({error:'Technischer Fehler.'},503)}
 }};
