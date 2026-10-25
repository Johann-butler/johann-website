/* Johann Push V1: Owner-Anmeldung, bewusste Freigabe, keine automatische Berechtigungsabfrage. */
(()=>{
 'use strict';
 const ENDPOINT='https://johann-push.bjornkorczak.workers.dev/';
 const AUTH_KEY='johann_auth_token_v26';
 let cached=null,busy=false,registration=null,previousFocus=null;
 const el=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e};
 const style=el('style');style.textContent=`
 #jp-modal[hidden]{display:none!important}#jp-modal{position:fixed;inset:0;z-index:100002;background:#020b18e8;overflow:auto;padding:18px;user-select:text;-webkit-user-select:text}
 #jp-card{max-width:650px;margin:20px auto;color:#edf7ff;background:#10253b;border:1px solid #5b99c8;border-radius:22px;padding:22px;font:15px/1.55 system-ui}
 #jp-card h2{font-size:27px;margin:0 0 6px}#jp-card h3{margin:0 0 8px;font-size:19px}#jp-card p{margin:8px 0}#jp-card section{margin:17px 0;padding:16px;border:1px solid #416a8c;border-radius:15px;background:#0a1d31}
 #jp-card button{min-height:45px;border:1px solid #77bcec;border-radius:11px;background:#235f91;color:white;padding:10px 14px;font:600 14px system-ui;margin:5px 7px 5px 0;cursor:pointer}#jp-card button:disabled{opacity:.5;cursor:wait}#jp-card button:focus-visible{outline:3px solid white;outline-offset:2px}
 #jp-card .jp-muted{color:#bfd6e8;font-size:13px}#jp-card .jp-code{font:700 24px/1.5 ui-monospace,monospace;color:#a7ddff;letter-spacing:.08em;user-select:all;-webkit-user-select:all}#jp-status,#jp-agent{white-space:pre-wrap;overflow-wrap:anywhere;min-height:24px}#jp-close{float:right}#jp-card .jp-problem{color:#ffcf9d}#jp-devices p{padding-bottom:8px;border-bottom:1px solid #36556e}
 `;document.head.append(style);
 const modal=el('div');modal.id='jp-modal';modal.hidden=true;modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','jp-title');
 modal.innerHTML=`<div id="jp-card"><button id="jp-close" type="button" aria-label="Benachrichtigungen schließen">×</button><p class="jp-muted">JOHANN · OWNER</p><h2 id="jp-title">Benachrichtigungen</h2><p>Johann kann dich bei geschlossenem App-Fenster über den Betrieb von Asgard informieren.</p><p id="jp-status" role="status" aria-live="polite"></p><section><h3>Dieses Gerät</h3><p id="jp-permission"></p><p id="jp-install" class="jp-muted"></p><button id="jp-enable" type="button">Push aktivieren</button><button id="jp-test" type="button">Testmeldung senden</button><button id="jp-disable" type="button">Auf diesem Gerät abschalten</button><p class="jp-muted">Nach Einrichtung auf Asgard sind Betriebs-, Temperatur- und WLAN-Meldungen sowie sensor- und wettergestützte Lüftungshinweise möglich. Push bleibt bis zum Abschalten aktiv, auch wenn du dich bei Johann abmeldest.</p></section><section><h3>Asgard verbinden</h3><p>Erstelle einen einmaligen Code und gib ihn im Einrichtungsprogramm auf Asgard ein. Der Code gilt zehn Minuten.</p><button id="jp-pair" type="button">Kopplungscode erstellen</button><p id="jp-code" class="jp-code"></p></section><section><h3>Betriebsstatus</h3><p id="jp-agent">Noch nicht geladen.</p><p id="jp-cron" class="jp-muted"></p><button id="jp-refresh" type="button">Status aktualisieren</button></section><section><h3>Angemeldete Push-Geräte</h3><div id="jp-devices"></div><p class="jp-muted">Die Push-Anmeldung enthält eine Zustelladresse und Verschlüsselungsschlüssel. In der Cloud werden außerdem Asgards letzte Rückmeldung und kurze Betriebszustände sowie eingerichtete Raum-/Balkonwerte und Wetterzusammenfassungen gespeichert. Bei WLAN-Meldungen werden Gerätename und MAC-Adresse für den Nachrichtentext verarbeitet. Keine Fotos, Dateinamen oder Chattexte. Meldungsaufträge werden nach 30 Tagen entfernt. Abschalten und Entfernen ist hier jederzeit möglich.</p></section></div>`;
 document.body.append(modal);const $=id=>document.getElementById(id);
 const homeSection=el('section');homeSection.innerHTML='<h3>Räume, Balkon & WLAN</h3><div id="jp-home"></div><p class="jp-muted">Grenzen: Wohnzimmer 21 bis 25 °C, Kinderzimmer 19 °C, Schlafzimmer 18 °C, Badezimmer 19 °C, Küche 18 °C. Überwärmung im Wohnzimmer nach zehn Minuten bestätigen; Fenster nur vermuten.  Warnung nach 20 Minuten darunter; Entwarnung nach zehn Minuten mindestens 0,5 °C darüber. WLAN-Abfrage etwa jede Minute. Meldungen folgen mit der Cloud-Prüfung, gegebenenfalls bis zu fünf Minuten später.</p>';$('jp-agent').closest('section').after(homeSection);
 const entry=el('button','🔔 Benachrichtigungen · Owner');entry.type='button';entry.style.cssText='display:block;width:100%;margin-top:10px;padding:11px;background:#123554;color:#c5eaff;border:1px solid #4a83b2;border-radius:10px;text-align:left';
 document.getElementById('infoBox')?.append(entry);
 const supported=()=>('serviceWorker'in navigator)&&('PushManager'in window)&&('Notification'in window);
 const standalone=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const isiOS=()=>/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const stamp=x=>x?new Date(x).toLocaleString('de-DE'):'Noch keine Rückmeldung';
 async function api(action,extra={}){
  let token='';try{token=localStorage.getItem(AUTH_KEY)||''}catch{}
  if(!token){window.johannOpenLogin?.();throw Error('Bitte zuerst mit deinem Owner-Konto anmelden. Danach Benachrichtigungen erneut öffnen.')}
  const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({action,...extra}),signal:AbortSignal.timeout(20000)});
  let d;try{d=await r.json()}catch{throw Error('Push-Worker liefert keine lesbare Antwort. Einrichtung in Cloudflare prüfen.')}
  if(!r.ok||d.error)throw Error(d.error||'Push-Anfrage fehlgeschlagen.');return d;
 }
 async function current(){if(!supported())return null;registration=await navigator.serviceWorker.getRegistration('./');return registration?registration.pushManager.getSubscription():null}
 async function idFor(sub){if(!sub)return null;const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(sub.endpoint));return [...new Uint8Array(h)].map(b=>b.toString(16).padStart(2,'0')).join('')}
 function keyBytes(s){return Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0))}
 function status(text,bad=false){$('jp-status').textContent=text;$('jp-status').classList.toggle('jp-problem',bad)}
 async function render(){
  const sub=await current(),id=await idFor(sub),known=cached?.subscriptions.some(x=>x.id===id);
  $('jp-permission').textContent=!supported()?'Push ist in diesem Browserfenster nicht verfügbar.':Notification.permission==='denied'?'Mitteilungen wurden abgelehnt. Bitte in den iPhone-Einstellungen für Johann wieder erlauben.':known?'Dieses Gerät ist für Johann-Push angemeldet.':sub?'Eine lokale Push-Anmeldung ist vorhanden, aber noch nicht mit deinem Owner-Konto verbunden.':'Dieses Gerät ist noch nicht für Johann-Push angemeldet.';
  $('jp-install').textContent=isiOS()&&!standalone()?'Auf dem iPhone: Johann in Safari öffnen → Teilen → Zum Home-Bildschirm. Anschließend über das Johann-Symbol öffnen und hier Push aktivieren.':'Für den ersten Test die Johann-App nach dem Senden schließen und den Sperrbildschirm prüfen. Fokus-Einstellungen können Meldungen stummschalten.';
  $('jp-enable').disabled=busy||!cached||!supported()||(isiOS()&&!standalone())||Notification.permission==='denied';
  $('jp-test').disabled=busy||!known;$('jp-disable').disabled=busy||!sub;$('jp-pair').disabled=busy||!cached;
  const agent=cached?.agents?.[0],words={ok:'OK',warning:'Hinweis',error:'Problem',unknown:'noch nicht bestätigt'};const fresh=agent?.last_seen&&Date.now()-agent.last_seen<300000;
  $('jp-agent').textContent=agent?('Asgard: '+(fresh?'Rückmeldung aktuell':'noch keine aktuelle Rückmeldung')+'\nZuletzt: '+stamp(agent.last_seen)+(fresh?'\nFotoempfang: '+(words[agent.summary?.foto]||words.unknown)+'\nHue-Verbindung: '+(words[agent.summary?.hue]||words.unknown)+'\nFoto-Festplatte: '+(words[agent.summary?.storage]||words.unknown)+(agent.summary?.photo_stale?'\nFotolauf liegt über 36 Stunden zurück.':''):'\nEinzelne Betriebszustände sind bis zur nächsten Rückmeldung nicht aktuell.')):'Asgard ist noch nicht gekoppelt.';
  $('jp-cron').textContent=cached?.lastTick?(Date.now()-cached.lastTick<900000?'Cloud-Prüfung zuletzt: ':'Cloud-Prüfung länger nicht gelaufen: ')+stamp(cached.lastTick):'Noch keine Cloud-Prüfung registriert. Cron-Trigger im Push-Worker einrichten.';
  $('jp-home').replaceChildren();const home=cached?.home,homeFresh=home&&Date.now()-home.receivedAt<180000;
  if(!cached?.homeVersion)$('jp-home').append(el('p','Die Raum-/WLAN-Erweiterung ist im Push-Worker noch nicht bereitgestellt.'));
  else if(!home)$('jp-home').append(el('p','Noch keine Raum-/WLAN-Rückmeldung von Asgard. Einrichtung dort abschließen.'));
  else{
   for(const [key,label] of [['living','Wohnzimmer'],['kids','Kinderzimmer'],['bedroom','Schlafzimmer'],['bathroom','Badezimmer'],['kitchen','Küche']]){const r=home.rooms?.[key],fresh=homeFresh&&r?.sample_at&&Date.now()-r.sample_at<660000;
    const text=!r?.configured?'Sensor noch nicht zugeordnet':!fresh||r.status==='unknown'?'kein aktueller bestätigter Messwert':r.temperature.toLocaleString('de-DE',{maximumFractionDigits:1})+' °C'+(r.humidity!==null?' · '+r.humidity+' % Luftfeuchtigkeit':'')+' · '+({ok:'im Bereich',pending:'Grenzwert überschritten/unterschritten; Wartezeit läuft',warning:'Temperaturhinweis aktiv'}[r.status]||'noch nicht bestätigt');
    $('jp-home').append(el('p',label+': '+text));
   }
   const outside=home.rooms?.outdoor,outFresh=homeFresh&&outside?.sample_at&&Date.now()-outside.sample_at<660000&&outside.status!=='unknown';
   $('jp-home').append(el('p','Balkon / Außen: '+(!outside?.configured?'Außensensor noch nicht zugeordnet':outFresh?outside.temperature.toLocaleString('de-DE',{maximumFractionDigits:1})+' °C'+(outside.humidity!==null?' · '+outside.humidity+' % Luftfeuchtigkeit':''):'kein aktueller bestätigter Messwert')));
   if(outFresh){const trend=home.outdoor_trend;$('jp-home').append(el('p',trend?'Am Balkonsensor in rund '+trend.minutes+' Minuten: '+(trend.direction==='stable'?'weitgehend stabil':Math.abs(trend.delta).toLocaleString('de-DE')+' °C '+(trend.direction==='falling'?'kälter':'wärmer'))+'.':'Balkontrend: zunächst eine Messreihe von rund einer Stunde sammeln.'))}
   const weather=home.weather,weatherFresh=homeFresh&&weather&&Date.now()-weather.fetched_at<7200000&&weather.valid_until>Date.now();
   if(weatherFresh){
    let text='Vorhersage Bochum für die nächsten rund drei Stunden: '+weather.minimum.toLocaleString('de-DE',{maximumFractionDigits:1})+' bis '+weather.maximum.toLocaleString('de-DE',{maximumFractionDigits:1})+' °C';
    if(weather.rain_probability!==null)text+=' · höchste stündliche Niederschlagswahrscheinlichkeit '+Math.round(weather.rain_probability)+' %';
    if(weather.near_gust!==null)text+=' · Böen nächste Stunde bis '+Math.round(weather.near_gust)+' km/h';
    $('jp-home').append(el('p',text+'.'));
    if(outFresh&&weather.current_model_temperature!==null&&Math.abs(outside.temperature-weather.current_model_temperature)>=5)$('jp-home').append(el('p','Balkonmessung und regionales Wettermodell weichen deutlich ab. Sonne, Wandnähe und geschützte Lage können den Sensor beeinflussen.'));
   }else if(outside?.configured)$('jp-home').append(el('p','Noch keine aktuelle Wettervorhersage bestätigt.'));
   const reasons={normal:'Luftfeuchtigkeit unter der Hinweisschwelle',unknown:'Lüftungsbedingungen noch nicht bestätigt',outside_moist:'Außenluft bietet aktuell wenig Trocknungsvorteil',room_cool:'Raum ist bereits unter deiner Temperaturgrenze',weather_unknown:'Vorhersage für einen Lüftungshinweis fehlt',weather_caution:'Außenluft wäre trockener; Regen-/Windvorhersage spricht für Vorsicht',suitable:'Außenluft wäre trockener; Lüftungsfenster nach Sensoren und Vorhersage günstig'};
   for(const [room,label] of [['living','Wohnzimmer'],['kids','Kinderzimmer'],['bedroom','Schlafzimmer'],['bathroom','Badezimmer'],['kitchen','Küche']])if(homeFresh&&home.rooms?.[room]?.configured&&outside?.configured)$('jp-home').append(el('p',label+' · '+(reasons[home.ventilation?.[room]?.reason]||reasons.unknown)));
   if(outside?.configured){const source=el('p',undefined,'jp-muted');source.append(document.createTextNode('Balkon = Sensorwert am Standort; Prognose = regionales Wettermodell. Quelle: '));const link=el('a','Open-Meteo');link.href='https://open-meteo.com/';link.target='_blank';link.rel='noopener noreferrer';link.style.color='#a7ddff';source.append(link);$('jp-home').append(source)}
   // JOHANN_ROOM_CLIMATE_UI_V1
   if(homeFresh&&home.climateVersion){
    const labels={living:'Wohnzimmer',kids:'Kinderzimmer',bedroom:'Schlafzimmer',bathroom:'Badezimmer',kitchen:'Küche'};
    const advice={outside_unknown:'Außenwert fehlt; Heizungsziel prüfen.',vent_brief:'Kurz stoßlüften; Heizung herunterregeln, falls eingeschaltet.',vent_cool:'Draußen kühler: kontrolliert lüften; Heizungsziel prüfen.',vent_caution:'Außen kühler, aber Regen/Böen: nur geschützt lüften.',vent_small_gain:'Nur geringer Kühlvorteil durch Lüften; verschatten und Heizungsziel prüfen.',shade_ac:'Außen mindestens genauso warm: Fenster zu, verschatten; ggf. Klimaanlage zum Kühlen.'};
    for(const [room,hint] of Object.entries(home.room_hints||{}))$('jp-home').append(el('p',labels[room]+': '+(hint.pending?'Wärmeentwicklung wird beobachtet. ':'')+(advice[hint.reason]||'')));
    const cases=home.room_cases||[];
    if(cases.length)$('jp-home').append(el('h3','Empfehlungen & deine Rückmeldung'));
    const fb={window:'Fenster war offen',shower:'Ich habe geduscht',cooking:'Es wurde gekocht',heating:'Heizung war an',wrong:'Vermutung passt nicht',helpful:'Empfehlung war hilfreich'};
    for(const c of [...cases].reverse()){
     const p=el('p',labels[c.room]+' · '+stamp(c.at)+' · '+({hot:'Über 25 °C',rising:'Schneller Temperaturanstieg',rapid_drop:'Schneller Temperaturabfall'}[c.scenario]||'Hinweis')+' · '+c.temperature+' °C');
     if(c.observed_delta!==undefined)p.append(el('span',' · Danach gemessen: '+(c.observed_delta>=0?'+':'')+c.observed_delta+' °C. Ursache nicht bestätigt.'));
     const prior=Object.entries(c.experience||{}).filter(([k,n])=>n>0&&fb[k]);if(prior.length)p.append(el('span',' · Ähnliche frühere Fälle laut deiner Rückmeldung: '+prior.map(([k,n])=>fb[k]+' ('+n+'×)').join(', ')+'. Aktuelle Ursache unbestätigt.'));
     const known=(cached.roomFeedback||[]).find(x=>x.case_id===c.id);
     p.append(el('br'));p.append(el('span',known?'Deine Rückmeldung: '+fb[known.label]+'. ':'Was war tatsächlich los? '));
     const select=el('select');select.setAttribute('aria-label','Rückmeldung für '+labels[c.room]);select.style.cssText='max-width:100%;min-height:44px;background:#10253b;color:#edf7ff;border:1px solid #77bcec;border-radius:8px;padding:8px';
     select.append(new Option('Bitte auswählen …',''));for(const [k,v] of Object.entries(fb))select.append(new Option(v,k));if(known)select.value=known.label;
     const save=el('button','Rückmeldung speichern');save.type='button';save.onclick=()=>{if(!select.value)return;perform(async()=>{await api('room_feedback',{case_id:c.id,label:select.value});await refresh();status('Rückmeldung gespeichert. Sie bestätigt nur deine Angabe; keine Geräte wurden geschaltet.')})};
     p.append(select,save);$('jp-home').append(p);
    }
    if(cases.length)$('jp-home').append(el('p','Verlauf und bestätigte Rückmeldungen sind ein Erfahrungsprotokoll. Keine automatische Änderung deiner Grenzwerte. Bis 30 Tage gespeichert; ausführliche Messreihe bis 72 Stunden auf Asgard.','jp-muted'));
   }
   // JOHANN_POWER_UI_V1
   const power=home.power,powerFresh=homeFresh&&power?.sample_at&&Date.now()-power.sample_at>=-60000&&Date.now()-power.sample_at<180000;
   let powerText='Stromversorgung: noch kein aktueller bestätigter Windows-Wert';
   if(powerFresh){
    powerText='Asgard: '+({mains:'am Netzstrom 🔌',battery:'läuft auf Akku 🪫',unknown:'Stromquelle nicht bestätigt'}[power.ac]||'Stromquelle nicht bestätigt');
    if(power.percent!==null)powerText+=' · '+power.percent+' % Akku';
    if(power.saver!==null)powerText+=' · Stromsparmodus '+(power.saver?'aktiv':'aus');
   }
   $('jp-home').append(el('p',powerText));
   const wifi=home.wifi,scanFresh=homeFresh&&wifi?.scan_at&&Date.now()-wifi.scan_at<180000;
   $('jp-home').append(el('p','WLAN: '+(!wifi?.configured?'FRITZ!Box noch nicht eingerichtet':scanFresh&&wifi.status==='ok'?wifi.connected+' aktive WLAN-Geräte · zuletzt '+stamp(wifi.scan_at):'keine aktuelle bestätigte Router-Abfrage')));
  }
  $('jp-devices').replaceChildren();for(const s of cached?.subscriptions||[]){const p=el('p',(s.id===id?'Dieses Gerät':'Weiteres Gerät')+' · angemeldet '+stamp(s.created_at));const remove=el('button','Entfernen');remove.type='button';remove.onclick=()=>perform(async()=>{await api('push_unsubscribe',{id:s.id});if(s.id===id&&sub)await sub.unsubscribe();await refresh();status('Push-Gerät entfernt.')});p.append(document.createElement('br'),remove);$('jp-devices').append(p)}
  if(agent){const disconnect=el('button','Asgard-Kopplung aufheben');disconnect.type='button';disconnect.onclick=()=>perform(async()=>{await api('push_revoke_agent',{id:agent.id});await refresh();status('Asgard-Kopplung aufgehoben. Der lokale Wächter läuft weiter.')});$('jp-devices').append(disconnect)}
 }
 // JOHANN_WOHNUNG_SNAPSHOT_V1: only the existing Owner-protected status endpoint.
 window.johannHomeReadSnapshot=async()=>{
  if(window.johannStudioIsOwner?.()!==true)throw Error('Bitte mit deinem Owner-Konto anmelden.');
  let before='';try{before=localStorage.getItem(AUTH_KEY)||''}catch{}
  if(!before)throw Error('Owner-Anmeldung fehlt.');
  const snapshot=await api('push_status');
  let after='';try{after=localStorage.getItem(AUTH_KEY)||''}catch{}
  if(before!==after||window.johannStudioIsOwner?.()!==true)throw Error('Anmeldung wurde geändert. Bitte Ansicht erneut öffnen.');
  const h=snapshot?.home;
  return {homeVersion:snapshot?.homeVersion,home:h?{receivedAt:h.receivedAt,rooms:h.rooms,outdoor_trend:h.outdoor_trend,weather:h.weather,ventilation:h.ventilation,climateVersion:h.climateVersion,room_hints:h.room_hints,room_cases:h.room_cases,power:h.power}:null};
 };
 async function refresh(){cached=await api('push_status');await render()}
 async function perform(fn){if(busy)return;busy=true;try{await render();await fn()}catch(e){status(e.name==='TimeoutError'?'Push-Dienst antwortet nicht rechtzeitig.':e.message,true)}finally{busy=false;await render().catch(()=>{})}}
 function close(){modal.hidden=true;previousFocus?.focus()}
 function open(){previousFocus=document.activeElement;modal.hidden=false;document.getElementById('infoBox')?.classList.remove('show');$('jp-close').focus();status('Lade Push-Einstellungen …');refresh().then(()=>status('Einstellungen geladen.')).catch(e=>{status(e.message,true);render().catch(()=>{})})}
 entry.onclick=open;$('jp-close').onclick=close;modal.addEventListener('click',e=>{if(e.target===modal)close()});
 modal.addEventListener('keydown',e=>{if(e.key==='Escape')close();if(e.key==='Tab'){const buttons=[...modal.querySelectorAll('button:not(:disabled)')].filter(x=>x.offsetParent!==null);const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
 $('jp-enable').onclick=async()=>{
  if(busy||!cached||!supported())return;
  // Berechtigungsanfrage direkt durch diesen bewussten Klick auslösen.
  let permission;try{permission=Notification.permission==='granted'?'granted':await Notification.requestPermission()}catch{status('Die Mitteilungsfreigabe konnte nicht geöffnet werden. Johann über das Symbol auf dem Home-Bildschirm starten.',true);return}
  if(permission!=='granted'){status('Push wurde nicht freigegeben.',true);await render();return}
  perform(async()=>{registration=await navigator.serviceWorker.ready;let sub=await registration.pushManager.getSubscription();if(!sub)sub=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:keyBytes(cached.publicKey)});await api('push_subscribe',{subscription:sub.toJSON()});await refresh();status('Push ist aktiviert. Sende jetzt eine Testmeldung.')});
 };
 $('jp-test').onclick=()=>perform(async()=>{const sub=await current(),id=await idFor(sub);const d=await api('push_test',{id});status(d.accepted>0?'Der Push-Dienst hat die Testmeldung angenommen. Bitte am Sperrbildschirm prüfen.':'Die Testmeldung konnte nicht zugestellt werden. Push auf diesem Gerät gegebenenfalls aus- und wieder einschalten.',d.accepted===0);await refresh()});
 $('jp-disable').onclick=()=>perform(async()=>{const sub=await current();if(sub){await api('push_unsubscribe',{id:await idFor(sub)});await sub.unsubscribe()}await refresh();status('Push auf diesem Gerät abgeschaltet.')});
 $('jp-pair').onclick=()=>perform(async()=>{const d=await api('push_pair_code');$('jp-code').textContent=d.code;status('Code erstellt. Gültig bis '+stamp(d.expiresAt)+'. Nur im Einrichtungsprogramm auf Asgard eingeben.');});
 $('jp-refresh').onclick=()=>perform(async()=>{await refresh();status('Status aktualisiert.')});
 window.johannPushOpen=open;if(new URL(location.href).searchParams.get('johannPush')==='1')open();
})();
