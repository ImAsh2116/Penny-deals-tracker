/* FINAL Penny & Deals Tracker - combined code */
const STORAGE_KEY='weekly_reminders_v1';
const WATCH_KEY='watchlist_v1';
const NEW_POSTS_KEY='new_posts_v1';

let reminders=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
let watchlist=JSON.parse(localStorage.getItem(WATCH_KEY)||"[]");
let newPosts=JSON.parse(localStorage.getItem(NEW_POSTS_KEY)||"[]");

const $=id=>document.getElementById(id);

// Sidebar toggles
document.querySelectorAll('.dropdown').forEach(dd=>{
  dd.addEventListener('click',()=>{
    const id=dd.getAttribute('data-target');
    const el=document.getElementById(id);
    el.style.display=el.style.display==='block'?'none':'block';
  });
});

// Reminders
const weekdayNames={MO:'Monday',TU:'Tuesday',WE:'Wednesday',TH:'Thursday',FR:'Friday',SA:'Saturday',SU:'Sunday'};
function saveReminders(){localStorage.setItem(STORAGE_KEY,JSON.stringify(reminders));}
function renderReminders(){
  const list=$('list'); list.innerHTML='';
  if(reminders.length===0){ const e=document.createElement('div'); e.className='small'; e.textContent='No reminders yet.'; list.appendChild(e); return; }
  reminders.forEach((r,i)=>{
    const el=document.createElement('div'); el.className='reminder';
    el.innerHTML=`<strong>${escapeHtml(r.title)}</strong>
      <span class="small">(${weekdayNames[r.weekday]} ${r.time})</span>
      <div>${escapeHtml(r.message||'')}</div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="bubble-btn" data-i="${i}" data-act="edit">Edit</button>
        <button class="bubble-btn" data-i="${i}" data-act="del">Delete</button>
      </div>`;
    list.appendChild(el);
  });
  list.querySelectorAll('button').forEach(btn=>{
    const i=+btn.getAttribute('data-i'), act=btn.getAttribute('data-act');
    btn.onclick=()=>{
      if(act==='del'){reminders.splice(i,1); saveReminders(); renderReminders();}
      if(act==='edit'){
        const r=reminders[i];
        const t=prompt('Edit title', r.title); if(t!==null) r.title=t.trim()||r.title;
        const m=prompt('Edit message', r.message||''); if(m!==null) r.message=m;
        saveReminders(); renderReminders();
      }
    };
  });
}
function addReminder(r){reminders.push(r); saveReminders(); renderReminders(); scheduleReminder(r);}
$('addBtn').addEventListener('click',()=>{
  const title=$('title').value.trim(), message=$('message').value.trim(), weekday=$('weekday').value, time=$('time').value;
  if(!title){alert('Please add a title'); return;}
  addReminder({title,message,weekday,time}); $('title').value=''; $('message').value='';
});

// Notifications
$('enableNotif').addEventListener('click',async()=>{
  if(!('Notification'in window)){alert('Notifications not supported'); return;}
  const perm=await Notification.requestPermission();
  if(perm==='granted'){reminders.forEach(scheduleReminder); alert('Notifications enabled');}
  else alert('Notifications denied or blocked.');
});
function nextOccurrence(weekday,timeHHMM){
  const map={MO:1,TU:2,WE:3,TH:4,FR:5,SA:6,SU:0};
  const [hh,mm]=timeHHMM.split(':').map(Number);
  const now=new Date(); let cand=new Date(now);
  cand.setHours(hh,mm,0,0);
  const target=map[weekday], delta=(target-cand.getDay()+7)%7;
  cand.setDate(cand.getDate()+ (delta===0 && cand<=now?7:delta));
  return cand;
}
function scheduleReminder(rem){
  if(Notification.permission!=='granted') return;
  const next=nextOccurrence(rem.weekday,rem.time);
  const ms=next.getTime()-Date.now();
  setTimeout(()=>{
    new Notification(rem.title,{body:rem.message||('Reminder: '+rem.title)});
    setTimeout(()=>scheduleReminder(rem),7*24*60*60*1000);
  }, Math.max(0,ms));
}

// ICS export
function escapeICal(s){return (s||'').replace(/\\/g,'\\\\').replace(/,/g,'\\,').replace(/;/g,'\\;').replace(/\\n/g,'\\n');}
function buildICS(list){
  function dtstamp(){return new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';}
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PennyDealsTracker//EN'];
  list.forEach((r,i)=>{
    const next=nextOccurrence(r.weekday,r.time);
    const dtUTC=new Date(next.getTime()-next.getTimezoneOffset()*60000);
    const dtStr=dtUTC.toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
    lines.push('BEGIN:VEVENT','UID:reminder-'+i+'@local','DTSTAMP:'+dtstamp(),'DTSTART:'+dtStr,'RRULE:FREQ=WEEKLY;BYDAY='+r.weekday,'SUMMARY:'+escapeICal(r.title));
    if(r.message) lines.push('DESCRIPTION:'+escapeICal(r.message));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR'); return lines.join('\r\n');
}
document.getElementById('exportIcsLink').addEventListener('click',e=>{
  e.preventDefault(); if(reminders.length===0){alert('No reminders to export'); return;}
  const ics=buildICS(reminders); const blob=new Blob([ics],{type:'text/calendar'});
  const url=URL.createObjectURL(blob); const a=document.createElement('a');
  a.href=url; a.download='penny_deals_reminders.ics'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
});

// Watchlist
function saveWatchlist(){localStorage.setItem(WATCH_KEY,JSON.stringify(watchlist));}
function renderWatchlist(){
  const c=$('watchlist'); c.innerHTML='';
  if(watchlist.length===0){const e=document.createElement('div'); e.className='small'; e.textContent='No items being tracked yet.'; c.appendChild(e); return;}
  const table=document.createElement('table');
  table.innerHTML=`<tr><th>Item</th><th>SKU</th><th>Location</th><th>Date</th><th>Price</th><th>Notes</th><th>Actions</th></tr>`;
  watchlist.forEach((it,i)=>{
    const tr=document.createElement('tr');
    tr.innerHTML=`<td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.sku)}</td>
      <td>${escapeHtml(it.location)}</td>
      <td>${escapeHtml(it.date)}</td>
      <td><input type="number" step="0.01" value="${it.price||''}" data-i="${i}" class="priceEdit"></td>
      <td>${escapeHtml(it.notes||'')}</td>
      <td><button class="bubble-btn" data-i="${i}" data-act="del">Delete</button></td>`;
    table.appendChild(tr);
  });
  c.appendChild(table);
  c.querySelectorAll('.priceEdit').forEach(inp=>{
    inp.onchange=()=>{const i=+inp.getAttribute('data-i'); watchlist[i].price=parseFloat(inp.value)||null; saveWatchlist();};
  });
  c.querySelectorAll('[data-act="del"]').forEach(btn=>{
    btn.onclick=()=>{const i=+btn.getAttribute('data-i'); if(confirm('Delete this item?')){watchlist.splice(i,1); saveWatchlist(); renderWatchlist();}};
  });
}
$('watchForm').addEventListener('submit',e=>{
  e.preventDefault();
  const item={name:$('wName').value.trim(), sku:$('wSku').value.trim(), location:$('wLocation').value.trim(),
    date:$('wDate').value, price:parseFloat($('wPrice').value)||null, notes:$('wNotes').value.trim()};
  if(!item.name||!item.sku||!item.date){alert('Please fill Item, SKU and Date'); return;}
  watchlist.push(item); saveWatchlist(); renderWatchlist(); e.target.reset();
});

// New Penny Posts (manual log)
function saveNewPosts(){localStorage.setItem(NEW_POSTS_KEY,JSON.stringify(newPosts));}
const newPostsDiv=$('newPosts');
function addNewPost(title,url){
  newPosts.unshift({title,url,date:new Date().toISOString()}); saveNewPosts(); renderNewPosts();
  if('Notification'in window && Notification.permission==='granted'){ new Notification('New Penny List',{body:title}); }
}
function renderNewPosts(){
  if(!newPostsDiv) return; newPostsDiv.innerHTML='';
  const form=document.createElement('div'); form.className='new-post';
  form.innerHTML=`<div class="grid3">
    <input id="npTitle" placeholder="Post title (e.g., Sept 30 Penny List)">
    <input id="npUrl" placeholder="URL (paste the post link)">
    <button class="bubble-btn" id="npAdd">Mark as New</button>
  </div>`;
  newPostsDiv.appendChild(form);
  document.getElementById('npAdd').onclick=()=>{
    const t=document.getElementById('npTitle').value.trim();
    const u=document.getElementById('npUrl').value.trim();
    if(!t||!u){alert('Add title and URL'); return;}
    addNewPost(t,u); document.getElementById('npTitle').value=''; document.getElementById('npUrl').value='';
  };
  if(newPosts.length===0){ const e=document.createElement('div'); e.className='small'; e.textContent='No new posts logged yet.'; newPostsDiv.appendChild(e); return; }
  newPosts.forEach(p=>{
    const el=document.createElement('div'); el.className='new-post';
    el.innerHTML=`<a href="${p.url}" target="_blank" rel="noopener">${escapeHtml(p.title)}</a>
                  <span class="small" style="margin-left:8px">${new Date(p.date).toLocaleString()}</span>`;
    newPostsDiv.appendChild(el);
  });
}

// Helpers
function escapeHtml(s){return (s||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}

// Defaults
if(reminders.length===0){
  addReminder({title:"Dollar General Penny List",message:"Check penny list links for this week's items!",weekday:"TU",time:"09:00"});
  addReminder({title:"Home Depot Clearance",message:"Check Home Depot deals and your watchlist!",weekday:"TU",time:"09:05"});
}

// Initial render
renderReminders(); renderWatchlist(); renderNewPosts();
if('Notification'in window && Notification.permission==='granted'){reminders.forEach(scheduleReminder);}

// Service worker
if('serviceWorker'in navigator){
  navigator.serviceWorker.register('./service-worker.js').then(()=>console.log('SW registered')).catch(err=>console.log('SW failed',err));
}