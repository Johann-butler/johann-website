/* HEIMDALL_CENTER_UI_V2_HOME. Own module; no mail, Studio or push scripts replaced. */
(()=>{
 'use strict';
 const ENDPOINT='https://johann-heimdall-zentrale.bjornkorczak.workers.dev/center/view',KEY='johann_auth_token_v26';
 const E=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const token=()=>{try{return localStorage.getItem(KEY)||''}catch{return ''}};
 const style=E('style');style.textContent=`#johannHeimdallTile[hidden],#hc-overlay[hidden]{display:none!important}#hc-overlay{position:fixed;inset:0;z-index:100006;background:#08121bf5;overflow:auto;color:#e9f0f6;padding:16px;font:15px/1.6 system-ui;user-select:text;-webkit-user-select:text}#hc-card{max-width:1060px;margin:20px auto}#hc-card h1{font-size:clamp(30px,6vw,48px);letter-spacing:4px;line-height:1.1;margin:14px 0}#hc-card h2{font-size:21px;margin:0 0 12px}#hc-card p{margin:7px 0}#hc-card button{background:#173c50;color:#e9f0f6;border:1px solid #52788c;border-radius:9px;padding:11px 16px;min-height:44px;margin:4px;cursor:pointer;font:600 14px system-ui}#hc-card button:focus-visible{outline:3px solid #79e2c5}#hc-card button:disabled{opacity:.5}#hc-card section{background:#102231;border:1px solid #304c60;padding:21px;border-radius:16px;margin:16px 0}#hc-card .hc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin:18px 0}#hc-card .hc-tile{background:#102231;border:1px solid #304c60;border-radius:14px;padding:18px;overflow-wrap:anywhere}#hc-card .hc-value{font-size:29px;line-height:1.3;font-weight:700}#hc-card .hc-muted{color:#aec3d2;font-size:13px}#hc-card .hc-good{color:#7ee4c4}#hc-card .hc-warn{color:#ffd18d}#hc-card .hc-error{color:#ffabad}#hc-card .hc-state{padding:5px 10px;border-radius:8px;background:#183247;display:inline-block;font-weight:600}#hc-card .hc-row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid #304c60;padding:12px 0}#hc-card svg{width:100%;height:auto;display:block}#hc-close{float:right}#hc-card ol{padding-left:21px}`;
 document.head.append(style);
 const overlay=E('div');overlay.id='hc-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','hc-title');
 const shell=E('div');shell.id='hc-card';overlay.append(shell);
 const close=E('button','Schließen');close.id='hc-close';close.type='button';
 const brand=E('p','JOHANN · OWNER · ASGARD','hc-muted'),title=E('h1','HEIMDALL');title.id='hc-title';title.tabIndex=-1;
 const subtitle=E('p','Deine Sicherheitszentrale. Gemeldeter Zustand, klare Grenzen.','hc-muted');
 const status=E('p','Zugang wird geprüft …');status.setAttribute('role','status');
 const refresh=E('button','Aktualisieren');refresh.type='button';const content=E('div');
 shell.append(close,brand,title,subtitle,status,refresh,content);document.body.append(overlay);
 const entry=E('button','HEIMDALL · Sicherheitszentrale');entry.type='button';entry.hidden=true;entry.style.cssText='width:100%;margin-top:10px;padding:12px;border:1px solid #4a83b2;border-radius:10px;background:#123554;color:#c5eaff;text-align:left';
 const home=document.getElementById('johannHeimdallTile');
 function knownOwner(){try{return Boolean(token())&&window.johannStudioIsOwner?.()===true}catch{return false}}
 function setEntryHidden(value){entry.hidden=value;if(home)home.hidden=value&&!knownOwner()}
 setEntryHidden(true);
 const attach=()=>{const menu=document.getElementById('infoBox');if(menu&&!menu.contains(entry))menu.append(entry)};
 attach();document.addEventListener('DOMContentLoaded',attach,{once:true});
 let activeToken='',observedToken=token(),generation=0,busy=false,focusBefore=null,last=null;
 const date=x=>typeof x==='number'?new Date(x).toLocaleString('de-DE'):'Nicht gemeldet';
 const fmt=(x,d=1)=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('de-DE',{maximumFractionDigits:d}):'—';
 const labels={ok:'Normal gemeldet',warning:'Hinweis',error:'Problem',unknown:'Nicht bestätigt'};
 const categories={antivirus:'Virenschutz',firewall:'Firewallprofile',python_access:'Python-Zugänge',johann_services:'Johann-Aufgaben',checks:'Vollständigkeit der Prüfung'};
 function button(text,fn){const b=E('button',text);b.type='button';b.onclick=fn;return b}
 function section(label){const s=E('section');s.append(E('h2',label));return s}
 function tile(label,value,note,cls=''){const t=E('div',undefined,'hc-tile');t.append(E('p',label,'hc-muted'),E('p',value,'hc-value '+cls),E('p',note,'hc-muted'));return t}
 function row(parent,label,value,cls=''){const r=E('div',undefined,'hc-row');r.append(E('span',label),E('span',value,cls));parent.append(r)}
 function plot(history,now){
  const s=section('Auslastung · letzte 24 Stunden');s.append(E('p','CPU = Mittelwert zwischen zwei lokalen Messungen; RAM = Anteil des belegten physischen Speichers. Lücken bleiben Lücken.','hc-muted'));
  if(!history.length){s.append(E('p','Noch keine Verlaufspunkte gespeichert.'));return s}
  const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 800 200');svg.setAttribute('role','img');svg.setAttribute('aria-label','CPU und RAM Auslastung in Prozent über 24 Stunden');
  const node=(tag,attrs,text)=>{const e=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;svg.append(e);return e};
  for(const n of [0,50,100]){const y=160-n*1.3;node('line',{x1:45,x2:780,y1:y,y2:y,stroke:'#355167','stroke-width':1});node('text',{x:2,y:y+5,fill:'#aec3d2','font-size':12},n+' %')}
  const start=now-86400000;
  for(const [key,color]of [['cpu','#7ee4c4'],['ram','#ffcc83']]){
   let points=[],previous=0;const flush=()=>{if(points.length)node('polyline',{points:points.join(' '),fill:'none',stroke:color,'stroke-width':2.5});points=[]};
   for(const p of history){const value=p[key];if(!Number.isFinite(value)||value<0||value>100||p.at<start||p.at>now){flush();previous=0;continue}if(previous&&p.at-previous>720000)flush();points.push((45+735*(p.at-start)/86400000).toFixed(1)+','+(160-1.3*value).toFixed(1));previous=p.at}flush();
  }
  node('text',{x:45,y:190,fill:'#aec3d2','font-size':12},'vor 24 Stunden');node('text',{x:735,y:190,fill:'#aec3d2','font-size':12},'jetzt');
  s.append(svg,E('p','Grün: CPU · Orange: RAM · '+history.length+' gespeicherte Verlaufspunkte','hc-muted'));return s;
 }
 function render(data){
  content.replaceChildren();const now=data.server_at,d=data.latest;
  if(!d){const empty=section('Noch keine Daten von Asgard');empty.append(E('p','Owner-Zugang ist bestätigt. Der lokale Übermittler hat noch keinen Statistikstand geliefert. Die Einrichtung auf Asgard und center-status.json prüfen.'));content.append(empty);return}
  const fresh=now-d.sample_at<=180000&&now-d.sample_at>=-60000;
  status.textContent=(fresh?'Rückmeldung aktuell':'Rückmeldung veraltet – aktuellen Zustand nicht bestätigt')+' · Messpunkt '+date(d.sample_at);
  status.className=fresh?'hc-good':'hc-warn';
  const grid=E('div',undefined,'hc-grid'),res=d.resources,s=d.security,securityFresh=fresh&&s&&now-s.checked_at<=660000;
  grid.append(tile('CPU',fmt(fresh?res.cpu_percent:null)+' %','Erster Messpunkt kann noch ohne CPU-Wert sein.'));
  grid.append(tile('RAM',fmt(fresh?res.memory?.used_percent:null)+' %',res.memory?fmt(res.memory.free_gib)+' GiB frei / '+fmt(res.memory.total_gib)+' GiB gesamt':'Nicht gemeldet'));
  const counts=securityFresh?s.findings:null;
  grid.append(tile('Sicherheitshinweise',counts?String(counts.high+counts.warning):'—','Hoch + Warnung im letzten bestätigten Wächterbericht',counts&&counts.high+counts.warning?'hc-warn':''));
  grid.append(tile('Unbekannte Prüfungen',counts?String(counts.unknown):'—','Unbekannt ist keine Entwarnung.',counts?.unknown?'hc-warn':''));content.append(grid);
  const security=section('Schutzstatus');security.append(E('p','Prüfstand: '+date(s?.checked_at),'hc-muted'));
  for(const [key,label]of Object.entries(categories)){const state=securityFresh?s.states[key]:'unknown';row(security,label,labels[state]||labels.unknown,state==='ok'?'hc-good':state==='error'?'hc-error':'hc-warn')}
  security.append(E('p','Ein normaler Sammelstatus ist kein Beweis für Angriffsfreiheit oder eine vollständig geprüfte Firewall. Keine bestätigte Firewall-V2-Korrektur wird vorausgesetzt.','hc-muted'));content.append(security);
  const disks=section('Speicherplatz auf Asgard');for(const [key,label]of [['system','Systemlaufwerk'],['photos','Foto-Laufwerk']]){const v=res.disks[key];row(disks,label,v?fmt(v.free_gib)+' GiB frei / '+fmt(v.total_gib)+' GiB gesamt':'Nicht verfügbar')};disks.append(E('p',fresh?'Kapazität, keine Messung von Datenträger-I/O oder Temperatur.':'Historischer Kapazitätsstand; Asgard liefert derzeit keine aktuelle Bestätigung.','hc-muted'));content.append(disks,plot(data.history,now));
  const night=section('Letzter Nachtcheck');if(d.night){row(night,'Beginn',date(d.night.checked_at));row(night,'Art',d.night.manual?'Manuell ausgelöster Test':'Nachtlauf');row(night,'Ergebnis',labels[d.night.state]);row(night,'Hinweise / unbekannt',d.night.warnings+' / '+d.night.unknown)}else night.append(E('p','Kein Nachtbericht übermittelt.'));night.append(E('p','Lokaler Check definierter eigener Ziele, kein vollständiger Penetrationstest.','hc-muted'));content.append(night);
  const pdf=section('PDF-Prüfungen · vorhandener lokaler Bestand');
  if(d.pdf){const c=d.pdf.counts;row(pdf,'Ohne Erkennung',String(c.no_detection));row(pdf,'Auffällige PDF-Funktionen',String(c.warning));row(pdf,'Erkennung ODER Scanfehler',String(c.blocked));row(pdf,'Unvollständig',String(c.unknown));row(pdf,'Wartend / in Prüfung',c.waiting+' / '+c.scanning);row(pdf,'Letztes gemeldetes Ergebnis',date(d.pdf.latest_at))}else pdf.append(E('p','PDF-Prüfablage nicht angebunden.'));
  pdf.append(E('p','Zähler der noch vorhandenen Berichte, keine lebenslange Gesamtstatistik. Gelöschte Berichte verschwinden aus diesem Bestand. „Keine Erkennung“ bedeutet nicht „garantiert sicher“.','hc-muted'));content.append(pdf);
  const mail=section('E-Mail-Schutz');
  if(d.mail){const m=d.mail,stale=!fresh||now-m.updated_at>900000;row(mail,'Vom Mail-Modul gemeldeter Status',stale?'Letzter Prüfstand älter als 15 Minuten':labels[m.state]);row(mail,'Statistikstand',date(m.updated_at));for(const [k,label]of [['checked','Bewertete Nachrichten (inkl. unvollständig)'],['no_detection','Ohne Hinweise in der erfassten Prüfung'],['blocked','Prüfbedarf / Sperrhinweis'],['incomplete','Unvollständig'],['pending','Ausstehend']])row(mail,label,String(m.counts[k]));mail.append(E('p','Zähler der erhaltenen Prüfereignisse bis zu sieben Tage. Hinweise sind kein Malwarebeweis. Ohne Anhang nur Hinweisprüfung; Anhänge brauchen eigene bestätigte Scans. Keine Gesamtstatistik aller jemals empfangenen Mails.','hc-muted'))}
  else mail.append(E('p','Noch keine Prüfstatistik vorhanden. Nach der Installation der Mail-Härtung eine neue Nachricht abrufen oder den Anhangsscan anfordern. Vorhandene Nachrichten gelten hier noch nicht als geprüft.'));
  mail.append(E('p','Die Schnittstelle übernimmt nur Status, Zeitpunkt und Zähler. Keine Absender, Betreffzeilen, Nachrichten oder Anhänge. Ein älterer Prüfstand kann auch bedeuten, dass keine neue Mail geprüft wurde.','hc-muted'));content.append(mail);
  const footer=section('Meldungen & Grenzen');footer.append(E('p','Diese Zentrale zeigt gemeldete Daten. Sie schaltet keine Dienste ab und führt keine Reparaturen, Exploits oder E-Mail-Aktionen aus. Verlauf: 24 Stunden sichtbar, bis zu sieben Tage gespeichert.'));
  if(typeof window.johannMeldungenOpen==='function')footer.append(button('Push-Meldungen mit Erklärung',()=>{hide();window.johannMeldungenOpen()}));content.append(footer);
 }
 async function fetchView(show=false){
  if(busy)return;const current=token();if(!current){setEntryHidden(true);content.replaceChildren();return}
  busy=true;refresh.disabled=true;const ticket=generation;
  try{
   const r=await fetch(ENDPOINT,{headers:{Authorization:'Bearer '+current},cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok){const e=Error(r.status===401||r.status===403?'Owner-Anmeldung nicht bestätigt':'Zentrale antwortet derzeit nicht');e.denied=r.status===401||r.status===403;throw e;}
   const data=await r.json();if(data.ok!==true||data.centerVersion!==1)throw Error('Unbekannte Zentrale-Antwort');
   if(ticket!==generation||current!==token())return;
   activeToken=current;setEntryHidden(false);last=data;
   if(show||!overlay.hidden){if(!data.latest)status.textContent='Owner-Zugang bestätigt';render(data)}
  }catch(e){if(e.denied){activeToken='';setEntryHidden(true);last=null}if(ticket===generation&&!overlay.hidden){content.replaceChildren();status.className='hc-warn';status.textContent=e.name==='TimeoutError'?'Zentrale antwortet nicht rechtzeitig':e.message;content.append(button('Owner-Anmeldung öffnen',()=>{hide();window.johannOpenLogin?.()}))}if(!activeToken)entry.hidden=true}
  finally{busy=false;refresh.disabled=false;if(token()&&token()!==current)fetchView(!overlay.hidden)}
 }
 function hide(){overlay.hidden=true;content.replaceChildren();last=null;focusBefore?.focus()}
 function open(){focusBefore=document.activeElement;overlay.hidden=false;title.focus();status.textContent='Owner-Zugang und Prüfstand werden geladen …';content.replaceChildren();fetchView(true)}
 close.onclick=hide;refresh.onclick=()=>fetchView(true);entry.onclick=open;if(home)home.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();open()},true);overlay.onclick=e=>{if(e.target===overlay)hide()};
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape')hide();if(e.key==='Tab'){const b=[...shell.querySelectorAll('button:not(:disabled)')].filter(x=>x.offsetParent!==null),first=b[0],end=b.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();end?.focus()}else if(!e.shiftKey&&document.activeElement===end){e.preventDefault();first?.focus()}}});
 function authChanged(){if(token()!==observedToken){observedToken=token();generation++;activeToken='';setEntryHidden(true);content.replaceChildren();last=null;if(!overlay.hidden)status.textContent='Zugang wird erneut geprüft …';fetchView(!overlay.hidden)}}
 window.addEventListener('johann-auth-state',authChanged);window.addEventListener('storage',authChanged);window.addEventListener('focus',()=>{if(!entry.hidden||token())fetchView(!overlay.hidden)});
 setInterval(()=>{if(token()!==observedToken)authChanged();else setEntryHidden(!activeToken)},3000);
 setInterval(()=>{if(!overlay.hidden&&!document.hidden)fetchView(true)},60000);
 window.johannHeimdallOpen=open;fetchView(false);
})();
