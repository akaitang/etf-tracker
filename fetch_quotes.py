#!/usr/bin/env python3
"""Fetch verified same-date TWSE monthly daily close data. Fail closed."""
import datetime as dt
import json
import os
import pathlib
import time
import urllib.parse
import urllib.request
from zoneinfo import ZoneInfo

ROOT = pathlib.Path(__file__).parent
CONFIG = ROOT / 'symbols.json'
OUT = ROOT / 'data' / 'quotes.json'
TZ = ZoneInfo('Asia/Taipei')

def get_quote(symbol, day):
    params = urllib.parse.urlencode({'response':'json','date':day.strftime('%Y%m%d'),'stockNo':symbol})
    url = 'https://www.twse.com.tw/rwd/zh/afterTrading/STOCK_DAY?' + params
    req = urllib.request.Request(url, headers={'User-Agent':'Mozilla/5.0 ETF-Tracker/1.0','Accept':'application/json'})
    with urllib.request.urlopen(req, timeout=25) as response:
        obj = json.load(response)
    if obj.get('stat') != 'OK' or not isinstance(obj.get('data'),list):
        raise ValueError('TWSE returned no valid data: '+str(obj.get('stat')))
    roc = f'{day.year-1911}/{day.month:02d}/{day.day:02d}'
    matches = [r for r in obj['data'] if str(r[0]).strip() == roc]
    if len(matches)!=1:
        raise ValueError('TWSE does not contain exact date '+roc)
    price = float(str(matches[0][6]).replace(',',''))
    if not 0 < price < 1000000:
        raise ValueError('Invalid close')
    return price, url

def main():
    now = dt.datetime.now(TZ)
    day = dt.date.fromisoformat(os.environ.get('TARGET_DATE', now.date().isoformat()))
    symbols = json.loads(CONFIG.read_text(encoding='utf-8'))['symbols']
    if day > now.date():
        raise ValueError('Future trading day not allowed')
    quotes = {}
    errors = {}
    for symbol in symbols:
        try:
            price, url = get_quote(symbol,day)
            quotes[symbol] = {'price':price,'date':day.isoformat(),'source':'TWSE STOCK_DAY','url':url}
        except Exception as exc:
            errors[symbol] = str(exc)
        time.sleep(1.5)
    # Never publish a partial day's dataset as fully verified.
    state = 'verified' if len(quotes)==len(symbols) else 'unverified'
    payload = {'date':day.isoformat(),'status':state,'updated_at':now.isoformat(),'symbols':symbols,
               'quotes':quotes if state=='verified' else {},'errors':errors,
               'note':'僅所有代號皆有指定日期 TWSE 官方資料才視為完整確認。'}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('status:',state,'date:',day,'quotes:',len(quotes),'errors:',errors)

if __name__ == '__main__': main()
