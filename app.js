
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const K='zenf_demo_v4';

const defaultTypes = [
  {type:'Standard Individual',price:140,qty:2},
  {type:'Standard Duplo',price:320,qty:2},
  {type:'Luxo Individual',price:220,qty:1},
  {type:'Luxo Duplo',price:320,qty:1},
  {type:'Standard Triplo',price:420,qty:1}
];

function buildRooms(types){
  let next=101, rooms=[];
  types.forEach(t=>{
    for(let i=0;i<t.qty;i++){
      while(rooms.some(r=>r.id===next)) next++;
      rooms.push({id:next++,type:t.type,price:Number(t.price)||0,status:'Disponível'});
    }
    next += 10;
  });
  return rooms;
}

const seed={
  guests:[
    {id:1,name:'Carlos Mendes',phone:'(47) 99911-2233',doc:'***.***.***-**',note:'Prefere quarto silencioso'},
    {id:2,name:'Mariana Souza',phone:'(41) 99822-1040',doc:'',note:''}
  ],
  roomTypes:structuredClone(defaultTypes),
  rooms:buildRooms(defaultTypes),
  reservations:[]
};

let db=JSON.parse(localStorage.getItem(K)||'null')||structuredClone(seed);
if(!db.roomTypes){
  db.roomTypes=[...new Map((db.rooms||[]).map(r=>[r.type,{type:r.type,price:r.price,qty:(db.rooms||[]).filter(x=>x.type===r.type).length}])).values()];
}
const save=()=>localStorage.setItem(K,JSON.stringify(db));
const fmt=d=>d?new Date(d+'T12:00:00').toLocaleDateString('pt-BR'):'—';
const money=v=>(Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const nights=(a,b)=>{if(!a||!b)return 1;const A=new Date(a+'T12:00:00'),B=new Date(b+'T12:00:00');return Math.max(1,Math.round((B-A)/86400000))};
function guest(id){return db.guests.find(x=>x.id==id)}
function room(id){return db.rooms.find(x=>x.id==id)}
function toast(t){const x=$('#toast');x.textContent=t;x.classList.add('show');setTimeout(()=>x.classList.remove('show'),1800)}

function setView(id){
  $$('.view').forEach(v=>v.classList.toggle('active',v.id===id));
  $$('aside nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  $('#title').textContent={dashboard:'Visão geral',reservas:'Reservas',hospedes:'Hóspedes',quartos:'Quartos',estacionamento:'Estacionamento',financeiro:'Financeiro'}[id];
  $('#newBtn').style.display=id==='reservas'||id==='dashboard'?'block':'none';
  $('#sidebar').classList.remove('open');$('#scrim').classList.remove('show');
  render();
}
$$('aside nav button').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$$('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
$('#sideBtn').onclick=()=>{$('#sidebar').classList.add('open');$('#scrim').classList.add('show')};
$('#scrim').onclick=()=>{$('#sidebar').classList.remove('open');$('#scrim').classList.remove('show')};

function openModal(id){$('#'+id).classList.add('show');$('#'+id).setAttribute('aria-hidden','false')}
function closeModal(id){$('#'+id).classList.remove('show');$('#'+id).setAttribute('aria-hidden','true')}
$$('[data-close]').forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));

let returnToReservation=false;

function availableRooms(){
  return db.rooms.filter(r=>r.status==='Disponível');
}

function populate(){
  const gsel=$('#reservationGuest');
  gsel.innerHTML='<option value="">Selecione o hóspede</option>'+db.guests.map(g=>`<option value="${g.id}">${g.name} • ${g.phone}</option>`).join('');
  const rsel=$('#reservationRoom');
  const avail=availableRooms();
  rsel.innerHTML='<option value="">Selecione o quarto</option>'+avail.map(r=>`<option value="${r.id}">Quarto ${r.id} • ${r.type} • ${money(r.price)}/dia</option>`).join('');
  $('#vehicleReservation').innerHTML='<option value="">Selecione a reserva</option>'+db.reservations.filter(r=>!['Finalizada','Cancelada'].includes(r.status)).map(r=>`<option value="${r.id}">Quarto ${r.roomId} • ${guest(r.guestId)?.name||'Hóspede'}</option>`).join('');
}

function calculateReservationValue(){
  const r=room(Number($('#reservationRoom').value));
  if(!r){$('#roomRateHelp').textContent='Selecione um quarto disponível.';return}
  const n=nights($('#checkIn').value,$('#checkOut').value);
  $('#reservationValue').value=(r.price*n).toFixed(2);
  $('#roomRateHelp').textContent=`Diária ${money(r.price)} • ${n} ${n===1?'noite':'noites'} • total ${money(r.price*n)}`;
}
['reservationRoom','checkIn','checkOut'].forEach(id=>$('#'+id).addEventListener('change',calculateReservationValue));

function renderRoomConfig(){
  $('#roomConfigRows').innerHTML=db.roomTypes.map((t,i)=>`
    <div class="room-config-row">
      <div><strong>${t.type}</strong><div class="meta">Categoria do hotel</div></div>
      <label>Quantidade<input data-roomqty="${i}" type="number" min="0" max="99" value="${t.qty}"></label>
      <label>Diária (R$)<input data-roomprice="${i}" type="number" min="0" step="0.01" value="${t.price}"></label>
    </div>`).join('');
}

function rebuildRoomsFromTypes(){
  const oldRooms=[...db.rooms];
  const oldByType={};
  oldRooms.forEach(r=>(oldByType[r.type]??=[]).push(r));
  const usedIds=new Set();
  let maxId=Math.max(100,...oldRooms.map(r=>Number(r.id)||0));
  const newRooms=[];

  db.roomTypes.forEach(t=>{
    const existing=(oldByType[t.type]||[]).sort((a,b)=>a.id-b.id);
    for(let i=0;i<t.qty;i++){
      let rr=existing[i];
      if(rr){
        rr={...rr,price:Number(t.price)||0};
      }else{
        do{maxId++}while(usedIds.has(maxId));
        rr={id:maxId,type:t.type,price:Number(t.price)||0,status:'Disponível'};
      }
      usedIds.add(rr.id);newRooms.push(rr);
    }
  });

  // Do not remove rooms linked to active reservations.
  db.reservations.filter(r=>!['Finalizada','Cancelada'].includes(r.status)).forEach(res=>{
    if(!newRooms.some(x=>x.id===res.roomId)){
      const old=oldRooms.find(x=>x.id===res.roomId);
      if(old)newRooms.push(old);
    }
  });
  db.rooms=newRooms.sort((a,b)=>a.id-b.id);
}

function render(){
  populate();
  const today=new Date().toISOString().slice(0,10);
  $('#todayLabel').textContent=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'});

  const occupied=db.rooms.filter(r=>r.status==='Ocupado').length;
  const active=db.reservations.filter(r=>!['Finalizada','Cancelada'].includes(r.status)).length;
  const vehicles=db.reservations.filter(r=>r.vehicle&&!['Finalizada','Cancelada'].includes(r.status)).length;
  $('#dashboardStats').innerHTML=[
    ['Quartos ocupados',`${occupied}/${db.rooms.length}`],
    ['Reservas ativas',active],
    ['Veículos',vehicles],
    ['Hóspedes cadastrados',db.guests.length]
  ].map(([a,b])=>`<div class="stat"><small>${a}</small><strong>${b}</strong></div>`).join('');

  const todayRes=db.reservations.filter(r=>r.in===today||r.out===today);
  $('#todayTimeline').innerHTML=todayRes.length?todayRes.map(r=>`
    <div class="timeline-item"><div><strong>${guest(r.guestId)?.name||'Hóspede'} • Quarto ${r.roomId}</strong><span>${r.in===today?'Check-in previsto':'Check-out previsto'}</span></div><span class="badge ${r.in===today?'ok':'warn'}">${r.in===today?'Entrada':'Saída'}</span></div>`).join('')
    :'<div class="meta">Nenhuma movimentação prevista para hoje.</div>';

  const parked=db.reservations.filter(r=>r.vehicle&&!['Finalizada','Cancelada'].includes(r.status));
  $('#parkingMini').innerHTML=parked.length?parked.slice(0,4).map(r=>`
    <div class="mini-item"><div><strong>${r.vehicle.plate} • ${r.vehicle.model}</strong><span>${guest(r.guestId)?.name} • Quarto ${r.roomId}</span></div></div>`).join('')
    :'<div class="meta">Nenhum veículo no estacionamento.</div>';

  $('#reservationsTable').innerHTML=db.reservations.map(r=>`
    <tr>
      <td><strong>${guest(r.guestId)?.name||'—'}</strong></td>
      <td>Quarto ${r.roomId}<br><span class="meta">${room(r.roomId)?.type||''}</span></td>
      <td>${fmt(r.in)}</td><td>${fmt(r.out)}</td><td>${money(r.value)}</td>
      <td>${r.vehicle?`${r.vehicle.plate}<br><span class="meta">${r.vehicle.model}</span>`:'—'}</td>
      <td><span class="badge ${r.status==='Hospedado'?'warn':'ok'}">${r.status}</span></td>
      <td>${!['Finalizada','Cancelada'].includes(r.status)?`<button class="link-btn" onclick="finishRes(${r.id})">Finalizar</button>`:''}</td>
    </tr>`).join('') || '<tr><td colspan="8" class="meta">Nenhuma reserva cadastrada.</td></tr>';

  $('#guestCards').innerHTML=db.guests.map(g=>`
    <div class="card"><h3>${g.name}</h3><div class="meta">${g.phone}<br>${g.doc||'Documento não informado'}${g.note?'<br>'+g.note:''}</div></div>`).join('');

  $('#roomTypeCards').innerHTML=db.roomTypes.map(t=>`
    <div class="room-type-card"><div class="type-count">${t.qty}</div><h3>${t.type}</h3><div class="type-price">${money(t.price)} por diária</div></div>`).join('');

  $('#roomCards').innerHTML=db.rooms.map(r=>`
    <div class="room-card"><div class="room-no">${r.id}</div><h3>${r.type}</h3><div class="meta">Diária ${money(r.price)}</div><footer><span class="badge ${r.status==='Disponível'?'ok':'warn'}">${r.status}</span></footer></div>`).join('');

  $('#parkingCards').innerHTML=parked.length?parked.map(r=>`
    <div class="parking-card"><div class="plate">${r.vehicle.plate}</div><h3>${r.vehicle.model} • ${r.vehicle.color}</h3><div class="meta">${guest(r.guestId)?.name}<br>Quarto ${r.roomId}<br>Saída prevista ${fmt(r.out)}</div></div>`).join('')
    :'<div class="meta">Nenhum veículo no estacionamento.</div>';

  const valid=db.reservations.filter(r=>r.status!=='Cancelada');
  const predicted=valid.reduce((s,r)=>s+(Number(r.value)||0),0);
  const received=valid.reduce((s,r)=>s+(Number(r.paid)||0),0);
  $('#financeStats').innerHTML=[
    ['Total previsto',money(predicted)],
    ['Recebido',money(received)],
    ['Pendente',money(predicted-received)],
    ['Reservas',valid.length]
  ].map(([a,b])=>`<div class="stat"><small>${a}</small><strong>${b}</strong></div>`).join('');

  $('#financeTable').innerHTML=valid.map(r=>`
    <tr><td>${guest(r.guestId)?.name||'—'}</td><td>Quarto ${r.roomId}</td><td>${fmt(r.in)} → ${fmt(r.out)}</td><td>${money(r.value)}</td><td>${money(r.paid)}</td><td>${money((Number(r.value)||0)-(Number(r.paid)||0))}</td></tr>`).join('')
    ||'<tr><td colspan="6" class="meta">Nenhuma movimentação financeira.</td></tr>';
}

window.finishRes=id=>{
  const r=db.reservations.find(x=>x.id===id);if(!r)return;
  r.status='Finalizada';
  const rm=room(r.roomId);if(rm)rm.status='Disponível';
  save();render();toast('Hospedagem finalizada');
};

$('#newBtn').onclick=$('#addReservation').onclick=()=>{
  populate();
  $('#reservationForm').reset();
  $('#reservationPaid').value='0';
  $('#vehicleFields').classList.remove('show');
  openModal('reservationModal');
};
$('#addGuest').onclick=()=>{returnToReservation=false;openModal('guestModal')};
$('#guestFromReservation').onclick=()=>{returnToReservation=true;closeModal('reservationModal');openModal('guestModal')};
$('#manageRooms').onclick=()=>{renderRoomConfig();openModal('roomsModal')};
$('#addVehicle').onclick=()=>openModal('vehicleModal');
$('#hasVehicle').onchange=e=>$('#vehicleFields').classList.toggle('show',e.target.checked);

$('#guestForm').onsubmit=e=>{
  e.preventDefault();
  const newGuest={id:Date.now(),name:$('#guestName').value.trim(),phone:$('#guestPhone').value.trim(),doc:$('#guestDocument').value.trim(),note:$('#guestNote').value.trim()};
  db.guests.push(newGuest);save();e.target.reset();closeModal('guestModal');render();toast('Hóspede cadastrado');
  if(returnToReservation){
    returnToReservation=false;openModal('reservationModal');populate();$('#reservationGuest').value=String(newGuest.id);
  }
};

$('#roomConfigForm').onsubmit=e=>{
  e.preventDefault();
  db.roomTypes=db.roomTypes.map((t,i)=>({
    ...t,
    qty:Math.max(0,Number(document.querySelector(`[data-roomqty="${i}"]`).value)||0),
    price:Math.max(0,Number(document.querySelector(`[data-roomprice="${i}"]`).value)||0)
  }));
  rebuildRoomsFromTypes();save();closeModal('roomsModal');render();toast('Quartos atualizados');
};

$('#reservationForm').onsubmit=e=>{
  e.preventDefault();
  const rid=Number($('#reservationRoom').value);
  const rm=room(rid);
  if(!rm){toast('Selecione um quarto disponível');return}
  const veh=$('#hasVehicle').checked?{
    model:$('#vehicleModel').value.trim(),
    color:$('#vehicleColor').value.trim(),
    plate:$('#vehiclePlate').value.trim().toUpperCase()
  }:null;
  const status=$('#reservationStatus').value;
  db.reservations.push({
    id:Date.now(),guestId:Number($('#reservationGuest').value),roomId:rid,
    in:$('#checkIn').value,out:$('#checkOut').value,
    value:Number($('#reservationValue').value)||0,
    paid:Number($('#reservationPaid').value)||0,
    status,vehicle:veh
  });
  if(status==='Hospedado')rm.status='Ocupado';
  save();e.target.reset();$('#vehicleFields').classList.remove('show');closeModal('reservationModal');render();toast('Reserva salva e lançada no financeiro');
};

$('#vehicleForm').onsubmit=e=>{
  e.preventDefault();
  const r=db.reservations.find(x=>x.id==$('#vehicleReservation').value);
  if(r)r.vehicle={model:$('#standaloneVehicleModel').value.trim(),color:$('#standaloneVehicleColor').value.trim(),plate:$('#standaloneVehiclePlate').value.trim().toUpperCase()};
  save();e.target.reset();closeModal('vehicleModal');render();toast('Veículo vinculado ao quarto');
};

render();
