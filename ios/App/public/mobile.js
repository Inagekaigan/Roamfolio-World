'use strict';
const mobileTabs=[['Journal','book',0],['Days','date',1],['Places','pin',2],['Wallet','wallet',3],['More','bag',-1]];
const nativeTools=()=>window.Capacitor?.Plugins?.TravelTools;
function updateMobile(){
  const bar=document.getElementById('tabbar');
  if(!bar)return;
  bar.innerHTML=mobileTabs.map(([title,glyph,page])=>{
    const current=page===view||page===-1&&view>=4;
    return '<button type="button" aria-current="'+(current?'page':'false')+'" data-action="'+(page===-1?'extras':'nav:'+page)+'">'+icon(glyph)+'<span>'+title+'</span></button>'
  }).join('');
  $('#mobileName').textContent=view===0?'Roamfolio':pages[view];
  if(view===0){
    const cover=$('.worldcover'),stop=stopForDay(activeDay);
    if(cover&&stop){
      const figure=document.createElement('div');
      figure.className='mobilePicture';figure.innerHTML=art(stop);
      cover.prepend(figure);
      const route=document.createElement('details');route.className='routefold';
      const map=$('#worldmap');route.innerHTML='<summary>'+icon('map')+' Route map <span>'+trip.stops.length+' stops</span></summary>';
      cover.after(route);if(map)route.append(map);
      hydrate();
    }
  }
}
function openExtras(){
  $('#extrasList').innerHTML=pages.slice(4).map((p,i)=>btn(icon(icons[i+4])+esc(p),'nav:'+(i+4),'extra')).join('')+
    btn(icon('users')+'My trips','trips','extra')+btn(icon('edit')+'Edit trip','edittrip','extra')+
    btn(icon('book')+'Share itinerary','sharetrip','extra')+btn(icon('note')+'Export trip backup','backup','extra')+
    btn(icon('bag')+'Import trip backup','restore','extra');
  $('#extras').showModal()
}
function shareText(){return [trip.name,date(1)+' – '+date(days()),'',...trip.stops.map(s=>s.name+', '+cityOf(s).country+' · '+s.nights+' nights'),'',...sorted().map(a=>date(a.day)+' · '+a.time+' · '+a.name+' ('+a.city+')')].join('\n')}
async function sendFile(name,contents,type){
  const bridge=nativeTools();if(bridge){await bridge.shareFile({name,contents});return}
  const file=new File([contents],name,{type});
  if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file]});return}
  const url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),2000)
}
async function shareTrip(){
  try{const message=shareText();
    if(nativeTools())await nativeTools().shareText({text:message});
    else if(navigator.share)await navigator.share({title:trip.name,text:message});
    else await sendFile('Roamfolio-itinerary.txt',message,'text/plain')
  }catch(error){if(error.name!=='AbortError')flash('Sharing is unavailable. Try exporting a backup.')}
}
function fileError(error){if(error?.name!=='AbortError')flash('The file could not be shared. Try again.')}
document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  if(action==='extras'){openExtras();return}
  if($('#extras').open)$('#extras').close();
  if(action==='sharetrip')shareTrip();
  if(action==='edittrip')edit('trip');
},true);
$('#extrasClose').addEventListener('click',()=>$('#extras').close());
updateMobile();
document.addEventListener('click',async e=>{
  const id=e.target.closest('[data-cal-event]')?.dataset.calEvent;
  if(!id)return;
  const a=trip.acts.find(a=>a.id===id);if(!a)return;
  const stop=trip.stops.find(s=>s.name===a.city)||stopForDay(a.day);
  const tz=stop&&coords(stop).zone;
  if(!tz){flash('Set the stop’s time zone in Places first.');return}
  const day=new Date(trip.start+'T12:00:00Z');day.setUTCDate(day.getUTCDate()+a.day-1);
  try{await nativeTools().addEvent({title:a.name,city:a.city,notes:a.notes,zone:tz,local:day.toISOString().slice(0,10)+'T'+a.time})}
  catch{flash('The calendar editor could not open for this local time.')}
});
