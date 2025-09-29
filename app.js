const STORAGE_KEY = 'weekly_reminders_v1';
const WATCH_KEY = 'watchlist_v1';
let reminders = JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let watchlist = JSON.parse(localStorage.getItem(WATCH_KEY)||"[]");
const $ = id => document.getElementById(id);

function saveReminders(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders)); }
function saveWatchlist(){ localStorage.setItem(WATCH_KEY, JSON.stringify(watchlist)); }

function renderReminders(){
  const list = $('list'); list.innerHTML='';
  if(reminders.length===0){ list.innerHTML='<small class="small">No reminders yet.</small>'; return; }
  reminders.forEach((r,i)=>{
    const el=document.createElement('div'); el.className='reminder';
    el.innerHTML=`<strong>${r.title}</strong> <span class="small">(${r.weekday} ${r.time})</span>
      <div>${r.message||''}</div>
      <button data-i="${i}" class="del">Delete</button>`;
    list.appendChild(el);
  });
  document.querySelectorAll('.del').forEach(b=>b.onclick=e=>{reminders.splice(+e.target.dataset.i,1); saveReminders(); renderReminders();});
}

function addReminder(r){ reminders.push(r); saveReminders(); renderReminders(); scheduleReminder(r); }

function nextOccurrence(weekday,timeHHMM){
  const map={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0};
  const [hh,mm]=timeHHMM.split(':').map(Number);
  let now=new Date(), candidate=new Date(now);
  candidate.setHours(hh,mm,0,0);
  const target=map[weekday], delta=(target-candidate.getDay()+7)%7;
  candidate.setDate(candidate.getDate()+ (delta===0 && candidate<=now?7:delta));
  return candidate;
}

function scheduleReminder(r){
  if(!('Notification' in window) || Notification.permission!=='granted') return;
  const next=nextOccurrence(r.weekday,r.time);
  const ms=next.getTime()-Date.now();
  setTimeout(()=>{
    new Notification(r.title,{body:r.message||r.title});
    setTimeout(()=>scheduleReminder(r),7*24*60*60*1000);
  },Math.max(0,ms));
}

$('addBtn').onclick=()=>{ const title=$('title').value.trim(), message=$('message').value.trim(), weekday=$('weekday').value, time=$('time').value;
  if(!title){alert('Add title'); return;}
  addReminder({title,message,weekday,time});
  $('title').value=''; $('message').value='';
};

$('requestNotif').onclick=async ()=>{
  if(!('Notification' in window)){alert('Not supported'); return;}
  const perm=await Notification.requestPermission();
  if(perm==='granted'){ reminders.forEach(scheduleReminder); alert('Notifications enabled'); }
};

function renderWatchlist(){
  const container=$('watchlist'); container.innerHTML='';
  if(watchlist.length===0){ container.innerHTML='<small class="small">No items yet.</small>'; return; }
  const table=document.createElement('table'); table.innerHTML=`<tr><th>Item</th><th>SKU</th><th>Location</th><th>Date</th><th>Price</th><th>Notes</th><th>Delete</th></tr>`;
  watchlist.forEach((it,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${it.name}</td><td>${it.sku}</td><td>${it.location}</td><td>${it.date}</td><td><input type="number" value="${it.price||''}" data-i="${i}" class="priceEdit"></td><td>${it.notes||''}</td><td><button data-i="${i}" class="delWatch">Delete</button></td>`;
    table.appendChild(tr);
  });
  container.appendChild(table);
  document.querySelectorAll('.delWatch').forEach(b=>b.onclick=e=>{watchlist.splice(+e.target.dataset.i,1); saveWatchlist(); renderWatchlist();});
  document.querySelectorAll('.priceEdit').forEach(inp=>inp.onchange=e=>{watchlist[+inp.dataset.i].price=parseFloat(inp.value)||null; saveWatchlist();});
}

$('watchForm').onsubmit=e=>{e.preventDefault(); watchlist.push({
  name:$('wName').value.trim(),
  sku:$('wSku').value.trim(),
  location:$('wLocation').value.trim(),
  date:$('wDate').value,
  price:parseFloat($('wPrice').value)||null,
  notes:$('wNotes').value.trim()
}); saveWatchlist(); renderWatchlist(); e.target.reset();};

if(reminders.length===0){
  addReminder({title:"Dollar General Penny List",message:"Check penny list!",weekday:"TU",time:"09:00"});
  addReminder({title:"Home Depot Deals",message:"Check Home Depot!",weekday:"TU",time:"09:05"});
}

renderReminders();
renderWatchlist();