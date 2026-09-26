/* V16.2: Sprache nur nach bewusstem Tippen, maximal 45 Sekunden. */
(()=>{
 const button=document.getElementById('voiceButton');
 const url='https://johann-ki.bjornkorczak.workers.dev/';
 let recorder=null,stream=null,chunks=[],busy=false,player=null,recordingTimer=null,countdownTimer=null;
 function clearRecordingTimers(){if(recordingTimer!==null){clearTimeout(recordingTimer);recordingTimer=null}if(countdownTimer!==null){clearInterval(countdownTimer);countdownTimer=null}}
 function label(text){button.title=text;button.setAttribute('aria-label',text)}
 function reset(){clearRecordingTimers();button.classList.remove('recording','busy');button.textContent='🎙️';label('Sprachaufnahme starten');busy=false}
 function stopTracks(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
 function base64ToBlob(base64,type){const bytes=atob(base64),array=new Uint8Array(bytes.length);for(let i=0;i<bytes.length;i++)array[i]=bytes.charCodeAt(i);return new Blob([array],{type})}
 window.johannSpeakReply=async(text)=>{
  try{
   const plain=String(text||'').replace(/https?:\/\/\S+/g,'').replace(/[*#_`]/g,'').slice(0,2200);
   say('🔊 Johann spricht …',15000);
   const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'voice_speak',text:plain})});
   const data=await r.json();if(!r.ok)throw Error(data.error||'Sprachausgabe nicht erreichbar');
   if(player){player.pause();URL.revokeObjectURL(player.src)}
   const objectUrl=URL.createObjectURL(base64ToBlob(data.audio,'audio/mpeg'));
   player=new Audio(objectUrl);player.onended=()=>URL.revokeObjectURL(objectUrl);
   await player.play();
  }catch(e){say('Die Textantwort ist da, aber die Sprachausgabe klappt gerade nicht: '+safeText(e.message),8000)}
 };
 button.addEventListener('click',async()=>{
  if(recorder&&recorder.state==='recording'){clearRecordingTimers();recorder.stop();button.classList.remove('recording');button.classList.add('busy');button.textContent='⌛';label('Johann verarbeitet deine Aufnahme');return}
  if(busy)return;
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){say('Dein Browser unterstützt die Aufnahme leider nicht.',7000);return}
  if(player){player.pause();player=null}
  busy=true;
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});
   const types=['audio/mp4','audio/webm;codecs=opus','audio/webm'];
   const mime=types.find(t=>MediaRecorder.isTypeSupported(t));
   recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined);chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recorder.onerror=()=>{clearRecordingTimers();stopTracks();reset();say('Aufnahme fehlgeschlagen.',6000)};
   recorder.onstop=async()=>{
    clearRecordingTimers();stopTracks();
    const blob=new Blob(chunks,{type:recorder.mimeType||'audio/mp4'});
    if(blob.size>4*1024*1024){reset();say('Die Aufnahme ist zu lang. Bitte höchstens 45 Sekunden sprechen oder die Aufnahme früher abschicken.',8000);return}
    try{
     const form=new FormData();form.append('action','voice_transcribe');form.append('audio',blob,blob.type.includes('webm')?'aufnahme.webm':'aufnahme.mp4');
     const r=await fetch(url,{method:'POST',body:form});const data=await r.json();if(!r.ok)throw Error(data.error||'Spracherkennung fehlgeschlagen');
     const heard=String(data.text||'').trim();if(!heard)throw Error('Ich habe nichts verstanden.');
     document.getElementById('command').value=heard;
     window.johannVoiceAwaiting=true;
     reset();submit();
    }catch(e){window.johannVoiceAwaiting=false;reset();say('Johann konnte dich nicht verstehen: '+safeText(e.message),8000)}
   };
   recorder.start();button.classList.add('recording');button.textContent='⏹';label('Aufnahme beenden und an Johann senden');say('Ich höre zu, Meister. Zum Senden erneut auf das Mikrofon tippen.',12000);
   const startedAt=Date.now();
   countdownTimer=setInterval(()=>{
    if(recorder?.state!=='recording'){clearRecordingTimers();return}
    const remaining=Math.ceil((45000-(Date.now()-startedAt))/1000);
    if(remaining<=5&&remaining>0){button.textContent=String(remaining);label('Noch '+remaining+' Sekunden – zum vorzeitigen Senden tippen')}
   },200);
   recordingTimer=setTimeout(()=>{
    if(recorder?.state==='recording'){clearRecordingTimers();recorder.stop();button.classList.remove('recording');button.classList.add('busy');button.textContent='⌛';label('Johann verarbeitet deine Aufnahme')}
   },45000);
  }catch(e){clearRecordingTimers();stopTracks();reset();say('Mikrofon nicht verfügbar. Bitte Berechtigung prüfen.',7500)}
 });
})();
