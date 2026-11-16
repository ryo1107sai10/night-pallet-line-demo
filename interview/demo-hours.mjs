import {defaultHours} from './hours.mjs'
import {configureHours} from './hours-form.mjs'

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
