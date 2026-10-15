# 台股 ETF 換股追蹤器 — HTML + GitHub Pages + GitHub Actions

完全開源的靜態網頁。前端不需要 Python；雲端定時抓取 TWSE 官方行情的 GitHub Actions 使用 Python 標準函式庫。MIT 授權。

## 5 分鐘部署

1. 登入 GitHub，新建 **Public** repository，例如 `etf-tracker`。不要上傳任何帳號、身分證字號、券商對帳單等私密資料。
2. 把本資料夾所有檔案（**包括 `.github/workflows/update.yml`**）上傳到 repository 根目錄。可以先解壓縮後用 GitHub 網頁 Upload files 上傳；隱藏的 `.github` 資料夾需確實保留。
3. 到 Settings → Pages → Build and deployment → Deploy from a branch，選 `main` 與 `/(root)`，儲存。網址通常是 `https://你的帳號.github.io/etf-tracker/`。
4. 到 Actions → 每日 TWSE 收盤價更新 → Run workflow，手動執行一次；等完成後重新整理網頁。
5. 每個台灣交易日 16:30（UTC 08:30），GitHub Actions 嘗試自動抓取 TWSE。GitHub 排程可能延遲或偶爾漏跑，並非保證精準執行。TWSE 當日官方資料若尚未可用，程式標示未確認，不會填入猜測數字。可以在 Actions 手動重跑。

## 行情與日期安全

- 使用 TWSE `https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY`，每個代號查當月資料，**逐一核對指定日期（民國年）**與官方收盤價欄位。
- 只要有一檔查不到，`data/quotes.json` 的 `status` 就是 `unverified`，不會發布部分價格冒充完整正式績效。
- 週末、休市或官方尚未發布當日資料時，網頁會保留最後已確認的本機資料；報價日期永遠顯示，不會冒充今日。
- GitHub Pages 是公開網址。交易紀錄只儲存在**使用者目前瀏覽器的 localStorage**，不會上傳到 GitHub。不同裝置需匯出／匯入 JSON 同步。預載的範例成交價與股數是公開的程式碼，請自行決定是否使用公開 repository。
- 要新增標的：修改 `symbols.json`，加入代號並提交；在網頁新增相同代號的交易紀錄，等待下一次 Actions 更新。上市標的以 TWSE 為主；上櫃標的需要另外支援 TPEx。
- 單純在網頁新增代號而未修改 `symbols.json`，雲端無法自動查詢該標的。

## 已知限制

- 不保證官方行情 16:30 已完整發布；失敗請稍後重跑。
- GitHub Actions schedule 有延遲、可能停用（長期無活動的公開 repo）等限制。
- 不做除權息／拆分調整，不計手續費、交易稅、配息；正 2 ETF 每日再平衡。
- 此版本只保留雲端最新一次執行結果，不自動儲存每日歷史曲線。若要完整歷史圖，可再增加每日 append 的 history.json。
- `index.html` 的「直接查詢 TWSE」按鈕仍可能被瀏覽器 CORS 阻擋；建議使用「載入雲端已驗證收盤價」。

## 授權

MIT License
