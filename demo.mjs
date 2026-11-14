// Synthetic fixtures. All writes are in memory and reset when the page reloads.
const timestamp = new Date().toISOString()
const expire = () => new Date(Date.now()+7200000).toISOString()
const fixedChecks = {
  ownership_verified:true,provider_verified:true,redelivery_enabled:true,auto_reply_checked:true,
  login_published:true,non_developer:true,token_verified:true,webhook_verified:true,
  liff_verified:true,receive_verified:true,send_accepted:false,delivery_confirmed:false,
}
const tenant = { id:'demo',slug:'demo',legal_name:'ミッドナイト企画（サンプル）',stopped:false,revision:1 }
const actor = { id:'admin',role:'admin',email:'admin@example.test' }
const store = {
  id:'ginza',name:'銀座店（サンプル）',address:'東京都中央区',business_type:'接客飲食',
  responsible:'サンプル担当者',timezone:'Asia/Tokyo',cutoff:'06:00',eligible_at:timestamp,stopped:false,revision:1,
}
const stores = [store,{...store,id:'yokohama',name:'横浜店（サンプル）',address:'神奈川県横浜市',eligible_at:null}]
const staff = [actor,{id:'manager',email:'manager@example.test',role:'manager'}].map(member=>({...member,activated:true}))
const channels = new Map([
  ['ginza',[
    newChannel('customer','銀座店｜顧客用','customer',fixedChecks),
    newChannel('recruitment','銀座店｜採用用','recruitment',{}),
  ]],
  ['yokohama',[]],
])
const testers = new Map([['customer',[{id:'test-visitor',purpose:'customer',verified_at:timestamp,received:true,expires_at:expire()}]]])
const history = new Map()
const response = value => structuredClone(value)

function newChannel(id,label,purpose,checks,owner_name=tenant.legal_name,account_type='unverified') {
  return {
    id,label,purpose,owner_name,account_type,checks:{...checks},status:'pending',stopped:false,revision:1,
    webhook_url:'https://example.test/api/v1/webhooks/line/'+id,liff_url:'https://example.test/liff/'+id,
  }
}

function log(scope,operation,reason) {
  const entry = { operation,reason,actor:actor.email,occurred_at:new Date().toISOString() }
  history.set(scope,[entry,...(history.get(scope)??[])])
}

function stop(entity,data,scope) {
  Object.assign(entity,{stopped:data.stopped,revision:entity.revision+1})
  log(scope,data.stopped?'配信停止':'配信再開',data.reason)
  return {stopped:data.stopped,revision:entity.revision,cancelled:0,in_flight:0}
}

function markConnected(c) {
  const names = Object.keys(fixedChecks)
  c.status = names.every(name=>c.checks[name]) ? 'connected' : 'pending'
}

export async function demoRequest(path,method,data) {
  const [base,storeId,section,channelId,action,testerId,tail] = path.split('/').slice(1)
  if (base==='session') return response({tenant,actor,stores})
  if (base==='tenant') return path.endsWith('/audit') ? response(history.get('tenant')??[]) : stop(tenant,data,'tenant')
  if (base==='staff') {
    if (method==='GET') return response(staff)
    if (storeId==='invites') {
      staff.push({id:crypto.randomUUID(),...data,activated:false})
      return { invite_code:'SAMPLE-INVITATION',setup_key:'SAMPLE-KEY',expires_at:expire() }
    }
    const member = staff.find(item=>item.id===storeId)
    if (member) member.disabled_at = timestamp
    return {}
  }
  if (!storeId && method==='POST') {
    const id = crypto.randomUUID()
    stores.push({...data,id,stopped:false,revision:1})
    channels.set(id,[])
    log(id,'店舗登録')
    return {id}
  }
  const location = stores.find(item=>item.id===storeId)
  if (!location) throw new Error('店舗が見つかりません。')
  if (section==='stop') return stop(location,data,storeId)
  if (section==='audit') return response(history.get(storeId)??[])
  if (section==='eligibility') {
    Object.assign(location,{eligible_at:data.verified?timestamp:null,revision:location.revision+1})
    log(storeId,'利用適格性の確認',data.reference)
    return {}
  }
  if (!section) {
    Object.assign(location,data,{revision:location.revision+1})
    log(storeId,'店舗設定を変更')
    return {}
  }
  const accounts = channels.get(storeId)
  if (!channelId) {
    if (method==='GET') return response(accounts)
    const id = crypto.randomUUID()
    accounts.push(newChannel(id,data.label,data.purpose,{},data.owner_name,data.account_type))
    log(storeId,'公式アカウントを登録')
    return {id}
  }
  const c = accounts.find(item=>item.id===channelId)
  if (!c) throw new Error('公式アカウントが見つかりません。')
  if (action==='stop') return stop(c,data,storeId)
  if (action==='console') {
    if (data.delivery_confirmed && !c.checks.send_accepted) throw new Error('先にデモのテスト送信を行ってください。')
    for (const name of Object.keys(fixedChecks)) if (name in data) c.checks[name]=data[name]
    c.revision++
    markConnected(c)
    log(storeId,'公式管理画面の確認を保存',data.reason)
    return response(c)
  }
  if (action==='check-token' || action==='check-webhook') {
    c.checks[action==='check-token'?'token_verified':'webhook_verified'] = true
    c.revision++
    markConnected(c)
    return response(c)
  }
  if (action==='tests') {
    const samples = testers.get(channelId)??[]
    if (method==='GET') return response(samples)
    if (tail==='send') {
      if (c.stopped || location.stopped || tenant.stopped) throw new Error('配信が停止中です。')
      const sample = samples.find(item=>item.id===testerId)
      if (!sample || !c.checks.token_verified || !c.checks.webhook_verified) throw new Error('トークンとWebhookを確認してください。')
      sample.send_status='accepted'
      c.checks.send_accepted=true
      markConnected(c)
      log(storeId,'テスト送信の模擬受付')
      return {status:'accepted'}
    }
    const sample={id:crypto.randomUUID(),purpose:data.purpose,expires_at:expire(),received:true,verified_at:timestamp}
    testers.set(channelId,[sample,...samples])
    Object.assign(c.checks,{liff_verified:true,receive_verified:true})
    return {liff_url:'https://example.test/liff/demo',code:'SAMPLE-LINE-CODE',expires_at:sample.expires_at}
  }
  throw new Error('該当するデモ操作が見つかりません。')
}
