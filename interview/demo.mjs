import {dateKey,mountInterview} from './calendar.mjs'
import {clockLabel, fitsHours, timeOptions} from './hours.mjs'
import {loadHours} from './demo-hours.mjs'

const key='night-pro-interview-demo-v1'
const timezone='Asia/Tokyo'
const today=dateKey(Date.now(),timezone)
const startDay=Date.parse(today+'T00:00:00Z')
const dayMs=86400000
function demoSlots(){
  const slots=[]
  const times=timeOptions(0,1440).map(clockLabel)
  for(let day=0;day<=96;day++){
    const date=new Date(startDay+day*dayMs).toISOString().slice(0,10)
    for(const [row,time] of times.entries()){
      if((day*2+row)%7===0)continue
      const begin=Date.parse(date+'T'+time+':00+09:00')
      const method=(day+row)%3===0?'online':'onsite'
      slots.push({date,id:date+'/'+time,starts_at:new Date(begin).toISOString(),
        ends_at:new Date(begin+30*60000).toISOString(),method,available:begin>Date.now()&&(day+row*2)%5!==0})
    }
  }
  return slots
}
function bookings(){
  try{return JSON.parse(localStorage.getItem(key)??'[]')}catch{return []}
}
const save=data=>localStorage.setItem(key,JSON.stringify(data))
const conflict=message=>Object.assign(new Error(message),{status:409})
const slots=demoSlots()
function available(id,list){
  const slot=slots.find(slot=>slot.id===id&&slot.available&&Date.parse(slot.starts_at)>Date.now()
    &&fitsHours(slot.starts_at,slot.ends_at,timezone,loadHours()))
  if(!slot||list.some(item=>item.status==='confirmed'&&item.slot_id===id))throw conflict('この枠は予約できなくなりました。空き枠を選び直してください。')
  return slot
}
function appointment(slot){
  return {slot_id:slot.id,method:slot.method,starts_at:slot.starts_at,ends_at:slot.ends_at,
    instructions:slot.method==='onsite'?'サンプル会場：銀座店 受付にて面談予約のお名前をお伝えください。':'サンプル面談：開始時刻までに担当者の案内をご確認ください。'}
}
const root=document.querySelector('#interview')
await mountInterview(root,{
  demo:true,
  async calendar(start=today){
    const end=new Date(Date.parse(start+'T00:00:00Z')+7*dayMs).toISOString().slice(0,10)
    const saved=bookings()
    return {store:'銀座店（サンプル）',timezone,today,hours:loadHours(),bookings:saved.slice(0,10),
      slots:slots.filter(slot=>slot.date>=start&&slot.date<end).map(slot=>({...slot,
        available:slot.available&&Date.parse(slot.starts_at)>Date.now()&&!saved.some(b=>b.slot_id===slot.id&&b.status==='confirmed')}))}
  },
  async book(input){
    const list=bookings()
    if(list.some(item=>item.status==='confirmed'&&Date.parse(item.starts_at)>Date.now()))throw conflict('確定済みの面談があります。日程変更からお手続きください。')
    const booking={...appointment(available(input.slot,list)),id:crypto.randomUUID(),applicant_name:input.name,status:'confirmed',revision:1}
    save([booking,...list].slice(0,10))
    return booking
  },
  async change(id,input){
    const list=bookings()
    const booking=list.find(item=>item.id===id&&item.revision===input.revision&&item.status==='confirmed')
    if(!booking)throw conflict('予約が更新されました。再読み込みしてください。')
    if(input.action==='cancel'){booking.status='cancelled';booking.instructions=null}
    else Object.assign(booking,appointment(available(input.slot,list)))
    booking.revision++
    save(list)
    return booking
  },
})
root.setAttribute('aria-busy','false')
