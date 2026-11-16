import {defaultHours} from './hours.mjs'
import {configureHours} from './hours-form.mjs'
import {drawAvailability} from './availability.mjs'
import {localInstant} from '../engine.mjs'
import {readAvailability,saveAvailability} from './demo-availability.mjs'

const key='night-pro-interview-hours'
export function loadHours(){
  try{
    const {start,end}=JSON.parse(localStorage.getItem(key))??defaultHours
    if(Number.isInteger(start)&&Number.isInteger(end)&&start%30===0&&end%30===0&&start>=0&&end<=1440&&start<end)return {start,end}
  }catch{ /* Storage can be unavailable or hold older data. */ }
  return defaultHours
}

const form=document.querySelector('#interview-hours')
if(form){
  const status=document.querySelector('#hours-status')
  configureHours(form,loadHours())
  function save(hours){
    try{
      localStorage.setItem(key,JSON.stringify(hours))
      status.textContent='受付時間を保存しました。面談予約に戻って確認できます。'
    }catch{status.textContent='受付時間を保存できませんでした。'}
  }
  form.onsubmit=event=>{
    event.preventDefault()
    save({start:Number(form.elements.start.value),end:Number(form.elements.end.value)})
  }
  document.querySelector('#restore-hours').onclick=()=>{
    configureHours(form,defaultHours)
    save(defaultHours)
  }
}


const availability=document.querySelector('#availability')
if(availability){
  const report=text=>{document.querySelector('#availability-status').textContent=text}
  const draw=()=>{
    const state=readAvailability()
    drawAvailability(availability,{google:{configured:true,connected:state.google},
      blocks:state.blocks.filter(item=>Date.parse(item.ends_at)>Date.now())},'Asia/Tokyo',{
      demo:true,localInstant,report,
      toggleDemo:enabled=>{
        saveAvailability({...readAvailability(),google:enabled})
        draw()
        report(enabled?'各日20:15〜21:00のサンプル予定を面談カレンダーに反映しました。':'サンプル予定の反映を停止しました。')
      },
      add:input=>{
        if(Date.parse(input.ends_at)-Date.parse(input.starts_at)>31*86400000)throw new Error('受付停止期間は31日以内で指定してください。')
        const latest=readAvailability()
        saveAvailability({...latest,blocks:[...latest.blocks,{...input,id:crypto.randomUUID()}]})
        draw();report('受付停止時間を追加しました。')
      },
      remove:id=>{
        const latest=readAvailability()
        saveAvailability({...latest,blocks:latest.blocks.filter(item=>item.id!==id)})
        draw();report('受付停止時間を解除しました。')
      },
    })
  }
  draw()
}
