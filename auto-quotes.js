/* Import official quotes written by GitHub Actions, without overwriting manual or newer quotes. */
(async()=>{try{
 const res=await fetch('./data/quotes.json?ts='+Date.now(),{cache:'no-store'});
 if(!res.ok)throw Error('HTTP '+res.status);
 const data=await res.json();
 if(data.status!=='verified'||!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!data.quotes)return;
 const requested=$('day').value;
 // Always show the most recently verified cloud date, rather than today's unverified date.
 if(data.date>requested)return;
 $('day').value=data.date;
 const storageKey='etf-quotes-'+data.date;
 const previous=JSON.parse(localStorage.getItem(storageKey)||'{}');
 const next={...previous};
 for(const [symbol,entry] of Object.entries(data.quotes)){
  if(entry?.date===data.date&&Number(entry.price)>0)next[symbol]={price:Number(entry.price),source:'TWSE 官方 '+data.date+'（GitHub 雲端）'};
 }
 localStorage.setItem(storageKey,JSON.stringify(next));loadQuotes();
 $('status').textContent='已載入 GitHub Actions '+data.date+' 官方收盤價。若有新標的尚未加入 symbols.json，需先更新清單。';
}catch(e){console.info('雲端行情尚未就緒：',e.message)}})();
