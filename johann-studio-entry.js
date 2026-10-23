/* Johann Studio entry V1. No requests, no credentials, no embedding private HTTP. */
(()=>{
 'use strict';
 const el=id=>document.getElementById(id);
 const tile=el('johannStudioTile'),locked=el('johannStudioLocked'),content=el('johannStudioContent');
 if(!tile||!locked||!content)return;
 const owner=()=>{try{return window.johannStudioIsOwner?.()===true}catch{return false}};
 function refresh(){
  const allowed=owner();tile.hidden=!allowed;locked.hidden=allowed;content.hidden=!allowed;
 }
 el('johannStudioLogin')?.addEventListener('click',()=>window.johannOpenLogin?.());
 el('johannStudioLaunch')?.addEventListener('click',event=>{
  if(owner())return;
  event.preventDefault();refresh();window.johannOpenLogin?.();
 });
 window.addEventListener('johann-auth-state',refresh);
 window.addEventListener('pageshow',refresh);
 refresh();
})();
