/* JOHANN TEST: UI ONLY. No production Worker calls. */
(()=>{
  const originalFetch=window.fetch.bind(window);
  window.fetch=(input,init)=>{
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    let url;try{url=new URL(raw,location.href)}catch{return Promise.reject(new Error('Test: ungültige URL'))}
    if(url.hostname==='johann-ki.bjornkorczak.workers.dev'||url.hostname==='api.johann-butler.de'||url.pathname.includes('api-in-diesem-test-deaktiviert'))return Promise.reject(new Error('Testmodus: KI deaktiviert'));
    return originalFetch(input,init);
  };
  const reply=()=>{
    const input=document.getElementById('command');if(input){input.value='';input.blur()}
    const message='Ich bin gerade im Testmodus. Deine Nachricht wurde nicht versendet. 💙';
    const status=document.getElementById('johann-test-status');if(status)status.textContent=message;
    const note=document.getElementById('johann-test-toast');if(note){note.textContent=message;note.hidden=false}
  };
  const unlock=()=>{const btn=document.getElementById('sendButton');if(btn&&btn.disabled)btn.disabled=false};
  document.addEventListener('DOMContentLoaded',()=>{
    const btn=document.getElementById('sendButton');if(btn){btn.disabled=false;new MutationObserver(unlock).observe(btn,{attributes:true,attributeFilter:['disabled']})}
  });
  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('#sendButton');if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();reply();
  },true);
  document.addEventListener('keydown',e=>{
    if(e.target?.id==='command'&&e.key==='Enter'){e.preventDefault();e.stopImmediatePropagation();reply()}
  },true);
  document.addEventListener('submit',e=>{if(e.target?.contains(document.getElementById('command'))){e.preventDefault();e.stopImmediatePropagation();reply()}},true);
})();
