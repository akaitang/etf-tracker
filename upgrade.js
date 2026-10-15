/* ETF Tracker A: non-destructive extension for the existing index.html */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const section = document.createElement('section');
  section.id = 'a-upgrade';
  section.innerHTML = `
    <h2>🧩 自訂追蹤標的・A 版</h2>
    <p class="muted">新增交易紀錄後，可在此查看目前追蹤代號。新代號需加入 GitHub 的 symbols.json，雲端才會每天抓官方收盤價。</p>
    <div class="flex"><button id="a-refresh">重新整理代號清單</button><button id="a-copy">複製 symbols.json 內容</button><button id="a-backup">立即備份交易紀錄</button></div>
    <p id="a-symbols" class="muted"></p>
    <p id="a-cloud-symbols" class="muted"></p>
    <p class="muted">只支援證交所 TWSE 上市股票／ETF。上櫃股票（TPEx）、興櫃及部分其他商品尚未支援官方自動報價。交易紀錄可選擇同步至你的私人 Supabase 帳號；官方行情仍需更新 GitHub symbols.json。</p>
    <p><a href="https://github.com/akaitang/etf-tracker/edit/main/symbols.json" target="_blank" rel="noopener">前往 GitHub 編輯 symbols.json</a></p>
    <small>備份提醒：每次新增交易後建議匯出 JSON。換裝置時請使用下方「資料備份」區的匯入功能。</small>
  `;
  const tradeSection = $('trades')?.closest('section');
  if (tradeSection) tradeSection.after(section);
  else document.querySelector('main')?.append(section);
  const getTrades = () => {
    try { return JSON.parse(localStorage.getItem('etf-trades')) || []; }
    catch { return []; }
  };
  const current = () => [...new Set(getTrades().map(t => String(t.symbol || '').trim().toUpperCase()).filter(Boolean))].sort();
  let cloud = [];
  const show = () => {
    const local = current();
    $('a-symbols').textContent = '你目前交易紀錄中的代號：' + (local.join('、') || '尚無紀錄');
    const missing = local.filter(s => !cloud.includes(s));
    $('a-cloud-symbols').textContent = cloud.length
      ? (missing.length ? '⚠️ 尚未加入雲端抓價清單：' + missing.join('、') : '✅ 目前交易代號都已列入雲端抓價清單')
      : '尚未讀取到 GitHub 的 symbols.json；請稍後重試。';
  };
  const load = async () => {
    try {
      const r = await fetch('./symbols.json?t=' + Date.now(), {cache:'no-store'});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const j = await r.json();
      if (!Array.isArray(j.symbols)) throw new Error('格式不正確');
      cloud = j.symbols.map(s => String(s).trim().toUpperCase());
    } catch(e) { $('a-cloud-symbols').textContent = '讀取清單失敗：' + e.message; }
    show();
  };
  $('a-refresh').addEventListener('click', load);
  $('a-copy').addEventListener('click', async () => {
    const all = [...new Set([...cloud, ...current()])].sort();
    const json = JSON.stringify({symbols:all},null,2);
    try { await navigator.clipboard.writeText(json); alert('已複製！請貼到 GitHub 的 symbols.json 並 Commit changes。'); }
    catch { prompt('請複製下方內容並貼到 GitHub symbols.json：',json); }
  });
  $('a-backup').addEventListener('click', () => $('export')?.click());
  // Refresh status after additions/deletions, without changing original calculation logic.
  $('add')?.addEventListener('click', () => setTimeout(show, 50));
  $('reset')?.addEventListener('click', () => setTimeout(show, 50));
  $('trades')?.addEventListener('click', () => setTimeout(show, 50));
  $('import')?.addEventListener('change', () => setTimeout(show, 500));
  load();
})();
