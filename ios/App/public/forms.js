const titles={stops:'destination',acts:'activity',costs:'cost item',bookings:'booking',packs:'packing item',notes:'note'};
function field(k,label,type='text',value='',opts){let spec=type.split('|'),t=spec[0],req=spec.includes('req')?' required':'';let content;
if(t==='select')content='<select name="'+k+'">'+opts.map(o=>'<option '+(o===value?'selected':'')+'>'+esc(o)+'</option>').join('')+'</select>';
else if(t==='textarea')content='<textarea name="'+k+'">'+esc(value)+'</textarea>';
else content='<input name="'+k+'" type="'+t+'" value="'+esc(value)+'" '+req+(t==='number'?' min="'+(spec.includes('positive')?1:0)+'" max="1000000000" step="'+(spec.includes('fx')?'any':spec.includes('decimal')?'0.01':'1')+'"':'')+'>';
return '<label>'+label+content+'</label>'}
let onSubmit;
function modal(title,fields,callback,button='Save changes'){$('#dialogtitle').textContent=title;$('#fields').innerHTML=fields;$('.dialogbuttons .primary').textContent=button;onSubmit=callback;if(!$('#modal').open)$('#modal').showModal()}
function edit(group,id,template){const r=group==='trip'?trip:trip[group].find(x=>x.id===id)||template||{};const f=(k,l,t,def,opts)=>field(k,l,t,r[k]??def??'',opts);
let body='';
if(group==='trip')body=f('name','Trip name','text|req')+f('start','Start date','date|req')+f('people','Travelers','number|positive|req')+f('cap','Total budget ('+(trip.currency||'JPY')+')','number|req')+f('buffer','Contingency (%)','number|req');
if(group==='stops')body=placeField(r)+f('nights','Nights at this stop','number|req',1)+field('zoneOverride','Time zone override (optional)','select','',['',...Intl.supportedValuesOf('timeZone')]);
if(group==='acts')body=f('name','Activity','text|req')+f('city','Destination','text|req',trip.stops[0]?.name)+f('day','Trip day','number|positive|req',1)+f('time','Local time','time|req','09:00')+f('category','Category','select','Sightseeing',cats)+f('notes','Address, transfer time, or backup plan','textarea');
if(group==='costs')body=f('name','Item name','text|req')+f('category','Category','select','Other',cats)+f('currency','Item currency','select',trip.currency||'JPY',currencyCodes)+f('fx','Exchange rate: trip currency per 1 item currency','number|fx|req',1)+f('rate','Unit price in item currency','number|decimal|req',0)+f('qty','Quantity per billing unit','number|positive|req',1)+f('basis','Billing unit','select','Per trip',bases)+f('actual','Actual total in item currency (optional)','number|decimal')+f('notes','Price source or assumptions','textarea');
if(group==='bookings')body=f('name','Reservation name','text|req')+f('type','Booking type','select','Hotel',['Hotel','Flight','Rail','Activity','Restaurant','Other'])+f('date','Booking date','date|req',trip.start)+f('reference','Confirmation reference')+f('address','Address or route')+f('deadline','Cancellation deadline (booking local time)','datetime-local')+f('notes','Contact and booking details','textarea');
if(group==='packs')body=f('name','Packing item','text|req');
if(group==='notes')body=f('name','Title','text|req')+f('type','Type','select','Note',['Note','Document link','Contact','Address','Reminder'])+f('url','Document or website URL','url')+f('notes','Details','textarea');
if(group==='acts'&&id&&nativeTools())body+='<button type="button" data-cal-event="'+esc(id)+'">Add saved activity to Apple Calendar</button>';
modal(group==='trip'?'Edit trip':(id?'Edit ':'Add ')+titles[group],body,data=>{for(const k of ['nights','day','people','cap','buffer','rate','qty'])if(k in data)data[k]=Number(data[k]);if('name'in data&&!data.name.trim()){flash('Enter a name.');return false}
if(group==='costs'){data.fx=data.currency===(trip.currency||'JPY')?1:Number(data.fx);if(!(data.fx>0)){flash('Enter a positive exchange rate.');return false}}
if(group==='stops'&&!resolvePlace(data,r))return false;
if(group==='stops'){if(data.zoneOverride)data.zone=data.zoneOverride;else if(id&&data.name===r.name&&r.zone)data.zone=r.zone;delete data.zoneOverride}
if(group==='stops'&&data.photo&&!/^https:\/\//i.test(data.photo)){flash('Use an HTTPS image URL.');return false}
if(group==='acts'&&data.day>days()){flash('Choose a day within the trip, or add nights to a stop.');return false}
if(group==='trip')Object.assign(trip,data);else if(id){if(group==='stops'&&r.name!==data.name)trip.acts.filter(a=>a.city===r.name).forEach(a=>a.city=data.name);Object.assign(r,data)}else trip[group].push({...data,id:uid(),...(group==='packs'?{done:false}:{})});return true});if(group==='stops')fillChoices()}
function presetDialog(){modal('Cost presets',field('preset','Choose a planning allowance','select',costTemplates()[0][0],costTemplates().map(p=>p[0]))+'<p class="notice">Review the unit price and billing unit before adding the estimate.</p>',data=>{let p=costTemplates().find(x=>x[0]===data.preset);edit('costs',null,{...cost(p),currency:(costTemplates()===presets?'JPY':'USD'),fx:((costTemplates()===presets?'JPY':'USD')===trip.currency?1:'')});return false},'Review estimate')}
$('#form').onsubmit=e=>{e.preventDefault();if(onSubmit(Object.fromEntries(new FormData(e.target)))===false)return;$('#modal').close();if(save())flash('Changes saved');render()};
$('#close').onclick=$('#cancel').onclick=()=>$('#modal').close();
$('#edit').onclick=()=>edit('trip');$('#menu').innerHTML=icon('map');
function download(){sendFile('Roamfolio-trip.json',JSON.stringify(trip,null,2),'application/json').catch(fileError)}
function printable(){let container=document.createElement('div');container.id='printout';const old=view;container.innerHTML='<h1>'+esc(trip.name)+'</h1><p>'+date(1)+' – '+date(days())+' · '+trip.people+' travelers</p>'+destinations()+itinerary()+budget()+[4,5,6].map(i=>{view=i;return other()}).join('');view=old;document.body.append(container);window.print();container.remove()}
document.addEventListener('click',e=>{let button=e.target.closest('[data-action]');if(!button)return;let [action,group,id]=button.dataset.action.split(':');if(action==='nav')nav(+group);if(action==='city'){nav(2);selected=group;render()}if(action==='edit'||action==='add')edit(group,id);if(action==='del'){let r=trip[group].find(x=>x.id===id);modal('Remove '+titles[group]+'?', '<p>Remove '+esc(r.name)+' from this trip?</p>',()=>{trip[group]=trip[group].filter(x=>x.id!==id)},'Remove')}if(action==='presets')presetDialog();if(action==='backup')download();if(action==='restore')$('#restore').click();if(action==='print'){if(nativeTools())nativeTools().printTrip({text:shareText()}).catch(fileError);else printable()}});
document.addEventListener('change',e=>{if(e.target.dataset.pack){trip.packs.find(x=>x.id===e.target.dataset.pack).done=e.target.checked;save();render()}});
function validBackup(t){let num=(n,min=0)=>Number.isFinite(n)&&n>=min&&Number.isInteger(n);let str=v=>typeof v==='string';if(!t||(t.currency&&!currencyCodes.includes(t.currency))||!str(t.name)||!/^\d{4}-\d{2}-\d{2}$/.test(t.start)||!Number.isFinite(Date.parse(t.start))||!num(t.people,1)||!num(t.buffer)||!num(t.cap))return false;let fields={acts:['city','time','category','notes'],stops:[],costs:['category','basis'],packs:[],bookings:['type','date','reference','address','deadline','notes'],notes:['type','url','notes']};for(let [g,attrs] of Object.entries(fields)){if(!Array.isArray(t[g])||!t[g].every(r=>r&&str(r.name)&&/^[a-f0-9-]{36}$/i.test(r.id)&&attrs.every(k=>str(r[k]))))return false}return t.stops.every(r=>num(r.nights)&&(!r.photo||/^https:\/\//i.test(r.photo)))&&t.acts.every(r=>num(r.day,1))&&t.costs.every(c=>bases.includes(c.basis)&&cats.includes(c.category)&&Number.isFinite(c.rate)&&c.rate>=0&&num(c.qty,1)&&(c.actual===''||Number.isFinite(Number(c.actual))&&Number(c.actual)>=0))}
$('#restore').onchange=async e=>{try{let obj=JSON.parse(await e.target.files[0].text());if(!validBackup(obj))throw Error();modal('Restore trip backup?','<p>Replace this browser’s trip with '+esc(obj.name)+'?</p>',()=>{trip=obj;trip.currency=trip.currency||'JPY';selected=''},'Restore trip')}catch{flash('Choose a valid Roamfolio JSON backup.')}e.target.value=''};
render();save();







