/* Published content loader. Published changes appear on fresh visits immediately; open pages refresh every 8 seconds. */
(() => {
  if(new URLSearchParams(location.search).has('studio-preview'))return;
  let last='';let busy=false;
  async function sync(){
    if(!window.SolluxContent || busy)return;busy=true;
    try{
      const resp=await fetch('/.netlify/functions/cms?action=published',{cache:'no-store'});
      if(!resp.ok)return;
      const data=await resp.json();const raw=JSON.stringify(data);
      if(raw!==last){window.SolluxContent.apply(data,true);last=raw;}
    }catch(_){/* Static fallback remains usable if CMS is not deployed. */}
    finally{busy=false;}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
  setInterval(()=>{if(!document.hidden)sync();},8000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});
})();
