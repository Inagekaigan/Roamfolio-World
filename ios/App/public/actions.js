function exportCalendar(){const fmt=d=>d.toISOString().slice(0,10).replace(/-/g,''),safe=s=>String(s||'').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,x=>'\\'+x);let lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Roamfolio//World Daybook//EN','CALSCALE:GREGORIAN'];for(const a of sorted()){let day=new Date(trip.start+'T00:00:00Z');day.setUTCDate(day.getUTCDate()+Number(a.day)-1);const stop=trip.stops.find(s=>s.name===a.city)||stopForDay(a.day);const zone=stop?coords(stop).zone:'';const local=fmt(day)+'T'+a.time.replace(':','')+'00';const start=(zone&&/^[A-Za-z0-9_+\/-]+$/.test(zone)?'DTSTART;TZID='+zone+':':'DTSTART:')+local;lines.push('BEGIN:VEVENT','UID:'+a.id+'@roamfolio','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),start,'SUMMARY:'+safe(a.name),'LOCATION:'+safe(a.city),'DESCRIPTION:'+safe(a.notes),'END:VEVENT')}lines.push('END:VCALENDAR');sendFile('Roamfolio-itinerary.ics',lines.join('\r\n')+'\r\n','text/calendar').catch(fileError)}
document.addEventListener('click',e=>{let a=e.target.closest('[data-action]')?.dataset.action||'', [cmd,arg]=a.split(':');if(cmd==='day'){activeDay=+arg;render()}if(cmd==='todayact')edit('acts',null,{day:activeDay,city:stopForDay(activeDay)?.name});if(cmd==='calendar')exportCalendar();if(cmd==='move'){let i=trip.stops.findIndex(s=>s.id===arg);if(i>0){[trip.stops[i-1],trip.stops[i]]=[trip.stops[i],trip.stops[i-1]];save();render();flash('Route updated. Scheduled activities retain their dates.')}}});



let nearbyItems=[];
async function nearby(stop){
  const panel=document.querySelector('[data-brief]');if(!panel)return;
  let list=panel.querySelector('.nearby');
  if(!list){list=document.createElement('section');list.className='nearby';panel.append(list)}
  list.textContent='Finding nearby places…';
  try{
    const data=await brief(cityOf(stop));const point=data.coordinates;
    const query=new URLSearchParams({format:'json',origin:'*',action:'query',list:'geosearch',gscoord:point.lat+'|'+point.lon,gsradius:5000,gslimit:12});
    const response=await jsonRequest('https://en.wikipedia.org/w/api.php?'+query);
    if(!list.isConnected)return;
    nearbyItems=response.query.geosearch.filter(item=>item.dist>0);
    list.innerHTML='<h3>Within 5 km of the city reference point</h3>'+ (nearbyItems.map((item,i)=>'<div class="sectionhead"><span>'+external(item.title,'https://en.wikipedia.org/?curid='+item.pageid)+' · '+(item.dist/1000).toFixed(1)+' km</span>'+btn('+ Schedule','scheduleplace:'+i)+'</div>').join('')||'No nearby entries found.');
  }catch{list.textContent='Nearby search is unavailable. Use the city map or try again.'}
}
document.addEventListener('click',e=>{
  const [action,id]=(e.target.closest('[data-action]')?.dataset.action||'').split(':');
  if(action==='nearby'){let stop=trip.stops.find(s=>s.id===id);if(stop)nearby(stop)}
  if(action==='scheduleplace'){
    const item=nearbyItems[Number(id)],stop=trip.stops.find(s=>s.id===selected)||trip.stops[0];if(!item||!stop)return;
    let start=1;for(const s of trip.stops){if(s===stop)break;start+=s.nights}
    edit('acts',null,{name:item.title,city:stop.name,day:start,category:'Sightseeing',notes:'https://en.wikipedia.org/?curid='+item.pageid})
  }
});
document.addEventListener('error',e=>{
 const image=e.target;if(image.tagName!=='IMG'||!image.parentElement?.dataset.art)return;
 const el=image.parentElement,stop=trip.stops.find(s=>s.id===el.dataset.art),p=stop&&cityOf(stop);image.remove();
 if(!p||el.dataset.retried)return;el.dataset.retried='yes';
 brief(p).then(d=>{if(!el.isConnected||!d.photo||image.src===d.photo)return;let im=new Image();im.src=d.photo;im.alt=p.name;el.append(im)}).catch(()=>{});
},true);


function costTemplates(){if(trip.currency==='JPY'&&trip.stops.length&&trip.stops.every(s=>cityOf(s).country==='Japan'))return presets;return [['Hotel room','Accommodation',100,'Per night'],['Meals and drinks','Food & drink',30,'Per traveler / day'],['Local transit','Transport',8,'Per traveler / day'],['Airport transfer','Transport',25,'Per traveler'],['Intercity ticket','Transport',45,'Per traveler'],['Museum or attraction','Sightseeing',15,'Per traveler'],['Mobile data','Essentials',15,'Per traveler'],['Laundry','Essentials',6,'Per trip'],['Baggage fee','Transport',30,'Per traveler'],['City tax allowance','Essentials',3,'Per traveler / night'],['Cash withdrawal fee','Essentials',3,'Per trip'],['Souvenirs','Shopping',25,'Per traveler']]}
const tripShelfKey='roamfolio-world-shelf';
function shelf(){try{return JSON.parse(localStorage.getItem(tripShelfKey))||{}}catch{return {}}}
function switchTrip(target){let collection=shelf();trip.tripId=trip.tripId||uid();collection[trip.tripId]=trip;target.tripId=target.tripId||uid();delete collection[target.tripId];try{localStorage.setItem(tripShelfKey,JSON.stringify(collection));localStorage.setItem(key,JSON.stringify(target))}catch{flash('Unable to save the trip. Export a backup first.');return false}trip=target;activeDay=1;view=0;selected='';return true}
function tripMenu(){let others=Object.values(shelf()).filter(t=>t.tripId!==trip.tripId);let labels=others.map(t=>t.name+' · '+t.start+' · '+t.tripId.slice(0,5));let opts=['Create a new trip','Open world sample',...labels];modal('Trip workspace',field('pick','Choose a trip','select',opts[0],opts),({pick})=>{if(pick===opts[0]){modal('New trip',field('name','Trip name','text|req')+field('start','Departure date','date|req',new Date().toISOString().slice(0,10))+field('currency','Budget currency','select','USD',currencyCodes)+field('cap','Trip budget','number|req',2000)+field('people','Travelers','number|positive|req',1),d=>{if(!d.name.trim())return false;return switchTrip({...d,name:d.name.trim(),cap:Number(d.cap),people:Number(d.people),buffer:10,stops:[],acts:[],costs:[],packs:[],notes:[],bookings:[]})},'Create trip');return false}return switchTrip(pick===opts[1]?worldSeed():others[labels.indexOf(pick)])},'Continue')}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="trips"]'))tripMenu()});
document.addEventListener('change',e=>{if(e.target.name==='currency'&&$('#form [name="fx"]')){let el=$('#form [name="fx"]');el.value=e.target.value===(trip.currency||'JPY')?'1':''}});

