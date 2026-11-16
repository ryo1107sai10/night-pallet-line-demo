const key='night-pro-interview-availability-v1'
export function readAvailability(){
  try{
    const data=JSON.parse(localStorage.getItem(key)??'null')
    if(data&&Array.isArray(data.blocks)&&typeof data.google==='boolean')return data
  }catch{ /* Start from the demo defaults when storage is unavailable. */ }
  return {google:true,blocks:[]}
}
export function saveAvailability(state){localStorage.setItem(key,JSON.stringify(state))}
export function demoIsBusy(slot,state){
  const start=Date.parse(slot.starts_at),end=Date.parse(slot.ends_at)
  const scheduled=state.google&&start<Date.parse(slot.date+'T21:00:00+09:00')&&end>Date.parse(slot.date+'T20:15:00+09:00')
  return scheduled||state.blocks.some(interval=>start<Date.parse(interval.ends_at)&&end>Date.parse(interval.starts_at))
}
