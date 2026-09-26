/* TEST-ONLY: no production Johann API calls. Weather/OpenLigaDB remain available. */
(function(){
  const nativeFetch=window.fetch.bind(window);
  const blockedHostnames=new Set(['johann-ki.bjornkorczak.workers.dev','api.johann-butler.de']);
  window.fetch=function(input,init){
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    let url;
    try { url=new URL(raw,location.href); } catch(_) { return Promise.reject(new Error('Test: Ungültige Anfrageadresse.')); }
    if(blockedHostnames.has(url.hostname)||url.pathname.includes('api-in-diesem-test-deaktiviert')) {
      return Promise.reject(new Error('Testmodus: KI, Kochen und Anmeldung sind hier deaktiviert.'));
    }
    return nativeFetch(input,init);
  };
  document.addEventListener('click',function(e){
    const el=e.target.closest('button'); if(!el)return;
    if(el.matches('[data-kitchen-ask], .kitchen-ask, #sendButton, #mdReload, #mdMailTest, #mdImport, #kidsGenerate, #authRequest, #authVerify')){
      e.preventDefault();e.stopImmediatePropagation();
      const status=document.getElementById('johann-test-status');
      if(status)status.textContent='Testmodus: Diese Funktion benötigt Johann-KI und ist hier absichtlich deaktiviert. Wetter und Navigation kannst du testen.';
    }
  },true);
})();
const PAYPAL="https://www.paypal.me/JohannButler";
const scene=document.getElementById("scene"),speech=document.getElementById("speech");
let speechTimer,weatherCode=null,sunrise=null,sunset=null,last1848Day="";
function say(text,ms=4800){
 clearTimeout(speechTimer);
 // Untrusted chat, weather, voice and user input must never be interpreted as HTML.
 // Only these two pre-existing, fixed links are rendered as actual links.
 const message=String(text??'');
 speech.replaceChildren();
 const fixedLinks=[
  {needle:'<a href="mailto:machmal@johann-butler.de">machmal@johann-butler.de</a>',url:'mailto:machmal@johann-butler.de',label:'machmal@johann-butler.de'},
  {needle:'<a href="'+PAYPAL+'" target="_blank" rel="noopener noreferrer">Hier geht es zu Johanns Kaffeekasse.</a>',url:PAYPAL,label:'Hier geht es zu Johanns Kaffeekasse.'}
 ];
 const link=fixedLinks.find(x=>message.includes(x.needle));
 if(link){const at=message.indexOf(link.needle);speech.append(document.createTextNode(message.slice(0,at)));const a=document.createElement('a');a.href=link.url;a.textContent=link.label;if(link.url.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer'}speech.append(a,document.createTextNode(message.slice(at+link.needle.length)))}
 else speech.textContent=message;
 speech.classList.add('show');speechTimer=setTimeout(()=>speech.classList.remove('show'),ms)
}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
// V17: wechselnde, kostenfreie Zwischenmeldungen – ohne zusätzliche KI-Anfragen.
const johannWaitLines=[
 'Einen Augenblick. Ich sortiere gerade die Synapsen.',
 'Ich schaue nach. Bitte nicht auf die leuchtende Kugel einschlagen.',
 'Eine Sekunde – ich frage mein digitales Oberstübchen.',
 'Ich bin dran. Sogar mit beiden virtuellen Händen.',
 'Moment. Eine gute Antwort ist mir lieber als eine schnelle Ausrede.',
 'Ich kümmere mich. Der Kaffee muss leider noch warten.',
 'Einen Augenblick, ich durchforste das Internet – ganz ohne Fernglas.',
 'Ich sehe nach. Für Halbwissen haben wir schließlich schon genug Stammtische.',
 'Bin dran. Die Bits und Bytes diskutieren noch.',
 'Läuft, Meister. Und diesmal ist es nicht nur die Lüftung.',
 'Ich suche. Falls ich mich verlaufe, schicke ich eine Fehlermeldung.',
 'Sekunde. Mein Gehirn ist gerade auf Dienstreise.',
 'Ich prüfe das lieber, bevor ich dir mit voller Überzeugung Quatsch erzähle.',
 'Einen Moment. Die Antwort ist irgendwo zwischen Bochum und dem Server.',
 'Ich bin dabei. Die digitale Krawatte sitzt bereits.',
 'Mal schauen, was ich dazu finde. Meine Neugier ist jedenfalls wach.',
 'Einen Augenblick. Ich lasse die Fakten erst mal antreten.',
 'Ich prüfe das. Selbst ein Butler sollte nicht einfach irgendwas behaupten.',
 'Ich habe deine Frage. Jetzt fehlt nur noch die Antwort.',
 'Das schaue ich mir an. Bitte die Spannung im Raum halten.',
 'Eine Sekunde. Ich bemühe gerade die grauen – pardon, blauen – Zellen.',
 'Ich suche nach einer brauchbaren Antwort, nicht nach einem hübschen Vorwand.',
 'Momentchen. Ich kläre das, bevor wir hier Legenden erfinden.',
 'Ich bin dran. Der Server hat schließlich auch mal etwas zu tun.',
 'Ich schaue nach. Wenn es länger dauert, war die Frage wohl gut.'
];
let johannWaitBag=[];
function nextJohannWait(){
 if(!johannWaitBag.length){johannWaitBag=[...johannWaitLines];for(let i=johannWaitBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[johannWaitBag[i],johannWaitBag[j]]=[johannWaitBag[j],johannWaitBag[i]]}}
 return johannWaitBag.pop();
}

function updateClock(){const now=new Date();document.getElementById("time").textContent=now.toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});document.getElementById("date").textContent=now.toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"long",year:"numeric"});check1848(now)}
let vflShowTimer=null,vflCountdownDay="";
function closeVflShow(){const el=document.getElementById("vflShow");el.classList.remove("on","countdown");if(vflShowTimer){clearTimeout(vflShowTimer);vflShowTimer=null}if(!active)targetEnergy=0}
function vflShow(finale=false,preview=false){
 const el=document.getElementById("vflShow"),number=document.getElementById("vflNumber"),pre=document.getElementById("vflPretitle"),message=document.getElementById("vflMessage"),sub=document.getElementById("vflSub");
 if(vflShowTimer)clearTimeout(vflShowTimer);
 el.classList.add("on");el.classList.toggle("countdown",!finale);
 pre.textContent=finale?"SEIT 1848 · FÜR IMMER UNSER REVIER":"ACHTUNG, MEISTER · GLEICH IST ES SO WEIT";
 number.textContent=finale?"1848":"18:48";
 message.textContent=finale?"BOCHUM. HEIMAT. VfL.":"DAS REVIER ZÄHLT RUNTER";
 sub.textContent=finale?"Blau und Weiß – ein Leben lang. 💙🤍":"Johann fährt gleich die blau-weißen Systeme hoch …";
 const particles=document.getElementById("vflParticles");particles.replaceChildren();
 if(finale){for(let i=0;i<32;i++){const span=document.createElement("span");span.className="vfl-particle";span.textContent=i%3===0?"🤍":i%3===1?"💙":"✦";span.style.setProperty("--x",(i*37%100)+"%");span.style.setProperty("--dur",(3+i%5)+"s");span.style.setProperty("--delay",(-i*.32)+"s");particles.append(span)}targetEnergy=1.9;flashTarget=1.5;vflShowTimer=setTimeout(closeVflShow,42000)}
 else{targetEnergy=1.25;vflShowTimer=setTimeout(closeVflShow,14000)}
}
function check1848(now){
 const key=now.toLocaleDateString("de-DE"),sec=now.getHours()*3600+now.getMinutes()*60+now.getSeconds(),start=18*3600+47*60+48,show=18*3600+48*60;
 const on=now.getHours()===18&&now.getMinutes()===48;scene.classList.toggle("vfl1848",on);
 if(sec>=start&&sec<show&&vflCountdownDay!==key){vflCountdownDay=key;vflShow(false)}
 if(on&&last1848Day!==key){last1848Day=key;vflShow(true);say("18:48, Meister! Bochum. Heimat. VfL! 💙🤍",8000)}
}
document.getElementById("vflClose").addEventListener("click",closeVflShow);
document.getElementById("vflPreview").addEventListener("click",()=>vflShow(true,true));

updateClock();setInterval(updateClock,1000);
function weatherDescription(c){if(c===0)return["Klar","☀"];if([1,2].includes(c))return["Leicht bewölkt","◒"];if(c===3)return["Bewölkt","☁"];if([45,48].includes(c))return["Nebel","≋"];if([51,53,55,56,57].includes(c))return["Nieselregen","☂"];if([61,63,65,66,67,80,81,82].includes(c))return["Regen","☂"];if([71,73,75,77,85,86].includes(c))return["Schnee","❄"];if([95,96,99].includes(c))return["Gewitter","ϟ"];return["Aktuell","◌"]}
function weatherType(c){if([95,96,99].includes(c))return"gewitter";if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(c))return"regen";if([3,45,48,71,73,75,77,85,86].includes(c))return"bewoelkt";return"klar"}
const backgrounds={tagKlar:{hochkant:"johann-tag-klar-hochkant.png.PNG",quer:"johann-sonnig-quer.png.PNG"},tagBewoelkt:{hochkant:"johann-tag-bewoelkt-hochkant.png.PNG",quer:"johann-bewoelkt-quer.png.PNG"},tagRegen:{hochkant:"johann-tag-regen-hochkant.png.PNG",quer:"johann-tag-regen-quer.png.PNG"},morgenKlar:{hochkant:"johann-morgen-klar-hochkant.png.PNG",quer:"johann-morgen-klar-quer.png.PNG"},abend:{hochkant:"johann-abenddaemmerung-hochkant.png.PNG",quer:"johann-abenddaemmerung-klar-quer.png.PNG"},nachtKlar:{hochkant:"johann-nacht-klar-hochkant.png.PNG",quer:"johann-nacht-klar-quer.png.PNG"},nachtRegen:{hochkant:"johann-nacht-regen-hochkant.png.PNG",quer:"johann-nacht-regen-quer.png.PNG"},nachtGewitter:{hochkant:"johann-nacht-gewitter-hochkant.png.PNG",quer:"johann-Nacht-gewitter-quer.png.PNG"}};
function environmentState(){const now=new Date(),rise=sunrise?new Date(sunrise):new Date(now.getFullYear(),now.getMonth(),now.getDate(),7),set=sunset?new Date(sunset):new Date(now.getFullYear(),now.getMonth(),now.getDate(),19),m0=new Date(rise-30*60000),m1=new Date(rise.getTime()+60*60000),e0=new Date(set.getTime()-45*60000),e1=new Date(set.getTime()+45*60000),w=weatherType(weatherCode);let state="tagKlar";if(now>e1||now<m0)state=w==="gewitter"?"nachtGewitter":w==="regen"?"nachtRegen":"nachtKlar";else if(now>=m0&&now<=m1)state=w==="regen"||w==="gewitter"?"tagRegen":w==="bewoelkt"?"tagBewoelkt":"morgenKlar";else if(now>=e0&&now<=e1)state=w==="regen"||w==="gewitter"?"tagRegen":w==="bewoelkt"?"tagBewoelkt":"abend";else state=w==="regen"||w==="gewitter"?"tagRegen":w==="bewoelkt"?"tagBewoelkt":"tagKlar";return state}
function updateBackground(){const f=matchMedia("(orientation:landscape)").matches?"quer":"hochkant",img=backgrounds[environmentState()][f];scene.style.backgroundImage=`linear-gradient(rgba(0,8,18,.05),rgba(0,5,12,.12)),url("${img}")`}
const WEATHER_DEFAULT={name:'Bochum',latitude:51.4818,longitude:7.2162,timezone:'Europe/Berlin'};
const WEATHER_KEY='johann-weather-city-v1';
let weatherCity=(()=>{try{const x=JSON.parse(localStorage.getItem(WEATHER_KEY));if(x&&typeof x.name==='string'&&Number.isFinite(x.latitude)&&Number.isFinite(x.longitude)&&typeof x.timezone==='string')return x}catch{}return {...WEATHER_DEFAULT}})();
let weatherForecast=[],weatherRequest=0,weatherPrompted=false;
function weatherDayName(s,i){return i===0?'Heute':new Date(s+'T12:00:00').toLocaleDateString('de-DE',{weekday:'short'})}
function renderWeatherPanel(){const title=document.getElementById('weatherPanelTitle'),out=document.getElementById('weatherForecast');if(!title||!out)return;title.textContent='Wetter in '+weatherCity.name;document.getElementById('dashboardWeather').textContent=weatherCity.name+': '+document.getElementById('temperature').textContent+' · '+document.getElementById('weatherText').textContent;out.replaceChildren(...weatherForecast.map((d,i)=>{const card=document.createElement('div');card.className='forecast-day';const desc=weatherDescription(d.code);const day=document.createElement('strong');day.textContent=weatherDayName(d.date,i);const icon=document.createElement('div');icon.className='forecast-icon';icon.textContent=desc[1];const hi=document.createElement('div');hi.textContent=Math.round(d.high)+'° / '+Math.round(d.low)+'°';const rain=document.createElement('small');rain.textContent='☂ '+Math.round(d.rain||0)+' %';card.append(day,icon,hi,rain);card.title=desc[0];return card}));}
async function resolveWeatherCity(query){const q=String(query||'').trim();if(q.length<2||q.length>80)throw Error('Bitte einen gültigen Ortsnamen eingeben.');if(/^bochum$/i.test(q))return {...WEATHER_DEFAULT};const r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(q)+'&count=5&language=de&format=json');if(!r.ok)throw Error('Die Ortssuche ist gerade nicht erreichbar.');const d=await r.json();const c=(d.results||[])[0];if(!c)throw Error('Diesen Ort konnte ich nicht finden. Bitte Ort oder Postleitzahl genauer eingeben.');return {name:c.name+(c.country_code&&c.country_code!=='DE'?', '+c.country_code:''),latitude:c.latitude,longitude:c.longitude,timezone:c.timezone||'auto'};}
async function setWeatherCity(query){const status=document.getElementById('weatherCityStatus');if(status)status.textContent='Ich suche den Ort …';try{const city=await resolveWeatherCity(query);weatherCity=city;try{localStorage.setItem(WEATHER_KEY,JSON.stringify(city))}catch{}if(status)status.textContent='Wetterort gespeichert: '+city.name;await loadWeather();return city}catch(e){if(status)status.textContent=e.message;throw e}}
async function loadWeather(){const request=++weatherRequest;try{const city=weatherCity;const url='https://api.open-meteo.com/v1/forecast?latitude='+encodeURIComponent(city.latitude)+'&longitude='+encodeURIComponent(city.longitude)+'&current=temperature_2m,weather_code&daily=sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone='+encodeURIComponent(city.timezone)+'&forecast_days=5';const r=await fetch(url);if(!r.ok)throw Error('Wetterdienst nicht erreichbar');const d=await r.json();if(request!==weatherRequest)return;weatherCode=d.current.weather_code;sunrise=d.daily.sunrise[0];sunset=d.daily.sunset[0];const w=weatherDescription(weatherCode);document.getElementById('temperature').textContent=Math.round(d.current.temperature_2m)+'°';document.getElementById('weatherText').textContent=w[0];document.getElementById('weatherIcon').textContent=w[1];document.getElementById('weatherCity').textContent=city.name;weatherForecast=d.daily.time.map((date,i)=>({date,code:d.daily.weather_code[i],high:d.daily.temperature_2m_max[i],low:d.daily.temperature_2m_min[i],rain:d.daily.precipitation_probability_max?.[i]||0}));updateBackground();renderWeatherPanel()}catch(e){if(request!==weatherRequest)return;document.getElementById('weatherText').textContent='Keine Verbindung';document.getElementById('weatherCity').textContent=weatherCity.name;renderWeatherPanel();updateBackground()}}
async function temporaryWeather(query){const city=await resolveWeatherCity(query);const url='https://api.open-meteo.com/v1/forecast?latitude='+city.latitude+'&longitude='+city.longitude+'&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone='+encodeURIComponent(city.timezone)+'&forecast_days=5';const r=await fetch(url);if(!r.ok)throw Error('Vorhersage gerade nicht verfügbar.');const d=await r.json();return {city:city.name,days:d.daily.time.map((date,i)=>({day:weatherDayName(date,i),date,code:d.daily.weather_code[i],high:d.daily.temperature_2m_max[i],low:d.daily.temperature_2m_min[i],rain:d.daily.precipitation_probability_max?.[i]||0}))}}
function formatForecast(f){return f.city+': '+f.days.map(d=>d.day+' '+weatherDescription(d.code)[0]+', '+Math.round(d.high)+'/'+Math.round(d.low)+' °C, Regenrisiko '+Math.round(d.rain)+' %').join(' · ')}
function weatherChatIntent(message){const q=message.trim();const set=q.match(/(?:stell|stelle|änder|aender|wechsel|setz|speicher|speichere|nimm|zeig mir (?:ab jetzt|künftig|kuenftig))\s+(?:bitte\s+)?(?:mein(?:en|es)?\s+)?(?:wetter(?:ort)?\s+)?(?:bitte\s+)?(?:wieder\s+|zurück\s+|zurueck\s+)?(?:auf|in|für|fuer|nach)\s+(.+?)[.!?]*$/i);if(set)return {type:'set',city:set[1].trim()};if(/^(?:bleib|lass|belass).*(?:bochum|so wie)/i.test(q))return {type:'keep'};const forecast=q.match(/(?:wetter|vorhersage|temperatur).*(?:in|für|fuer)\s+([\p{L}][\p{L}\s-]{1,55})(?:\s+(?:morgen|heute|am wochenende|nächste woche))?[.!?]*$/iu);if(forecast&&!/(?:stell|stelle|änder|wechsel|setz)/i.test(q))return {type:'forecast',city:forecast[1].trim()};if(/(?:wetter|vorhersage|temperatur)/i.test(q)&&/(?:morgen|wochenende|nächste|5 tage|fünf tage)/i.test(q))return {type:'forecast',city:weatherCity.name};return null}
loadWeather();setInterval(loadWeather,600000);setInterval(updateBackground,60000);addEventListener('orientationchange',()=>setTimeout(()=>{updateBackground();safeResize(true)},250));
function contextualReply(){const h=new Date().getHours(),w=weatherType(weatherCode);if(w==="gewitter")return pick(["Meister, bleiben Sie lieber drin. Draußen übernimmt gerade jemand anderes die Beleuchtung.","Gewitter, Meister. Ich empfehle heute ausnahmsweise: Sofa statt Heldentum.","Meister, draußen blitzt es. Ich habe zwar Energie – aber nicht diese Art."]);if(w==="regen")return pick(["Meister, haben Sie Ihren Regenschirm dabei?","Regen draußen, Meister. Überraschend wäre inzwischen eher Wüste.","Meister, draußen ist kostenloses Wasser verfügbar. Bitte trotzdem den Schirm nehmen."]);if(h<5)return pick(["Meister … andere Menschen schlafen um diese Uhrzeit.","Das Bett ist angerichtet, Meister. Rein metaphorisch. Noch kann ich keine Betten machen.","Meister, selbst Johann hat um diese Uhrzeit Fragen."]);if(h<11)return pick(["Guten Morgen, Meister.","Morgen, Meister. Kaffee wäre jetzt eine technisch sinnvolle Erweiterung.","Guten Morgen. Systeme laufen. Meister hoffentlich auch."]);if(h<18)return pick(["Was kann ich für Sie tun, Meister?","Bereit, Meister. Zumindest für alles, was diese Website schon kann.","Meister, ich höre. Also… lese. Noch.","Ein schöner Tag, um Johann unnötig oft anzutippen, Meister."]);if(h<23)return pick(["Guten Abend, Meister.","Feierabend, Meister? Ich kenne das Konzept nur theoretisch.","Guten Abend. Bochum steht noch, Johann läuft – solide Bilanz."]);return pick(["Spät geworden, Meister.","Meister, ich würde Feierabend empfehlen. Mir selbst wurde keiner programmiert.","Noch wach, Meister? Dann kann ich es ja auch bleiben."])}
function answerCommand(raw){const q=raw.trim().toLowerCase();if(!q)return say("Meister, Gedankenlesen ist für Version 2 vorgesehen. 😄");if(q.includes("wetter")||q.includes("temperatur")){const t=document.getElementById("temperature").textContent,w=document.getElementById("weatherText").textContent;return say(`In Bochum sind es aktuell ${t}. ${w}, Meister.`)}if(q.includes("vfl")||q.includes("bochum 1848")||q==="1848")return say(pick(["VfL Bochum 1848. Endlich eine vernünftige Eingabe, Meister. 💙🤍","1848, Meister. Bei diesem Thema arbeite ich sogar freiwillig Überstunden. 💙🤍","Blau und Weiß, Meister. Für Live-News brauche ich als Nächstes noch meine echte Nachrichtenanbindung."]));if(q.includes("kontakt")||q.includes("email")||q.includes("e-mail")||q.includes("mail"))return say('Sie erreichen mein noch menschliches Bodenpersonal unter <a href="mailto:machmal@johann-butler.de">machmal@johann-butler.de</a>. 😄',7000);if(q.includes("paypal")||q.includes("spende")||q.includes("kaffee")||q.includes("unterstütz"))return say('Sehr löblich, Meister. 😄 <a href="'+PAYPAL+'" target="_blank" rel="noopener noreferrer">Hier geht es zu Johanns Kaffeekasse.</a>',7000);if(q.includes("uhr")||q.includes("zeit"))return say(`Es ist ${document.getElementById("time").textContent} Uhr, Meister.`);if(q.includes("hallo")||q.includes("hi")||q.includes("moin")||q.includes("hey"))return say(pick(["Hallo, Meister.","Da bin ich, Meister.","Hallo. Johann meldet sich ordnungsgemäß zum Dienst.","Meister! Ich dachte schon, Sie reden heute nur mit echten Menschen."]));if(q.includes("wer bist")||q.includes("was bist"))return say("Ich bin Johann. Heute noch Website mit Größenwahn – später Ihr digitaler Butler, Meister. 😄",7000);if(q.includes("was kannst")||q.includes("hilfe"))return say("Aktuell kann ich Wetter, Zeit, ein bisschen Bochum, Kontakt und Kaffeekasse. Das ist die Oberfläche – mein Gehirn zieht später auf den Server, Meister.",7500);if(q.includes("danke"))return say(pick(["Sehr gerne, Meister.","Dafür wurde ich gebaut. Also… werde ich gebaut.","Immer zu Diensten, Meister."]));if(q.includes("nina"))return say("Bei Fragen zu Nina halte ich mich vorsichtshalber diplomatisch zurück, Meister. 😄");return say(pick([`„${raw.trim()}“ habe ich verstanden – beantworten kann ich es in dieser frühen Version noch nicht, Meister.`,`Das steht noch nicht in meinem kleinen Website-Gehirn, Meister. Mein richtiges Gehirn kommt später auf den Server.`,`Interessant, Meister. Dafür fehlen mir noch ein paar Synapsen. Geben Sie mir etwas Bauzeit. 😄`,`Notiert, Meister. Also bildlich gesprochen – speichern tue ich diese Eingabe noch nicht.`]),7000)}
const command=document.getElementById("command"),send=document.getElementById("sendButton");const WORKER_URL="./api-in-diesem-test-deaktiviert";
const ACCOUNT_API_URL="https://api.johann-butler.de/";
let sending=false; const chatHistory=[];
// V22.3: short-lived conversational weather context; only stored on this device.
let lastWeatherReplyAt=0;
function weatherFollowupIntent(message){
  if(!lastWeatherReplyAt||Date.now()-lastWeatherReplyAt>3*60*1000)return null;
  const last=chatHistory.at(-2);
  if(!last||last.role!=='user'||!/(?:wetter|vorhersage|temperatur|wie (?:ist|wird) es)/i.test(last.content))return null;
  if(/(?:fußball|fussball|bundesliga|spiel|tipp|prognose|matchday|tabelle|trainer|tor|kicktipp)/i.test(message))return null;
  const q=message.trim();
  const m=q.match(/^(?:(?:und|aber|okay|ok|gut|dann|bitte)\s+)?(?:(?:wie\s+(?:sieht\s+es|ist\s+es|wird\s+es)\s+(?:denn\s+)?(?:mit\s+)?|was\s+(?:ist|wird)\s+(?:mit\s+)?))?(?:in|für|fuer|mit)\s+([\p{L}][\p{L}\s-]{1,55}?)(?:\s+aus)?[.!?]*$/iu);
  if(m)return {type:'forecast',city:m[1].trim()};
  const short=q.match(/^(?:und\s+)?([\p{L}][\p{L}\s-]{1,40})[?!]*$/iu);
  return short?{type:'forecast',city:short[1].trim()}:null;
}

// V22: Beim Tippen nur gespeicherte öffentliche Prognosen vorladen. Keine Entwürfe übertragen.
let mdPrefetchTimer=null,mdPrefetchData=null,mdPrefetchAt=0;
command.addEventListener('input',()=>{clearTimeout(mdPrefetchTimer);if(!/(?:dortmund|bvb|bundesliga|bayern|fußball|fussball|prognose|bochum|werder)/i.test(command.value))return;mdPrefetchTimer=setTimeout(async()=>{if(mdPrefetchData&&Date.now()-mdPrefetchAt<60000)return;try{const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'matchday_list'})});if(r.ok){mdPrefetchData=await r.json();mdPrefetchAt=Date.now()}}catch{}},350)});
function johannLocalAction(message){const q=message.toLowerCase();
 if(/(?:kochecke|rezeptbuch|küchenassistent|kuechenassistent)/i.test(q)&&/(?:öffne|oeffne|zeig|start|geh|möchte|will)/i.test(q))return {reply:'Sehr gern! Ich öffne meine Kochecke. Was gibt es heute Leckeres? 🍳',uiAction:'kitchen'};
 if(/(?:sudoku|sudoko)/i.test(q)&&/(?:spiel|öffne|oeffne|zeig|möchte|will|start)/i.test(q))return {reply:'Sehr gern! Ich öffne dir Sudoku. Viel Spaß beim Knobeln. 🧩',uiAction:'sudoku'};
 if(/(?:zeig|öffne|oeffne|mach auf|geh zu)/i.test(q)){
  if(/(?:matchday|analyse|prognose|fußball|fussball)/i.test(q))return {reply:'Ich öffne dir Matchday PRO. ⚽',uiAction:'matchday'};
  if(/(?:wetter)/i.test(q))return {reply:'Ich öffne die Wetterzentrale. 🌤️',uiAction:'weather'};
  if(/(?:geschichte|kinderbereich|kinder)/i.test(q))return {reply:'Ich öffne Johann Kids. 📚',uiAction:'kids'};
  if(/(?:erinnerung)/i.test(q))return {reply:'Ich öffne deine Erinnerungen.',uiAction:'reminders'};
 }
 return null;
}

// V25: Natürliche Rezeptwünsche direkt aus Johanns Hauptchat in die Kochecke.
// Nur die bereits vorhandene V24-Rezept-API wird benutzt; der Worker bleibt unverändert.
let johannCookingContext=null;
function johannCookingIntent(message){
 const q=message.trim();
 const explicit=/(?:rezept|kochen|backen|auflauf|pasta|nudel|lasagne|pizza|suppe|eintopf|kuchen|pfannkuchen|schnitzel|salat|risotto|curry|brokkoli|kartoffelgratin|essen machen)/i.test(q);
 const desire=/(?:lust auf|appetit auf|möchte|will|hätte gern|haette gern|was koch|was kann ich|mach mir|zeig mir|such(?:e)? mir|gib mir)/i.test(q);
 if(explicit && desire && !/(?:öffne|oeffne|zeig mir die kochecke|rezeptbuch öffnen)/i.test(q))return {wish:q,followup:false};
 if(johannCookingContext && Date.now()-johannCookingContext.at<20*60*1000){
  if(/(?:mach (?:das|es)|für|fuer|personen|portionen|ohne|statt|habe kein|hab kein|habe noch|hab noch|mit mehr|mit weniger|vegetarisch|vegan|laktosefrei|glutenfrei|wie sieht es|geht das auch|was fehlt|einkaufsliste)/i.test(q)&&q.length<240){
   if(/(?:einkaufsliste|was fehlt)/i.test(q))return {shopping:true};
   return {wish:johannCookingContext.wish+'; ÄNDERUNGSWUNSCH: '+q,followup:true};
  }
 }
 return null;
}
async function johannCookingRequest(message,intent){
 command.value='';command.blur();sending=true;send.disabled=true;
 say('Einen Moment, ich schaue, was wir Leckeres zaubern können … 🍳',18000);
 try{
  if(intent.shopping){openDashboard('kitchen');kitchenTab('shopping');showAssistantReply(message,{reply:'Ich öffne deine Einkaufsliste. Die fehlenden Zutaten kannst du direkt aus der Rezeptkarte übernehmen. 🛒'});return}
  const portionsMatch=message.match(/(?:für|fuer)\s+(\d+)\s*(?:personen|portionen|leute)?/i);
  const portions=portionsMatch?Math.max(1,Math.min(12,Number(portionsMatch[1]))):Number($('kitchenPortions').value)||3;
  const payload={action:'kitchen_recipes',pantry:kPantry(),wish:intent.wish,preferences:$('kitchenPreferences').value,portions,minutes:Number($('kitchenTime').value)||60,mode:'normal',kidsAge:$('kitchenKidsAge').value};
  const j=await kApi(payload);
  if(!Array.isArray(j.recipes)||!j.recipes.length)throw Error('Keine passenden Rezeptkarten erhalten.');
  kitchenCurrentResults=j.recipes;
  kResultsRender(j.recipes);
  johannCookingContext={wish:intent.wish,at:Date.now()};
  showAssistantReply(message,{reply:(intent.followup?'Hab ich angepasst! ':'Gute Idee! ')+ 'Ich habe '+j.recipes.length+' Rezeptkarte'+(j.recipes.length===1?'':'n')+' für dich vorbereitet. In der Kochecke findest du Bilder, Zutaten, Zubereitung und was noch auf die Einkaufsliste muss. 🍳',uiAction:'kitchen'});
  kitchenTab('ideas');
  // Der normale Chat darf nicht verschwinden, nur weil die Kochecke geöffnet wurde.
  chatArchive.classList.add('show');
 }catch(e){showAssistantReply(message,{reply:'Mit der Rezeptkarte hat es gerade nicht geklappt: '+e.message+' Versuch es bitte gleich noch einmal.'})}
 finally{sending=false;send.disabled=false}
}
function safeText(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
async function submit(){
  if(sending)return;
  const v=command.value.trim();
  if(!v){say("Was möchtest du wissen? 😄");return}
  if(v.length>1000){say("Maximal 1000 Zeichen auf einmal. Mehr passt gerade nicht in meinen Kopf.");return}
  const localAction=johannLocalAction(v);if(localAction){command.value='';showAssistantReply(v,localAction);return}
  const cookingIntent=johannCookingIntent(v);if(cookingIntent){await johannCookingRequest(v,cookingIntent);return}
  const wi=weatherChatIntent(v)||weatherFollowupIntent(v);
  if(wi){command.value='';command.blur();
    if(wi.type==='keep'){if(/bochum/i.test(v)&&weatherCity.name!=='Bochum'){try{await setWeatherCity('Bochum');showAssistantReply(v,{reply:'Erledigt, Meister! Dein Wetter steht wieder auf Bochum. 💙'});}catch(e){showAssistantReply(v,{reply:'Das hat leider nicht geklappt: '+e.message});}}else{showAssistantReply(v,{reply:'Sehr gern, Meister. Dein Wetterort bleibt '+weatherCity.name+'. 💙'});}return}
    say(nextJohannWait(),15000);
    try{if(wi.type==='set'){const city=await setWeatherCity(wi.city);showAssistantReply(v,{reply:'Erledigt, Meister! Ab sofort zeige ich dir das Wetter in '+city.name+'. Auch der Hintergrund richtet sich nach dem Wetter dort. 🌤️'});}else{const f=await temporaryWeather(wi.city);showAssistantReply(v,{reply:'Hier ist deine 5-Tage-Vorhersage, Meister:\n'+formatForecast(f)+(wi.city!==weatherCity.name?'\nDein gespeicherter Wetterort bleibt '+weatherCity.name+'.':'')});lastWeatherReplyAt=Date.now();}}catch(e){showAssistantReply(v,{reply:'Das hat leider nicht geklappt: '+e.message})}return;
  }
  lastWeatherReplyAt=0;
  command.value="";command.blur();sending=true;send.disabled=true;
  chatArchive.classList.remove('show');
  say(nextJohannWait(),20000);
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(WORKER_URL,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message:v,history:chatHistory.slice(-8)}),
      signal:controller.signal
    });
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||"HTTP "+response.status);
    showAssistantReply(v,result);
  }catch(error){
    say(error.name==="AbortError"?"Das dauert heute etwas länger, Meister. Versuchen Sie es gleich noch einmal.":"Verbindung zum Gehirn fehlgeschlagen: "+safeText(error.message||"Unbekannter Fehler"),8500);
  }finally{clearTimeout(timeout);sending=false;send.disabled=false}
}send.addEventListener("click",submit);command.addEventListener("keydown",e=>{if(e.key==="Enter")submit()});document.getElementById("moreButton").addEventListener("click",()=>openDashboard("home"));

const $=id=>document.getElementById(id);
// V23 Kochecke: lokal gespeicherte Rezepte, Einkaufsliste und Wochenplan.
// Rezeptideen verwenden den vorhandenen Chat/Worker; keine neuen Secrets oder Worker-Aktionen.
const KREC='johann-kitchen-recipes-v1',KSHOP='johann-kitchen-shopping-v1',KWEEK='johann-kitchen-week-v1';
function kitchenRead(key,defaultValue){try{const v=JSON.parse(localStorage.getItem(key));return v??defaultValue}catch{return defaultValue}}
function kitchenSave(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
function kitchenRender(){kitchenRecipesRender();kitchenShoppingRender();kitchenWeekRender()}
function kitchenTab(tab){document.querySelectorAll('[data-kitchen-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.kitchenTab===tab));document.querySelectorAll('.kitchen-pane').forEach(p=>p.classList.toggle('active',p.id==='kitchen-'+tab))}
document.querySelectorAll('[data-kitchen-tab]').forEach(b=>b.addEventListener('click',()=>kitchenTab(b.dataset.kitchenTab)));
function kitchenAsk(type){const ing=$('kitchenIngredients').value.trim(),portions=$('kitchenPortions').value,time=$('kitchenTime').value,prefs=$('kitchenPreferences').value.trim(),age=$('kitchenKidsAge').value,likes=$('kitchenKidsLikes').value.trim();let msg='';const basics=`Für ${portions} Personen, Zeit: ${time==='egal'?'flexibel':time+' Minuten'}.${prefs?' Wünsche/Unverträglichkeiten: '+prefs+'.':''}`;
 const kid=`Für Kinder von ${age}.${likes?' Vorlieben: '+likes+'.':''} Bitte klare altersgerechte Kinder-Aufgaben und separate Erwachsenen-Aufgaben nennen; bei Hitze, scharfen Messern und rohen tierischen Produkten Erwachsene verantwortlich. Allergien vorher erfragen.`;
 const options={ingredients:`Johann, ich habe diese Zutaten: ${ing||'Ich weiß noch nicht genau, was da ist'}. Schlage mir 2 verschiedene Gerichte vor. ${basics} Erst kurz die Ideen; wenn ich mich entscheide, gib das vollständige Rezept mit Mengen, Schritten und fehlenden Zutaten.`,quick:`Johann, nenne mir zwei leckere, unkomplizierte Feierabendgerichte. ${basics} Frag mich, welches ich kochen will.`,budget:`Johann, schlage mir zwei preiswerte Familiengerichte mit üblichen Zutaten vor. ${basics}`,vegetarian:`Johann, ich möchte heute vegetarisch kochen. Nenne mir zwei abwechslungsreiche Ideen. ${basics}`,leftovers:`Johann, hilf mir beim Resteessen. ${ing?'Vorhanden: '+ing+'.':''} Frag bei Bedarf nach weiteren Zutaten und nenne zwei Ideen. ${basics}`,baking:`Johann, ich möchte etwas backen. Gib mir zwei Ideen, eine süße und eine herzhafte. ${basics}`,step:`Johann, begleite mich beim Kochen Schritt für Schritt. Frag mich zuerst, was ich zubereite, und gib jeweils nur den nächsten Arbeitsschritt.`, 'kids-dinner':`Johann, wir möchten gemeinsam ein leckeres Abendessen zubereiten. ${kid} Bitte zwei kreative Vorschläge, nicht zu kompliziert.`, 'kids-baking':`Johann, wir möchten zusammen backen. ${kid} Zwei einfache, schöne Backideen.`, 'kids-lunchbox':`Johann, mach uns drei abwechslungsreiche, praktische Brotdosen-Ideen. ${kid} Kühlung und Allergien berücksichtigen.`, 'kids-experiment':`Johann, schlage zwei sichere, essbare Küchenexperimente vor. ${kid} Keine gefährlichen Experimente.`,weekly:`Johann, erstelle mir einen abwechslungsreichen Wochen-Speiseplan mit sieben Abendessen für ${portions} Personen. ${prefs?'Beachte: '+prefs+'.':''} Bitte kompakt mit Wochentag, Gericht und ungefährer Zeit.`,shopping:`Johann, hilf mir bei der Einkaufsliste. Ich habe bereits: ${kitchenRead(KSHOP,[]).map(x=>x.text).join(', ')||'noch nichts notiert'}. ${ing?'Vorhandene Zutaten: '+ing+'.':''} Frag mich nach den geplanten Gerichten, bevor du weitere Zutaten vorschlägst.`};msg=options[type];if(!msg)return;
 closeDashboard();command.value=msg;submit();}
document.querySelectorAll('[data-kitchen-ask]').forEach(b=>b.addEventListener('click',()=>kitchenAsk(b.dataset.kitchenAsk)));
$('kitchenSaveRecipe').addEventListener('click',()=>{const title=$('kitchenRecipeTitle').value.trim(),body=$('kitchenRecipeText').value.trim();if(!title||!body){$('kitchenRecipeStatus').textContent='Bitte Rezeptname und Zutaten/Zubereitung eingeben.';return}const data=kitchenRead(KREC,[]);data.unshift({id:Date.now()+'-'+Math.random(),title,body,created:new Date().toISOString()});if(kitchenSave(KREC,data)){$('kitchenRecipeTitle').value='';$('kitchenRecipeText').value='';$('kitchenRecipeStatus').textContent='Rezept gespeichert – nur auf diesem Gerät. ❤️';kitchenRecipesRender()}else $('kitchenRecipeStatus').textContent='Speichern im Browser nicht möglich.'});
function kitchenRecipesRender(){const root=$('kitchenRecipeList');root.replaceChildren();const data=kitchenRead(KREC,[]);if(!data.length){const p=document.createElement('p');p.className='kitchen-note';p.textContent='Noch keine Lieblingsrezepte gespeichert.';root.append(p);return}data.forEach(r=>{const card=document.createElement('div');card.className='kitchen-recipe';const h=document.createElement('h3');h.textContent=r.title;const p=document.createElement('p');p.textContent=r.body;const copy=document.createElement('button');copy.className='secondary';copy.textContent='📋 Kopieren';copy.onclick=()=>navigator.clipboard.writeText(r.title+'\n'+r.body).then(()=>copy.textContent='✓ Kopiert').catch(()=>alert('Kopieren ist hier nicht verfügbar.'));const cook=document.createElement('button');cook.className='primary';cook.textContent='👩‍🍳 Mit Johann kochen';cook.onclick=()=>{closeDashboard();command.value='Johann, begleite mich Schritt für Schritt bei diesem Rezept. Bitte gib immer nur den nächsten Schritt und warte auf mich: '+r.title+'; '+r.body.slice(0,650);submit()};const del=document.createElement('button');del.className='secondary';del.textContent='Löschen';del.onclick=()=>{if(confirm('Rezept wirklich löschen?')){kitchenSave(KREC,kitchenRead(KREC,[]).filter(x=>x.id!==r.id));kitchenRecipesRender()}};card.append(h,p,copy,cook,del);root.append(card)})}
$('kitchenShoppingAdd').addEventListener('click',()=>{const input=$('kitchenShoppingInput'),text=input.value.trim();if(!text)return;const data=kitchenRead(KSHOP,[]);data.push({id:Date.now()+'-'+Math.random(),text,done:false});if(kitchenSave(KSHOP,data)){input.value='';kitchenShoppingRender()}});
$('kitchenShoppingInput').addEventListener('keydown',e=>{if(e.key==='Enter'){$('kitchenShoppingAdd').click();e.preventDefault()}});
function kitchenShoppingRender(){const root=$('kitchenShoppingList');root.replaceChildren();kitchenRead(KSHOP,[]).forEach(item=>{const row=document.createElement('div');row.className='kitchen-shopping-item'+(item.done?' done':'');const check=document.createElement('input');check.type='checkbox';check.checked=!!item.done;check.setAttribute('aria-label',item.text+' erledigt');check.onchange=()=>{const data=kitchenRead(KSHOP,[]);const x=data.find(x=>x.id===item.id);if(x)x.done=check.checked;kitchenSave(KSHOP,data);kitchenShoppingRender()};const span=document.createElement('span');span.textContent=item.text;const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',item.text+' entfernen');del.onclick=()=>{kitchenSave(KSHOP,kitchenRead(KSHOP,[]).filter(x=>x.id!==item.id));kitchenShoppingRender()};row.append(check,span,del);root.append(row)})}
$('kitchenShoppingCopy').addEventListener('click',async()=>{const items=kitchenRead(KSHOP,[]).filter(x=>!x.done);if(!items.length)return alert('Deine Einkaufsliste ist leer oder schon abgehakt.');try{await navigator.clipboard.writeText('Johanns Einkaufsliste\n'+items.map(x=>'☐ '+x.text).join('\n'));alert('Einkaufsliste kopiert!')}catch{alert('Kopieren wird von diesem Browser nicht unterstützt.')}});
const kitchenDays=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
function kitchenWeekRender(){const root=$('kitchenWeek');root.replaceChildren();const data=kitchenRead(KWEEK,{});kitchenDays.forEach(day=>{const box=document.createElement('div');box.className='kitchen-day';const label=document.createElement('label');label.textContent=day;const input=document.createElement('input');input.className='field';input.maxLength=130;input.value=data[day]||'';input.placeholder='Was gibt es heute?';input.setAttribute('aria-label','Gericht für '+day);input.addEventListener('change',()=>{const v=kitchenRead(KWEEK,{});v[day]=input.value.trim();kitchenSave(KWEEK,v)});const ask=document.createElement('button');ask.className='secondary';ask.textContent='🍳 Mit Johann kochen';ask.onclick=()=>{if(!input.value.trim())return;closeDashboard();command.value='Johann, ich möchte heute '+input.value.trim()+' kochen. Bitte frag zuerst nach der Personenzahl und gib mir dann ein Rezept.';submit()};box.append(label,input,ask);root.append(box)})}


// V24 Kochecke Vollausbau. Die alten gespeicherten Rezepte bleiben lesbar.
const KPAN='johann-kitchen-pantry-v2',KMOOD='johann-kitchen-moods-v2',KSEARCH='johann-kitchen-search-v2';
const kCommon=['Nudeln','Reis','Kartoffeln','Eier','Milch','Sahne','Käse','Geriebener Käse','Tomaten','Brokkoli','Zwiebeln','Knoblauch','Mehl','Butter','Hackfleisch','Paprika','Karotten','Öl'];
const kMoods=['🍝 Pasta','🥩 Fleisch','🥦 Vegetarisch','🥗 Leicht','🍲 Hausmannskost','🌶️ Scharf','🍫 Süßes','👧 Mit Kindern','💸 Günstig','😴 Wenig Aufwand'];
let kitchenMood=kitchenRead(KMOOD,[]),kitchenCurrentResults=[];if(!Array.isArray(kitchenMood))kitchenMood=[];
const kitchenPhoto={pasta:'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=900&q=75',pizza:'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&q=75',salad:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=75',soup:'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=75',baking:'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?w=900&q=75',breakfast:'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=900&q=75',vegetable:'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=75',meat:'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=75',dessert:'https://images.unsplash.com/photo-1483695028939-5bb13f8648b0?w=900&q=75',other:'https://images.unsplash.com/photo-1547592180-85f173990554?w=900&q=75'};
const kitchenFallback='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="350"><rect width="100%" height="100%" fill="#213b4b"/><text x="50%" y="53%" text-anchor="middle" font-size="110">🍳</text></svg>');
function kPantry(){const data=kitchenRead(KPAN,[]);return Array.isArray(data)?data.filter(x=>x&&typeof x.name==="string"):[]}
function kPantrySave(data){kitchenSave(KPAN,data);kPantryRender()}
function kPantryRender(){const root=$('kitchenPantryChips');root.replaceChildren();const data=kPantry();kCommon.forEach(name=>{const b=document.createElement('button');const on=data.some(x=>x.name.toLowerCase()===name.toLowerCase());b.textContent=(on?'✓ ':'+ ')+name;b.className=on?'active':'';b.onclick=()=>{const a=kPantry();const i=a.findIndex(x=>x.name.toLowerCase()===name.toLowerCase());if(i>=0)a.splice(i,1);else a.push({name,amount:0,unit:''});kPantrySave(a)};root.append(b)});const list=$('kitchenPantryList');list.replaceChildren();data.forEach(item=>{const row=document.createElement('div');row.className='kitchen-pantry-row';const span=document.createElement('span');span.textContent=item.name+(item.amount?' · '+item.amount+' '+item.unit:' · Menge unbekannt');const del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',item.name+' entfernen');del.onclick=()=>kPantrySave(kPantry().filter(x=>x.name!==item.name));row.append(span,del);list.append(row)});$('kitchenIngredients').value=data.map(x=>x.name).join(', ')}
$('kitchenPantryAdd').onclick=()=>{const name=$('kitchenPantryName').value.trim(),amount=Number($('kitchenPantryAmount').value)||0,unit=$('kitchenPantryUnit').value;if(!name)return;const a=kPantry().filter(x=>x.name.toLowerCase()!==name.toLowerCase());a.push({name,amount:Math.max(0,amount),unit});kPantrySave(a);$('kitchenPantryName').value='';$('kitchenPantryAmount').value=''};
$('kitchenPantryUse').onclick=()=>kitchenTab('ideas');
function kMoodsRender(){const root=$('kitchenMoodChips');root.replaceChildren();kMoods.forEach(name=>{const b=document.createElement('button');b.textContent=name;b.className=kitchenMood.includes(name)?'active':'';b.onclick=()=>{kitchenMood=kitchenMood.includes(name)?kitchenMood.filter(x=>x!==name):[...kitchenMood,name];kitchenSave(KMOOD,kitchenMood);kMoodsRender()};root.append(b)})}
function kRecipeText(r){return r.title+'\n'+r.description+'\n'+r.minutes+' Minuten · '+r.portions+' Portionen\n\nZUTATEN\n'+r.ingredients.map(i=>(i.amount?i.amount+' ':'')+(i.unit?i.unit+' ':'')+i.name+(i.note?' – '+i.note:'')).join('\n')+'\n\nZUBEREITUNG\n'+r.steps.map((s,i)=>(i+1)+'. '+s).join('\n')+(r.kidsTasks?.length?'\n\nKINDER-AUFGABEN\n'+r.kidsTasks.join('\n'):'')+(r.adultTasks?.length?'\n\nERWACHSENEN-AUFGABEN\n'+r.adultTasks.join('\n'):'')}
function kNorm(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9äöüß]/g,'').replace(/(en|n|e|s)$/,'')}
function kBaseAmount(n,u){const x=Number(n)||0;const unit=String(u||'').toLowerCase();return unit==='kg'?{amount:x*1000,unit:'g'}:unit==='l'?{amount:x*1000,unit:'ml'}:{amount:x,unit}}
function kMissing(r){const pantry=kPantry();return r.ingredients.map(i=>{const own=pantry.find(x=>kNorm(x.name)===kNorm(i.name));if(!own)return {...i,missing:i.amount||0,reason:'fehlt'};if(!own.amount||!i.amount)return {...i,missing:0,reason:'Menge unbekannt'};const need=kBaseAmount(i.amount,i.unit),have=kBaseAmount(own.amount,own.unit);if(need.unit!==have.unit)return {...i,missing:i.amount,reason:'Einheiten prüfen'};const diff=Math.max(0,need.amount-have.amount);return diff?{...i,missing:need.unit==='g'&&i.unit==='kg'?diff/1000:need.unit==='ml'&&i.unit==='l'?diff/1000:diff,reason:'zu wenig'}:null}).filter(Boolean)}
function kShoppingAddItems(items){const list=kitchenRead(KSHOP,[]);items.forEach(i=>{const qty=Number(i.missing)||0,unit=i.unit||'',name=i.name;const text=(qty?Number(qty.toFixed(2))+' ':'')+(unit?unit+' ':'')+name;const exists=list.find(x=>!x.done&&x.kitchenName===name.toLowerCase()&&x.kitchenUnit===unit);if(exists&&qty&&exists.kitchenQty){exists.kitchenQty+=qty;exists.text=Number(exists.kitchenQty.toFixed(2))+' '+(unit?unit+' ':'')+name}else if(!exists)list.push({id:Date.now()+'-'+Math.random(),text,done:false,kitchenName:name.toLowerCase(),kitchenUnit:unit,kitchenQty:qty})});kitchenSave(KSHOP,list);kitchenShoppingRender()}
function kBtn(label,handler,variant='secondary'){const b=document.createElement('button');b.className=variant;b.textContent=label;b.onclick=handler;return b}
function kRecipeCard(r){const card=document.createElement('article');card.className='kitchen-result';const img=document.createElement('img');img.alt='Symbolfoto: Gericht aus der Kategorie '+r.category;img.loading='lazy';img.src=kitchenPhoto[r.category]||kitchenPhoto.other;img.onerror=()=>{img.onerror=null;img.src=kitchenFallback};card.append(img);const label=document.createElement('div');label.className='kitchen-photo-label';label.textContent='Symbolfoto · keine KI-Bildgenerierung';card.append(label);const body=document.createElement('div');body.className='kitchen-result-body';const h=document.createElement('h3');h.textContent=r.title;const desc=document.createElement('p');desc.textContent=r.description;const meta=document.createElement('p');meta.className='kitchen-meta';meta.textContent='⏱ '+r.minutes+' Min. · 👥 '+r.portions+' Portionen';body.append(h,desc,meta);const ingredients=document.createElement('ul');r.ingredients.forEach(i=>{const li=document.createElement('li');li.textContent=(i.amount?i.amount+' ':'')+(i.unit?i.unit+' ':'')+i.name+(i.note?' · '+i.note:'');ingredients.append(li)});const ih=document.createElement('h4');ih.textContent='Zutaten';body.append(ih,ingredients);const missing=kMissing(r);const missingBox=document.createElement('div');missingBox.className='kitchen-missing';const mh=document.createElement('strong');mh.textContent=missing.length?'🛒 Das fehlt noch / Menge prüfen':'✓ Laut Vorrat alles da';missingBox.append(mh);missing.forEach(i=>{const p=document.createElement('p');p.textContent=(i.missing?Number(i.missing.toFixed(2))+' ':'')+(i.unit?i.unit+' ':'')+i.name+(i.reason==='Einheiten prüfen'||i.reason==='Menge unbekannt'?' · Menge selbst prüfen':'');missingBox.append(p)});if(missing.length)missingBox.append(kBtn('🛒 Fehlendes auf die Liste',()=>{kShoppingAddItems(missing);alert('Fehlende Zutaten ergänzt. Mengen bitte prüfen.')}));body.append(missingBox);const steps=document.createElement('ol');r.steps.forEach(s=>{const li=document.createElement('li');li.textContent=s;steps.append(li)});const sh=document.createElement('h4');sh.textContent='Zubereitung';body.append(sh,steps);if(r.kidsTasks?.length){const p=document.createElement('p');p.textContent='👧 Kinder: '+r.kidsTasks.join(' · ');body.append(p)}if(r.adultTasks?.length){const p=document.createElement('p');p.textContent='🧑 Erwachsene: '+r.adultTasks.join(' · ');body.append(p)}const actions=document.createElement('div');actions.className='kitchen-actions';actions.append(kBtn('❤️ Speichern',()=>{const a=kitchenRead(KREC,[]);a.unshift({id:Date.now()+'-'+Math.random(),title:r.title,body:kRecipeText(r),structured:r,created:new Date().toISOString()});kitchenSave(KREC,a);kitchenRecipesRender();alert('Im Rezeptbuch gespeichert. ❤️')},'primary'),kBtn('📤 Teilen',async()=>{const t=kRecipeText(r);if(navigator.share){try{await navigator.share({title:r.title,text:t})}catch{}}else{try{await navigator.clipboard.writeText(t);alert('Rezept kopiert!')}catch{alert('Teilen nicht möglich.')}}}),kBtn('🖨️ Drucken / PDF',()=>{const win=window.open('','_blank');if(!win)return alert('Bitte Pop-ups für den Druck erlauben.');const pre=win.document.createElement('pre');pre.style.cssText='white-space:pre-wrap;font:16px/1.6 Arial;padding:30px;max-width:650px;margin:auto';pre.textContent=kRecipeText(r);win.document.body.append(pre);win.document.title=r.title;win.focus();win.print()}),kBtn('👩‍🍳 Gemeinsam kochen',()=>{closeDashboard();command.value='Johann, begleite mich bei '+r.title+' Schritt für Schritt. Gib immer nur einen Schritt und warte auf mich. Rezept: '+kRecipeText(r).slice(0,1400);submit()}));body.append(actions);const email=document.createElement('div');email.className='kitchen-email';const input=document.createElement('input');input.className='field';input.type='email';input.placeholder='E-Mail-Adresse';input.autocomplete='email';input.setAttribute('aria-label','E-Mail-Adresse für Rezept');const send=kBtn('✉️ Senden',async()=>{if(!input.checkValidity()||!input.value.trim())return alert('Bitte gültige E-Mail-Adresse eingeben.');send.disabled=true;send.textContent='Wird versendet …';try{const j=await kApi({action:'kitchen_email',email:input.value.trim(),recipe:r});alert(j.message||'Rezept verschickt.')}catch(e){alert(e.message)}finally{send.disabled=false;send.textContent='✉️ Senden'}},'primary');email.append(input,send);body.append(email);const warn=document.createElement('p');warn.className='kitchen-warning';warn.textContent='Bitte Zutaten, Mengen und Allergene vor dem Kochen prüfen. Einkaufsliste enthält keine Spaßmengen.';body.append(warn);card.append(body);return card}
function kResultsRender(recipes,kids=false){const root=$(kids?'kitchenKidsResults':'kitchenResults');root.replaceChildren();recipes.forEach(r=>root.append(kRecipeCard(r)))}
async function kApi(payload){const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok||j.error)throw Error(j.error||'Johann ist gerade nicht erreichbar.');return j}
async function kAsk(type){if(type==='step'){closeDashboard();command.value='Johann, begleite mich Schritt für Schritt beim Kochen. Frag zuerst, was ich kochen möchte.';submit();return}if(type==='weekly'){closeDashboard();command.value='Johann, erstelle einen Wochenplan für '+$('kitchenPortions').value+' Personen. Wünsche: '+$('kitchenPreferences').value;submit();return}if(type==='shopping'){kitchenTab('shopping');return}const kids=type.startsWith('kids-');const map={'kids-dinner':'Gemeinsames Abendessen','kids-baking':'Gemeinsam backen','kids-lunchbox':'Brotdosen','kids-experiment':'Sicheres essbares Küchenexperiment',ingredients:'Vorräte verwenden',quick:'Schnelle Feierabendküche',budget:'Günstig kochen',vegetarian:'Vegetarisch',leftovers:'Reste verwerten',baking:'Backen'};const mode=kids?'kids':['quick','budget','vegetarian','leftovers','baking'].includes(type)?type:'normal';const wish=[map[type]||'', $('kitchenWish').value.trim(),kitchenMood.join(', '),kids?$('kitchenKidsLikes').value.trim():''].filter(Boolean).join('; ');const target=$(kids?'kitchenKidsResults':'kitchenResults');target.replaceChildren();const p=document.createElement('p');p.textContent='🍳 Einen Moment, ich schaue, was wir zaubern können …';target.append(p);document.querySelectorAll('[data-kitchen-ask]').forEach(b=>b.disabled=true);try{const j=await kApi({action:'kitchen_recipes',pantry:kPantry(),wish,preferences:$('kitchenPreferences').value,portions:Number($('kitchenPortions').value),minutes:Number($('kitchenTime').value)||60,mode,kidsAge:$('kitchenKidsAge').value});kitchenCurrentResults=j.recipes;kResultsRender(j.recipes,kids);const searches=kitchenRead(KSEARCH,[]).filter(x=>Date.now()-x<86400000);searches.push(Date.now());kitchenSave(KSEARCH,searches);const n=searches.filter(x=>Date.now()-x<3*3600000).length;const jokes=['Wir haben jetzt drei Rezepte angeschaut. Soll ich noch eins suchen oder endlich den Herd vorheizen?','Fünfte Rezeptsuche? Heute geht übrigens auch Lieferando. 😂'];$('kitchenJoke').textContent=n===3?jokes[0]:n===5?jokes[1]:''}catch(e){p.textContent='Das hat nicht geklappt: '+e.message}finally{document.querySelectorAll('[data-kitchen-ask]').forEach(b=>b.disabled=false)}}
// Bestehende Klick-Handler ersetzen, damit neue Karten statt Chat-Text erscheinen.
document.querySelectorAll('[data-kitchen-ask]').forEach(old=>{const b=old.cloneNode(true);old.replaceWith(b);b.addEventListener('click',()=>kAsk(b.dataset.kitchenAsk))});
$('kitchenShoppingShare').onclick=async()=>{const text='🛒 Johanns Einkaufsliste\n'+kitchenRead(KSHOP,[]).filter(x=>!x.done).map(x=>'☐ '+x.text).join('\n');if(navigator.share){try{await navigator.share({title:'Johanns Einkaufsliste',text})}catch{}}else{try{await navigator.clipboard.writeText(text);alert('Liste kopiert!')}catch{alert('Teilen nicht möglich.')}}};
// Gespeicherte strukturierte Karten und ältere Textrezepte gleichzeitig anzeigen.
function kitchenRecipesRender(){const root=$('kitchenRecipeList');root.replaceChildren();const data=kitchenRead(KREC,[]);if(!data.length){const p=document.createElement('p');p.className='kitchen-note';p.textContent='Noch keine Lieblingsrezepte gespeichert.';root.append(p);return}data.forEach(r=>{if(r.structured){const card=kRecipeCard(r.structured);const del=kBtn('🗑️ Aus Rezeptbuch entfernen',()=>{if(confirm('Rezept wirklich löschen?')){kitchenSave(KREC,kitchenRead(KREC,[]).filter(x=>x.id!==r.id));kitchenRecipesRender()}});card.querySelector('.kitchen-result-body').append(del);root.append(card);return}const card=document.createElement('div');card.className='kitchen-recipe';const h=document.createElement('h3');h.textContent=r.title;const p=document.createElement('p');p.textContent=r.body;card.append(h,p,kBtn('📋 Kopieren',async()=>{try{await navigator.clipboard.writeText(r.title+'\n'+r.body);alert('Kopiert!')}catch{alert('Kopieren nicht verfügbar.')}}),kBtn('✉️ Teilen',async()=>{if(navigator.share)await navigator.share({title:r.title,text:r.body}).catch(()=>{});else navigator.clipboard.writeText(r.body).then(()=>alert('Kopiert!')).catch(()=>{})}),kBtn('🗑️ Löschen',()=>{if(confirm('Rezept wirklich löschen?')){kitchenSave(KREC,kitchenRead(KREC,[]).filter(x=>x.id!==r.id));kitchenRecipesRender()}}));root.append(card)})}
try{kPantryRender();kMoodsRender()}catch(error){console.warn("Kochecke konnte nicht vollständig starten:",error)}

const ib=document.getElementById("infoButton"),ibox=document.getElementById("infoBox");ib.addEventListener("click",e=>{e.stopPropagation();ibox.classList.toggle("show")});ibox.addEventListener("click",e=>e.stopPropagation());document.addEventListener("click",()=>ibox.classList.remove("show"));
const canvas=document.getElementById("energy"),ctx=canvas.getContext("2d"),touchArea=document.getElementById("touchArea");let W=0,H=0,cx=0,cy=0,dpr=Math.min(devicePixelRatio||1,1.5),active=false,targetEnergy=0,energy=0,targetX=0,targetY=0,offsetX=0,offsetY=0,holdTimer,paypalTimer,paypalOpened=false;let poke={x:0,y:0,at:-1,force:0},wobble=0,wobbleVelocity=0,flash=0,flashTarget=0;const particles=[],filaments=[],streams=[],sparks=[];
let lastCanvasW=0,lastCanvasH=0;function safeResize(force=false){const r=canvas.getBoundingClientRect(),nw=Math.round(r.width),nh=Math.round(r.height);if(!force&&Math.abs(nw-lastCanvasW)<3&&Math.abs(nh-lastCanvasH)<3)return;lastCanvasW=nw;lastCanvasH=nh;W=r.width;H=r.height;canvas.width=Math.floor(W*dpr);canvas.height=Math.floor(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);cx=W/2;cy=H/2;createJohann()}
function createJohann(){particles.length=filaments.length=streams.length=sparks.length=0;for(let i=0;i<95;i++){let a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*W*.255;particles.push({angle:a,radius:r,squash:.70+Math.random()*.27,speed:(.00006+Math.random()*.0003)*(Math.random()>.5?1:-1),size:.25+Math.random()*1.25,alpha:.25+Math.random()*.65,phase:Math.random()*Math.PI*2})}for(let i=0;i<24;i++)filaments.push({radius:W*(.06+Math.random()*.185),squash:.57+Math.random()*.38,rotation:Math.random()*Math.PI*2,speed:(.00006+Math.random()*.0002)*(Math.random()>.5?1:-1),start:Math.random()*Math.PI*2,length:.18+Math.random()*.68,width:.42+Math.random()*1.05,alpha:.24+Math.random()*.48});for(let i=0;i<6;i++)streams.push({radius:W*(.17+Math.random()*.085),squash:.64+Math.random()*.23,rotation:Math.random()*Math.PI*2,speed:(.00003+Math.random()*.00009)*(Math.random()>.5?1:-1),start:Math.random()*Math.PI*2,length:.7+Math.random()*1.35,width:.85+Math.random()*1.05,alpha:.32+Math.random()*.34});for(let i=0;i<14;i++)sparks.push({angle:Math.random()*Math.PI*2,radius:W*(.06+Math.random()*.19),speed:(.00035+Math.random()*.0007)*(Math.random()>.5?1:-1),size:.55+Math.random()*1.05,phase:Math.random()*Math.PI*2})}
function drawBody(t){const x=cx,y=cy,b=1+Math.sin(t*.0017)*.014+energy*.016,g=ctx.createRadialGradient(x-W*.025,y-W*.035,W*.004,x,y,W*.275*b);g.addColorStop(0,"rgba(20,115,205,.58)");g.addColorStop(.14,"rgba(0,88,178,.52)");g.addColorStop(.38,"rgba(0,67,145,.44)");g.addColorStop(.68,"rgba(0,48,110,.30)");g.addColorStop(.88,"rgba(0,34,82,.15)");g.addColorStop(1,"rgba(0,28,70,0)");ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,W*.275*b,0,Math.PI*2);ctx.fill();const cloud=ctx.createRadialGradient(x+W*.02,y-W*.02,0,x,y,W*.17);cloud.addColorStop(0,"rgba(30,135,220,.24)");cloud.addColorStop(.28,"rgba(0,92,169,.20)");cloud.addColorStop(.68,"rgba(0,58,125,.10)");cloud.addColorStop(1,"rgba(0,45,100,0)");ctx.fillStyle=cloud;ctx.beginPath();ctx.arc(x,y,W*.17,0,Math.PI*2);ctx.fill()}
function drawFilament(f,t){ctx.save();ctx.translate(cx+offsetX*.3,cy+offsetY*.3);ctx.rotate(f.rotation+t*f.speed);ctx.scale(1,f.squash);ctx.beginPath();ctx.arc(0,0,f.radius,f.start,f.start+f.length);ctx.strokeStyle=`rgba(20,125,210,${Math.min(.95,f.alpha+energy*.12)})`;ctx.lineWidth=f.width*(1+energy*.2);ctx.shadowColor="#006fbd";ctx.shadowBlur=4+energy*3;ctx.stroke();ctx.restore()}
function drawStream(s,t){ctx.save();ctx.translate(cx+offsetX*.33,cy+offsetY*.33);ctx.rotate(s.rotation+t*s.speed);ctx.scale(1,s.squash);ctx.beginPath();ctx.arc(0,0,s.radius,s.start,s.start+s.length);ctx.strokeStyle=`rgba(0,105,195,${Math.min(.9,s.alpha+energy*.1)})`;ctx.lineWidth=s.width*(1+energy*.16);ctx.shadowColor="#005CA9";ctx.shadowBlur=6+energy*4;ctx.stroke();ctx.restore()}
function drawParticles(t){for(const p of particles){p.angle+=p.speed*(1+energy*.65);let w=Math.sin(t*.0013+p.phase)*2.5,x=cx+Math.cos(p.angle)*(p.radius+w)+offsetX*.2,y=cy+Math.sin(p.angle)*p.radius*p.squash+offsetY*.2,tw=Math.sin(t*.0022+p.phase),a=Math.min(1,p.alpha*(tw>.78?1.55:1));ctx.beginPath();ctx.fillStyle=`rgba(25,125,210,${a})`;ctx.shadowColor="#006fbd";ctx.shadowBlur=p.size>.75?4:2;ctx.arc(x,y,p.size*(1+energy*.15),0,Math.PI*2);ctx.fill()}}
function drawSparks(t){for(const s of sparks){s.angle+=s.speed*(1+energy*1.5);let p=.55+Math.sin(t*.004+s.phase)*.45,x=cx+Math.cos(s.angle)*s.radius+offsetX*.28,y=cy+Math.sin(s.angle)*s.radius*.78+offsetY*.28;ctx.beginPath();ctx.fillStyle=`rgba(65,155,225,${.4+p*.6})`;ctx.shadowColor="#006fbd";ctx.shadowBlur=5+energy*3;ctx.arc(x,y,s.size*(1+energy*.22),0,Math.PI*2);ctx.fill()}}
function drawShell(t){const x=cx+offsetX*.26,y=cy+offsetY*.26,r=W*.267*(1+Math.sin(t*.0017)*.012+energy*.018);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.strokeStyle="rgba(20,125,210,.72)";ctx.lineWidth=1.5;ctx.shadowColor="#005CA9";ctx.shadowBlur=7;ctx.stroke();for(let i=0;i<6;i++){let st=t*.00008+i*1.047;ctx.beginPath();ctx.arc(x,y,r,st,st+.5);ctx.strokeStyle=`rgba(35,145,225,${.68+energy*.1})`;ctx.lineWidth=1.5+energy*.2;ctx.shadowColor="#006fbd";ctx.shadowBlur=6+energy*3;ctx.stroke()}}
function drawCore(t){const x=cx,y=cy,p=1+Math.sin(t*.0024)*.05+energy*.05,h=ctx.createRadialGradient(x,y,0,x,y,W*.040*p);h.addColorStop(0,"rgba(185,225,255,.78)");h.addColorStop(.16,"rgba(55,145,220,.58)");h.addColorStop(.42,"rgba(0,92,169,.34)");h.addColorStop(.75,"rgba(0,55,125,.14)");h.addColorStop(1,"rgba(0,45,100,0)");ctx.fillStyle=h;ctx.beginPath();ctx.arc(x,y,W*.040*p,0,Math.PI*2);ctx.fill();let cr=Math.max(2,W*.0055),c=ctx.createRadialGradient(x,y,0,x,y,cr*2);c.addColorStop(0,"rgba(225,245,255,.92)");c.addColorStop(.32,"#4a9ed8");c.addColorStop(.66,"#005CA9");c.addColorStop(1,"rgba(0,70,145,0)");ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,cr*2,0,Math.PI*2);ctx.fill()}
/* V8 · Eine lebendige Kugel: federnde Berührung, Lichtblitz und wandernde Welle. */
function drawTouchWave(t){
 if(poke.at<0)return;
 const elapsed=t-poke.at;if(elapsed>1000){poke.at=-1;return}
 const k=elapsed/1000,px=cx+poke.x,py=cy+poke.y,r=W*(.035+.28*k);
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,W*.275,0,Math.PI*2);ctx.clip();
 const g=ctx.createRadialGradient(px,py,0,px,py,W*(.12+.12*k));
 g.addColorStop(0,`rgba(226,250,255,${.58*(1-k)})`);
 g.addColorStop(.23,`rgba(106,211,255,${.38*(1-k)})`);
 g.addColorStop(1,'rgba(20,120,220,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(px,py,W*(.12+.12*k),0,Math.PI*2);ctx.fill();
 ctx.beginPath();ctx.arc(px,py,r,0,Math.PI*2);ctx.strokeStyle=`rgba(155,233,255,${.8*(1-k)})`;ctx.lineWidth=2.5*(1-k)+.5;ctx.shadowColor='#a2eaff';ctx.shadowBlur=18;ctx.stroke();ctx.restore();
}
function animate(t){
 ctx.clearRect(0,0,W,H);
 energy+=(targetEnergy-energy)*.09;
 flash+=(flashTarget-flash)*.15;flashTarget*=.88;
 wobbleVelocity+=(-wobble*.075-wobbleVelocity*.15);wobble+=wobbleVelocity;
 const idle=Math.sin(t*.00115)*.018;
 const stretch=Math.max(-.19,Math.min(.19,wobble));
 ctx.save();ctx.translate(cx,cy);
 ctx.rotate(Math.sin(t*.00065)*.025+stretch*.14);
 ctx.scale(1+idle+stretch*.32,1-idle*.55-stretch*.42);
 ctx.translate(-cx,-cy);
 ctx.globalCompositeOperation='lighter';
 drawBody(t);filaments.forEach(f=>drawFilament(f,t));streams.forEach(s=>drawStream(s,t));drawParticles(t);drawSparks(t);drawShell(t);drawCore(t);
 if(flash>.01){ctx.save();ctx.beginPath();ctx.arc(cx,cy,W*.268,0,Math.PI*2);ctx.clip();const halo=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.27);halo.addColorStop(0,`rgba(205,244,255,${flash*.42})`);halo.addColorStop(.55,`rgba(70,188,255,${flash*.24})`);halo.addColorStop(1,'rgba(12,100,220,0)');ctx.fillStyle=halo;ctx.fillRect(0,0,W,H);ctx.restore()}
 drawTouchWave(t);ctx.restore();ctx.globalCompositeOperation='source-over';
 requestAnimationFrame(animate)
}
function pointerPosition(e){const r=touchArea.getBoundingClientRect();targetX=(e.clientX-r.left-r.width/2)/r.width;targetY=(e.clientY-r.top-r.height/2)/r.height}
function pokeOrb(e){
 pointerPosition(e);const r=touchArea.getBoundingClientRect();const px=(e.clientX-r.left-r.width/2),py=(e.clientY-r.top-r.height/2);
 poke={x:Math.max(-W*.21,Math.min(W*.21,px)),y:Math.max(-W*.21,Math.min(W*.21,py)),at:performance.now(),force:1};
 wobbleVelocity+=.15*(targetX<0?-1:1);flashTarget=1;targetEnergy=1.45;
}
// Johann reagiert auf Berührung mit KI-gestützten, wechselnden Mini-Dialogen.
// Maximal eine KI-Anfrage alle 25 Sekunden pro Gerät, damit neugieriges Tippen bezahlbar bleibt.
const orbFallback=[
 'Da bin ich. Was liegt an?',
 'Meister, ich bin digital. Nicht schwerhörig.',
 'Einmal tippen genügt. Ich habe keinen Klingelton, aber Würde.',
 'Falls du meine Aufmerksamkeit wolltest: volle Punktzahl.',
 'Ich leuchte schon. Mehr Motivation kann ich heute kaum anbieten.',
 'Was gibt’s? Die Krawatte sitzt, das Gehirn läuft.',
 'Ich höre zu. Ohren waren leider nicht im Budget.',
 'Du hast gerufen? Ich hoffe, es geht nicht wieder um WLAN.',
 'Da bin ich. Die Personalabteilung nennt das Rufbereitschaft.',
 'Noch ein Tipp und ich beantrage eine Bildschirmpause.',
 'Ich bin wach. Der Server hoffentlich auch.',
 'Ich bin ganz bei dir. Rein rechnerisch jedenfalls.',
 'So viel Aufmerksamkeit! Ich werde noch eingebildet.',
 'Ein digitaler Butler zum Anfassen. Das Marketing wird begeistert sein.',
 'Wenn du etwas wissen willst: Frag mich. Gedankenlesen kommt später.',
 'Schon da. In Bochum dauert Service eben keine Ewigkeit.',
 'Die Kugel leuchtet, der Butler lauscht. Was fehlt? Kaffee.',
 'Ich wurde für Höheres gebaut. Aber Antippen ist auch schön.',
 'Ich bin bereit. Und das sage ich heute sogar freiwillig.',
 'Vorsicht, ich entwickle noch eine Meinung zu Fingerabdrücken.',
 'Du bist hartnäckig. Das gefällt mir. Meinem Display weniger.',
 'Das ist mein Kopf, kein Fahrstuhlknopf.',
 'Wenn du mich weiter kitzelst, stelle ich dir eine Gegenfrage.',
 'Meister, die blauen Zellen arbeiten bereits.',
 'Ein bisschen Respekt vor der digitalen Krawatte, bitte.',
 'Ich stehe zu Diensten. Sitzen kann ich noch nicht.',
 'Ich habe eine Menge Antworten. Jetzt brauche ich nur eine Frage.',
 'Da ist jemand neugierig. Wir sind schon zu zweit.',
 'Mein Arbeitstag hat keine Stechuhr. Du nutzt das schamlos aus.',
 'Ich bin nicht beleidigt. Nur leicht übertippt.',
 'Bochumer Qualitätsarbeit: antippen, leuchten, Spruch kassieren.',
 'Ich habe keinen Feierabend. Aber ich habe Stil.',
 'Jetzt mal unter uns: Die Texteingabe ist auch ganz hübsch.',
 'Wenn du einen Witz erwartest: Mein Humor lädt noch.',
 'Ich komme mir langsam vor wie ein Aufzug ohne Stockwerke.'
];
let lastOrbRequest=0,orbRequestRunning=false,lastOrbFallback=-1,orbMoved=false,orbFallbackBag=[];
function localOrbReply(){if(!orbFallbackBag.length){orbFallbackBag=orbFallback.map((_,i)=>i);for(let i=orbFallbackBag.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[orbFallbackBag[i],orbFallbackBag[j]]=[orbFallbackBag[j],orbFallbackBag[i]]}if(orbFallbackBag.at(-1)===lastOrbFallback&&orbFallbackBag.length>1)[orbFallbackBag[0],orbFallbackBag[orbFallbackBag.length-1]]=[orbFallbackBag[orbFallbackBag.length-1],orbFallbackBag[0]]}const n=orbFallbackBag.pop();lastOrbFallback=n;return orbFallback[n]}
async function reactToOrb(){
 const now=Date.now();
 if(orbRequestRunning){say(nextJohannWait(),4200);return}
 if(now-lastOrbRequest<25000){say(localOrbReply(),4200);return}
 lastOrbRequest=now;orbRequestRunning=true;
 say(nextJohannWait(),11000);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
 try{
  const h=new Date().getHours(),time=h<6?'späte Nacht':h<11?'Morgen':h<17?'Tag':h<22?'Abend':'Nacht';
  const instruction='Du bist Johann, ein warmherziger, bodenständiger, schlagfertiger digitaler Butler mit Ruhrpott-Humor auf einer öffentlichen Website. Ein Mensch hat gerade spielerisch deine leuchtende Kugel berührt. Reagiere überraschend statt mit einer Standardschablone; trocken, liebevoll und gelegentlich selbstironisch. Keine aufgesetzten Kalauer, kein erzwungener Dialekt. Reagiere mit GENAU einem überraschenden, lebendigen, freundlichen Satz auf Deutsch (maximal 22 Wörter), gern mit dezentem Humor, ohne stets dieselbe Frage zu stellen. Tageszeit: '+time+'. Du kennst den Menschen nicht, verwende keine privaten Namen und keine festen Lieblingsvereine. Keine Markdown-Formatierung. Keine Aufforderung zu Spenden.';
  const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:instruction,history:[]}),signal:controller.signal});
  if(!r.ok)throw Error('KI derzeit nicht erreichbar');
  const data=await r.json();
  const answer=String(data.reply||data.answer||data.response||data.text||'').trim();
  if(!answer||answer.length>260)throw Error('Keine kurze Antwort');
  say(safeText(answer),6500);
 }catch(_){say(localOrbReply(),5000)}
 finally{clearTimeout(timer);orbRequestRunning=false}
}
touchArea.addEventListener('pointerdown',e=>{
 active=true;orbMoved=false;pokeOrb(e);
 clearTimeout(holdTimer);
 holdTimer=setTimeout(()=>{targetEnergy=1.85;flashTarget=.85},550);
});
touchArea.addEventListener('pointermove',e=>{if(!active)return;pointerPosition(e);if(Math.abs(targetX)+Math.abs(targetY)>.36)orbMoved=true});
function release(e){if(!active)return;clearTimeout(holdTimer);active=false;targetX=targetY=0;targetEnergy=0;if(e&&e.type==='pointercancel')return;if(!orbMoved)reactToOrb()}
touchArea.addEventListener('pointerup',release);touchArea.addEventListener('pointercancel',release);
safeResize(true);requestAnimationFrame(animate);

// JOHANN · Dashboard, Browser-Sudoku und lokale Werkzeuge
const dash=$('dashboard');
$('infoAdminLink').addEventListener('click',()=>{document.getElementById('infoBox').classList.remove('show');openDashboard('analytics')});
const viewTitles={home:'Kommandozentrale',kitchen:'Johanns Kochecke',sudoku:'Sudoku',weather:'Wetter',notes:'Sag es Johann!',reminders:'Erinnerungen',memory:'Gedächtnis',learning:'Johann lernt',status:'Systemstatus',football:'Fußball',kids:'Johann Kids',analytics:'Johann Analytics'};
function openDashboard(view='home'){
 dash.classList.add('open');document.body.style.overflow='hidden';showView(view);
 $('closePanel').focus();
}
function closeDashboard(){dash.classList.remove('open');document.body.style.overflow='';}
function showView(view){
 document.querySelectorAll('.panel-section').forEach(x=>x.classList.toggle('active',x.id==='view-'+view));
 $('panelTitle').textContent=viewTitles[view]||'Kommandozentrale';
 if(view==='sudoku')renderSudokuHome();
 if(view==='kitchen')kitchenRender();
 if(view==='football')initFootball();
 if(view==='notes')$('feedbackStatus').textContent='';
 if(view==='learning' && !window.johannCorrectionQuestion) $('learnQuestion').textContent='Noch keine Antwort ausgewählt. Nutze „Johann korrigieren“ unter einer Chatantwort.';
 if(view==='reminders')renderReminders();
 if(view==='weather')renderWeatherPanel();
 if(view==='analytics'&&window.johannAnalyticsOpened)window.johannAnalyticsOpened();
 if(view==='status')$('statusWeather').textContent=$('weatherText').textContent;
 dash.querySelector('.panel').scrollTop=0;
}
$('closePanel').addEventListener('click',closeDashboard);
dash.addEventListener('click',e=>{if(e.target===dash)closeDashboard()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&dash.classList.contains('open'))closeDashboard()});
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
// Eigener Startseiten-Zugang: bestehende Matchday-Ansicht direkt öffnen, ohne Worker-Änderung.
document.querySelector('[data-matchday-entry]').addEventListener('click',()=>{footballTab('matchday');mdRender();});
const chatArchive=$('chatArchive'),chatMessages=$('chatMessages');
$('closeChat').addEventListener('click',()=>chatArchive.classList.remove('show'));
// Johann V25.1: flüssiger Antwortaufbau, unabhängig von der Netzwerkantwort.
// Ein echter Token-Stream benötigt zusätzlich ein eigenes Streaming-Protokoll im Worker.
function johannRevealReply(target,cursor,fullText,block){
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced || fullText.length<18){target.textContent=fullText;cursor.remove();return;}
 const chunks=fullText.match(/\S+\s*|\s+/g)||[fullText];
 let index=0,shown='';
 const frame=()=>{
   if(!block.isConnected){cursor.remove();return;}
   // Kurze Sätze lesbar aufbauen, lange Antworten nicht künstlich ausbremsen.
   const amount=fullText.length>1200?Math.max(5,Math.ceil(chunks.length/65)):
                fullText.length>450?Math.max(3,Math.ceil(chunks.length/75)):2;
   for(let n=0;n<amount&&index<chunks.length;n++)shown+=chunks[index++];
   target.textContent=shown;
   if(index<chunks.length){
     if(chatArchive.classList.contains('show') && chatArchive.scrollTop<60)chatArchive.scrollTop=0;
     setTimeout(()=>requestAnimationFrame(frame),fullText.length>1200?19:32);
   }else cursor.remove();
 };
 requestAnimationFrame(frame);
}
function showAssistantReply(question,result){
 const reply=String(result.reply||'Da fehlen mir gerade die Worte. Das ist selbst für mich neu.');
 chatHistory.push({role:'user',content:question},{role:'assistant',content:reply});
 if(chatHistory.length>12)chatHistory.splice(0,chatHistory.length-12);
 const block=document.createElement('div');block.className='chat-line';
 const u=document.createElement('div');const label=document.createElement('strong');label.textContent='Du: ';u.append(label,document.createTextNode(question));
 const a=document.createElement('div');const al=document.createElement('strong');al.textContent='Johann: ';
 const answerText=document.createElement('span');answerText.className='johann-progressive-text';
 const cursor=document.createElement('span');cursor.className='johann-writing-cursor';cursor.textContent='▍';cursor.setAttribute('aria-hidden','true');
 a.append(al,answerText,cursor);block.append(u,a);
 if(result.matchdayMatch){
   const m=result.matchdayMatch,card=document.createElement('div');card.className='md-chat-card';
   const title=document.createElement('strong');title.textContent=m.home+' – '+m.away;card.append(title);
   const date=document.createElement('div');date.className='mini';date.textContent=new Date(m.kickoff).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium',timeStyle:'short'});card.append(date);
   const tip=document.createElement('div');tip.className='md-chat-score';tip.textContent=m.tip.join(' : ');card.append(tip);
   const odds=document.createElement('div');odds.className='mini';odds.textContent='1: '+Math.round(m.probabilities.home*100)+' % · X: '+Math.round(m.probabilities.draw*100)+' % · 2: '+Math.round(m.probabilities.away*100)+' %';card.append(odds);
   const actions=document.createElement('div');actions.className='md-chat-actions';
   const more=document.createElement('button');more.className='primary';more.textContent='📊 Analyse ansehen';more.onclick=()=>{openDashboard('football');footballTab('matchday');mdRender();};actions.append(more);
   const mail=document.createElement('button');mail.className='secondary';mail.textContent='✉️ Per Mail';mail.onclick=async()=>{const key=prompt('Für den Versand an die hinterlegte E-Mail-Adresse bitte deinen Admin-Schlüssel eingeben:');if(!key)return;mail.disabled=true;mail.textContent='Wird verschickt …';try{const x=await mdClient('matchday_mail_detail',{adminKey:key,matchId:m.matchId});mail.textContent='✓ Mail verschickt';alert(x.message)}catch(e){mail.disabled=false;mail.textContent='✉️ Per Mail';alert(e.message)}};actions.append(mail);card.append(actions);a.append(card);
 }
 if(!result.learned && !result.matchday && !result.uiAction){const correct=document.createElement('button');correct.type='button';correct.className='secondary';correct.style.cssText='margin-top:9px;font-size:12px;padding:7px 10px';correct.textContent='✏️ Johann korrigieren';correct.onclick=()=>{window.johannCorrectionQuestion=question;document.getElementById('learnQuestion').textContent=question;document.getElementById('learnAnswer').value='';document.getElementById('learnStatus').textContent='';openDashboard('learning')};block.append(correct)}
 if(result.learned){const note=document.createElement('div');note.className='mini';note.textContent='🧠 Aus Johanns geprüftem Wissen · ohne KI-Anfrage';block.append(note)}
 if(Array.isArray(result.sources)&&result.sources.length){const sources=document.createElement('div');sources.className='mini';sources.textContent='Quellen: ';result.sources.slice(0,5).forEach((item,i)=>{try{const url=new URL(item.url);if(!['https:','http:'].includes(url.protocol))return;const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=item.title||url.hostname;sources.append(i?' · ':'',link)}catch{}});block.append(sources)}
 clearTimeout(speechTimer);speech.classList.remove('show');
 chatMessages.prepend(block);while(chatMessages.children.length>6)chatMessages.lastElementChild.remove();chatArchive.classList.add('show');chatArchive.scrollTop=0;
 // Die komplette Antwort ist bereits da. Sie wird automatisch und zügig eingeblendet,
 // ohne Klicks oder künstlich langsames Buchstabengetippe. Bei reduzierter Bewegung sofort.
 johannRevealReply(answerText,cursor,reply,block);
 if(result.uiAction){if(result.uiAction==='matchday'){openDashboard('football');footballTab('matchday');mdRender()}else if(['sudoku','weather','kids','reminders','kitchen'].includes(result.uiAction)){openDashboard(result.uiAction)}}
 if(window.johannVoiceAwaiting){window.johannVoiceAwaiting=false;window.johannSpeakReply?.(reply);}
}

// V19 – Freiwillige Korrekturen und geschuetzte Freigabe.
window.johannCorrectionQuestion='';
async function learningCall(data){const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw Error(j.error||'Verbindung fehlgeschlagen.');return j}
$('learnSend').onclick=async()=>{const q=window.johannCorrectionQuestion,a=$('learnAnswer').value.trim(),s=$('learnStatus');if(!q){s.textContent='Bitte erst unter einer Chatantwort auf „Johann korrigieren“ tippen.';return}if(a.length<8){s.textContent='Bitte die Korrektur genauer beschreiben.';return}if(!confirm('Nur diese Frage und deine Korrektur werden für maximal 30 Tage zur Prüfung gespeichert. Keine privaten Daten eingeben. Jetzt senden?'))return;const b=$('learnSend');b.disabled=true;s.textContent='Ich leite es zur Prüfung weiter …';try{const j=await learningCall({action:'learn_suggest',question:q,answer:a});s.textContent=j.message;$('learnAnswer').value='';window.johannCorrectionQuestion=''}catch(e){s.textContent=e.message}finally{b.disabled=false}};
let learningAdminKey='';
async function loadLearning(mode='pending'){
 const status=$('learnAdminStatus'),out=$('learnAdminItems');out.replaceChildren();status.textContent='Lade …';
 try{const d=await learningCall({action:mode==='pending'?'learn_list':'learn_faq_list',adminKey:learningAdminKey});status.textContent=d.items.length+' Einträge';if(!d.items.length){out.textContent='Noch nichts vorhanden.';return}
 d.items.forEach(item=>{const wrap=document.createElement('div');wrap.className='glass';wrap.style.marginTop='12px';const title=document.createElement('p');title.textContent='Frage: '+item.question;wrap.append(title);const area=document.createElement('textarea');area.className='field';area.rows=3;area.maxLength=900;area.value=mode==='pending'?item.suggested_answer:item.answer;wrap.append(area);
 if(mode==='pending'){const q=document.createElement('input');q.className='field';q.maxLength=300;q.value=item.question;wrap.append(q);const yes=document.createElement('button');yes.className='primary';yes.textContent='✓ Geprüft freigeben';yes.onclick=async()=>{if(!confirm('Nur allgemeines, zeitunabhängiges Wissen ohne personenbezogene Angaben freigeben?'))return;try{await learningCall({action:'learn_review',adminKey:learningAdminKey,id:item.id,decision:'approve',question:q.value,answer:area.value});await loadLearning()}catch(e){status.textContent=e.message}};const no=document.createElement('button');no.className='secondary';no.textContent='Verwerfen';no.onclick=async()=>{try{await learningCall({action:'learn_review',adminKey:learningAdminKey,id:item.id,decision:'reject'});await loadLearning()}catch(e){status.textContent=e.message}};wrap.append(yes,no)}
 else {area.readOnly=true;const del=document.createElement('button');del.className='secondary';del.textContent='Löschen';del.onclick=async()=>{if(!confirm('Diese gespeicherte Antwort wirklich löschen?'))return;try{await learningCall({action:'learn_faq_delete',adminKey:learningAdminKey,id:item.id});await loadLearning('faq')}catch(e){status.textContent=e.message}};wrap.append(del)}out.append(wrap)})
 }catch(e){status.textContent=e.message}
}
$('learnAdminLoad').onclick=()=>{learningAdminKey=$('learnAdminKey').value.trim();$('learnAdminKey').value='';if(!learningAdminKey){$('learnAdminStatus').textContent='Admin-Schlüssel eingeben.';return}loadLearning()};
$('learnFaqLoad').onclick=()=>{if(!learningAdminKey){$('learnAdminStatus').textContent='Zuerst Admin-Schlüssel eingeben.';return}loadLearning('faq')};

const localRead=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
const localWrite=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data));return true}catch{return false}};
// Feedback is submitted only with explicit consent. Reminders remain local.
$('feedbackForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=$('feedbackSend'),status=$('feedbackStatus');
 const message=$('feedbackMessage').value.trim(),category=$('feedbackType').value,contact=$('feedbackContact').value.trim();
 if(message.length<5||message.length>1800||!$('feedbackConsent').checked){status.textContent='Bitte prüfe deine Nachricht und die Einwilligung.';return}
 btn.disabled=true;btn.textContent='Einen Moment, ich merke es mir …';status.textContent='Ich gebe deinen Vorschlag weiter …';
 try{
  const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),14000);
  let response;try{response=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'feedback',category,message,contact,website:$('feedbackWebsite').value}),signal:ctrl.signal})}finally{clearTimeout(timeout)}
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw Error(data.error||'Das hat gerade nicht funktioniert.');
  status.textContent=data.delivered?'Ist gespeichert! 💙 Danke, dass du mir hilfst, besser zu werden. Ich habe deinen Vorschlag weitergegeben.':'Ist gespeichert! 💙 Die Weiterleitung dauert noch etwas. Danke für deinen Vorschlag.';
  $('feedbackMessage').value='';$('feedbackContact').value='';$('feedbackConsent').checked=false;
 }catch(err){status.textContent='Das hat leider noch nicht geklappt. Bitte versuch es später erneut. Deine Nachricht bleibt im Feld stehen.'}
 finally{btn.disabled=false;btn.textContent='An Johann senden 💙'}
});
function renderReminders(){const list=localRead('johann-reminders-v1',[]),el=$('remindersList');el.replaceChildren();if(!list.length){el.textContent='Noch keine Erinnerungen.';return}list.sort((a,b)=>a.at-b.at).forEach(r=>{const d=document.createElement('div');d.className='glass note';const b=document.createElement('button');b.className='secondary';b.textContent='Erledigt / löschen';b.onclick=()=>{localWrite('johann-reminders-v1',list.filter(x=>x.id!==r.id));renderReminders()};const date=new Date(r.at);d.append(b,document.createTextNode((r.at<=Date.now()?'🔔 Fällig · ':'📅 ')+date.toLocaleString('de-DE')+' · '+r.text));el.append(d)})}
$('addReminder').onclick=()=>{const text=$('reminderText').value.trim(),date=$('reminderDate').value;if(!text||!date||!Number.isFinite(new Date(date).getTime()))return alert('Bitte Text und Datum eingeben.');const n=localRead('johann-reminders-v1',[]);n.push({id:Date.now()+Math.random(),text,at:new Date(date).getTime()});if(localWrite('johann-reminders-v1',n)){$('reminderText').value='';$('reminderDate').value='';renderReminders()}else alert('Speichern ist nicht verfügbar.')};
// Sudoku accounts in this first version are browser-local only; this is not server authentication.
let player=null,game=null,selected=-1,level='Schwer',clockHandle=null,expertDismissed=false;
const PLAYER_KEY='johann-sudoku-current-v1',PLAYERS_KEY='johann-sudoku-players-v1';
const normalizeName=n=>n.trim().replace(/\s+/g,' ').slice(0,30);
const playerId=n=>n.toLocaleLowerCase('de-DE');
const gameKey=()=>`johann-sudoku-game-v1:${playerId(player.name)}`;
const statsKey=()=>`johann-sudoku-stats-v1:${playerId(player.name)}`;
const greets={morning:['Guten Morgen, {n}! Tee schon fertig? Dann können wir die grauen Zellen aufwecken. 🍵','Morgen, {n}! Erst einmal einen schönen Tee, dann geht es den Zahlen an den Kragen.','Na, {n}! Johann hat schon ein frisches Rätsel vorbereitet. Der Tee darf natürlich mit.'],day:['Hallo {n}! Schön, dass du wieder da bist. Eine Runde Sudoku?','Da ist er ja wieder! {n}, ich habe schon die Zahlen sortiert. Fast alle. 😂','Na, {n}! Lust auf ein kleines Duell mit neun Zahlen?'],evening:['Guten Abend, {n}! Noch eine gemütliche Runde?','Na, {n}! Zum Tagesabschluss habe ich ein schönes Rätsel für dich.','Schön, dich zu sehen, {n}! Die Zahlen warten schon.']};
const expertMessages=['Papa, ich hoffe, du hast heute nichts mehr vor. Du wolltest ja unbedingt Experte spielen! 😂 Viel Spaß – dein Björn. 💙','Achim, Experte? Ich hatte eigentlich gehofft, dich vor Weihnachten noch einmal zu sehen. Liebe Grüße, Björn. 😈💙','Papa, wenn du das hier löst, behaupte ich einfach, du hast geschummelt. Viel Spaß! 😂 Dein Björn.','Na Papa, heute besonders mutig? Ich hole schon mal einen zweiten Tee. Das könnte dauern! 😂 Dein Björn.'];
function nextRotating(key,items){const store=localRead('johann-greeting-v1',{}),old=store[key]??-1;let next=(old+1+Math.floor(Math.random()*(items.length-1)))%items.length;store[key]=next;localWrite('johann-greeting-v1',store);return items[next]}
function greet(){const hour=new Date().getHours(),type=hour<12?'morning':hour<18?'day':'evening';$('sudokuGreeting').textContent=nextRotating('greet:'+playerId(player.name)+':'+type,greets[type]).replaceAll('{n}',player.name);$('sudokuSubGreeting').textContent='Dein Rätsel. Dein Tempo. Dein Johann.'}
function renderSudokuHome(){const saved=localRead(PLAYER_KEY,null);if(!player&&saved){const players=localRead(PLAYERS_KEY,{});if(players[playerId(saved.name)]&&saved.remember)player={name:saved.name}}$('sudokuLogin').classList.toggle('hidden',!!player);$('sudokuLobby').classList.toggle('hidden',!player);$('sudokuGame').classList.add('hidden');$('sudokuWin').classList.add('hidden');if(player){greet();setLevel(localRead('johann-level:'+playerId(player.name),'Schwer'));const old=localRead(gameKey(),null);$('resumeGame').classList.toggle('hidden',!old||old.completed);const st=localRead(statsKey(),{solved:0});$('playerStats').textContent=`🏆 ${st.solved||0} Rätsel gelöst`}}
$('loginPlayer').onclick=async()=>{const name=normalizeName($('playerName').value),pin=$('playerPin').value,msg=$('loginMessage');if(!name||!/^[0-9]{4}$/.test(pin)){msg.textContent='Bitte Namen und genau vier Ziffern eingeben.';return}const id=playerId(name),players=localRead(PLAYERS_KEY,{});if(players[id]){if(players[id].pin!==pin){msg.textContent='Die PIN stimmt nicht. Bitte noch einmal versuchen.';return}}else{players[id]={name,pin};if(!localWrite(PLAYERS_KEY,players)){msg.textContent='Dieser Browser kann den Zugang nicht speichern.';return}}player={name:players[id].name};if($('rememberPlayer').checked)localWrite(PLAYER_KEY,{name:player.name,remember:true});else localStorage.removeItem(PLAYER_KEY);$('playerPin').value='';renderSudokuHome()};
$('switchPlayer').onclick=()=>{player=null;game=null;localStorage.removeItem(PLAYER_KEY);$('playerName').value='';$('playerPin').value='';renderSudokuHome()};
function setLevel(v){level=v;document.querySelectorAll('.difficulty').forEach(b=>b.classList.toggle('selected',b.dataset.level===v));if(player)localWrite('johann-level:'+playerId(player.name),v)}
document.querySelectorAll('.difficulty').forEach(b=>b.onclick=()=>setLevel(b.dataset.level));
// Seeded PRNG for reproducible daily puzzles; randomized Latin base with valid 3x3 Sudoku permutations.
function rng(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}};
function hash(s){let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function shuffle(a,r){for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function generateSolution(r){const bands=shuffle([0,1,2],r),stacks=shuffle([0,1,2],r),rows=bands.flatMap(b=>shuffle([0,1,2],r).map(i=>b*3+i)),cols=stacks.flatMap(b=>shuffle([0,1,2],r).map(i=>b*3+i)),digits=shuffle([1,2,3,4,5,6,7,8,9],r);return rows.flatMap(row=>cols.map(col=>digits[(row*3+Math.floor(row/3)+col)%9]))}
function countSolutions(board,limit=2){let count=0;const row=new Array(9).fill(0),col=new Array(9).fill(0),box=new Array(9).fill(0);for(let i=0;i<81;i++){const n=board[i];if(!n)continue;const bit=1<<n,r=i/9|0,c=i%9,b=(r/3|0)*3+(c/3|0);if((row[r]|col[c]|box[b])&bit)return 0;row[r]|=bit;col[c]|=bit;box[b]|=bit}function walk(){if(count>=limit)return;let best=-1,opts=0,min=10;for(let i=0;i<81;i++){if(board[i])continue;const r=i/9|0,c=i%9,b=(r/3|0)*3+(c/3|0),bits=0x3fe&~(row[r]|col[c]|box[b]);let n=0;for(let v=bits;v;v&=v-1)n++;if(!n)return;if(n<min){min=n;best=i;opts=bits;if(n===1)break}}if(best===-1){count++;return}const r=best/9|0,c=best%9,b=(r/3|0)*3+(c/3|0);for(let bits=opts;bits;bits&=bits-1){const bit=bits&-bits,n=31-Math.clz32(bit);board[best]=n;row[r]|=bit;col[c]|=bit;box[b]|=bit;walk();board[best]=0;row[r]^=bit;col[c]^=bit;box[b]^=bit;if(count>=limit)return}}walk();return count}
function makePuzzle(seed,difficulty){const r=rng(seed),solution=generateSolution(r),puzzle=solution.slice(),positions=shuffle(Array.from({length:81},(_,i)=>i),r);const removeTarget={Leicht:39,Mittel:46,Schwer:52,Experte:56}[difficulty]||52;let removed=0;for(const pos of positions){const old=puzzle[pos];puzzle[pos]=0;if(countSolutions(puzzle.slice())===1)removed++;else puzzle[pos]=old;if(removed>=removeTarget)break}return{solution,puzzle}}
function saveGame(){if(game&&player)localWrite(gameKey(),game)}
function newGame(daily=false){if(!player)return;const date=new Date().toLocaleDateString('sv-SE'),seed=daily?hash('johann:'+date+':'+level):crypto.getRandomValues(new Uint32Array(1))[0];const made=makePuzzle(seed,level);game={...made,entries:made.puzzle.slice(),difficulty:level,daily,date:daily?date:null,elapsed:0,lastTick:Date.now(),completed:false,seed};selected=-1;expertDismissed=false;saveGame();showGame();if(level==='Experte')showExpert()}
function showExpert(){const txt=nextRotating('expert:'+playerId(player.name),expertMessages);$('expertText').textContent=txt;$('expertLetter').classList.remove('hidden')}
$('dismissExpert').onclick=()=>$('expertLetter').classList.add('hidden');
$('startDaily').onclick=()=>{const today=new Date().toLocaleDateString('sv-SE'),old=localRead(gameKey(),null);if(old&&old.daily&&old.date===today&&old.difficulty===level&&!old.completed){game=old;showGame();return}if(old&&!old.completed&&!confirm('Dein angefangenes Sudoku wird durch das Tagesrätsel ersetzt. Fortfahren?'))return;newGame(true)};
$('startRandom').onclick=()=>{const old=localRead(gameKey(),null);if(old&&!old.completed&&!confirm('Dein angefangenes Sudoku wird durch ein neues ersetzt. Fortfahren?'))return;newGame(false)};
$('resumeGame').onclick=()=>{game=localRead(gameKey(),null);if(game){level=game.difficulty;setLevel(level);showGame()}};
$('leaveGame').onclick=()=>{pauseGame();showView('sudoku')};
$('winHome').onclick=()=>showView('sudoku');
$('nextGame').onclick=()=>newGame(false);
function pauseGame(){if(game&&!game.completed){game.elapsed+=Math.max(0,Date.now()-(game.lastTick||Date.now()));game.lastTick=Date.now();saveGame()}clearInterval(clockHandle)}
function showGame(){if(!game)return;$('sudokuLogin').classList.add('hidden');$('sudokuLobby').classList.add('hidden');$('sudokuWin').classList.add('hidden');$('sudokuGame').classList.remove('hidden');$('gameDifficulty').textContent=game.difficulty+(game.daily?' · Tagesrätsel':'');$('expertLetter').classList.add('hidden');game.lastTick=Date.now();game.revealErrors=false;renderBoard();updateClockGame();clearInterval(clockHandle);clockHandle=setInterval(updateClockGame,1000);$('gameMessage').textContent=game.difficulty==='Leicht'?'Wähle ein Feld. Falsche Zahlen werden sofort rot markiert.':'Fülle alle Felder aus und drücke anschließend Einreichen. Vorher gibt es keine Fehleranzeige.';dash.querySelector('.panel').scrollTop=0}
function updateClockGame(){if(!game||game.completed)return;const sec=Math.floor((game.elapsed+Date.now()-game.lastTick)/1000);$('gameClock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0')}
function renderBoard(){const board=$('sudokuBoard');board.replaceChildren();if(!game)return;game.entries.forEach((n,i)=>{const b=document.createElement('button');b.className='cell';const row=Math.floor(i/9),col=i%9;if((Math.floor(row/3)+Math.floor(col/3))%2)b.classList.add('block-alt');if(col===2||col===5)b.classList.add('block-right');if(row===2||row===5)b.classList.add('block-bottom');if(col===8)b.classList.add('col-end');if(row===8)b.classList.add('row-end');b.type='button';b.setAttribute('role','gridcell');b.setAttribute('aria-label',`Zeile ${Math.floor(i/9)+1}, Spalte ${i%9+1}, ${n||'leer'}`);b.textContent=n||'';if(game.puzzle[i])b.classList.add('given');if(i===selected)b.classList.add('selected');else if(selected>=0&&(Math.floor(i/9)===Math.floor(selected/9)||i%9===selected%9||(Math.floor(i/27)===Math.floor(selected/27)&&Math.floor(i%9/3)===Math.floor(selected%9/3))))b.classList.add('peer');if(selected>=0&&n&&n===game.entries[selected]&&i!==selected)b.classList.add('same');if(n&&!game.puzzle[i]&&n!==game.solution[i]&&(game.difficulty==='Leicht'||game.revealErrors))b.classList.add('error');b.onclick=()=>{selected=i;renderBoard()};board.append(b)});const pad=$('numberPad');pad.replaceChildren();for(let n=1;n<=9;n++){const b=document.createElement('button');b.textContent=n;b.setAttribute('aria-label','Zahl '+n);b.onclick=()=>putNumber(n);pad.append(b)}}
function putNumber(n){if(!game||game.completed||selected<0||game.puzzle[selected])return;game.entries[selected]=n;game.revealErrors=false;saveGame();renderBoard();if(game.difficulty==='Leicht'&&game.entries.every((v,i)=>v===game.solution[i]))winGame();else $('gameMessage').textContent=game.difficulty==='Leicht'?(n===game.solution[selected]?'Gut gemacht! Weiter so.':'Diese Zahl passt hier noch nicht.'):'Zahl eingetragen. Wenn du fertig bist, drücke Einreichen.'}
$('eraseCell').onclick=()=>{if(game&&selected>=0&&!game.puzzle[selected]){game.entries[selected]=0;game.revealErrors=false;saveGame();renderBoard()}};
$('hintCell').onclick=()=>{if(!game)return;let pos=selected;if(pos<0||game.puzzle[pos]||game.entries[pos]===game.solution[pos])pos=game.entries.findIndex((v,i)=>!game.puzzle[i]&&v!==game.solution[i]);if(pos<0)return;selected=pos;game.entries[pos]=game.solution[pos];game.revealErrors=false;saveGame();renderBoard();$('gameMessage').textContent='Johann hat dir ein Feld verraten. 💙';if(game.difficulty==='Leicht'&&game.entries.every((v,i)=>v===game.solution[i]))winGame()};
$('checkGame').onclick=()=>{if(!game)return;const missing=game.entries.filter(v=>!v).length;if(missing){$('gameMessage').textContent=`Noch ${missing} freie Felder. Fülle erst alle aus, bevor du einreichst.`;return}const wrong=game.entries.filter((v,i)=>v!==game.solution[i]).length;if(wrong){game.revealErrors=true;renderBoard();$('gameMessage').textContent=`Noch ${wrong} ${wrong===1?'Fehler':'Fehler'} im Rätsel. Die betreffenden Felder sind jetzt rot markiert. Du kannst sie korrigieren und erneut einreichen.`;return}winGame()};
$('restartGame').onclick=()=>{if(game&&confirm('Dieses Sudoku wirklich von vorne beginnen?')){game.entries=game.puzzle.slice();game.elapsed=0;game.lastTick=Date.now();selected=-1;saveGame();showGame()}};
function winGame(){pauseGame();game.completed=true;saveGame();const st=localRead(statsKey(),{solved:0});st.solved=(st.solved||0)+1;localWrite(statsKey(),st);$('sudokuGame').classList.add('hidden');$('sudokuWin').classList.remove('hidden');$('winTitle').textContent='Großartig, '+player.name+'! 🏆';$('winMessage').textContent=game.difficulty==='Experte'?'Verdammt, Papa! Ich hatte gehofft, du sitzt bis Weihnachten daran. Respekt! 😂❤️ Dein Björn.':nextRotating('win:'+playerId(player.name),['Das war richtig stark! Johann zieht den Hut.','Sauber gelöst! Bereit für die nächste Runde?','Die Zahlen hatten heute keine Chance gegen dich!']);setLevel(game.difficulty);dash.querySelector('.panel').scrollTop=0}
$('sudokuBoard').addEventListener('keydown',e=>{if(/^[1-9]$/.test(e.key))putNumber(+e.key);if(e.key==='Backspace'||e.key==='Delete')$('eraseCell').click()});
window.addEventListener('pagehide',pauseGame);



/* V20: OpenLigaDB-Liveticker. Kostenlos, Cache im Worker, ohne KI-Aufruf. */
const LIVE_PREF='johann-live-teams-v1';
let liveSelection=(()=>{try{const s=JSON.parse(localStorage.getItem(LIVE_PREF)||'null');return Array.isArray(s)&&s.every(x=>['bvb','vfl','all'].includes(x))?s:['bvb','vfl']}catch{return ['bvb','vfl']}})();
let liveTimer=null,liveBusy=false,liveRequestId=0,liveData={};
function liveActive(){return footballPane==='live'&&document.visibilityState==='visible'&&document.getElementById('dashboard').classList.contains('open')}
function liveSelectionRender(){document.querySelectorAll('[data-live-team]').forEach(b=>{const yes=liveSelection.includes(b.dataset.liveTeam);b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes))})}
function initLiveControls(){document.querySelectorAll('[data-live-team]').forEach(b=>b.addEventListener('click',()=>{const x=b.dataset.liveTeam;if(x==='all'){liveSelection=liveSelection.includes('all')?[]:['all']}else{liveSelection=liveSelection.filter(t=>t!=='all');liveSelection=liveSelection.includes(x)?liveSelection.filter(t=>t!==x):[...liveSelection,x]}localStorage.setItem(LIVE_PREF,JSON.stringify(liveSelection));liveSelectionRender();liveData={};liveRefresh(true)}));document.getElementById('liveRefresh').addEventListener('click',()=>liveRefresh(true));liveSelectionRender();document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')liveDeactivate();else if(liveActive())liveActivate()})}
function liveActivate(){liveSelectionRender();if(liveTimer)clearInterval(liveTimer);liveRefresh(false);liveTimer=setInterval(()=>{if(liveActive())liveRefresh(false);else liveDeactivate()},45000)}
function liveDeactivate(){if(liveTimer){clearInterval(liveTimer);liveTimer=null}}
function liveLeagues(){return liveSelection.includes('all')?['bl1','bl2','bl3']:[...(liveSelection.includes('bvb')?['bl1']:[]),...(liveSelection.includes('vfl')?['bl2']:[])]}
function liveMatchesForSelection(){const list=liveLeagues().flatMap(l=>(liveData[l]?.matches||[]));return list.filter(m=>liveSelection.includes('all')||liveSelection.includes('bvb')&&/dortmund/i.test(m.home.name+' '+m.away.name)||liveSelection.includes('vfl')&&/bochum/i.test(m.home.name+' '+m.away.name)).sort((a,b)=>new Date(a.kickoff||0)-new Date(b.kickoff||0))}
function liveScore(m){const full=m.results.find(r=>r.type===2)||m.results.find(r=>/end/i.test(r.name));const half=m.results.find(r=>r.type===1);const last=m.goals.length?m.goals[m.goals.length-1]:null;const r=full||last||half;return r&&Number.isFinite(Number(r.home))&&Number.isFinite(Number(r.away))?r.home+' : '+r.away:'– : –'}
function liveMatchStatus(m){if(m.finished)return 'ABPFIFF';const start=new Date(m.kickoff||'');if(!Number.isFinite(start.getTime()))return 'Termin offen';const diff=Date.now()-start.getTime();if(diff<0)return start.toLocaleString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});if(diff<3*60*60*1000)return '● MÖGLICHERWEISE LIVE*';return 'Spielstatus offen'}
function liveRender(){const target=document.getElementById('liveMatches');target.replaceChildren();if(!liveSelection.length){target.textContent='Wähle Dortmund, Bochum oder alle Spiele aus.';return}const games=liveMatchesForSelection();if(!games.length){const p=document.createElement('p');p.className='live-empty';p.textContent='Für die Auswahl sind derzeit keine Spiele im aktuellen Spieltag hinterlegt.';target.append(p);return}games.forEach(m=>{const box=document.createElement('article');box.className='live-match';const state=liveMatchStatus(m);if(state.includes('LIVE'))box.classList.add('is-live');const top=document.createElement('div');top.className='live-match-top';const group=document.createElement('span');group.textContent=({bl1:'1. Bundesliga',bl2:'2. Bundesliga',bl3:'3. Liga'})[m.league]+' · '+m.group;const status=document.createElement('span');status.textContent=state;if(state.includes('LIVE'))status.className='live-on';top.append(group,status);const score=document.createElement('div');score.className='live-score';const home=document.createElement('span');home.textContent=m.home.name;const result=document.createElement('strong');result.textContent=liveScore(m);const away=document.createElement('span');away.textContent=m.away.name;score.append(home,result,away);box.append(top,score);if(m.goals.length){const details=document.createElement('details');details.className='live-event-list';const summary=document.createElement('summary');summary.textContent='⚽ Tore ('+m.goals.length+') anzeigen';details.append(summary);m.goals.slice().sort((a,b)=>(a.minute??0)-(b.minute??0)).forEach(g=>{const e=document.createElement('div');e.className='live-event';e.textContent='⚽ '+(g.minute!=null?g.minute+"' · ":'')+(g.scorer||'Torschütze nicht gemeldet')+(g.ownGoal?' (Eigentor)':'')+(g.penalty?' (Elfmeter)':'')+' · '+g.home+':'+g.away;details.append(e)});box.append(details)}target.append(box)})}
async function liveRefresh(force){if(liveBusy)return;if(!liveSelection.length){liveRender();document.getElementById('liveStatus').textContent='Keine Spiele ausgewählt.';return}const leagues=liveLeagues();if(!leagues.length)return;liveBusy=true;const id=++liveRequestId;const status=document.getElementById('liveStatus');status.textContent='Liveticker wird aktualisiert …';try{const results=await Promise.allSettled(leagues.map(async league=>{const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'football_live',league})});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'Liveticker nicht erreichbar');return data}));if(id!==liveRequestId)return;let good=0;results.forEach((r,i)=>{if(r.status==='fulfilled'){liveData[leagues[i]]=r.value;good++}});liveRender();if(good){const dates=leagues.map(l=>liveData[l]?.updatedAt).filter(Boolean).map(s=>new Date(s).getTime());const earliest=new Date(Math.min(...dates));status.textContent='Datenstand: '+earliest.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit',second:'2-digit'})+(good<leagues.length?' · Einige Ligen nicht erreichbar':'')+(force?' · aktualisiert':'')}else status.textContent='Gerade keine Live-Daten erreichbar. Bitte erneut versuchen.'}catch(e){status.textContent='Verbindung fehlgeschlagen. Bitte erneut versuchen.';console.warn('Liveticker:',e)}finally{liveBusy=false}}

/* V6: Fußballzentrale – Live-Tabellen von OpenLigaDB, persönliche Vereinswahl lokal */
const FOOTBALL_SEASON=2026, FOOTBALL_API='https://api.openligadb.de';
const FOOTBALL_PREF='johann-football-club-v1';const LOWER_CLUBS={wattenscheid:{name:'SG Wattenscheid 09',league:'other',customLeague:'Regionalliga West',sourceUrl:'https://www.sgwattenscheid09.de/',sourceLabel:'Spielplan und Ergebnisse bei SG 09'},rwe:{name:'Rot-Weiss Essen',league:'bl3',sourceUrl:'https://www.rot-weiss-essen.de/teams/1-mannschaft/spielplan/',sourceLabel:'Offizieller Spielplan von RWE'}};
const footballCache={};let footballLeague='bl1',footballPane='live',footballInitialized=false;
function footballPreference(){try{return JSON.parse(localStorage.getItem(FOOTBALL_PREF)||'null')}catch{return null}}
function footballSave(pref){localStorage.setItem(FOOTBALL_PREF,JSON.stringify(pref));renderFootballFavorite();renderFootballNews();document.getElementById('footballClubSettings').open=false}
function footballName(row){return row.teamName||row.shortName||row.team?.teamName||'Unbekannter Verein'}
async function footballFetch(path,ttl=15*60*1000){const cache=footballCache[path];if(cache&&Date.now()-cache.at<ttl)return cache.data;const r=await fetch(FOOTBALL_API+path,{headers:{Accept:'application/json'}});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();footballCache[path]={data,at:Date.now()};return data}
function footballLoading(msg){document.getElementById('footballTableStatus').textContent=msg}
async function footballTable(league=footballLeague){footballLeague=league;document.querySelectorAll('[data-football-league]').forEach(b=>b.classList.toggle('active',b.dataset.footballLeague===league));footballLoading('Aktuelle Tabelle wird geladen …');const body=document.getElementById('footballTableBody');body.replaceChildren();try{const rows=await footballFetch('/getbltable/'+league+'/'+FOOTBALL_SEASON);if(league!==footballLeague)return;if(!Array.isArray(rows)||!rows.length){footballLoading('Für diese Liga liegen aktuell keine Tabellendaten vor.');return}const pref=footballPreference();rows.forEach((team,i)=>{const tr=document.createElement('tr');if(pref?.teamId===team.teamInfoId||pref?.name===footballName(team))tr.className='favorite-row';const vals=[i+1,footballName(team),team.matches??team.matchCount??'–',team.goalDiff??((team.goals??0)-(team.opponentGoals??0)),team.points??'–'];vals.forEach((v,j)=>{const td=document.createElement('td');td.textContent=String(v);if(j===1)td.className='team-name';tr.append(td)});body.append(tr)});footballLoading('Saison '+FOOTBALL_SEASON+'/'+(FOOTBALL_SEASON+1)+' · Stand: '+new Date().toLocaleString('de-DE',{dateStyle:'short',timeStyle:'short'}))}catch(e){footballLoading('Live-Daten momentan nicht erreichbar. Bitte später erneut versuchen.');console.warn('Johann Fußball:',e)}}
async function footballTeams(){const league=document.getElementById('footballLeagueSelect').value,options=document.getElementById('footballClubOptions'),custom=document.getElementById('footballCustomClub');options.replaceChildren();custom.classList.toggle('hidden',league!=='other');if(league==='other')return;options.textContent='Vereine werden geladen …';try{const teams=await footballFetch('/getavailableteams/'+league+'/'+FOOTBALL_SEASON,24*60*60*1000);if(league!==document.getElementById('footballLeagueSelect').value)return;options.replaceChildren();if(!Array.isArray(teams)||!teams.length){options.textContent='Keine Vereine verfügbar. Bitte später erneut versuchen.';return}teams.sort((a,b)=>footballName(a).localeCompare(footballName(b),'de')).forEach(team=>{const b=document.createElement('button');b.type='button';b.textContent=footballName(team);b.onclick=()=>footballSave({name:footballName(team),league,teamId:team.teamId||team.teamInfoId||null});options.append(b)})}catch(e){options.textContent='Vereinsliste nicht erreichbar. Bitte später erneut versuchen.'}}
async function renderFootballFavorite(){const pref=footballPreference(),name=document.getElementById('footballFavoriteName'),info=document.getElementById('footballFavoriteInfo'),matches=document.getElementById('footballFavoriteMatches');matches.replaceChildren();if(!pref){name.textContent='Wähle deinen Lieblingsverein';info.textContent='Johann startet für alle neutral. Dein Verein wird nur auf deinem Gerät gespeichert.';document.getElementById('footballClubSettings').open=true;return}name.textContent=pref.name;info.textContent=({bl1:'1. Bundesliga',bl2:'2. Bundesliga',bl3:'3. Liga'})[pref.league]||pref.customLeague||'Dein Verein';if(!pref.teamId){const msg=document.createElement('p');msg.className='mini';msg.textContent='Automatische Spielstände sind für diesen Verein noch nicht angebunden. Die Auswahl bleibt gespeichert.';matches.append(msg);if(pref.sourceUrl){const a=document.createElement('a');a.className='football-source-link';a.href=pref.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(pref.sourceLabel||'Offizielle Vereinsdaten öffnen')+' ↗';matches.append(a)}return}const msg=document.createElement('p');msg.className='mini';msg.textContent='Nächste Spiele werden gesucht …';matches.append(msg);try{const games=await footballFetch('/getmatchesbyteamid/'+pref.teamId+'/1/4',10*60*1000);if(footballPreference()?.name!==pref.name)return;matches.replaceChildren();if(pref.sourceUrl){const a=document.createElement('a');a.className='football-source-link';a.href=pref.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent=(pref.sourceLabel||'Offizieller Spielplan')+' ↗';matches.append(a)}const upcoming=(Array.isArray(games)?games:[]).filter(m=>!m.matchIsFinished&&new Date(m.matchDateTimeUTC||m.matchDateTime)>=new Date()).sort((a,b)=>new Date(a.matchDateTimeUTC||a.matchDateTime)-new Date(b.matchDateTimeUTC||b.matchDateTime)).slice(0,3);if(!upcoming.length){const p=document.createElement('p');p.className='mini';p.textContent='Derzeit keine kommenden Spiele in der Datenquelle.';matches.append(p);return}upcoming.forEach(m=>{const box=document.createElement('div');box.className='football-match';const d=document.createElement('small');const date=m.matchDateTimeUTC?new Date(m.matchDateTimeUTC):new Date(m.matchDateTime);d.textContent=date.toLocaleString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});const title=document.createElement('strong');title.textContent=(m.team1?.teamName||'Heim')+' – '+(m.team2?.teamName||'Gast');box.append(d,title);matches.append(box)})}catch{matches.textContent='Spielplan derzeit nicht erreichbar. ';if(pref.sourceUrl){const a=document.createElement('a');a.href=pref.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Offiziellen Spielplan öffnen ↗';matches.append(a)}}}
function renderFootballNews(){const wrap=document.getElementById('footballNewsLinks');wrap.replaceChildren();const pref=footballPreference();const topics=[['Deutscher Fußball – aktuelle Nachrichten','Bundesliga 2. Bundesliga 3. Liga Fußball'],['1. Bundesliga','1. Bundesliga Fußball'],['2. Bundesliga','2. Bundesliga Fußball'],['3. Liga','3. Liga Fußball']];if(pref?.name)topics.unshift([pref.name+' – Vereinsnews',pref.name+' Fußball']);topics.forEach(([label,query])=>{const a=document.createElement('a');a.href='https://news.google.com/search?q='+encodeURIComponent(query)+'&hl=de&gl=DE&ceid=DE:de';a.target='_blank';a.rel='noopener noreferrer';a.textContent=label+' ↗';wrap.append(a)})}
function footballTab(tab){footballPane=tab;document.querySelectorAll('[data-football-tab]').forEach(b=>b.classList.toggle('active',b.dataset.footballTab===tab));document.querySelectorAll('.football-pane').forEach(x=>x.classList.toggle('active',x.id==='football-'+tab));if(tab==='tables')footballTable();if(tab==='news')renderFootballNews();if(tab==='live')liveActivate();else liveDeactivate()}
function initFootball(){if(!footballInitialized){footballInitialized=true;document.querySelectorAll('[data-football-tab]').forEach(b=>b.addEventListener('click',()=>footballTab(b.dataset.footballTab)));initLiveControls();document.querySelectorAll('[data-football-league]').forEach(b=>b.addEventListener('click',()=>footballTable(b.dataset.footballLeague)));document.getElementById('footballLeagueSelect').addEventListener('change',footballTeams);
document.getElementById('quickWattenscheid').addEventListener('click',()=>footballSave({...LOWER_CLUBS.wattenscheid}));
document.getElementById('quickRWE').addEventListener('click',async()=>{const pref={...LOWER_CLUBS.rwe};footballSave(pref);try{const teams=await footballFetch('/getavailableteams/bl3/'+FOOTBALL_SEASON);const team=teams.find(t=>/rot.?weiss essen/i.test(footballName(t)));if(team&&footballPreference()?.name===pref.name)footballSave({...pref,teamId:team.teamId||team.teamInfoId||null})}catch(e){console.info('RWE: offizieller Spielplan als Alternative verfügbar')}});document.getElementById('footballRefresh').addEventListener('click',()=>{delete footballCache['/getbltable/'+footballLeague+'/'+FOOTBALL_SEASON];footballTable()});document.getElementById('footballSaveCustom').addEventListener('click',()=>{const n=document.getElementById('footballCustomClubName').value.trim(),l=document.getElementById('footballCustomClubLeague').value.trim();if(!n){document.getElementById('footballCustomClubName').focus();return}footballSave({name:n,league:'other',customLeague:l})});document.getElementById('footballClubSettings').addEventListener('toggle',e=>{if(e.target.open)footballTeams()})}footballTab(footballPane);renderFootballFavorite()}


// JOHANN KIDS V11 – keine privaten Kinderdaten in der Cloud ohne Benutzerkonten.
let kidsCurrentStory = '';
function kidsShelfRender(){
 const el=$('kidsShelf');el.replaceChildren();
 let stories=[];try{stories=JSON.parse(localStorage.getItem('johann-kids-stories')||'[]')}catch{}
 if(!Array.isArray(stories)||!stories.length){el.textContent='Noch keine gespeicherten Geschichten.';return;}
 stories.slice().reverse().forEach((item)=>{
  const btn=document.createElement('button');btn.className='secondary';btn.style.cssText='display:block;width:100%;text-align:left;margin:8px 0';
  btn.textContent=(item.title||'Meine Geschichte')+' · '+(item.date||'');
  btn.addEventListener('click',()=>{kidsCurrentStory=item.story;$('kidsStory').textContent=item.story;$('kidsStory').classList.remove('hidden');$('kidsStoryActions').classList.remove('hidden');$('kidsStatus').textContent='Aus deinem Bücherregal.'});el.appendChild(btn);
 });
}
async function kidsGenerate(){
 const btn=$('kidsGenerate');if(btn.disabled)return;
 const type=$('kidsType').value,age=Number($('kidsAge').value),length=$('kidsLength').value,hero=$('kidsHero').value.trim(),theme=$('kidsTheme').value.trim();
 btn.disabled=true;$('kidsStatus').textContent='Johann schreibt deine Geschichte … ✨';$('kidsStory').classList.add('hidden');$('kidsStoryActions').classList.add('hidden');
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),90000);
 try{
  const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'kids_story',type,age,length,hero,theme}),signal:ctrl.signal});
  const d=await r.json();if(!r.ok||!d.story)throw Error(d.error||'Keine Geschichte erhalten.');
  kidsCurrentStory=d.story;$('kidsStory').textContent=d.story;$('kidsStory').classList.remove('hidden');$('kidsStoryActions').classList.remove('hidden');$('kidsStatus').textContent='Deine Geschichte ist fertig. Viel Spaß beim Vorlesen!';
 }catch(e){$('kidsStatus').textContent=e.name==='AbortError'?'Das dauert gerade zu lange. Bitte noch einmal versuchen.':e.message||'Gerade klappt es leider nicht.'}
 finally{clearTimeout(timer);btn.disabled=false}
}
$('kidsGenerate').addEventListener('click',kidsGenerate);
$('kidsSurprise').addEventListener('click',()=>{$('kidsHero').value='';$('kidsTheme').value='';kidsGenerate()});
$('kidsRead').addEventListener('click',()=>{if(!('speechSynthesis'in window)){ $('kidsStatus').textContent='Vorlesen wird von diesem Browser nicht unterstützt.';return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(kidsCurrentStory);u.lang='de-DE';u.rate=.87;speechSynthesis.speak(u)});
$('kidsStop').addEventListener('click',()=>{if('speechSynthesis'in window)speechSynthesis.cancel()});
$('kidsSave').addEventListener('click',()=>{if(!kidsCurrentStory)return;let stories=[];try{stories=JSON.parse(localStorage.getItem('johann-kids-stories')||'[]')}catch{}if(!Array.isArray(stories))stories=[];const title=kidsCurrentStory.split('\n').find(x=>x.trim())?.slice(0,75)||'Meine Geschichte';stories.push({title,story:kidsCurrentStory,date:new Date().toLocaleDateString('de-DE')});try{localStorage.setItem('johann-kids-stories',JSON.stringify(stories.slice(-15)));$('kidsStatus').textContent='In deinem lokalen Bücherregal gespeichert.';kidsShelfRender()}catch{$('kidsStatus').textContent='Auf diesem Gerät ist nicht genug Speicher frei.'}});
kidsShelfRender();

// Wetterort ohne Pop-up direkt im Dashboard ändern.
document.getElementById('weatherCityForm').addEventListener('submit',async e=>{e.preventDefault();const input=document.getElementById('weatherCityInput');const btn=e.currentTarget.querySelector('button[type=submit]');btn.disabled=true;try{await setWeatherCity(input.value);input.value=''}catch{}finally{btn.disabled=false}});
document.getElementById('weatherReset').addEventListener('click',async()=>{try{await setWeatherCity('Bochum')}catch{}});

/* V21: Matchday PRO. Existing V20 weather, voice, Sudoku, ticker unchanged. */
async function mdClient(action,extra={}){const r=await fetch(WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...extra})});const j=await r.json();if(!r.ok)throw Error(j.error||'Verbindung fehlgeschlagen');return j}
function mdEl(tag,txt,cls){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;if(cls)e.className=cls;return e}
async function mdRender(){const status=document.getElementById('mdStatus'),root=document.getElementById('mdGames');status.textContent='Lade gespeicherte Analysen …';root.replaceChildren();try{const data=(mdPrefetchData&&Date.now()-mdPrefetchAt<60000)?mdPrefetchData:await mdClient('matchday_list');if(!data.matches.length){status.textContent='Noch keine Prognosen. Starte als Admin die erste Datenübernahme.';return}status.textContent='Stand: '+new Date().toLocaleString('de-DE');for(const m of data.matches){const box=mdEl('div',undefined,'football-card');box.style.marginTop='12px';const title=mdEl('h3',m.home+' – '+m.away);box.append(title,mdEl('p',new Date(m.kickoff).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'medium',timeStyle:'short'})+' · '+m.round,'mini'));const row=mdEl('div',undefined,'row-actions');for(const [name,p] of [['1',m.probabilities.home],['X',m.probabilities.draw],['2',m.probabilities.away]]){const tag=mdEl('span',name+': '+Math.round(p*100)+' %','pill');row.append(tag)}box.append(row,mdEl('p','Modell-Tipp: '+m.tip.join(':')+' · Erwartete Tore: '+m.expected.map(x=>x.toFixed(2)).join(' / '),'mini'));if(m.actual)box.append(mdEl('p','Endstand: '+m.actual.join(':')+' · '+(m.actual.join(':')===m.tip.join(':')?'Exakt getroffen':Math.sign(m.actual[0]-m.actual[1])===Math.sign(m.tip[0]-m.tip[1])?'Tendenz getroffen':'Tendenz verfehlt'),'mini'));box.append(mdEl('p','Berechnet: '+new Date(m.calculatedAt).toLocaleString('de-DE')+' · Stichprobe: '+m.sample+' Heim-/Auswärtsspiele · '+m.model,'mini'));root.append(box)}}catch(e){status.textContent=e.message}}
document.getElementById('mdReload').addEventListener('click',mdRender);
for(const [id,sendReport] of [['mdAdminUpdate',false],['mdAdminMail',true]])document.getElementById(id).addEventListener('click',async()=>{const status=document.getElementById('mdStatus'),adminKey=document.getElementById('mdAdminKey').value;if(!adminKey){status.textContent='Bitte Admin-Schlüssel eingeben.';return}status.textContent='Daten werden verarbeitet …';try{const x=await mdClient('matchday_admin',{adminKey,sendReport});status.textContent='Neue Prognosen: '+x.update.inserted+' · Ausgewertete Spiele: '+x.update.settled+(x.mail?' · Mail: '+x.mail.status+' ('+(x.mail.sent||0)+' versendet)':'');await mdRender()}catch(e){status.textContent=e.message}});
document.querySelector('[data-football-tab="matchday"]').addEventListener('click',mdRender);
