/* Supabase manual sync, v1: uses per-trade stable UUIDs and safe upsert */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const URL='https://glwmksedvcpohruovqki.supabase.co';
const KEY='sb_publishable_0q-yaPwJO_XSU5CBTDkayA_v9xWOKAY';
let session=null;
const msg=t=>{$('cloudStatus').textContent=t;};
const errorMessage=e=>e?.message||String(e);
async function api(path,method='GET',body,token,extra={}){
 const headers={'apikey':KEY,'Content-Type':'application/json',...extra};
 if(token)headers.Authorization='Bearer '+token;
 const r=await fetch(URL+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const text=await r.text();let data;
 try{data=text?JSON.parse(text):null;}catch{data={message:text};}
 if(!r.ok)throw Error(data?.message||data?.msg||data?.error_description||data?.error||('HTTP '+r.status));
 return data;
}
async function token(){
 if(!session)throw Error('請先登入');
 if(Date.now()>=session.expiry-60000){
  const s=await api('/auth/v1/token?grant_type=refresh_token','POST',{refresh_token:session.refresh_token});
  session={...s,expiry:Date.now()+s.expires_in*1000};
  sessionStorage.setItem('etf-cloud-session',JSON.stringify(session));
 }
 return session.access_token;
}
async function auth(){const t=await token();const u=await api('/auth/v1/user','GET',undefined,t);return {t,uid:u.id};}
function checkRows(rows){
 if(!Array.isArray(rows)||!rows.every(t=>['old','new'].includes(t.type)&&/^[0-9A-Z]{4,8}$/.test(t.symbol)&&Number.isInteger(t.shares)&&t.shares>0&&Number.isFinite(t.price)&&t.price>0))throw Error('交易資料格式錯誤');
}
function ensureIds(){
 let changed=false;
 for(const t of trades){if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(t.cloudId||'')){t.cloudId=crypto.randomUUID();changed=true;}}
 if(changed)saveTrades();
}
async function fetchCloud(t,uid){
 const rows=await api('/rest/v1/trades?select=id,user_id,symbol,trade_type,quantity,price,traded_at,notes,created_at&user_id=eq.'+encodeURIComponent(uid)+'&order=created_at.asc','GET',undefined,t);
 if(!Array.isArray(rows))throw Error('無法讀取雲端資料');return rows;
}
function parseTime(v){if(!v)return '';const d=new Date(v);if(!Number.isFinite(d.getTime()))return '';return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')+'T'+[String(d.getHours()).padStart(2,'0'),String(d.getMinutes()).padStart(2,'0')].join(':');}
function toISO(v){if(!v)return null;const d=new Date(v);return Number.isFinite(d.getTime())?d.toISOString():null;}
$('cloudLogin').onclick=async()=>{try{
 const email=$('cloudEmail').value.trim(),password=$('cloudPassword').value;
 if(!email||!password)throw Error('請輸入 Email 與密碼');
 const s=await api('/auth/v1/token?grant_type=password','POST',{email,password});
 session={...s,expiry:Date.now()+s.expires_in*1000};sessionStorage.setItem('etf-cloud-session',JSON.stringify(session));
 $('cloudPassword').value='';msg('已登入 '+s.user.email+'。請先備份，再選擇同步方向。');
 }catch(e){msg('登入失敗：'+errorMessage(e));}};
$('cloudLogout').onclick=async()=>{const old=session;session=null;sessionStorage.removeItem('etf-cloud-session');msg('已登出，資料仍保留在本機。');if(old)try{await api('/auth/v1/logout','POST',undefined,old.access_token)}catch{}};
$('cloudPush').onclick=async()=>{try{
 const {t,uid}=await auth();checkRows(trades);ensureIds();
 const remote=await fetchCloud(t,uid);
 const localIds=new Set(trades.map(x=>x.cloudId));
 const removed=remote.filter(r=>!localIds.has(r.id));
 const detail='本機 '+trades.length+' 筆；雲端 '+remote.length+' 筆。'+(removed.length?'將刪除雲端多出的 '+removed.length+' 筆（請確保本機是最新版本）。':'')+'\n確定以本機紀錄為準同步嗎？';
 if(!confirm(detail))return;
 const rows=trades.map(x=>({id:x.cloudId,user_id:uid,symbol:x.symbol,trade_type:x.type,quantity:x.shares,price:x.price,traded_at:toISO(x.tradedAt),notes:''}));
 // Upsert first. If the network fails, no existing cloud row is deleted.
 if(rows.length)await api('/rest/v1/trades?on_conflict=id','POST',rows,t,{'Prefer':'resolution=merge-duplicates,return=minimal'});
 // Remove only after successful upsert; each delete is protected by user_id and RLS.
 for(const row of removed){await api('/rest/v1/trades?id=eq.'+encodeURIComponent(row.id)+'&user_id=eq.'+encodeURIComponent(uid),'DELETE',undefined,t);}
 msg('同步完成：雲端現有 '+rows.length+' 筆交易。另一台裝置登入後按「從雲端下載」。');
 }catch(e){msg('同步未完成：'+errorMessage(e)+'。請先不要重複操作，檢查雲端筆數。');}};
$('cloudPull').onclick=async()=>{try{
 const {t,uid}=await auth();const rows=await fetchCloud(t,uid);
 if(!rows.length&&!confirm('雲端目前是空的。確定要將本機交易紀錄清空嗎？'))return;
 if(rows.length&&!confirm('將從雲端下載 '+rows.length+' 筆，取代這台裝置目前 '+trades.length+' 筆交易。請先匯出 JSON 備份。確定嗎？'))return;
 const next=rows.map(x=>({cloudId:x.id,type:x.trade_type,symbol:x.symbol,shares:Number(x.quantity),price:Number(x.price),tradedAt:parseTime(x.traded_at)}));
 checkRows(next);trades=next;saveTrades();msg('已從雲端下載 '+rows.length+' 筆交易。');
 }catch(e){msg('下載失敗：'+errorMessage(e));}};
try{session=JSON.parse(sessionStorage.getItem('etf-cloud-session')||'null');if(session)msg('已找到登入工作階段；請選擇同步方向。')}catch{}
})();
