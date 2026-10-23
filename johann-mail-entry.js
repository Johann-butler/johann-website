/* Johann dashboard mail module. No local HTTP fetch, iframe URL or new tab. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),frame=$('johannMailFrame'),note=$('johannMailNotice');let pub='',active=false,loading=false;
 const bytes=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
 const b64=value=>{let s='';for(const x of new Uint8Array(value))s+=String.fromCharCode(x);return btoa(s)};
 const uuid=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
 const owner=()=>window.johannStudioIsOwner?.()===true;
 const message=(text,error=false)=>{note.textContent=text;note.style.color=error?'#ffb9a9':''};
 async function call(body){if(!owner())throw Error('Bitte mit deinem Johann-Owner-Konto anmelden.');if(typeof window.johannMailCall!=='function')throw Error('Mail-Anbindung fehlt in der Website. Bitte Seite aktualisieren.');return window.johannMailCall(body);}
 window.johannMailTransport=async(path,body)=>{
  if(!pub)throw Error('Asgard bitte zuerst koppeln.');
  const id=uuid(),aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt','decrypt']);
  const publicKey=await crypto.subtle.importKey('spki',bytes(pub),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12)),raw=new TextEncoder().encode(JSON.stringify({method:body===undefined?'GET':'POST',path:'/api/mail/'+path,body}));
  const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id+'|request')},aes,raw);
  const sealedKey=await crypto.subtle.encrypt({name:'RSA-OAEP'},publicKey,await crypto.subtle.exportKey('raw',aes));
  await call({op:'submit',id,envelope:{iv:b64(iv),key:b64(sealedKey),data:b64(cipher)}});
  const deadline=Date.now()+165000;
  while(Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,1800));const r=await call({op:'result',id});
   if(!r.envelope)continue;
   const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(r.envelope.iv),additionalData:new TextEncoder().encode(id+'|response')},aes,bytes(r.envelope.data));
   const result=JSON.parse(new TextDecoder().decode(raw));call({op:'ack',id}).catch(()=>{});
   if(result.error||result.status>=400)throw Error(result.error||'Mail-Auftrag fehlgeschlagen.');
   return result.result;
  }
  throw Error('Asgard antwortet nicht rechtzeitig. Bei Versand zuerst Versandprotokoll prüfen. Kein automatischer Wiederholungsversand.');
 };
 async function refresh(){
  if(loading||!owner()||!active)return;loading=true;
  try{
   message('Verbinde mit Asgard …');const info=await call({op:'info'});pub=info.pub;
   $('johannMailPair').hidden=!!info.paired;$('johannMailDisconnect').hidden=!info.paired;
   if(!info.paired){frame.hidden=true;frame.srcdoc='';message('Einmal Asgard koppeln. Danach erscheinen deine Postfächer hier in Johann.');return;}
   const age=Date.now()/1000-info.seen;
   message(age<90?'Asgard verbunden · Mail wird verschlüsselt geladen.':'Kopplung vorhanden. Asgard wartet auf Verbindung; das kann beim ersten Abruf kurz dauern.');
   if(!frame.srcdoc){frame.srcdoc=MAIL_DOCUMENT;frame.hidden=false;}
  }catch(e){message(e.message,true);}finally{loading=false;}
 }
 function auth(){const allowed=owner();$('johannMailTile').hidden=!allowed;$('johannMailLocked').hidden=allowed;$('johannMailContent').hidden=!allowed;if(!allowed){pub='';frame.srcdoc='';frame.hidden=true;}else if(active)refresh();}
 document.addEventListener('click',e=>{const button=e.target.closest?.('[data-view]');if(!button)return;active=button.dataset.view==='mail';if(active)refresh();else{frame.srcdoc='';frame.hidden=true;}});
 $('johannMailLogin').onclick=()=>window.johannOpenLogin?.();
 $('johannMailRefresh').onclick=()=>refresh();
 $('johannMailPair').onclick=async()=>{try{const r=await call({op:'pair_create'});message('Kopplungscode: '+r.code+'\nGilt zehn Minuten. Auf Asgard den neuen Installer mit „koppeln“ starten.');}catch(e){message(e.message,true);}};
 $('johannMailDisconnect').onclick=async()=>{if(!confirm('Asgard-Mail-Verbindung für deinen Account aufheben? Bereits begonnene Sendungen können nicht zurückgerufen werden.'))return;try{await call({op:'unpair'});pub='';frame.srcdoc='';frame.hidden=true;await refresh();}catch(e){message(e.message,true);}};
 window.addEventListener('johann-auth-state',auth);auth();
 const MAIL_DOCUMENT="<!doctype html>\n<html lang=\"de\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><title>Johann \u00b7 Mail</title><link rel=\"stylesheet\" href=\"./johann-mail.css\"><script src=\"./johann-mail-ui.js\" defer></script></head>\n<body><header hidden><a href=\"/\">\u2190 Studio</a><span>JOHANN <b>Mail</b></span><button id=\"logout\">Abmelden</button></header>\n<main><p id=\"notice\" role=\"status\" aria-live=\"polite\">Verbinde mit Asgard \u2026</p>\n<section id=\"login\" hidden><h1>Deine Post. Auf Asgard.</h1><p>Mit deinem Johann-Owner-Konto anmelden.</p><label>Studio-Zugangsschl\u00fcssel<input id=\"key\" type=\"password\" autocomplete=\"current-password\"></label><button id=\"signin\">Anmelden</button></section>\n<div id=\"app\" hidden>\n<section class=\"intro\"><div><p class=\"eyebrow\">DEIN ASSISTENT F\u00dcR GMAIL & STRATO</p><h1>Ein Postfach mit Ged\u00e4chtnis.</h1><p>Erst pr\u00fcfen, dann antworten. Du bestimmst, was Johann senden und behalten darf.</p></div><button id=\"sync\">Jetzt abrufen</button></section>\n<div id=\"accounts\" class=\"cards\"></div>\n<nav><button id=\"inboxTab\" class=\"selected\">Posteingang</button><button id=\"memoryTab\">Johanns Ged\u00e4chtnis</button><button id=\"sentTab\">Versandprotokoll</button></nav>\n<div id=\"inbox\"><div class=\"toolbar\"><label>Postfach<select id=\"account\"><option value=\"\">Alle Postf\u00e4cher</option></select></label><label>Suche<input id=\"search\" placeholder=\"Absender, Betreff oder Text\"></label><button id=\"find\">Suchen</button><button id=\"foldersButton\">Weitere Ordner</button></div>\n<section id=\"folderBox\" hidden><label>Ordner<select id=\"folder\"></select></label><button id=\"older\">Bis zu 100 weitere Nachrichten laden</button><p>Der regelm\u00e4\u00dfige Abruf pr\u00fcft den Posteingang. Andere Ordner und \u00e4ltere Nachrichten l\u00e4dst du hier bei Bedarf.</p></section>\n<div class=\"columns\"><section class=\"messageList\"><h2>Nachrichten</h2><div id=\"messages\"></div><div class=\"toolbar\"><button id=\"previous\">\u2190 Zur\u00fcck</button><span id=\"page\"></span><button id=\"next\">Weitere \u2192</button></div></section>\n<section id=\"reading\"><p>W\u00e4hle eine Nachricht aus.</p></section></div></div>\n<section id=\"memory\" hidden><h2>Was Johann behalten darf</h2><p>Du gibst jeden Eintrag frei. Fakten erg\u00e4nzen KI-Entw\u00fcrfe nur, wenn du sie dort ausw\u00e4hlst. Fertige Vorlagen lassen sich ohne KI wiederverwenden. Das ver\u00e4ndert kein Sprachmodell.</p>\n<label>Art<select id=\"learnKind\"><option value=\"fact\">Freigegebener Fakt</option><option value=\"template\">Fertige Antwortvorlage</option><option value=\"example\">Stilbeispiel zum Nachschlagen</option></select></label><label>Titel<input id=\"learnTitle\" maxlength=\"150\"></label><label>Nur f\u00fcr diese E-Mail-Adresse (leer = allgemein)<input id=\"learnScope\" type=\"email\"></label><label>G\u00fcltig bis (optional)<input id=\"learnExpiry\" type=\"date\"></label><label>Inhalt<textarea id=\"learnText\" rows=\"5\"></textarea></label><button id=\"learn\">Diesen Eintrag freigeben und speichern</button><div id=\"knowledge\"></div></section>\n<section id=\"sent\" hidden><h2>Versandprotokoll</h2><p>\u201eAngenommen\u201c bedeutet: Der Mailserver hat die Nachricht angenommen. Bei \u201eUngekl\u00e4rt\u201c zuerst im Gesendet-Ordner pr\u00fcfen. Johann wiederholt einen unsicheren Versand niemals automatisch.</p><div id=\"sends\"></div></section>\n<footer>Postfachzug\u00e4nge bleiben auf Asgard. Maildaten werden verschl\u00fcsselt mit Asgard ausgetauscht. Cloud-KI ist optional und wird nur auf deinen Klick genutzt. Die Website l\u00e4dt keine Bilder oder Links aus E-Mails nach.</footer>\n</div></main></body></html>\n";
})();
