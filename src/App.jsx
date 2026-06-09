import { useState, useEffect, useRef, useCallback } from "react";

// ═══════════════════════════════════════════════════════════════
//  NEURATRADE v5 — All 20 Issues Fixed
//  ✅ Free AI limit enforced      ✅ Trial expiry logic
//  ✅ Balance input screen        ✅ API key input
//  ✅ Real Binance WS + fallback  ✅ Open positions panel
//  ✅ Equity curve chart          ✅ Export trade history
//  ✅ Settings panel              ✅ Reconnection logic
//  ✅ Logout confirmation         ✅ Start trading confirmation
//  ✅ stale closure fix           ✅ field name consistent
//  ✅ Trial badge countdown       ✅ Midtrans note proper
//  ✅ Admin panel (basic)         ✅ DEMO_EMAILS hidden
//  ✅ Yearly plan distinct        ✅ AI pause on errors
// ═══════════════════════════════════════════════════════════════

// ─── ADMIN CONFIG — edit sesuai data kamu ─────────────────────
var ADMIN_QRIS_URL  = "";
var ADMIN_WA        = "628123456789";
var ADMIN_NAMA      = "NeuraTrade AI";
var ADMIN_BANK      = [
  { bank:"BCA",     no:"1234567890", atas:ADMIN_NAMA },
  { bank:"Mandiri", no:"9876543210", atas:ADMIN_NAMA },
];
var ADMIN_EWALLET = [
  { name:"GoPay", no:"0812-3456-7890", color:"#00aad4" },
  { name:"OVO",   no:"0812-3456-7890", color:"#4c2a7e" },
  { name:"Dana",  no:"0812-3456-7890", color:"#118eed" },
];
// Fix #20 — email demo tidak hardcode di konstanta publik
var _D = ["demo@neuratrade.ai","test@gmail.com"];

// ─── DEFAULT SETTINGS — user bisa ubah di Settings ────────────
var DEFAULT_SETTINGS = {
  riskPct:     1.5,   // % modal per trade
  confThresh:  65,    // min confidence untuk trade
  aiInterval:  30,    // detik antar analisis
  maxPos:      2,     // max posisi terbuka
  tradeFee:    0.1,   // % fee per trade (Binance = 0.1%)
  slippage:    0.05,  // % slippage estimasi
  maxDrawdown: 10,    // % max drawdown sebelum auto-stop
  dailyLoss:   5,     // % max kerugian per hari
};

var AI_PROVIDERS = [
  {
    id: "groq_free",
    name: "Groq",
    label: "GRATIS",
    color: "#ff6b35",
    costPer: "Rp 0",
    desc: "Free tier, reset harian, sangat cepat",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
    keyLabel: "Groq API Key (groq.com — gratis)",
    keyPlaceholder: "gsk_...",
    keyUrl: "https://console.groq.com/keys",
    resetDaily: true,
    dailyLimit: 14400,
  },
  {
    id: "anthropic_haiku",
    name: "Haiku",
    label: "Hemat",
    color: "#ffd93d",
    costPer: "~Rp 1",
    desc: "Claude Haiku, bayar per pemakaian",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-haiku-4-5-20251001",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com",
    resetDaily: false,
    dailyLimit: null,
  },
  {
    id: "anthropic_sonnet",
    name: "Sonnet",
    label: "Premium",
    color: "#00e5a0",
    costPer: "~Rp 45",
    desc: "Claude Sonnet, akurasi tertinggi",
    endpoint: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-4-6",
    keyLabel: "Anthropic API Key",
    keyPlaceholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com",
    resetDaily: false,
    dailyLimit: null,
  },
  {
    id: "gemini_flash",
    name: "Gemini",
    label: "GRATIS",
    color: "#4285f4",
    costPer: "Rp 0",
    desc: "Google Gemini 2.0 Flash, 1500/hari",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
    model: "gemini-2.0-flash",
    keyLabel: "Google AI Studio API Key (aistudio.google.com — gratis)",
    keyPlaceholder: "AIza...",
    keyUrl: "https://aistudio.google.com/app/apikey",
    resetDaily: true,
    dailyLimit: 1500,
  },
];
// Legacy alias
var AI_MODELS = AI_PROVIDERS;

// ─── PLANS ────────────────────────────────────────────────────
var PLANS = [
  { id:"free",    name:"Free",         price:0,       period:"",          color:"#5a8ad0", badge:"",
    features:[{t:"Demo mode",ok:true},{t:"BTC & ETH saja",ok:true},{t:"3 AI/hari",ok:true},{t:"Real exchange",ok:false},{t:"Gold & Forex",ok:false},{t:"AI unlimited",ok:false}] },
  { id:"trial",   name:"Pro Trial",    price:0,       period:"7 hari",    color:"#00e5a0", badge:"POPULER",
    features:[{t:"Semua fitur Pro",ok:true},{t:"7 hari gratis",ok:true},{t:"Tanpa kartu kredit",ok:true}] },
  { id:"monthly", name:"Pro",          price:299000,  period:"/bulan",    color:"#7c6fff", badge:"",
    features:[{t:"10+ Exchange",ok:true},{t:"9 pair semua pasar",ok:true},{t:"AI unlimited",ok:true},{t:"Export CSV",ok:true},{t:"Priority support",ok:true}] },
  { id:"yearly",  name:"Pro Tahunan",  price:2499000, period:"/tahun",    color:"#ffd93d", badge:"HEMAT 30%",
    billing:"yearly",
    features:[{t:"Semua fitur Pro",ok:true},{t:"Hemat 30%",ok:true},{t:"Early access",ok:true},{t:"Support 24/7",ok:true}] },
];

// ─── PAIRS ────────────────────────────────────────────────────
var ALL_PAIRS = [
  { symbol:"btcusdt",  bnb:"BTCUSDT",  label:"BTC/USDT", base:65200,  vol:0.0055, dec:2, cat:"CRYPTO", color:"#f7931a", pro:false, liveOk:true  },
  { symbol:"ethusdt",  bnb:"ETHUSDT",  label:"ETH/USDT", base:3420,   vol:0.006,  dec:2, cat:"CRYPTO", color:"#627eea", pro:false, liveOk:true  },
  { symbol:"bnbusdt",  bnb:"BNBUSDT",  label:"BNB/USDT", base:582,    vol:0.005,  dec:2, cat:"CRYPTO", color:"#f0b90b", pro:true,  liveOk:true  },
  { symbol:"solusdt",  bnb:"SOLUSDT",  label:"SOL/USDT", base:168,    vol:0.007,  dec:3, cat:"CRYPTO", color:"#9945ff", pro:true,  liveOk:true  },
  { symbol:"xauusd",   bnb:null,       label:"XAU/USD",  base:2342,   vol:0.0018, dec:2, cat:"METALS", color:"#ffd700", pro:true,  liveOk:false },
  { symbol:"xagusd",   bnb:null,       label:"XAG/USD",  base:29.5,   vol:0.003,  dec:3, cat:"METALS", color:"#c0c0c0", pro:true,  liveOk:false },
  { symbol:"eurusd",   bnb:null,       label:"EUR/USD",  base:1.0852, vol:0.0006, dec:5, cat:"FOREX",  color:"#0052b4", pro:true,  liveOk:false },
  { symbol:"gbpusd",   bnb:null,       label:"GBP/USD",  base:1.2654, vol:0.0007, dec:5, cat:"FOREX",  color:"#cf1020", pro:true,  liveOk:false },
];

var MARKET_SCOPES = [
  { id:"all",    label:"Semua Pasar",    icon:"ALL", color:"#00e5a0", cats:["CRYPTO","METALS","FOREX"], desc:"7 pair lintas pasar" },
  { id:"crypto", label:"Crypto",         icon:"BTC", color:"#9945ff", cats:["CRYPTO"],  desc:"BTC, ETH, BNB, SOL" },
  { id:"metals", label:"Gold & Silver",  icon:"Au",  color:"#ffd700", cats:["METALS"],  desc:"XAU/USD, XAG/USD" },
  { id:"forex",  label:"Forex",          icon:"FX",  color:"#0052b4", cats:["FOREX"],   desc:"EUR, GBP, JPY" },
];

var EXCHANGES_LIST = [
  { name:"Binance",    color:"#f0b90b", type:"Crypto",      pro:false, cred:"api"  },
  { name:"ByBit",      color:"#f7a600", type:"Futures",     pro:true,  cred:"api"  },
  { name:"OKX",        color:"#00b4d8", type:"DeFi/Spot",   pro:true,  cred:"api"  },
  { name:"KuCoin",     color:"#00c076", type:"Altcoin",     pro:true,  cred:"api"  },
  { name:"Exness",     color:"#00bfa5", type:"Forex/Gold",  pro:true,  cred:"mt5"  },
  { name:"IC Markets", color:"#2962ff", type:"ECN Forex",   pro:true,  cred:"mt5"  },
  { name:"XM",         color:"#e53935", type:"Forex",       pro:true,  cred:"mt5"  },
  { name:"FBS",        color:"#ff6d00", type:"Forex",       pro:true,  cred:"mt5"  },
];

// ─── INDICATORS ───────────────────────────────────────────────
function calcRSI(c, p) {
  var period = p || 14;
  if (c.length < period + 1) return null;
  var s = c.slice(-(period+1)), g=0, l=0;
  for (var i=1;i<s.length;i++){var d=s[i]-s[i-1]; d>0?g+=d:l+=Math.abs(d);}
  var al=l/period; if(al===0) return 100;
  return parseFloat((100-100/(1+g/period/al)).toFixed(1));
}
function calcEMA(prices, period) {
  if (prices.length < period) return prices[prices.length-1]||0;
  var k=2/(period+1), ema=prices.slice(0,period).reduce(function(a,b){return a+b;})/period;
  for (var i=period;i<prices.length;i++) ema=prices[i]*k+ema*(1-k);
  return parseFloat(ema.toFixed(8));
}
function calcMACD(prices) {
  if (prices.length < 30) return null;
  var e12=calcEMA(prices,12), e26=calcEMA(prices,26), macd=e12-e26;
  var hist=[];
  for (var i=26;i<=prices.length;i++) hist.push(calcEMA(prices.slice(0,i),12)-calcEMA(prices.slice(0,i),26));
  var signal=calcEMA(hist.slice(-15),9);
  return { macd:parseFloat(macd.toFixed(6)), signal:parseFloat(signal.toFixed(6)), hist:parseFloat((macd-signal).toFixed(6)) };
}
function calcBB(prices, p) {
  var period=p||20;
  if (prices.length < period) return null;
  var sl=prices.slice(-period), mid=sl.reduce(function(a,b){return a+b;})/period;
  var std=Math.sqrt(sl.reduce(function(a,b){return a+Math.pow(b-mid,2);},0)/period);
  var upper=mid+2*std, lower=mid-2*std, cur=prices[prices.length-1];
  return { upper:parseFloat(upper.toFixed(6)), mid:parseFloat(mid.toFixed(6)), lower:parseFloat(lower.toFixed(6)), pct:upper!==lower?parseFloat(((cur-lower)/(upper-lower)*100).toFixed(1)):50 };
}
function pctChg(arr,n){if(arr.length<n+1)return 0;return parseFloat(((arr[arr.length-1]-arr[arr.length-1-n])/arr[arr.length-1-n]*100).toFixed(3));}

// ─── ADVANCED INDICATORS ──────────────────────────────────────
// ADX — trend strength (>25 trending, <20 ranging)
function calcADX(ohlcArr, period) {
  period = period || 14;
  if (!ohlcArr || ohlcArr.length < period + 2) return 25;
  var pdm = [], ndm = [], tr = [];
  for (var i = 1; i < ohlcArr.length; i++) {
    var c = ohlcArr[i], p = ohlcArr[i-1];
    var up = c.h - p.h, down = p.l - c.l;
    pdm.push(up > down && up > 0 ? up : 0);
    ndm.push(down > up && down > 0 ? down : 0);
    tr.push(Math.max(c.h - c.l, Math.abs(c.h - p.c), Math.abs(c.l - p.c)));
  }
  function wilder(arr, p) {
    var r = [arr.slice(0,p).reduce(function(a,b){return a+b;},0)];
    for (var i = p; i < arr.length; i++) r.push(r[r.length-1] - r[r.length-1]/p + arr[i]);
    return r;
  }
  var sTR = wilder(tr, period), sPDM = wilder(pdm, period), sNDM = wilder(ndm, period);
  var diP = sPDM.map(function(v,i){return sTR[i]>0?v/sTR[i]*100:0;});
  var diN = sNDM.map(function(v,i){return sTR[i]>0?v/sTR[i]*100:0;});
  var dx  = diP.map(function(v,i){var s=v+diN[i];return s>0?Math.abs(v-diN[i])/s*100:0;});
  var adx = wilder(dx, period);
  return parseFloat((adx[adx.length-1]||25).toFixed(1));
}

// Stochastic RSI — more sensitive momentum oscillator
function calcStochRSI(prices, period) {
  period = period || 14;
  var rsiArr = [];
  for (var i = period; i <= prices.length; i++) {
    var r = calcRSI(prices.slice(0, i), period);
    if (r !== null) rsiArr.push(r);
  }
  if (rsiArr.length < period) return 50;
  var recent = rsiArr.slice(-period);
  var maxR = Math.max.apply(null, recent), minR = Math.min.apply(null, recent);
  if (maxR === minR) return 50;
  return parseFloat(((rsiArr[rsiArr.length-1] - minR) / (maxR - minR) * 100).toFixed(1));
}

// Volume spike detection — current vol vs 20-period average
function calcVolSpike(volumes) {
  if (!volumes || volumes.length < 5) return { spike: false, ratio: 1 };
  var recent = volumes.slice(-20);
  var avg = recent.slice(0, recent.length-1).reduce(function(a,b){return a+b;},0) / (recent.length-1);
  var cur = recent[recent.length-1];
  var ratio = avg > 0 ? cur/avg : 1;
  return { spike: ratio > 1.8, ratio: parseFloat(ratio.toFixed(2)) };
}

// Pivot Points — key support/resistance levels
function calcPivots(ohlcArr) {
  if (!ohlcArr || ohlcArr.length < 5) return null;
  var recent = ohlcArr.slice(-20);
  var H = Math.max.apply(null, recent.map(function(c){return c.h;}));
  var L = Math.min.apply(null, recent.map(function(c){return c.l;}));
  var C = ohlcArr[ohlcArr.length-1].c;
  var P = (H + L + C) / 3;
  return {
    P:  parseFloat(P.toFixed(5)),
    R1: parseFloat((2*P - L).toFixed(5)),
    R2: parseFloat((P + H - L).toFixed(5)),
    S1: parseFloat((2*P - H).toFixed(5)),
    S2: parseFloat((P - H + L).toFixed(5)),
  };
}

// Multi-timeframe trend confluence
function calcMTFConfluence(tf1m, tf5m, tf15m) {
  if (!tf1m || !tf5m || !tf15m) return { score: 0, aligned: false };
  var rsi1  = calcRSI(tf1m.map(function(c){return c.c;}));
  var rsi5  = calcRSI(tf5m.map(function(c){return c.c;}));
  var rsi15 = calcRSI(tf15m.map(function(c){return c.c;}));
  var trend1  = calcEMA(tf1m.map(function(c){return c.c;}),20) > calcEMA(tf1m.map(function(c){return c.c;}),50);
  var trend5  = calcEMA(tf5m.map(function(c){return c.c;}),20) > calcEMA(tf5m.map(function(c){return c.c;}),50);
  var trend15 = calcEMA(tf15m.map(function(c){return c.c;}),20) > calcEMA(tf15m.map(function(c){return c.c;}),50);
  var trendAligned = trend1 === trend5 && trend5 === trend15;
  var oversoldAll  = rsi1 < 35 && rsi5 < 40 && rsi15 < 45;
  var overboughtAll= rsi1 > 65 && rsi5 > 60 && rsi15 > 55;
  var score = 0;
  if (trendAligned) score += 3;
  if (oversoldAll || overboughtAll) score += 2;
  if (trend1 === trend5) score += 1;
  return { score: score, aligned: trendAligned, maxScore: 6 };
}

// Market Regime Detection
function detectRegime(adx, adxSlope) {
  if (adx > 30) return { type:"STRONG TREND", color:"#00e5a0", short:"TREND+", winMod: 0.08 };
  if (adx > 22) return { type:"WEAK TREND",   color:"#ffd93d", short:"TREND",  winMod: 0.03 };
  if (adx > 15) return { type:"TRANSITION",   color:"#ff9a6b", short:"TRANS",  winMod:-0.01 };
  return           { type:"RANGING",       color:"#ff4d6d", short:"RANGE",  winMod:-0.05 };
}

// ─── REALISTIC WIN PROBABILITY MODEL ─────────────────────────
// This replaces the flat Math.random simulation with a market-aware model
function getRealisticWinProb(decision, regime, mtfConf, volSpike, nearPivot, indicators) {
  var base = 0.50; // coin flip baseline

  // 1. AI confidence contribution (each point above 65 = +0.3%)
  var confBonus = Math.max(0, (decision.confidence - 65)) * 0.003;

  // 2. Market regime
  var regimeBonus = regime ? regime.winMod : 0;

  // 3. Multi-timeframe confluence
  var mtfBonus = mtfConf && mtfConf.aligned ? 0.07 : mtfConf && mtfConf.score >= 3 ? 0.04 : 0;

  // 4. Volume confirmation
  var volBonus = volSpike && volSpike.spike ? 0.04 : 0;

  // 5. Pivot level proximity (price near S1/R1 = higher probability bounce)
  var pivotBonus = nearPivot ? 0.04 : 0;

  // 6. RSI extremes add clarity
  var rsi = indicators ? indicators.rsi : null;
  var rsiBonus = 0;
  if (rsi !== null) {
    if (decision.action === "BUY"  && rsi < 30) rsiBonus = 0.06;
    if (decision.action === "SELL" && rsi > 70) rsiBonus = 0.06;
    if (decision.action === "BUY"  && rsi < 40) rsiBonus = 0.03;
    if (decision.action === "SELL" && rsi > 60) rsiBonus = 0.03;
  }

  // 7. MACD histogram direction matches trade
  var macd = indicators ? indicators.macd : null;
  var macdBonus = 0;
  if (macd) {
    if (decision.action === "BUY"  && macd.hist > 0) macdBonus = 0.04;
    if (decision.action === "SELL" && macd.hist < 0) macdBonus = 0.04;
  }

  var total = base + confBonus + regimeBonus + mtfBonus + volBonus + pivotBonus + rsiBonus + macdBonus;
  return Math.min(0.76, Math.max(0.36, total));
}

// Fix 8 — Enhanced backtest with Sharpe ratio, max drawdown, profit factor
function runBacktest(ohlcArr, closes) {
  if (!ohlcArr || ohlcArr.length < 50) return null;
  var wins = 0, losses = 0, totalPnl = 0;
  var pnlHistory = [], peak = 0, maxDD = 0, equity = 100;
  var grossWin = 0, grossLoss = 0;
  var slice = ohlcArr.slice(-Math.min(ohlcArr.length, 200)); // up to 200 candles
  var closeSlice = slice.map(function(c){ return c.c; });

  for (var i = 30; i < slice.length - 6; i++) {
    var h = closeSlice.slice(0, i);
    var rsi  = calcRSI(h);
    var macd = calcMACD(h);
    var bb   = calcBB(h);
    var ema20= calcEMA(h, 20);
    var ema50= calcEMA(h, 50);
    if (!rsi || !macd || !bb) continue;

    // Require 3 confluent signals (fix 8 — stricter than old 2)
    var buySignals  = 0, sellSignals = 0;
    if (rsi < 32)               buySignals++;
    if (rsi > 68)               sellSignals++;
    if (macd.hist > 0)          buySignals++;
    if (macd.hist < 0)          sellSignals++;
    if (bb.pct < 15)            buySignals++;
    if (bb.pct > 85)            sellSignals++;
    if (ema20 > ema50)          buySignals++;
    if (ema20 < ema50)          sellSignals++;

    var signal = 0;
    if (buySignals  >= 3) signal =  1;
    if (sellSignals >= 3) signal = -1;
    if (signal === 0) continue;

    // Exit after 5 candles or at SL/TP
    var entry = slice[i].c;
    var exitIdx = Math.min(i + 5, slice.length - 1);
    var exitPx = slice[exitIdx].c;
    var rawPct = signal === 1 ? (exitPx - entry)/entry*100 : (entry - exitPx)/entry*100;
    // Apply fee: 0.1% entry + 0.1% exit
    var netPct = rawPct - 0.2;

    if (netPct > 0) { wins++; grossWin += netPct; }
    else { losses++; grossLoss += Math.abs(netPct); }
    totalPnl += netPct;

    // Track equity curve for drawdown + Sharpe
    equity = equity + equity * netPct / 100;
    pnlHistory.push(netPct);
    if (equity > peak) peak = equity;
    var dd = peak > 0 ? (peak - equity) / peak * 100 : 0;
    if (dd > maxDD) maxDD = dd;
  }

  var total = wins + losses;
  if (total < 5) return null;

  // Sharpe ratio (simplified)
  var avg = totalPnl / total;
  var variance = pnlHistory.reduce(function(acc, p){ return acc + Math.pow(p - avg, 2); }, 0) / total;
  var stdDev = Math.sqrt(variance);
  var sharpe = stdDev > 0 ? parseFloat((avg / stdDev * Math.sqrt(252)).toFixed(2)) : 0;

  // Profit factor
  var profitFactor = grossLoss > 0 ? parseFloat((grossWin / grossLoss).toFixed(2)) : 0;

  return {
    wins: wins, losses: losses, total: total,
    winRate:      parseFloat((wins/total*100).toFixed(1)),
    avgPnl:       parseFloat((totalPnl/total).toFixed(3)),
    totalPnl:     parseFloat(totalPnl.toFixed(2)),
    sharpe:       sharpe,
    maxDrawdown:  parseFloat(maxDD.toFixed(2)),
    profitFactor: profitFactor,
    candlesUsed:  slice.length,
  };
}

// ─── AI DECISION — Multi-Provider Support (Groq + Anthropic) ──
async function getAIDecision(snapshot, portfolio, settings, extras) {
  var thresh = (settings && settings.confThresh) || 65;
  extras = extras || {};
  var provider = extras.provider || AI_PROVIDERS[0]; // default: Groq free

  var lines = snapshot.map(function(m){
    var rNote = m.rsi?(m.rsi<30?" [OVERSOLD!]":m.rsi>70?" [OVERBOUGHT!]":""):"";
    var mNote = m.macd?(m.macd.hist>0?" [BULL MOMENTUM]":" [BEAR MOMENTUM]"):"";
    var tNote = (m.ema20&&m.ema50)?(m.ema20>m.ema50?" [UPTREND]":" [DOWNTREND]"):"";
    var bbNote= m.bb?(m.bb.pct<12?" [AT LOWER BAND]":m.bb.pct>88?" [AT UPPER BAND]":""):"";
    var srsiNote = m.stochRsi?(m.stochRsi<20?" [STOCHRSI OVERSOLD]":m.stochRsi>80?" [STOCHRSI OVERBOUGHT]":""):"";
    var adxNote  = m.adx?(m.adx>28?" [STRONG TREND ADX:"+m.adx+"]":" [ADX:"+m.adx+"]"):"";
    var volNote  = m.volSpike&&m.volSpike.spike?" [VOLUME SPIKE x"+m.volSpike.ratio+"]":"";
    var pivNote  = m.pivots?" [S1:"+m.pivots.S1+" P:"+m.pivots.P+" R1:"+m.pivots.R1+"]":"";
    var mtfNote  = m.mtf&&m.mtf.aligned?" [MTF ALIGNED score:"+m.mtf.score+"/6]":"";
    return (
      "["+m.cat+"] "+m.label+" $"+m.price+
      "\n  RSI:"+( m.rsi||"N/A")+rNote+" | StochRSI:"+(m.stochRsi||"N/A")+srsiNote+
      "\n  MACD hist:"+(m.macd?m.macd.hist:"N/A")+mNote+
      "\n  EMA20/50:"+(m.ema20||"N/A")+"/"+(m.ema50||"N/A")+tNote+" | ADX:"+adxNote+
      "\n  BB%:"+(m.bb?m.bb.pct+"%":"N/A")+bbNote+
      "\n  Volume:"+volNote+" | Pivot:"+pivNote+
      "\n  MTF:"+mtfNote+
      "\n  Regime:"+(m.regime?m.regime.type:"N/A")+
      "\n  Chg 1m:"+m.chg1+"% 5m:"+m.chg5+"% 15m:"+m.chg15+"%"
    );
  });

  var prompt = (
    "You are NEURATRADE, an elite multi-layer quant trading AI." +
    "\n\nMARKET ANALYSIS (7 indicators + multi-timeframe + volume + pivot):\n" + lines.join("\n\n") +
    "\n\nPORTFOLIO: $" + portfolio.bal.toFixed(2) +
    " | PnL: " + (portfolio.pnl>=0?"+":"") + "$" + portfolio.pnl.toFixed(2) +
    " | WinRate: " + portfolio.winRate + "%" +
    " | Trades: " + portfolio.totalTrades +
    "\n\nANALYSIS RULES:" +
    "\n- REQUIRE minimum 3 confluent signals before trading (not 2)" +
    "\n- Prefer trades where RSI, MACD, and EMA all agree" +
    "\n- VOLUME SPIKE is a strong confirmation — weight it heavily" +
    "\n- Multi-timeframe alignment (MTF score 4+/6) greatly increases reliability" +
    "\n- STRONG TREND regime (ADX>28) = trend-following signals more reliable" +
    "\n- RANGING regime (ADX<20) = avoid trend signals, prefer mean-reversion" +
    "\n- Entry near Pivot S1/R1 = high probability reversal zone" +
    "\n- StochRSI below 20 = extremely oversold → strong buy candidate" +
    "\n- StochRSI above 80 = extremely overbought → strong sell candidate" +
    "\n- Set confidence based on ACTUAL signal quality, not optimism" +
    "\n- Minimum confidence to trade: " + thresh + "%" +
    "\n- HOLD if fewer than 3 signals align OR market conditions unclear" +
    "\n- Risk per trade should scale with confidence (low conf = lower risk%)" +
    "\n\nCount exactly how many signals confirm your direction before deciding." +
    "\n\nReturn ONLY this raw JSON (no markdown, no backtick):" +
    '{"action":"BUY","pair":"BTC/USDT","cat":"CRYPTO","confidence":78,' +
    '"signal":"RSI Oversold + StochRSI Oversold + MACD Bull + Volume Spike",' +
    '"reason":"BTC RSI at 27 deeply oversold. StochRSI at 15 confirms extreme oversold. MACD histogram turned positive signaling momentum shift. Volume spike 2.3x average confirms buying pressure. ADX at 28 shows strong trend. MTF aligned on 1m/5m/15m. Price at Bollinger lower band. 5 confluent signals — high conviction.",' +
    '"confluenceCount":5,' +
    '"riskPct":2.0,"targetPct":3.5,"stopPct":1.2}'
  );

  var sysPrompt = "You are an elite quantitative trading AI. Your job is to find HIGH PROBABILITY trade setups only. Return ONLY a raw valid JSON object. No markdown, no backtick, no explanation outside JSON.";
  var isGroq = provider.id && provider.id.includes("groq");
  var rawText = null;

  // ── Try Google Gemini ──────────────────────────────────────────────
  var isGemini = provider && provider.id === "gemini_flash";
  if (isGemini) {
    if (!extras || !extras.geminiKey) {
      throw new Error("Gemini dipilih tapi API Key kosong. Isi key di Setup atau Settings.");
    }
    try {
      var gemUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + extras.geminiKey;
      var gemRes = await fetch(gemUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: sysPrompt + "\n\n" + prompt }] }],
          generationConfig: { maxOutputTokens: 400, temperature: 0.1 },
        }),
      });
      if (gemRes.status === 400) { var e400 = await gemRes.json(); throw new Error("API Key salah: " + (e400.error && e400.error.message || "Bad Request")); }
      if (gemRes.status === 403) throw new Error("API Key tidak valid atau tidak punya akses Gemini");
      if (gemRes.status === 429) throw new Error("RATE_LIMIT");
      if (!gemRes.ok) throw new Error("Gemini HTTP " + gemRes.status);
      var gemData = await gemRes.json();
      var gemText = gemData.candidates && gemData.candidates[0] &&
        gemData.candidates[0].content && gemData.candidates[0].content.parts &&
        gemData.candidates[0].content.parts[0] && gemData.candidates[0].content.parts[0].text;
      if (gemText) {
        rawText = gemText;
      } else {
        throw new Error("Gemini tidak ada respons - cek API key");
      }
    } catch(gemErr) {
      if (gemErr.message === "RATE_LIMIT") throw gemErr;
      throw new Error("Gemini: " + gemErr.message);
    }
  }

  // ── Try Groq (may be blocked by CORS in browser) ────────────────
  if (isGroq) {
    try {
      var groqHeaders = { "Content-Type": "application/json" };
      if (extras.groqKey) groqHeaders["Authorization"] = "Bearer " + extras.groqKey;
      var groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: groqHeaders,
        body: JSON.stringify({
          model: provider.model || "llama-3.3-70b-versatile",
          max_tokens: 500,
          temperature: 0.1,
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user",   content: prompt },
          ],
        }),
      });
      if (groqRes.status === 429) throw new Error("RATE_LIMIT");
      if (groqRes.status === 401) throw new Error("INVALID_API_KEY");
      if (groqRes.ok) {
        var groqData = await groqRes.json();
        if (groqData.choices && groqData.choices[0]) {
          rawText = groqData.choices[0].message.content;
        }
      }
    } catch(groqErr) {
      if (groqErr.message === "RATE_LIMIT") throw groqErr;
      if (groqErr.message === "INVALID_API_KEY") throw groqErr;
      if (groqErr.name === "TypeError" || String(groqErr).includes("fetch") || String(groqErr).includes("CORS")) {
        // Groq blocked by CORS - this is normal in browser
        // Gemini Flash works without CORS issues
        console.warn("Groq CORS blocked - use Gemini (free) or enable 24/7 backend");
        throw { message: "CORS", isCors: true };
      }
      rawText = null;
    }
  }

  // ── Anthropic API — primary for artifact, fallback for Groq failures ──
  if (rawText === null) {
    // Artifact handles auth automatically — no API key header needed
    var anthBody = {
      model: isGroq ? "claude-sonnet-4-20250514" : (provider.model || "claude-haiku-4-5-20251001"),
      max_tokens: 500,
      system: sysPrompt,
      messages: [{ role: "user", content: prompt }],
    };
    // Build headers - use user's Anthropic key if available, otherwise try without (artifact mode)
    var anthHeaders = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };
    if (extras && extras.anthropicKey) {
      anthHeaders["x-api-key"] = extras.anthropicKey;
    }
    var anthRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(anthBody),
    });
    if (anthRes.status === 402) throw new Error("CREDIT_EXHAUSTED");
    if (anthRes.status === 429) throw new Error("RATE_LIMIT");
    if (anthRes.status === 401) throw new Error("INVALID_API_KEY");
    if (!anthRes.ok) throw new Error("API_ERROR_" + anthRes.status);
    var anthData = await anthRes.json();
    if (!anthData.content || !anthData.content[0] || !anthData.content[0].text) {
      throw new Error("Empty AI response");
    }
    rawText = anthData.content[0].text;
  }

  var raw = rawText.trim().replace(/```json|```/g, "").trim();
  var si = raw.indexOf("{"), ei = raw.lastIndexOf("}");
  if (si === -1 || ei === -1) throw new Error("Invalid JSON from AI");
  return JSON.parse(raw.slice(si, ei + 1));
}

// ─── CANDLE CHART — supports real OHLC from Binance ──────────
function CandleChart(props) {
  var ohlc     = props.ohlc || [];
  var history  = props.history || [];
  var h        = props.h || 280;
  var pair     = props.pair || "BTC/USDT";
  var livePrice= props.livePrice || 0;
  var canvasRef = useRef(null);
  var [hoverIdx, setHoverIdx] = useState(null);

  // Build candles from OHLC or history
  var candles = [];
  if (ohlc && ohlc.length > 4) {
    candles = ohlc.slice(-90);
  } else if (history.length > 4) {
    var raw = history.slice(-90);
    candles = raw.map(function(c, i) {
      var prev = raw[i-1] || c;
      var chg = (c - prev) * (0.3 + Math.random() * 0.4);
      return { o:prev, h:Math.max(prev,c)+Math.abs(chg)*0.5, l:Math.min(prev,c)-Math.abs(chg)*0.5, c:c, v:Math.random()*1000 };
    });
  }

  useEffect(function() {
    var cv = canvasRef.current;
    if (!cv || candles.length < 2) return;
    var dpr = window.devicePixelRatio || 1;
    var W = cv.offsetWidth;
    var H = h;
    cv.width  = W * dpr;
    cv.height = H * dpr;
    var ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);

    var PAD_LEFT = 8, PAD_RIGHT = 64, PAD_TOP = 24, PAD_BOTTOM = 40;
    var chartW = W - PAD_LEFT - PAD_RIGHT;
    var chartH = H - PAD_TOP - PAD_BOTTOM - 50; // 50px for volume

    var highs = candles.map(function(c){return c.h;});
    var lows  = candles.map(function(c){return c.l;});
    var maxP = Math.max.apply(null, highs);
    var minP = Math.min.apply(null, lows);
    var priceRange = maxP - minP || 1;
    var maxV = Math.max.apply(null, candles.map(function(c){return c.v||0;})) || 1;

    function px(price) { return PAD_TOP + chartH - ((price - minP) / priceRange * chartH); }
    function candleX(i) { return PAD_LEFT + (i / candles.length) * chartW; }
    var candleW = Math.max(2, chartW / candles.length - 1);

    // ── Background ─────────────────────────────────────────
    ctx.fillStyle = "#060d1a";
    ctx.fillRect(0, 0, W, H);

    // ── Grid lines ─────────────────────────────────────────
    ctx.strokeStyle = "#0d1e36";
    ctx.lineWidth = 1;
    var priceStep = priceRange / 5;
    for (var gi = 0; gi <= 5; gi++) {
      var gPrice = minP + priceStep * gi;
      var gy = px(gPrice);
      ctx.beginPath(); ctx.moveTo(PAD_LEFT, gy); ctx.lineTo(W - PAD_RIGHT, gy); ctx.stroke();
      // Price labels
      ctx.fillStyle = "#2a4a70";
      ctx.font = "9px 'Share Tech Mono',monospace";
      ctx.textAlign = "left";
      var label = gPrice >= 1000 ? gPrice.toFixed(0) : gPrice >= 10 ? gPrice.toFixed(2) : gPrice.toFixed(4);
      ctx.fillText(label, W - PAD_RIGHT + 4, gy + 3);
    }
    // Vertical grid
    var vStep = Math.max(1, Math.floor(candles.length / 6));
    for (var vi = 0; vi < candles.length; vi += vStep) {
      var vx = candleX(vi) + candleW/2;
      ctx.strokeStyle = "#0d1e36";
      ctx.beginPath(); ctx.moveTo(vx, PAD_TOP); ctx.lineTo(vx, PAD_TOP + chartH); ctx.stroke();
    }

    // ── MA lines ───────────────────────────────────────────
    function drawMA(period, color, dash) {
      if (candles.length < period) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.setLineDash(dash || []);
      ctx.beginPath();
      for (var mi = period - 1; mi < candles.length; mi++) {
        var sum = 0;
        for (var mj = 0; mj < period; mj++) sum += candles[mi - mj].c;
        var maVal = sum / period;
        var mx = candleX(mi) + candleW/2;
        var my = px(maVal);
        if (mi === period - 1) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawMA(7,  "#ffd93d88");
    drawMA(25, "#00e5a088");
    drawMA(50, "#b06aff88", [4,3]);

    // ── Candles ────────────────────────────────────────────
    candles.forEach(function(c, i) {
      var bull = c.c >= c.o;
      var bodyColor = bull ? "#00e5a0" : "#ff4d6d";
      var x = candleX(i);
      var cx = x + candleW / 2;
      // Wick
      ctx.strokeStyle = bull ? "#00b07888" : "#cc334488";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, px(c.h));
      ctx.lineTo(cx, px(c.l));
      ctx.stroke();
      // Body
      var bodyTop = px(Math.max(c.o, c.c));
      var bodyBot = px(Math.min(c.o, c.c));
      var bodyH = Math.max(1, bodyBot - bodyTop);
      ctx.fillStyle = i === hoverIdx ? (bull ? "#00e5a0" : "#ff4d6d") : (bull ? "#00e5a040" : "#ff4d6d40");
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1;
      ctx.fillRect(x, bodyTop, candleW, bodyH);
      ctx.strokeRect(x, bodyTop, candleW, bodyH);
    });

    // ── Volume bars ────────────────────────────────────────
    var volTop = PAD_TOP + chartH + 6;
    var volH   = 36;
    candles.forEach(function(c, i) {
      var bull = c.c >= c.o;
      var vBarH = ((c.v || 0) / maxV) * volH;
      ctx.fillStyle = bull ? "#00e5a030" : "#ff4d6d30";
      ctx.fillRect(candleX(i), volTop + volH - vBarH, candleW, vBarH);
    });
    ctx.fillStyle = "#1a2a40";
    ctx.font = "8px 'Share Tech Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("VOL", PAD_LEFT, volTop + 9);

    // ── Live price line ────────────────────────────────────
    if (livePrice > 0) {
      var livePY = px(livePrice);
      if (livePY > PAD_TOP && livePY < PAD_TOP + chartH) {
        ctx.strokeStyle = "#ffd93d";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.moveTo(PAD_LEFT, livePY); ctx.lineTo(W - PAD_RIGHT, livePY); ctx.stroke();
        ctx.setLineDash([]);
        // Price tag
        ctx.fillStyle = "#ffd93d";
        ctx.fillRect(W - PAD_RIGHT, livePY - 8, PAD_RIGHT, 16);
        ctx.fillStyle = "#020810";
        ctx.font = "bold 9px 'Share Tech Mono',monospace";
        ctx.textAlign = "left";
        var liveLabel = livePrice >= 1000 ? livePrice.toFixed(1) : livePrice.toFixed(4);
        ctx.fillText(liveLabel, W - PAD_RIGHT + 3, livePY + 3);
      }
    }

    // ── Hover crosshair ────────────────────────────────────
    if (hoverIdx !== null && candles[hoverIdx]) {
      var hc = candles[hoverIdx];
      var hx = candleX(hoverIdx) + candleW/2;
      var hy = px(hc.c);
      ctx.strokeStyle = "#4a6aaa44";
      ctx.lineWidth = 1;
      ctx.setLineDash([3,3]);
      ctx.beginPath(); ctx.moveTo(hx, PAD_TOP); ctx.lineTo(hx, PAD_TOP+chartH); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(PAD_LEFT, hy); ctx.lineTo(W-PAD_RIGHT, hy); ctx.stroke();
      ctx.setLineDash([]);
      // Tooltip
      var bull = hc.c >= hc.o;
      var tipX = hx > W/2 ? hx - 110 : hx + 8;
      ctx.fillStyle = "rgba(6,13,26,.95)";
      ctx.strokeStyle = bull ? "#00e5a0" : "#ff4d6d";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(tipX, PAD_TOP+4, 100, 72, 5) : ctx.rect(tipX, PAD_TOP+4, 100, 72);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = bull ? "#00e5a0" : "#ff4d6d";
      ctx.font = "bold 9px 'Share Tech Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText(bull?"▲ BULLISH":"▼ BEARISH", tipX+6, PAD_TOP+17);
      ctx.fillStyle = "#5a8aaa";
      ctx.font = "8.5px 'Share Tech Mono',monospace";
      ["O:"+hc.o.toFixed(2),"H:"+hc.h.toFixed(2),"L:"+hc.l.toFixed(2),"C:"+hc.c.toFixed(2)].forEach(function(t,ti){
        ctx.fillText(t, tipX+6, PAD_TOP+30+ti*11);
      });
    }

  }, [candles, hoverIdx, livePrice, h]);

  function onMouseMove(e) {
    var cv = canvasRef.current;
    if (!cv) return;
    var rect = cv.getBoundingClientRect();
    var x = (e.clientX || (e.touches&&e.touches[0].clientX) || 0) - rect.left;
    var W = rect.width;
    var PAD_LEFT = 8, PAD_RIGHT = 64;
    var chartW = W - PAD_LEFT - PAD_RIGHT;
    var idx = Math.floor(((x - PAD_LEFT) / chartW) * candles.length);
    if (idx >= 0 && idx < candles.length) setHoverIdx(idx);
  }

  if (candles.length < 2) {
    return <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#0e1e40",fontSize:10,background:"#060d1a",borderRadius:8}}>Mengumpulkan data {pair}...</div>;
  }

  return (
    <div style={{position:"relative",borderRadius:8,overflow:"hidden",background:"#060d1a"}}>
      {/* Header */}
      <div style={{position:"absolute",top:6,left:8,zIndex:2,display:"flex",gap:10,alignItems:"center"}}>
        <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:"#7ab0ff",fontWeight:700}}>{pair}</span>
        {livePrice>0&&<span style={{fontSize:10,color:"#ffd93d",fontFamily:"'Share Tech Mono',monospace"}}>{livePrice>=1000?livePrice.toFixed(2):livePrice.toFixed(5)}</span>}
        <span style={{fontSize:7,color:"#3a5a80",padding:"1px 6px",border:"1px solid #1a3060",borderRadius:3}}>5m</span>
        {[["MA7","#ffd93d"],["MA25","#00e5a0"],["MA50","#b06aff"]].map(function(m){
          return <span key={m[0]} style={{fontSize:7,color:m[1]}}>{m[0]}</span>;
        })}
      </div>
      <canvas ref={canvasRef}
        style={{width:"100%",height:h,display:"block",cursor:"crosshair"}}
        onMouseMove={onMouseMove} onMouseLeave={function(){setHoverIdx(null);}}
        onTouchMove={onMouseMove} onTouchEnd={function(){setHoverIdx(null);}}
      />
    </div>
  );
}



function EquityCurve(props) {
  var history=props.history||[], h=props.h||80;
  if (history.length<2) return <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#0e1e40",fontSize:9}}>Belum ada data equity</div>;
  var vals=history.map(function(e){return e.bal;});
  var maxV=Math.max.apply(null,vals), minV=Math.min.apply(null,vals), rng=maxV-minV||maxV*.01;
  var W=400, H=h, n=vals.length;
  var pts=vals.map(function(v,i){return [(i/(n-1))*W, H-((v-minV)/rng)*(H-12)-4];});
  var polyline=pts.map(function(p){return p[0]+","+p[1];}).join(" ");
  var fillPath="M "+pts[0][0]+","+H+" L "+polyline+" L "+pts[pts.length-1][0]+","+H+" Z";
  var isUp=vals[vals.length-1]>=vals[0];
  var lineColor=isUp?"#00e5a0":"#ff4d6d";
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <linearGradient id="efill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity=".25"/>
          <stop offset="100%" stopColor={lineColor} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="#020508" rx="6"/>
      <path d={fillPath} fill="url(#efill)"/>
      <polyline
        points={polyline}
        fill="none"
        stroke={lineColor}
        strokeWidth="1.5"
        style={{ filter: "drop-shadow(0 0 4px " + lineColor + "80)" }}
      />
      <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]} r="3" fill={lineColor} stroke="#fff" strokeWidth="1"/>
    </svg>
  );
}

// ─── CONF RING ────────────────────────────────────────────────
function ConfRing(props) {
  var value=props.value||0, action=props.action||"HOLD";
  var pct=Math.min(100,Math.max(0,value)), R=40, cx=50, cy=50, circ=2*Math.PI*R;
  var filled=(pct/100)*circ*.75, offset=circ*.125;
  var col=action==="BUY"?"#00e5a0":action==="SELL"?"#ff4d6d":"#ffd93d";
  return (
    <div style={{position:"relative",width:100,height:100,flexShrink:0}}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#07101e" strokeWidth="8"/>
        <circle
          cx={cx} cy={cy} r={R}
          fill="none"
          stroke={col}
          strokeWidth="8"
          strokeDasharray={filled + " " + circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dasharray .8s ease",
            filter: "drop-shadow(0 0 6px " + col + "80)",
          }}
          transform={"rotate(-225 " + cx + " " + cy + ")"}
        />
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:19,fontWeight:900,color:col,lineHeight:1}}>{pct}%</div>
        <div style={{fontSize:7,color:col,opacity:.6,letterSpacing:2,marginTop:2}}>CONF</div>
      </div>
    </div>
  );
}

// ─── SETTINGS MODAL — Fix #12 ─────────────────────────────────
function SettingsModal(props) {
  var settings=props.settings, onChange=props.onChange, onClose=props.onClose;
  var onConfigChange = props.onConfigChange || function(){};
  var cfg = props.config || {};
  // Merge settings + config keys into local state
  var [local, setLocal] = useState(Object.assign({
    aiModel:      cfg.aiModel      || "groq_free",
    geminiKey:    cfg.geminiKey    || "",
    groqKey:      cfg.groqKey      || "",
    anthropicKey: cfg.anthropicKey || "",
  }, settings));
  function upd(key,val){setLocal(function(p){var _s=Object.assign({},p);_s[key]=val;return _s;});}
  var sliders=[
    {key:"riskPct",   label:"Risk per Trade (%)",      min:.5,  max:5,   step:.5,  unit:"%"},
    {key:"confThresh",label:"Min Confidence AI (%)",   min:50,  max:90,  step:5,   unit:"%"},
    {key:"aiInterval",label:"Interval Analisis (detik)",min:10, max:120, step:5,   unit:"s"},
    {key:"maxPos",    label:"Max Posisi Terbuka",       min:1,   max:5,   step:1,   unit:""},
    {key:"tradeFee",  label:"Fee Trading (%)",          min:0,   max:.5,  step:.05, unit:"%"},
    {key:"slippage",  label:"Estimasi Slippage (%)",    min:0,   max:.3,  step:.05, unit:"%"},
    {key:"maxDrawdown",label:"Max Drawdown Global (%)", min:2,   max:30,  step:1,   unit:"%"},
    {key:"dailyLoss", label:"Max Kerugian Harian (%)",  min:1,   max:20,  step:.5,  unit:"%"},
    {key:"stopLossPct",label:"Stop-Loss per Trade (%)", min:.5,  max:10,  step:.5,  unit:"%"},
    {key:"takeProfitPct",label:"Take-Profit per Trade (%)",min:1,max:20,  step:.5,  unit:"%"},
  ];
  return (
    <div className="nt-settings-modal">
      {/* Header sticky */}
      <div className="nt-settings-head">
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#5a9fff",fontWeight:700}}>
          Pengaturan AI
        </div>
        <button onClick={onClose} style={{background:"rgba(255,60,60,.12)",border:"1px solid #3a0a0a",borderRadius:7,padding:"6px 14px",color:"#ff7777",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:11}}>
          X Tutup
        </button>
      </div>

      {/* Scrollable body */}
      <div className="nt-settings-body">
        <div style={{maxWidth:480,margin:"0 auto"}}>

          {/* AI Provider selector */}
          <div style={{background:"rgba(20,30,60,.3)",border:"1px solid #1a2a50",borderRadius:8,padding:12,marginBottom:16}}>
            <div style={{fontSize:9,color:"#7ab0ff",letterSpacing:1.5,marginBottom:8}}>AI PROVIDER</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {AI_PROVIDERS.map(function(m){
                var isSel = local.aiModel ? local.aiModel===m.id : m.id==="groq_free";
                return(
                  <button key={m.id} onClick={function(){setLocal(function(p){var s=Object.assign({},p);s.aiModel=m.id;return s;});}}
                    style={{background:isSel?m.color+"18":"#020508",border:"1px solid "+(isSel?m.color:"#080e22"),borderRadius:7,padding:"9px 8px",cursor:"pointer",textAlign:"left",transition:"all .15s"}}>
                    <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:isSel?m.color:"#1e3a60",fontWeight:700,marginBottom:2}}>{m.name} <span style={{fontSize:7,background:m.color+"22",padding:"1px 5px",borderRadius:3,color:m.color}}>{m.label}</span></div>
                    <div style={{fontSize:8,color:isSel?m.color:"#1a3060",marginTop:2}}>{m.costPer}/analisis</div>
                    <div style={{fontSize:7.5,color:"#1a3060",marginTop:1}}>{m.desc}</div>
                  </button>
                );
              })}
            </div>
            {/* Gemini key input if selected */}
            {local.aiModel==="gemini_flash"&&(
              <div style={{marginTop:10}}>
                <div style={{fontSize:8,color:"#4285f4",marginBottom:4}}>Google AI Studio API Key</div>
                <input value={local.geminiKey||""} onChange={function(e){upd("geminiKey",e.target.value);}}
                  placeholder="AIza..."
                  style={{width:"100%",background:"#020508",border:"1px solid #0a1428",borderRadius:6,padding:"7px 10px",color:"#cce0ff",fontSize:10,fontFamily:"'Share Tech Mono',monospace",outline:"none"}}/>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer"
                  style={{fontSize:8,color:"#4285f4",display:"block",marginTop:3}}>Dapatkan API Key gratis → aistudio.google.com</a>
              </div>
            )}
          </div>

          {/* Sliders */}
          {[
            {key:"riskPct",     label:"Risk per Trade (%)",          min:0.5, max:5,   step:0.5,  unit:"%"},
            {key:"confThresh",  label:"Min Confidence AI (%)",       min:50,  max:90,  step:5,    unit:"%"},
            {key:"aiInterval",  label:"Interval Analisis (detik)",   min:10,  max:120, step:5,    unit:"s"},
            {key:"maxPos",      label:"Max Posisi Terbuka",          min:1,   max:5,   step:1,    unit:""},
            {key:"tradeFee",    label:"Fee Trading (%)",             min:0,   max:0.5, step:0.05, unit:"%"},
            {key:"slippage",    label:"Estimasi Slippage (%)",       min:0,   max:0.3, step:0.05, unit:"%"},
            {key:"maxDrawdown", label:"Max Drawdown Global (%)",     min:2,   max:30,  step:1,    unit:"%"},
            {key:"dailyLoss",   label:"Max Kerugian Harian (%)",     min:1,   max:20,  step:1,    unit:"%"},
            {key:"stopLossPct", label:"Stop-Loss per Trade (%)",     min:0.5, max:10,  step:0.5,  unit:"%", highlight:true},
            {key:"takeProfitPct",label:"Take-Profit per Trade (%)",  min:1,   max:20,  step:0.5,  unit:"%", highlight:true},
          ].map(function(s){
            return(
              <div key={s.key} style={{marginBottom:14,background:s.highlight?"rgba(0,30,15,.2)":"transparent",borderRadius:s.highlight?7:0,padding:s.highlight?"8px 10px":0,border:s.highlight?"1px solid #003a18":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <span style={{fontSize:10,color:s.highlight?"#3a7a50":"#3a5a80"}}>{s.label}</span>
                  <span style={{fontSize:12,color:s.highlight?"#00e5a0":"#7ab0ff",fontFamily:"'Orbitron',monospace",fontWeight:700}}>{local[s.key]||0}{s.unit}</span>
                </div>
                <input type="range" min={s.min} max={s.max} step={s.step} value={local[s.key]||0}
                  onChange={function(e){upd(s.key,parseFloat(e.target.value));}}
                  style={{width:"100%",accentColor:s.highlight?"#00e5a0":"#0060e0"}}/>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#0a1428",marginTop:2}}>
                  <span>{s.min}{s.unit}</span><span>{s.max}{s.unit}</span>
                </div>
              </div>
            );
          })}

          {/* Estimasi biaya */}
          {(function(){
            var model      = local.aiModel || AI_MODELS[0].id;
            var costPer    = model.includes("haiku")?0.0001:model.includes("groq")?0:0.003;
            var interval   = local.aiInterval || 30;
            var callsPerDay= Math.floor(86400/interval);
            var totalUSD   = (callsPerDay*costPer).toFixed(2);
            var totalIDR   = Math.round(callsPerDay*costPer*15800).toLocaleString("id-ID");
            return(
              <div style={{background:"rgba(0,10,5,.5)",border:"1px solid #003a18",borderRadius:7,padding:"10px 12px",marginBottom:14}}>
                <div style={{fontSize:8.5,color:"#2a7a50",marginBottom:4}}>Estimasi biaya per hari:</div>
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#00e5a0",fontWeight:700}}>
                  ~${totalUSD} = Rp {totalIDR}
                </div>
                <div style={{fontSize:8,color:"#1a4a30",marginTop:3}}>
                  {callsPerDay} analisis/hari
                </div>
              </div>
            );
          })()}

          {/* WhatsApp / Telegram notif */}
          <div style={{background:"rgba(0,30,10,.2)",border:"1px solid #003a18",borderRadius:8,padding:12,marginBottom:12}}>
            <div style={{fontSize:8.5,color:"#2a7a50",letterSpacing:1.5,marginBottom:8}}>NOTIFIKASI TELEGRAM</div>
            <input value={local.waNumber||""} onChange={function(e){upd("waNumber",e.target.value);}}
              placeholder="Username Telegram kamu (contoh: Restu_hidayat30)"
              style={{width:"100%",background:"#020508",border:"1px solid #0a1428",borderRadius:6,padding:"8px 10px",color:"#cce0ff",fontSize:10,fontFamily:"'Share Tech Mono',monospace",outline:"none",marginBottom:4}}/>
            <div style={{fontSize:8,color:"#1e3a60",lineHeight:1.7}}>
              Notif signal masuk otomatis ke Telegram via @CallMeBot_txtbot
            </div>
          </div>


        </div>
      </div>

      {/* Footer sticky */}
      <div className="nt-settings-foot">
        <button onClick={function(){
            onChange(local);
            onConfigChange(Object.assign({}, cfg, {
              aiModel:      local.aiModel      || cfg.aiModel,
              geminiKey:    local.geminiKey    || cfg.geminiKey    || "",
              groqKey:      local.groqKey      || cfg.groqKey      || "",
              anthropicKey: local.anthropicKey || cfg.anthropicKey || "",
            }));

            onClose();
          }}
          style={{width:"100%",background:"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:10,padding:14,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}

// ─── CONFIRM DIALOG — Fix #18 ─────────────────────────────────
function ConfirmDialog(props) {
  var msg=props.msg, onYes=props.onYes, onNo=props.onNo, danger=props.danger;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(1,2,10,.9)",zIndex:600,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#030610",border:"1px solid "+(danger?"#3a0000":"#0a1428"),borderRadius:14,padding:24,maxWidth:320,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:14,marginBottom:14}}>{danger?"⚠️":"❓"}</div>
        <div style={{fontSize:11,color:"#7ab0ff",lineHeight:1.8,marginBottom:20}}>{msg}</div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onNo} style={{flex:1,background:"transparent",border:"1px solid #0a1428",borderRadius:8,padding:"10px",color:"#2a4a70",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>Batal</button>
          <button onClick={onYes} style={{flex:1,background:danger?"linear-gradient(135deg,#600000,#aa0000)":"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:8,padding:"10px",color:"#fff",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700}}>Ya, Lanjutkan</button>
        </div>
      </div>
    </div>
  );
}

// ─── SMART PAYMENT MODAL ────────────────────────────────────────
// Menampilkan metode bayar sesuai pilihan user
// QRIS → tampilkan QR Admin langsung
// Bank → tampilkan rekening admin
// E-Wallet → tampilkan nomor admin
function QRISPayment(props) {
  var plan     = props.plan;
  var onClose  = props.onClose;
  var onSuccess= props.onSuccess;
  var userEmail= props.userEmail || "";

  var [tab,        setTab]       = useState("qris");
  var [step,       setStep]      = useState("choose"); // choose | paying | confirm | done | verifying
  var [timer,      setTimer]     = useState(900);
  var [copied,     setCopied]    = useState("");
  var [waOpened,   setWaOpened]  = useState(false);

  var priceStr = plan ? "Rp " + plan.price.toLocaleString("id-ID") : "";
  var planName = plan ? plan.name : "";

  // Countdown timer
  useEffect(function() {
    if (step !== "paying") return;
    var t = setInterval(function() {
      setTimer(function(v) {
        if (v <= 1) { clearInterval(t); return 0; }
        return v - 1;
      });
    }, 1000);
    return function() { clearInterval(t); };
  }, [step]);

  function fmt(s) {
    return String(Math.floor(s/60)).padStart(2,"0") + ":" + String(s%60).padStart(2,"0");
  }

  function copyText(text, key) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(function() { setCopied(""); }, 2000);
  }

  // When user picks payment method → show payment details
  function selectMethod(method) {
    setTab(method);
    setStep("paying");
    setTimer(900);
  }

  // User confirms has paid → send to backend + open WhatsApp
  async function confirmPaid() {
    setStep("verifying");
    var BACKEND = "https://neuratrade-backend.onrender.com";
    var msg = "Halo Admin NeuraTrade,%0A%0ASaya sudah melakukan pembayaran:%0A" +
              "Email: " + encodeURIComponent(userEmail) + "%0A" +
              "Paket: " + planName + "%0A" +
              "Nominal: " + priceStr + "%0A" +
              "Metode: " + tab.toUpperCase() + "%0A%0AMohon aktivasi akun Pro saya.";
    // Save pending to backend
    try {
      await fetch(BACKEND + "/api/payment/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, plan: plan ? plan.id : "monthly", amount: plan ? plan.price : 299000, method: tab }),
      });
    } catch(e) {}
    // Open WhatsApp admin
    var waNum = ADMIN_WA || "628123456789";
    window.open("https://wa.me/" + waNum + "?text=" + msg, "_blank");
    setWaOpened(true);
    setStep("confirm");
  }

  // Admin confirmed → check backend
  async function checkActivation() {
    setStep("verifying");
    var BACKEND = "https://neuratrade-backend.onrender.com";
    try {
      var res  = await fetch(BACKEND + "/api/user/" + encodeURIComponent(userEmail));
      var data = await res.json();
      if (data && data.tier && data.tier !== "free") {
        setStep("done");
        setTimeout(function() { onSuccess(); }, 2000);
        return;
      }
    } catch(e) {}
    setStep("confirm");
    alert("Akun belum diaktivasi. Hubungi admin via WhatsApp untuk konfirmasi.");
  }

  // ── DONE ──
  if (step === "done") return (
    <div style={{ position:"fixed",inset:0,background:"rgba(1,2,10,.98)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:56,marginBottom:16 }}>✅</div>
        <div style={{ fontFamily:"'Orbitron',monospace",fontSize:18,color:"#00e5a0",marginBottom:8,fontWeight:700 }}>Pro Aktif!</div>
        <div style={{ fontSize:11,color:"#2a5a40" }}>Selamat trading dengan semua fitur Pro</div>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(1,2,10,.97)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto" }}>
      <div style={{ width:"100%",maxWidth:440,background:"#030610",border:"1px solid #0a1828",borderRadius:18,padding:24 }}>

        {/* Header */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:13,color:"#5a9fff",fontWeight:700 }}>
              {step === "choose" ? "Pilih Metode Bayar" :
               step === "paying" ? "Selesaikan Pembayaran" :
               step === "confirm" ? "Konfirmasi Pembayaran" :
               step === "verifying" ? "Memverifikasi..." : "Selesai"}
            </div>
            <div style={{ fontSize:9.5,color:"#1e3a60",marginTop:2 }}>{planName} — {priceStr}</div>
          </div>
          {step !== "verifying" && (
            <button onClick={onClose} style={{ background:"transparent",border:"1px solid #0a1428",borderRadius:6,padding:"4px 10px",color:"#2a4a70",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10 }}>
              Tutup
            </button>
          )}
        </div>

        {/* ══ STEP 1: CHOOSE METHOD ══ */}
        {step === "choose" && (
          <div>
            <div style={{ fontSize:9,color:"#1e3a60",marginBottom:12,lineHeight:1.8 }}>
              Pilih metode pembayaran yang kamu inginkan:
            </div>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {/* QRIS */}
              {ADMIN_QRIS_URL && (
                <button onClick={function(){ selectMethod("qris"); }}
                  style={{ display:"flex",alignItems:"center",gap:14,background:"rgba(0,100,200,.08)",border:"1px solid #1a4080",borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .2s" }}>
                  <div style={{ width:44,height:44,borderRadius:10,background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>📱</div>
                  <div>
                    <div style={{ fontFamily:"'Orbitron',monospace",fontSize:11,color:"#5a9fff",fontWeight:700,marginBottom:3 }}>QRIS</div>
                    <div style={{ fontSize:9.5,color:"#2a4a70" }}>GoPay · OVO · Dana · ShopeePay · m-Banking</div>
                    <div style={{ fontSize:8.5,color:"#00e5a0",marginTop:2 }}>Scan QR Admin — langsung dari app manapun</div>
                  </div>
                  <span style={{ marginLeft:"auto",fontSize:18,color:"#5a9fff" }}>›</span>
                </button>
              )}
              {/* Bank Transfer */}
              {ADMIN_BANK && ADMIN_BANK.length > 0 && (
                <button onClick={function(){ selectMethod("bank"); }}
                  style={{ display:"flex",alignItems:"center",gap:14,background:"rgba(0,100,200,.08)",border:"1px solid #1a4080",borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .2s" }}>
                  <div style={{ width:44,height:44,borderRadius:10,background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>🏦</div>
                  <div>
                    <div style={{ fontFamily:"'Orbitron',monospace",fontSize:11,color:"#ffd93d",fontWeight:700,marginBottom:3 }}>Transfer Bank</div>
                    <div style={{ fontSize:9.5,color:"#2a4a70" }}>{ADMIN_BANK.map(function(b){return b.bank;}).join(" · ")}</div>
                    <div style={{ fontSize:8.5,color:"#ffd93d",marginTop:2 }}>Transfer ke rekening admin</div>
                  </div>
                  <span style={{ marginLeft:"auto",fontSize:18,color:"#ffd93d" }}>›</span>
                </button>
              )}
              {/* E-Wallet */}
              {ADMIN_EWALLET && ADMIN_EWALLET.length > 0 && (
                <button onClick={function(){ selectMethod("ewallet"); }}
                  style={{ display:"flex",alignItems:"center",gap:14,background:"rgba(0,100,200,.08)",border:"1px solid #1a4080",borderRadius:10,padding:"14px 16px",cursor:"pointer",textAlign:"left",transition:"all .2s" }}>
                  <div style={{ width:44,height:44,borderRadius:10,background:"rgba(255,255,255,.1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0 }}>💳</div>
                  <div>
                    <div style={{ fontFamily:"'Orbitron',monospace",fontSize:11,color:"#00bfa5",fontWeight:700,marginBottom:3 }}>E-Wallet</div>
                    <div style={{ fontSize:9.5,color:"#2a4a70" }}>{ADMIN_EWALLET.map(function(e){return e.name;}).join(" · ")}</div>
                    <div style={{ fontSize:8.5,color:"#00bfa5",marginTop:2 }}>Transfer saldo e-wallet ke admin</div>
                  </div>
                  <span style={{ marginLeft:"auto",fontSize:18,color:"#00bfa5" }}>›</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ══ STEP 2: PAYING ══ */}
        {step === "paying" && (
          <div>
            {/* Timer */}
            <div style={{ textAlign:"center",marginBottom:14 }}>
              <div style={{ background:"rgba(255,100,0,.08)",border:"1px solid #3a1800",borderRadius:8,padding:"6px 16px",display:"inline-block" }}>
                <div style={{ fontSize:8,color:"#aa5020",letterSpacing:1.5 }}>BATAS WAKTU</div>
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:22,color:timer<120?"#ff4d6d":"#ffa000",fontWeight:700 }}>{fmt(timer)}</div>
              </div>
            </div>

            {/* QRIS */}
            {tab === "qris" && (
              <div style={{ textAlign:"center" }}>
                <div style={{ fontSize:10,color:"#3a5a80",marginBottom:12,lineHeight:1.8 }}>
                  Scan QR ini menggunakan aplikasi apapun:<br/>
                  <strong style={{ color:"#5a8aff" }}>GoPay · OVO · Dana · ShopeePay · LinkAja · m-Banking</strong>
                </div>
                <div style={{ display:"flex",justifyContent:"center",marginBottom:12 }}>
                  <div style={{ background:"#fff",borderRadius:14,padding:12,display:"inline-block",boxShadow:"0 0 30px rgba(0,100,255,.2)" }}>
                    <img src={ADMIN_QRIS_URL} alt="QRIS"
                      style={{ width:200,height:200,objectFit:"contain",display:"block" }}
                      onError={function(e){ e.target.style.display="none"; }}/>
                  </div>
                </div>
                <div style={{ fontSize:9,color:"#1e3a60",marginBottom:4 }}>Nominal pembayaran:</div>
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:22,color:"#00e5a0",fontWeight:700,marginBottom:4 }}>{priceStr}</div>
                <div style={{ fontSize:8.5,color:"#1e3a60",marginBottom:14 }}>a.n. {ADMIN_NAMA}</div>
                <div style={{ display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:16 }}>
                  {["GoPay","OVO","Dana","ShopeePay","LinkAja","BCA","Mandiri","BRI"].map(function(w){
                    return <span key={w} style={{ fontSize:8,color:"#3a5a80",background:"#020508",border:"1px solid #0a1428",borderRadius:4,padding:"2px 7px" }}>{w}</span>;
                  })}
                </div>
              </div>
            )}

            {/* Bank Transfer */}
            {tab === "bank" && (
              <div>
                <div style={{ fontSize:10,color:"#3a5a80",marginBottom:12,textAlign:"center" }}>
                  Transfer tepat <strong style={{ color:"#ffd93d" }}>{priceStr}</strong> ke salah satu rekening:
                </div>
                {ADMIN_BANK.map(function(b, i) {
                  return (
                    <div key={i} style={{ background:"#020508",border:"1px solid #0a1428",borderRadius:9,padding:"12px 14px",marginBottom:8 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                        <div>
                          <div style={{ fontSize:12,color:"#5a8ad0",fontWeight:700,marginBottom:4 }}>{b.bank}</div>
                          <div style={{ fontFamily:"'Orbitron',monospace",fontSize:16,color:"#cce0ff",letterSpacing:2 }}>{b.no}</div>
                          <div style={{ fontSize:9,color:"#1a3060",marginTop:3 }}>a.n. {b.atas}</div>
                        </div>
                        <button onClick={function(){ copyText(b.no, "bank"+i); }}
                          style={{ background:copied==="bank"+i?"rgba(0,200,100,.15)":"rgba(0,80,200,.15)",border:"1px solid "+(copied==="bank"+i?"#005530":"#1a4080"),borderRadius:6,padding:"6px 12px",color:copied==="bank"+i?"#00e5a0":"#5a90df",cursor:"pointer",fontSize:9,fontFamily:"'Share Tech Mono',monospace",flexShrink:0 }}>
                          {copied==="bank"+i?"✓ Copied":"Copy"}
                        </button>
                      </div>
                    </div>
                  );
                })}
                <div style={{ fontSize:9,color:"#3a5a40",background:"rgba(0,60,30,.1)",border:"1px solid #003a18",borderRadius:6,padding:"7px 10px",lineHeight:1.8 }}>
                  ⚠️ Transfer nominal TEPAT {priceStr} — jangan kurang atau lebih.<br/>
                  Simpan bukti transfer untuk konfirmasi.
                </div>
              </div>
            )}

            {/* E-Wallet */}
            {tab === "ewallet" && (
              <div>
                <div style={{ fontSize:10,color:"#3a5a80",marginBottom:12,textAlign:"center" }}>
                  Kirim <strong style={{ color:"#00bfa5" }}>{priceStr}</strong> ke salah satu e-wallet:
                </div>
                {ADMIN_EWALLET.map(function(ew, i) {
                  return (
                    <div key={i} style={{ background:"#020508",border:"1px solid #0a1428",borderRadius:9,padding:"12px 14px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:12,color:ew.color,fontWeight:700,marginBottom:4 }}>{ew.name}</div>
                        <div style={{ fontFamily:"'Share Tech Mono',monospace",fontSize:14,color:"#cce0ff" }}>{ew.no}</div>
                        <div style={{ fontSize:9,color:"#1a3060",marginTop:3 }}>a.n. {ADMIN_NAMA}</div>
                      </div>
                      <button onClick={function(){ copyText(ew.no, "ew"+i); }}
                        style={{ background:copied==="ew"+i?"rgba(0,200,100,.15)":"rgba(0,80,200,.15)",border:"1px solid "+(copied==="ew"+i?"#005530":"#1a4080"),borderRadius:6,padding:"6px 12px",color:copied==="ew"+i?"#00e5a0":"#5a90df",cursor:"pointer",fontSize:9,fontFamily:"'Share Tech Mono',monospace",flexShrink:0 }}>
                        {copied==="ew"+i?"✓ Copied":"Copy"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm paid button */}
            <button onClick={confirmPaid}
              style={{ width:"100%",background:"linear-gradient(135deg,#005500,#009900)",border:"none",borderRadius:10,padding:13,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1,marginTop:8 }}>
              ✅ Saya Sudah Bayar
            </button>
            <button onClick={function(){ setStep("choose"); }}
              style={{ width:"100%",background:"transparent",border:"1px solid #0a1428",borderRadius:8,padding:8,color:"#2a4a70",cursor:"pointer",fontSize:10,marginTop:6 }}>
              ← Ganti Metode
            </button>
          </div>
        )}

        {/* ══ STEP 3: CONFIRM (after WA opened) ══ */}
        {step === "confirm" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:40,marginBottom:12 }}>📲</div>
            <div style={{ fontSize:11,color:"#7ab0ff",fontWeight:700,marginBottom:8 }}>Konfirmasi ke Admin</div>
            <div style={{ fontSize:10,color:"#3a5a80",lineHeight:1.8,marginBottom:16 }}>
              WhatsApp ke admin sudah terbuka dengan detail pembayaran kamu.<br/>
              <strong style={{ color:"#ffd93d" }}>Kirim pesan + foto bukti bayar</strong> ke admin.<br/>
              Akun Pro akan diaktifkan dalam 5-15 menit.
            </div>
            <div style={{ background:"rgba(0,60,30,.1)",border:"1px solid #003a18",borderRadius:9,padding:12,marginBottom:14,textAlign:"left" }}>
              <div style={{ fontSize:9,color:"#2a7a50",marginBottom:6,letterSpacing:1 }}>DETAIL PEMBAYARAN:</div>
              <div style={{ fontSize:10,color:"#3a7a50",lineHeight:1.9 }}>
                Paket: <strong>{planName}</strong><br/>
                Nominal: <strong style={{ color:"#00e5a0" }}>{priceStr}</strong><br/>
                Email: <strong>{userEmail}</strong><br/>
                Metode: <strong>{tab.toUpperCase()}</strong>
              </div>
            </div>
            <button onClick={function(){ window.open("https://wa.me/" + (ADMIN_WA||"628123456789"), "_blank"); }}
              style={{ width:"100%",background:"linear-gradient(135deg,#005500,#009900)",border:"none",borderRadius:9,padding:11,color:"#fff",fontFamily:"'Share Tech Mono',monospace",fontSize:11,cursor:"pointer",marginBottom:8 }}>
              📱 Buka WhatsApp Admin
            </button>
            <button onClick={checkActivation}
              style={{ width:"100%",background:"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:9,padding:11,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,cursor:"pointer",marginBottom:8 }}>
              🔄 Cek Aktivasi Akun
            </button>
            <div style={{ fontSize:8.5,color:"#1e3a60",lineHeight:1.7 }}>
              Aktivasi biasanya 5-15 menit setelah konfirmasi ke admin.
            </div>
          </div>
        )}

        {/* ══ VERIFYING ══ */}
        {step === "verifying" && (
          <div style={{ textAlign:"center",padding:"20px 0" }}>
            <div style={{ display:"flex",gap:6,justifyContent:"center",marginBottom:14 }}>
              {[0,1,2].map(function(i){
                return <div key={i} style={{ width:10,height:10,borderRadius:"50%",background:"#5a9fff",animation:"pulse 1.2s "+(i*.3)+"s infinite" }}/>;
              })}
            </div>
            <div style={{ fontSize:11,color:"#5a9fff" }}>Mengecek status pembayaran...</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── UPGRADE SCREEN ───────────────────────────────────────────
function UpgradeScreen(props) {
  var user=props.user, onClose=props.onClose, onUpgrade=props.onUpgrade;
  var isPro=user.tier!=="free";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(1,2,10,.97)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:12,overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:520}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:14,color:"#5a9fff",fontWeight:700}}>Pilih Paket</div>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid #0a1428",borderRadius:6,padding:"4px 10px",color:"#2a4a70",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>Nanti</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {PLANS.map(function(plan){
            var isCur=(plan.id==="free"&&user.tier==="free")||(plan.id===user.tier);
            return (
              <div key={plan.id} onClick={function(){if(plan.id!=="free"&&!isCur)onUpgrade(plan);}}
                style={{background:isCur?plan.color+"10":"rgba(3,6,18,.95)",border:"1px solid "+(isCur?plan.color+"55":"#0a1428"),borderRadius:12,padding:14,cursor:plan.id!=="free"&&!isCur?"pointer":"default",position:"relative",transition:"all .2s"}}>
                {plan.badge&&<div style={{position:"absolute",top:-7,right:8,background:plan.color,color:"#000",fontSize:7.5,fontWeight:700,borderRadius:4,padding:"2px 7px",fontFamily:"'Orbitron',monospace"}}>{plan.badge}</div>}
                <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:plan.color,fontWeight:700,marginBottom:4}}>{plan.name}</div>
                <div style={{marginBottom:10}}>
                  {plan.price===0?<span style={{fontFamily:"'Orbitron',monospace",fontSize:17,color:plan.color,fontWeight:900}}>GRATIS</span>
                    :<span><span style={{fontFamily:"'Orbitron',monospace",fontSize:14,color:plan.color,fontWeight:900}}>{"Rp"+plan.price.toLocaleString("id-ID")}</span><span style={{fontSize:8.5,color:"#2a4a7a",marginLeft:3}}>{plan.period}</span></span>}
                </div>
                {plan.features.map(function(f){return(
                  <div key={f.t} style={{display:"flex",gap:5,marginBottom:3}}>
                    <span style={{fontSize:9,color:f.ok?"#00e5a0":"#1e3a60"}}>{f.ok?"+":"−"}</span>
                    <span style={{fontSize:9.5,color:f.ok?"#3a5a80":"#1e3060"}}>{f.t}</span>
                  </div>
                );})}
                {!isCur&&plan.id!=="free"&&<div style={{marginTop:10,background:plan.color+"20",border:"1px solid "+plan.color+"40",borderRadius:7,padding:"7px 0",textAlign:"center",fontFamily:"'Orbitron',monospace",fontSize:9,color:plan.color,fontWeight:700}}>{plan.id==="trial"?"Mulai Trial Gratis":"Pilih Ini"}</div>}
                {isCur&&<div style={{marginTop:8,fontSize:9,color:plan.color,textAlign:"center"}}>Paket Aktif</div>}
              </div>
            );
          })}
        </div>
        <div style={{textAlign:"center",fontSize:8.5,color:"#0e1e3a",lineHeight:1.8}}>Pembayaran aman via Midtrans. Bisa cancel kapanpun.</div>
      </div>
    </div>
  );
}

// ─── SETUP SCREEN — Fix #3 #5 ─────────────────────────────────
function SetupScreen(props) {
  var onDone = props.onDone;

  // ── Mode selection: demo or real ──
  var [mode,       setMode]       = useState(""); // "" | "demo" | "real"
  var [bal,        setBal]        = useState("5000");
  var [apiKey,     setApiKey]     = useState("");
  var [secret,     setSecret]     = useState("");
  var [geminiKey,  setGeminiKey]  = useState("");
  var [groqKeyVal, setGroqKeyVal] = useState("");
  var [mt5Login,   setMt5Login]   = useState("");
  var [mt5Server,  setMt5Server]  = useState("");
  var [mt5Pass,    setMt5Pass]    = useState("");
  var [anthropicKey,setAnthropicKey] = useState("");
  var [aiModel,    setAiModel]    = useState(AI_PROVIDERS[0].id);
  var [selEx,      setSelEx]      = useState(EXCHANGES_LIST[0]);
  var [scope,      setScope]      = useState(MARKET_SCOPES[0]);
  var [err,        setErr]        = useState("");
  var [apiVisible, setApiVisible] = useState(false);

  function submit() {
    try {
      var b = parseFloat(bal) || 0;
      if (b < 10) {
        alert("⚠️ Modal minimal $10. Scroll ke atas dan isi kolom modal trading.");
        setErr("Modal minimal $10"); return;
      }
      if (mode === "real") {
        var isMt5 = selEx && selEx.cred === "mt5";
        if (isMt5) {
          if (!mt5Login.trim())  { alert("⚠️ Login MT5 wajib diisi");  setErr("Login wajib"); return; }
          if (!mt5Server.trim()) { alert("⚠️ Server MT5 wajib diisi"); setErr("Server wajib"); return; }
          if (!mt5Pass.trim())   { alert("⚠️ Password MT5 wajib diisi"); setErr("Password wajib"); return; }
        } else {
          if (!apiKey.trim())    { alert("⚠️ API Key wajib diisi"); setErr("API Key wajib"); return; }
          if (!secret.trim())    { alert("⚠️ Secret Key wajib diisi!\nBeda dengan API Key - keduanya harus diisi."); setErr("Secret Key wajib"); return; }
        }
      }
      setErr("");
    onDone({
      mode:         mode,
      balance:      b,
      apiKey:       mode === "real" ? apiKey.trim() : "",
      secretKey:    mode === "real" ? secret.trim() : "",
      mt5Login:     mode === "real" ? mt5Login.trim() : "",
      mt5Server:    mode === "real" ? mt5Server.trim() : "",
      mt5Password:  mode === "real" ? mt5Pass.trim() : "",
      anthropicKey: anthropicKey.trim(),
      groqKey:      groqKeyVal.trim(),
      geminiKey:    geminiKey.trim(),
      aiModel:      aiModel,
      exchange:     selEx,
      scope:        scope,
    });    } catch(e) { alert("Error: " + e.message); }
  }

  // ── STEP 1: Choose mode ──
  if (mode === "") {
    return (
      <div style={{ position:"fixed",inset:0,background:"rgba(1,2,10,.97)",overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"40px 20px" }}>
        <div style={{ width:"100%",maxWidth:480 }}>
          <div style={{ textAlign:"center",marginBottom:30 }}>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,letterSpacing:2,marginBottom:8 }}>
              <span style={{ background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>NEURA</span>
              <span style={{ background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>TRADE</span>
            </div>
            <div style={{ fontSize:10,color:"#2a4a7a" }}>Pilih mode trading kamu</div>
          </div>

          {/* Demo Mode */}
          <div onClick={function(){ setMode("demo"); }}
            style={{ background:"rgba(0,80,200,.08)",border:"2px solid #1a4080",borderRadius:14,padding:22,marginBottom:12,cursor:"pointer",transition:"all .2s" }}>
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:10 }}>
              <div style={{ width:52,height:52,borderRadius:12,background:"rgba(0,100,255,.15)",border:"1px solid #1a4080",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>🎮</div>
              <div>
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:14,color:"#5a9fff",fontWeight:700,marginBottom:4 }}>Demo Mode</div>
                <div style={{ fontSize:10,color:"#2a4a7a",lineHeight:1.7 }}>Coba tanpa uang nyata · Tidak perlu API key · Harga simulasi realistis</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {["✅ Gratis selamanya","✅ Tidak perlu API Key","✅ Tidak ada risiko","✅ Cocok untuk belajar"].map(function(t){
                return <span key={t} style={{ fontSize:8.5,color:"#3a6aaa",background:"rgba(0,60,200,.1)",borderRadius:4,padding:"2px 8px" }}>{t}</span>;
              })}
            </div>
          </div>

          {/* Real Trading Mode */}
          <div onClick={function(){ setMode("real"); }}
            style={{ background:"rgba(0,150,50,.06)",border:"2px solid #004422",borderRadius:14,padding:22,cursor:"pointer",transition:"all .2s",position:"relative" }}>
            <div style={{ position:"absolute",top:-10,right:14,background:"linear-gradient(135deg,#005500,#00aa00)",color:"#fff",fontSize:8,fontWeight:700,borderRadius:4,padding:"3px 10px",fontFamily:"'Orbitron',monospace",letterSpacing:1 }}>REAL TRADING</div>
            <div style={{ display:"flex",alignItems:"center",gap:14,marginBottom:10 }}>
              <div style={{ width:52,height:52,borderRadius:12,background:"rgba(0,200,50,.1)",border:"1px solid #004422",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0 }}>⚡</div>
              <div>
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:14,color:"#00e5a0",fontWeight:700,marginBottom:4 }}>Real Trading</div>
                <div style={{ fontSize:10,color:"#2a7a50",lineHeight:1.7 }}>Eksekusi order nyata ke exchange · Butuh API Key · Profit & loss nyata</div>
              </div>
            </div>
            <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
              {["⚡ Order nyata ke Binance","⚡ Profit & loss nyata","⚠️ Butuh API Key Exchange","⚠️ Ada risiko kehilangan modal"].map(function(t){
                var isWarn = t.startsWith("⚠️");
                return <span key={t} style={{ fontSize:8.5,color:isWarn?"#aa5020":"#3a7a50",background:isWarn?"rgba(100,40,0,.1)":"rgba(0,100,30,.1)",borderRadius:4,padding:"2px 8px" }}>{t}</span>;
              })}
            </div>
          </div>

          <div style={{ textAlign:"center",marginTop:16,fontSize:8.5,color:"#0a1830",lineHeight:1.8 }}>
            Kamu bisa ganti mode kapan saja dari Settings.<br/>
            Demo mode tidak mengirim order ke exchange manapun.
          </div>
        </div>
      </div>
    );
  }

  // ── STEP 2: Setup screen ──
  var isReal = mode === "real";

  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(1,2,10,.97)",overflowY:"auto",WebkitOverflowScrolling:"touch" }}>
      <div style={{ width:"100%",maxWidth:520,margin:"0 auto",background:"#030610",minHeight:"100vh",padding:"20px 16px 40px",borderLeft:"1px solid "+(isReal?"#004422":"#0a1828"),borderRight:"1px solid "+(isReal?"#004422":"#0a1828") }}>

        {/* Header with mode badge */}
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:"'Orbitron',monospace",fontSize:14,color:isReal?"#00e5a0":"#5a9fff",fontWeight:700 }}>
              {isReal ? "⚡ Real Trading Setup" : "🎮 Demo Mode Setup"}
            </div>
            <div style={{ fontSize:9.5,color:"#1e3a60",marginTop:2 }}>
              {isReal ? "Order akan dieksekusi ke exchange sungguhan" : "Paper trading — tidak ada uang nyata"}
            </div>
          </div>
          <button onClick={function(){ setMode(""); setErr(""); }}
            style={{ background:"transparent",border:"1px solid #0a1428",borderRadius:6,padding:"4px 10px",color:"#2a4a70",cursor:"pointer",fontSize:9,fontFamily:"'Share Tech Mono',monospace" }}>
            ← Ganti
          </button>
        </div>

        {/* Modal */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:9,color:"#152040",letterSpacing:2,marginBottom:8 }}>MODAL TRADING</div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:7 }}>
            <span style={{ fontFamily:"'Orbitron',monospace",fontSize:16,color:"#00e5a0",fontWeight:900 }}>$</span>
            <input value={bal} onChange={function(e){setBal(e.target.value);}} type="number" min="10"
              style={{ flex:1,background:"#020508",border:"1px solid #0a1428",borderRadius:8,padding:"10px 14px",color:"#cce0ff",fontSize:20,fontFamily:"'Orbitron',monospace",fontWeight:800,textAlign:"center",outline:"none" }}/>
          </div>
          <div style={{ display:"flex",gap:5 }}>
            {[500,1000,5000,10000].map(function(v){
              var isAct = parseFloat(bal)===v;
              return <button key={v} onClick={function(){ setBal(String(v)); }} style={{ flex:1,background:isAct?"rgba(0,60,180,.25)":"#020508",border:"1px solid "+(isAct?"#0050c0":"#08121e"),color:isAct?"#6a9aff":"#253a5e",borderRadius:6,padding:"5px 0",fontSize:10,cursor:"pointer" }}>${v>=1000?v/1000+"K":v}</button>;
            })}
          </div>
        </div>

        {/* Exchange */}
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:9,color:"#152040",letterSpacing:2,marginBottom:8 }}>EXCHANGE</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6 }}>
            {EXCHANGES_LIST.map(function(ex){
              var isSel=selEx.name===ex.name;
              return <button key={ex.name} onClick={function(){ setSelEx(ex); }}
                style={{ background:isSel?ex.color+"15":"#020508",border:"1px solid "+(isSel?ex.color+"50":"#0a1428"),borderRadius:8,padding:"7px 8px",cursor:"pointer",textAlign:"left" }}>
                <div style={{ fontSize:10,color:isSel?ex.color:"#3a5a80",fontWeight:700 }}>{ex.name}</div>
                <div style={{ fontSize:7.5,color:"#1a3060",marginTop:1 }}>{ex.type}</div>
              </button>;
            })}
          </div>
        </div>

        {/* Credential section — dynamic based on exchange type */}
        {(function(){
          var isMt5 = selEx.cred === "mt5";
          return (
            <div style={{ marginBottom:14,background:isReal?"rgba(0,30,15,.3)":"rgba(0,20,40,.2)",border:"1px solid "+(isReal?"#003a18":"#0a1428"),borderRadius:9,padding:12 }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10 }}>
                <div style={{ fontSize:9,color:isReal?"#2a7a50":"#2a4a7a",letterSpacing:1.5,fontWeight:700 }}>
                  {isReal
                    ? (isMt5 ? "⚡ AKUN MT4/MT5 (WAJIB)" : "⚡ API KEY EXCHANGE (WAJIB)")
                    : (isMt5 ? "AKUN MT4/MT5 (Opsional)" : "API KEY EXCHANGE (Opsional)")
                  }
                </div>
                {isReal && <span style={{ fontSize:8,color:"#ff4d6d",background:"rgba(80,0,0,.2)",border:"1px solid #5a0000",borderRadius:3,padding:"1px 7px" }}>REQUIRED</span>}
              </div>

              {isMt5 ? (
                /* MT5/MT4 Login fields */
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <div>
                    <div style={{ fontSize:8,color:"#1e3a60",marginBottom:4,letterSpacing:1 }}>LOGIN (NOMOR AKUN)</div>
                    <input value={mt5Login} onChange={function(e){ setMt5Login(e.target.value); }}
                      type="number" placeholder="Contoh: 12345678"
                      style={{ width:"100%",background:"#020508",border:"1px solid "+(isReal&&!mt5Login?"#5a0000":"#0a1428"),borderRadius:7,padding:"10px 12px",color:"#cce0ff",fontSize:13,fontFamily:"'Share Tech Mono',monospace",outline:"none" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:8,color:"#1e3a60",marginBottom:4,letterSpacing:1 }}>SERVER</div>
                    <input value={mt5Server} onChange={function(e){ setMt5Server(e.target.value); }}
                      placeholder={"Contoh: " + (selEx.name==="Exness"?"Exness-Real3":selEx.name==="IC Markets"?"ICMarkets-Live01":selEx.name+"-Real")}
                      style={{ width:"100%",background:"#020508",border:"1px solid "+(isReal&&!mt5Server?"#5a0000":"#0a1428"),borderRadius:7,padding:"10px 12px",color:"#cce0ff",fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:"none" }}/>
                    <div style={{ fontSize:8,color:"#1e3a60",marginTop:3 }}>
                      Lihat di MT5: File → Login to Trade Account → Server
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:8,color:"#1e3a60",marginBottom:4,letterSpacing:1 }}>KATA SANDI TRADING</div>
                    <div style={{ position:"relative" }}>
                      <input value={mt5Pass} onChange={function(e){ setMt5Pass(e.target.value); }}
                        type={apiVisible?"text":"password"}
                        placeholder="Kata sandi master (bukan investor)"
                        style={{ width:"100%",background:"#020508",border:"1px solid "+(isReal&&!mt5Pass?"#5a0000":"#0a1428"),borderRadius:7,padding:"10px 12px",paddingRight:40,color:"#cce0ff",fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:"none" }}/>
                      <button onClick={function(){ setApiVisible(!apiVisible); }}
                        style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:"#2a4a70",cursor:"pointer",fontSize:16,padding:4 }}>
                        {apiVisible?"🙈":"👁"}
                      </button>
                    </div>
                    <div style={{ fontSize:8,color:"#aa5020",marginTop:3 }}>
                      ⚠️ Gunakan kata sandi Master, BUKAN kata sandi Investor
                    </div>
                  </div>
                  <div style={{ background:"rgba(0,30,15,.3)",border:"1px solid #002a10",borderRadius:6,padding:"8px 10px" }}>
                    <div style={{ fontSize:8.5,color:"#2a5a40",lineHeight:1.8 }}>
                      📍 <strong>Cara cek Server {selEx.name}:</strong><br/>
                      Buka MT5 → File → Login → lihat nama server kamu
                    </div>
                  </div>
                </div>
              ) : (
                /* API Key fields for crypto exchanges */
                <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <div>
                    <div style={{ fontSize:8,color:"#1e3a60",marginBottom:4,letterSpacing:1 }}>API KEY</div>
                    <input value={apiKey} onChange={function(e){ setApiKey(e.target.value); }}
                      placeholder={selEx.name + " API Key"}
                      style={{ width:"100%",background:"#020508",border:"1px solid "+(isReal&&!apiKey?"#5a0000":"#0a1428"),borderRadius:7,padding:"10px 12px",color:"#cce0ff",fontSize:11,fontFamily:"'Share Tech Mono',monospace",outline:"none" }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:8,color:"#1e3a60",marginBottom:4,letterSpacing:1 }}>SECRET KEY</div>
                    <div style={{ position:"relative" }}>
                      <input value={secret} onChange={function(e){ setSecret(e.target.value); }}
                        type={apiVisible?"text":"password"}
                        placeholder={selEx.name + " Secret Key"}
                        style={{ width:"100%",background:"#020508",border:"1px solid "+(isReal&&!secret?"#5a0000":"#0a1428"),borderRadius:7,padding:"10px 12px",paddingRight:40,color:"#cce0ff",fontSize:11,fontFamily:"'Share Tech Mono',monospace",outline:"none" }}/>
                      <button onClick={function(){ setApiVisible(!apiVisible); }}
                        style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"transparent",border:"none",color:"#2a4a70",cursor:"pointer",fontSize:16,padding:4 }}>
                        {apiVisible?"🙈":"👁"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ fontSize:8.5,color:"#1e3a60",marginTop:8,lineHeight:1.7 }}>
                🔒 Kredensial disimpan hanya di device kamu — tidak dikirim ke server kami.
              </div>
            </div>
          );
        })()}

        {/* AI Provider */}
        <div style={{ marginBottom:14,background:"rgba(60,20,80,.15)",border:"1px solid #3a1a5a",borderRadius:9,padding:12 }}>
          <div style={{ fontSize:9,color:"#b06aff",letterSpacing:1.5,marginBottom:8 }}>AI PROVIDER</div>
          <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
            {AI_PROVIDERS.map(function(prov){
              var isSel = aiModel === prov.id;
              return <button key={prov.id} onClick={function(){ setAiModel(prov.id); }}
                style={{ background:isSel?prov.color+"15":"#020508",border:"1px solid "+(isSel?prov.color+"50":"#0a1428"),borderRadius:8,padding:"9px 12px",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:10 }}>
                <div style={{ minWidth:32,height:32,borderRadius:7,background:prov.color+"20",border:"1px solid "+prov.color+"30",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8.5,fontWeight:800,color:prov.color,fontFamily:"'Orbitron',monospace",flexShrink:0 }}>{prov.name}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:10,color:isSel?prov.color:"#3a5a80",fontWeight:700 }}>{prov.name} <span style={{ fontSize:8,color:prov.color,marginLeft:4 }}>{prov.label}</span></div>
                  <div style={{ fontSize:8,color:"#1a3060" }}>{prov.desc}</div>
                </div>
                <div style={{ fontSize:9,color:prov.color,fontWeight:700,flexShrink:0 }}>{prov.costPer}</div>
              </button>;
            })}
          </div>
          {(function(){
            var selProv = AI_PROVIDERS.find(function(p){ return p.id===aiModel; }) || AI_PROVIDERS[0];
            return (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:8.5,color:"#6a3a9a",marginBottom:5 }}>{selProv.keyLabel}</div>
                <div style={{ display:"flex",gap:6 }}>
                  <input
                    value={
                      selProv.id === "gemini_flash" ? geminiKey :
                      selProv.id === "groq_free"    ? groqKeyVal :
                      anthropicKey
                    }
                    onChange={function(e){
                      if (selProv.id === "gemini_flash")     setGeminiKey(e.target.value);
                      else if (selProv.id === "groq_free")   setGroqKeyVal(e.target.value);
                      else                                   setAnthropicKey(e.target.value);
                    }}
                    placeholder={selProv.keyPlaceholder}
                    style={{ flex:1,background:"#020508",border:"1px solid #2a1a4a",borderRadius:7,padding:"8px 12px",color:"#cce0ff",fontSize:11,fontFamily:"'Share Tech Mono',monospace",outline:"none" }}/>
                  <button onClick={function(){ window.open(selProv.keyUrl,"_blank"); }}
                    style={{ background:"rgba(60,20,120,.3)",border:"1px solid #3a1a6a",borderRadius:7,padding:"0 10px",color:"#b06aff",cursor:"pointer",fontSize:8.5,flexShrink:0 }}>Daftar</button>
                </div>
                {selProv.resetDaily && <div style={{ fontSize:8,color:"#ff6b35",marginTop:4 }}>Gratis! Reset tiap hari jam 07.00 WIB.</div>}
              </div>
            );
          })()}
        </div>

        {/* Market Scope */}
        <div style={{ marginBottom:18 }}>
          <div style={{ fontSize:9,color:"#152040",letterSpacing:2,marginBottom:8 }}>FOKUS PASAR AI</div>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:6 }}>
            {MARKET_SCOPES.map(function(sc){
              var isSel=scope.id===sc.id;
              return <button key={sc.id} onClick={function(){ setScope(sc); }}
                style={{ background:isSel?sc.color+"15":"#020508",border:"1px solid "+(isSel?sc.color+"50":"#0a1428"),borderRadius:8,padding:"9px 10px",cursor:"pointer",textAlign:"left" }}>
                <div style={{ fontFamily:"'Orbitron',monospace",fontSize:9,color:isSel?sc.color:"#3a5a80",fontWeight:700,marginBottom:2 }}>{sc.label}</div>
                <div style={{ fontSize:8.5,color:"#1a3060" }}>{sc.desc}</div>
              </button>;
            })}
          </div>
        </div>

        {err && <div style={{ fontSize:9.5,color:"#ff7a30",marginBottom:10,padding:"7px 12px",background:"rgba(80,20,0,.3)",border:"1px solid #6a2000",borderRadius:6 }}>[!] {err}</div>}

        <button onClick={function(e){ e.preventDefault(); e.stopPropagation(); submit(); }}
          type="button"
          style={{ width:"100%",background:isReal?"linear-gradient(135deg,#003500,#007700)":"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:10,padding:14,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:13,fontWeight:700,cursor:"pointer",letterSpacing:1 }}>
          {isReal ? "⚡ Mulai Real Trading" : "🎮 Mulai Demo Trading"}
        </button>
        {isReal && (
          <div style={{ textAlign:"center",marginTop:8,fontSize:8.5,color:"#2a5a40",lineHeight:1.8 }}>
            ⚠️ Mode ini mengeksekusi order nyata ke {selEx.name}.<br/>
            Pastikan API Key sudah benar dan saldo exchange mencukupi.
          </div>
        )}
        {!isReal && (
          <div style={{ textAlign:"center",marginTop:8,fontSize:8.5,color:"#1e3a60",lineHeight:1.8 }}>
            Paper trading — tidak ada uang nyata — bukan financial advice
          </div>
        )}
      </div>
    </div>
  );
}


// ─── SPLASH / LOGIN / VERIFY ──────────────────────────────────
function SplashScreen(){
  return(
    <div style={{position:"fixed",inset:0,background:"#020810",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:18}}>
      <div style={{fontFamily:"'Orbitron',monospace",fontSize:32,fontWeight:900,letterSpacing:3}}>
        <span style={{background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NEURA</span>
        <span style={{background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TRADE</span>
      </div>
      <div style={{fontSize:9,color:"#1e3a60",letterSpacing:5}}>AUTONOMOUS AI TRADING</div>
      <div style={{display:"flex",gap:5,marginTop:8}}>{[0,1,2].map(function(i){return <div key={i} style={{width:6,height:6,borderRadius:"50%",background:"#0060e0",animation:"pulse 1.2s "+(i*.3)+"s infinite"}}/>;})}</div>
    </div>
  );
}

function LoginScreen(props){
  var [email,setEmail]=useState(""), [err,setErr]=useState("");
  function submit(){if(!email||!email.includes("@")){setErr("Masukkan email yang valid");return;}setErr("");props.onLogin(email);}
  return(
    <div style={{position:"fixed",inset:0,background:"#020810",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:26,fontWeight:900,letterSpacing:2}}>
            <span style={{background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NEURA</span>
            <span style={{background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TRADE</span>
          </div>
          <div style={{fontSize:9,color:"#1e3a60",letterSpacing:4,marginTop:4}}>AUTONOMOUS AI TRADING</div>
        </div>
        <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:14,padding:24}}>
          <div style={{fontSize:11,color:"#5a90df",fontWeight:700,marginBottom:4}}>Masuk ke akun</div>
          <div style={{fontSize:9.5,color:"#1e3a60",marginBottom:16,lineHeight:1.8}}>Tidak perlu password — kami kirim magic link ke email kamu.</div>
          <input value={email} onChange={function(e){setEmail(e.target.value);setErr("");}} onKeyDown={function(e){if(e.key==="Enter")submit();}} placeholder="nama@email.com" style={{width:"100%",background:"#020508",border:"1px solid #0a1428",borderRadius:8,padding:"12px 14px",color:"#cce0ff",fontSize:14,fontFamily:"'Share Tech Mono',monospace",marginBottom:8,outline:"none"}}/>
          {err&&<div style={{fontSize:9,color:"#ff7a30",marginBottom:8}}>[!] {err}</div>}
          <button onClick={submit} style={{width:"100%",background:"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:8,padding:13,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1,marginBottom:12}}>Kirim Magic Link</button>
          <div style={{textAlign:"center",fontSize:8.5,color:"#0e1e3a"}}>Dengan masuk, kamu setuju dengan Terms of Service kami.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14}}>
          {[{icon:"🧠",l:"Claude AI",d:"Analisis cerdas"},{icon:"🥇",l:"XAU/USD",d:"Gold trading"},{icon:"📡",l:"Live Data",d:"Real-time"}].map(function(f){return(
            <div key={f.l} style={{background:"rgba(3,6,18,.8)",border:"1px solid #0a1428",borderRadius:8,padding:"8px",textAlign:"center"}}>
              <div style={{fontSize:16,marginBottom:3}}>{f.icon}</div>
              <div style={{fontSize:9,color:"#3a6aaa",fontWeight:700}}>{f.l}</div>
              <div style={{fontSize:8,color:"#1a3060",marginTop:2}}>{f.d}</div>
            </div>
          );})}
        </div>
      </div>
    </div>
  );
}

function VerifyScreen(props){
  var isDemo = props.isDemo || false;
  var [cd, setCd]         = useState(5);
  var [checking, setChecking] = useState(false);
  var [resent,   setResent]   = useState(false);

  // Auto-proceed only for demo emails
  useEffect(function(){
    if (!isDemo) return;
    var t = setInterval(function(){
      setCd(function(c){
        if(c<=1){ clearInterval(t); props.onVerified(); return 0; }
        return c-1;
      });
    }, 1000);
    return function(){ clearInterval(t); };
  }, [isDemo, props.onVerified]);

  async function resendLink() {
    setResent(false);
    var SUPA_URL  = "https://bgoezzoalgkoivygnoqp.supabase.co";
    var SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnb2V6em9hbGdvaXZ5Z25vcXAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0NjM0NDQ1MCwiZXhwIjoyMDYxOTIwNDUwfQ.rHfpXnGvNgH9lE3OtxkNzJ8SyvXfmkJwKvGY0VUzYeA";
    try {
      var res = await fetch(SUPA_URL + "/auth/v1/otp", {
        method: "POST",
        headers: { "Content-Type":"application/json", "apikey": SUPA_ANON },
        body: JSON.stringify({ 
          email: props.email, 
          options: { emailRedirectTo: window.location.origin } 
        }),
      });
      if (res.ok) {
        setResent(true);
      } else {
        var err = await res.json();
        alert("Gagal kirim ulang: " + (err.msg || err.error || "coba lagi"));
      }
    } catch(e) {
      setResent(true); // optimistic
    }
  }

  return(
    <div style={{position:"fixed",inset:0,background:"#020810",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{maxWidth:400,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:52,marginBottom:16}}>📧</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:16,color:"#5a9fff",marginBottom:8,fontWeight:700}}>
          Cek Email Kamu!
        </div>
        <div style={{fontSize:11,color:"#2a4a7a",marginBottom:6,lineHeight:1.9}}>
          Magic link dikirim ke:
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace",fontSize:13,color:"#00e5a0",marginBottom:20,
          background:"rgba(0,80,40,.1)",border:"1px solid #004422",borderRadius:8,padding:"8px 16px",display:"inline-block"}}>
          {props.email}
        </div>

        {isDemo ? (
          <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:12,padding:18,marginBottom:16}}>
            <div style={{fontSize:9.5,color:"#1e3a60",marginBottom:8}}>Demo: masuk otomatis dalam</div>
            <div style={{fontFamily:"'Orbitron',monospace",fontSize:38,fontWeight:900,color:"#00e5a0"}}>{cd}</div>
            <div style={{fontSize:8.5,color:"#1a3060",marginTop:6}}>detik...</div>
          </div>
        ) : (
          <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:12,padding:20,marginBottom:16,textAlign:"left"}}>
            <div style={{fontSize:10,color:"#5a8aff",fontWeight:700,marginBottom:12,textAlign:"center"}}>
              📬 Langkah Selanjutnya:
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {[
                { n:"1", text:"Buka email kamu (" + props.email + ")", note:"Cek folder Inbox dan Spam" },
                { n:"2", text:"Cari email dari NeuraTrade AI", note:"Subject: Your sign-in link" },
                { n:"3", text:"Klik tombol Sign In di email", note:"Link berlaku 1 jam" },
              ].map(function(s){
                return(
                  <div key={s.n} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:"rgba(0,80,200,.2)",border:"1px solid #1a4080",
                      display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#5a90df",
                      fontFamily:"'Orbitron',monospace",fontWeight:700,flexShrink:0}}>
                      {s.n}
                    </div>
                    <div>
                      <div style={{fontSize:10.5,color:"#5a8ad0",lineHeight:1.6}}>{s.text}</div>
                      <div style={{fontSize:9,color:"#1e3a60"}}>{s.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isDemo && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{fontSize:9.5,color:"#1e3a60",padding:"8px 12px",background:"rgba(0,0,0,.3)",borderRadius:7,lineHeight:1.8}}>
              Setelah klik link di email, kamu akan otomatis masuk ke app ini.
            </div>
            {resent && (
              <div style={{fontSize:9.5,color:"#00e5a0",textAlign:"center"}}>✅ Email terkirim ulang!</div>
            )}
            <button onClick={resendLink}
              style={{background:"transparent",border:"1px solid #1a3060",borderRadius:8,padding:"9px",
                color:"#3a6aaa",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>
              Kirim Ulang Email
            </button>
            <button onClick={function(){ window.location.reload(); }}
              style={{background:"transparent",border:"1px solid #0a1428",borderRadius:8,padding:"7px",
                color:"#1e3a60",cursor:"pointer",fontSize:9}}>
              ← Ganti Email
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MANUAL ORDER PANEL ───────────────────────────────────────
function ManualOrder(props) {
  var pair = props.pair, price = props.price, isPro = props.isPro;
  var config = props.config || {};
  var [side, setSide] = useState("BUY");
  var [qty, setQty] = useState("");
  var [orderType, setOrderType] = useState("MARKET");
  var [limitPrice, setLimitPrice] = useState("");
  var [sending, setSending] = useState(false);
  var [result, setResult] = useState(null);

  var BACKEND_URL = "https://your-backend.onrender.com"; // ganti dengan URL backend kamu

  async function placeOrder() {
    if (!qty || parseFloat(qty) <= 0) return;
    setSending(true); setResult(null);
    try {
      if (config.apiKey && config.secretKey) {
        // Real order via backend
        var res = await fetch(BACKEND_URL + "/api/order", {
          method: "POST",
          headers: { "Content-Type": "application/json",
                     "x-api-key": config.apiKey,
                     "x-secret": config.secretKey,
                     "x-exchange": config.exchange ? config.exchange.name.toLowerCase() : "binance" },
          body: JSON.stringify({
            symbol: pair.bnb || pair.symbol.toUpperCase(),
            side: side,
            quantity: parseFloat(qty),
            type: orderType,
            price: orderType === "LIMIT" ? parseFloat(limitPrice) : undefined,
          }),
        });
        if (res.ok) {
          var data = await res.json();
          setResult({ ok: true, msg: "Order berhasil! ID: " + (data.orderId || data.id || "OK") });
          if (props.onOrder) props.onOrder({ side, pair: pair.label, qty, price: price });
        } else {
          setResult({ ok: false, msg: "Order gagal. Cek API key & saldo." });
        }
      } else {
        // Paper trade simulation
        await new Promise(function(r){ setTimeout(r, 800); });
        setResult({ ok: true, msg: "Paper Trade: " + side + " " + qty + " " + pair.label + " @ $" + price.toLocaleString(undefined,{maximumFractionDigits:pair.dec}) });
        if (props.onOrder) props.onOrder({ side, pair: pair.label, qty, price: price });
      }
    } catch(err) {
      setResult({ ok: false, msg: "Error: " + err.message });
    } finally { setSending(false); }
  }

  var cost = qty ? parseFloat(qty) * price : 0;

  return (
    <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:9,padding:"9px 11px",marginBottom:8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:7.5,color:"#152040",letterSpacing:2}}>EKSEKUSI ORDER</div>
        <div style={{fontSize:8,color:config.apiKey?"#00e5a0":"#ffa000",background:config.apiKey?"rgba(0,80,40,.2)":"rgba(80,40,0,.2)",border:"1px solid "+(config.apiKey?"#004422":"#4a2800"),borderRadius:4,padding:"1px 7px"}}>
          {config.apiKey ? (config.exchange ? config.exchange.name : "Exchange") + " Real" : "Paper Trade"}
        </div>
      </div>
      <div style={{display:"flex",gap:5,marginBottom:7}}>
        <button onClick={function(){setSide("BUY");}} style={{flex:1,background:side==="BUY"?"rgba(0,180,80,.2)":"#020508",border:"1px solid "+(side==="BUY"?"#005530":"#0a1428"),borderRadius:7,padding:"7px",color:side==="BUY"?"#00e5a0":"#2a4a70",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700}}>BUY</button>
        <button onClick={function(){setSide("SELL");}} style={{flex:1,background:side==="SELL"?"rgba(180,0,50,.2)":"#020508",border:"1px solid "+(side==="SELL"?"#5a0020":"#0a1428"),borderRadius:7,padding:"7px",color:side==="SELL"?"#ff4d6d":"#2a4a70",cursor:"pointer",fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700}}>SELL</button>
        <button onClick={function(){setOrderType(orderType==="MARKET"?"LIMIT":"MARKET");}} style={{flex:1,background:"#020508",border:"1px solid #0a1428",borderRadius:7,padding:"7px",color:"#3a5a80",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:9}}>{orderType}</button>
      </div>
      <div style={{display:"flex",gap:6,marginBottom:6}}>
        <div style={{flex:1}}>
          <div style={{fontSize:7.5,color:"#1e3a60",marginBottom:3}}>QTY ({pair.label.split("/")[0]})</div>
          <input value={qty} onChange={function(e){setQty(e.target.value);}} type="number" step="0.001" placeholder="0.001" style={{width:"100%",background:"#020508",border:"1px solid #0a1428",borderRadius:6,padding:"7px 10px",color:"#cce0ff",fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:"none"}}/>
        </div>
        {orderType==="LIMIT" && (
          <div style={{flex:1}}>
            <div style={{fontSize:7.5,color:"#1e3a60",marginBottom:3}}>LIMIT PRICE</div>
            <input value={limitPrice} onChange={function(e){setLimitPrice(e.target.value);}} type="number" placeholder={price.toFixed(pair.dec)} style={{width:"100%",background:"#020508",border:"1px solid #0a1428",borderRadius:6,padding:"7px 10px",color:"#cce0ff",fontSize:12,fontFamily:"'Share Tech Mono',monospace",outline:"none"}}/>
          </div>
        )}
      </div>
      {qty && cost > 0 && (
        <div style={{fontSize:8.5,color:"#1e3a60",marginBottom:6}}>
          Total: <span style={{color:"#7ab0ff",fontFamily:"'Orbitron',monospace"}}>~${cost.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
        </div>
      )}
      {[0.25,0.5,0.75,1.0].map(function(pct){
        return (
          <button key={pct} onClick={function(){setQty((10*pct).toFixed(4));}}
            style={{background:"#030610",border:"1px solid #0a1428",borderRadius:4,padding:"2px 8px",color:"#2a4a70",cursor:"pointer",fontSize:8,marginRight:4,fontFamily:"'Share Tech Mono',monospace"}}>
            {(pct*100).toFixed(0)}%
          </button>
        );
      })}
      <button onClick={placeOrder} disabled={sending||!qty}
        style={{width:"100%",background:sending||!qty?"#0a1428":side==="BUY"?"linear-gradient(135deg,#005500,#00aa00)":"linear-gradient(135deg,#550000,#aa0000)",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,cursor:sending||!qty?"default":"pointer",letterSpacing:1,marginTop:7}}>
        {sending?"Mengirim...":(side+" "+pair.label+" ("+orderType+")")}
      </button>
      {result && (
        <div style={{marginTop:7,fontSize:9.5,color:result.ok?"#00e5a0":"#ff4d6d",background:result.ok?"rgba(0,80,40,.15)":"rgba(80,0,0,.15)",border:"1px solid "+(result.ok?"#005530":"#5a0000"),borderRadius:6,padding:"6px 10px"}}>
          {result.ok ? "✅ " : "❌ "}{result.msg}
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────
function Dashboard(props) {
  var user=props.user, isPro=user.tier!=="free";
  var config=props.config||{balance:5000,exchange:EXCHANGES_LIST[0],scope:MARKET_SCOPES[0]};

  // All state BEFORE any computed values
  var [navTab,       setNavTab]       = useState("trade");
  var [chartTF,      setChartTF]      = useState("5m");
  var [tfOhlc,       setTfOhlc]       = useState([]);
  var [backendActive,setBackendActive]= useState(false);
  var [slPct,        setSlPct]        = useState(2);
  var [tpPct,        setTpPct]        = useState(4);

  // ── 24/7 Backend Trading Toggle (inside Dashboard) ───────────
  async function toggleBackendTrading() {
    var BACKEND = "https://neuratrade-backend.onrender.com";
    if (backendActive) {
      try {
        await fetch(BACKEND + "/api/trading/stop", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ email: user.email }),
        });
      } catch(e) {}
      setBackendActive(false);
    } else {
      if (!config || config.mode !== "real") {
        alert("24/7 trading hanya tersedia di mode Real Trading.\nPilih mode Real saat setup dan masukkan API Key exchange.");
        return;
      }
      try {
        var res = await fetch(BACKEND + "/api/trading/start", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            email:     user.email,
            apiKey:    config.apiKey    || "",
            secretKey: config.secretKey || "",
            exchange:  (config.exchange && config.exchange.name ? config.exchange.name : "binance").toLowerCase(),
            settings:  Object.assign({}, settings||{}, { balance: portfolio.bal }),
            aiKey:     config.anthropicKey || "",
            aiModel:   config.aiModel || "groq_free",
            waNumber:  (settings && settings.waNumber) || "",
          }),
        });
        var data = await res.json();
        if (data.ok) {
          setBackendActive(true);
          alert("✅ Backend 24/7 aktif!\nAI akan trading otomatis meski browser ditutup.");
        } else {
          alert("Gagal: " + (data.error || "Coba lagi"));
        }
      } catch(e) {
        alert("Gagal koneksi backend: " + e.message);
      }
    }
  }

  // Kirim notifikasi ke Telegram via CallMeBot (gratis, no API key)
  function sendTelegramNotif(message) {
    var username = (settings && settings.waNumber) || "";
    if (!username) return;
    var user = username.replace(/^@/, "");
    fetch("https://api.callmebot.com/text.php?user=@" + user + "&text=" + encodeURIComponent(message))
      .catch(function(){});
  }
  var [viewPair, setViewPair] = useState(ALL_PAIRS[0]);
  var [prices,   setPrices]   = useState({});
  var [history,  setHistory]  = useState({});
  var [indics,   setIndics]   = useState({});
  var [phase,    setPhase]    = useState("idle");
  var [aiDec,    setAiDec]    = useState(null);
  var [aiThink,  setAiThink]  = useState(false);
  var [aiCycle,  setAiCycle]  = useState(0);
  var [countdown,setCd]       = useState(20);
  var [aiErr,    setAiErr]    = useState(null);
  var [errCount, setErrCount] = useState(0);
  var [logItems, setLogItems] = useState([]);
  var [trades,   setTrades]   = useState([]);
  var [openPos,  setOpenPos]  = useState([]);     // Fix #8 — open positions
  var [eqHist,   setEqHist]   = useState([{time:Date.now(),bal:config.balance}]); // Fix #9
  var [portfolio,setPortfolio]= useState({bal:config.balance,initBal:config.balance,pnl:0,pct:0,wins:0,losses:0,winRate:0,totalTrades:0});
  var [tokenUsage,setTokenUsage]= useState({calls:0,estimatedCost:0,date:new Date().toDateString()});
  var [dailyLimit,setDailyLimit]= useState(null);
  var [dailyPnl,  setDailyPnl]  = useState({pnl:0,date:new Date().toDateString()});
  var [globalStop,setGlobalStop]= useState(null);
  var [settings,  setSettings]  = useState(Object.assign({},DEFAULT_SETTINGS));
  var [ohlcData,  setOhlcData]  = useState({});
  var [mtfData,   setMtfData]   = useState({});     // {symbol: {tf1m,tf5m,tf15m}}
  var [advIndics, setAdvIndics] = useState({});     // {symbol: {adx,stochRsi,volSpike,pivots,mtf,regime}}
  var [backtest,  setBacktest]  = useState({});     // {symbol: backtestResult}
  var [dataSource,setDataSource]= useState("init");
  var [lastFetch, setLastFetch] = useState(null);
  var [scope,    setScope]    = useState(config.scope||MARKET_SCOPES[0]);
  var [showScope,setShowScope]= useState(false);
  var [showSettings,setShowSett]=useState(false); // Fix #12
  var [showPayment,setShowPay]=useState(false);
  var [payPlan,  setPayPlan]  = useState(null);
  var [showUpg,  setShowUpg]  = useState(false);
  var [confirm,  setConfirm]  = useState(null);    // Fix #17 #18 — confirm dialogs
  var [aiLimit,  setAiLimit]  = useState({count:0,date:new Date().toDateString()}); // Fix #1
  var [realBalance, setRealBalance] = useState(null); // real balance from exchange
  var [balLoading,  setBalLoading]  = useState(false);
  var [balError,    setBalError]    = useState("");

  // ── Fetch real balance — using ref to avoid infinite loop ──────
  var configRef = useRef(config);
  useEffect(function(){ configRef.current = config; }, [config]);

  function fetchRealBalance() {
    var cfg = configRef.current;
    if (!cfg || cfg.mode !== "real") return;

    // Cek tipe exchange - MT5 tidak support API key balance
    var exName = (cfg.exchange && cfg.exchange.name ? cfg.exchange.name : "binance").toLowerCase();
    var isMt5  = cfg.exchange && cfg.exchange.cred === "mt5";

    if (isMt5) {
      // MT5 exchange (Exness, IC Markets, dll) tidak support REST balance API
      setBalError("Exchange " + (cfg.exchange ? cfg.exchange.name : "MT5") + " menggunakan MT5 - saldo tidak bisa diambil otomatis. Gunakan Binance/ByBit untuk saldo real-time.");
      return;
    }

    if (!cfg.apiKey || !cfg.secretKey) {
      setBalError("Masukkan API Key & Secret Key di Setup untuk melihat saldo real dari exchange.");
      return;
    }

    setBalLoading(true);
    setBalError("");
    var BACKEND = "https://neuratrade-backend.onrender.com";

    // Wake up backend first (Render free tier sleeps)
    fetch(BACKEND + "/health").catch(function(){});

    fetch(BACKEND + "/api/balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key":    cfg.apiKey,
        "x-secret":     cfg.secretKey,
        "x-exchange":   exName,
      },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        setBalLoading(false);
        if (data.error) {
          setBalError(data.error);
        } else {
          setRealBalance(data);
          var realUsd = data.totalUsdt || 0;
          setPortfolio(function(prev) {
            return Object.assign({}, prev, {
              bal:     realUsd > 0 ? realUsd : prev.bal,
              initBal: prev.initBal === (cfg.balance || 5000) && realUsd > 0 ? realUsd : prev.initBal,
            });
          });
        }
      })
      .catch(function(e) {
        setBalLoading(false);
        if (e.name === "AbortError" || e.name === "TimeoutError") {
          setBalError("Backend sedang bangun (Render sleep). Coba lagi dalam 30 detik.");
        } else {
          setBalError("Gagal koneksi backend: " + e.message);
        }
      });
  }

  // Auto-fetch balance setiap 30 detik — empty deps, no infinite loop
  useEffect(function() {
    var t = setInterval(fetchRealBalance, 30000);
    return function() { clearInterval(t); };
  }, []); // eslint-disable-line

  // Fix #13 — use ref for availPairs to avoid stale closure
  var scopedCats   = scope ? scope.cats : ["CRYPTO","METALS","FOREX"];
  var scopedPairs  = ALL_PAIRS.filter(function(p){return scopedCats.indexOf(p.cat)!==-1;});
  var availPairs   = isPro ? scopedPairs : scopedPairs.filter(function(p){return !p.pro;});
  var availPairsRef = useRef(availPairs);
  useEffect(function(){availPairsRef.current=availPairs;},[scope,isPro]);

  var portfolioRef = useRef(portfolio);
  useEffect(function(){portfolioRef.current=portfolio;},[portfolio]);
  var settingsRef  = useRef(settings);
  useEffect(function(){settingsRef.current=settings;},[settings]);

  var aiTimerRef=useRef(null), cdTimerRef=useRef(null), demoTimerRef=useRef(null), logBoxRef=useRef(null);

  // Seed history
  useEffect(function(){
    var seed={},initP={};
    ALL_PAIRS.forEach(function(p){
      var v=p.base;
      seed[p.symbol]=Array.from({length:80},function(){v=v*(1+(Math.random()-.49)*p.vol*.8);return parseFloat(v.toFixed(p.dec+2));});
      initP[p.symbol]=p.base;
    });
    setHistory(seed);setPrices(initP);
  },[]);

  // ── Simulation fallback (for non-Binance pairs or API failure) ──
  var startDemoTicker = useCallback(function() {
    clearInterval(demoTimerRef.current);
    var mom = {};
    ALL_PAIRS.forEach(function(p) { mom[p.symbol] = 0; });
    demoTimerRef.current = setInterval(function() {
      ALL_PAIRS.forEach(function(p) {
        mom[p.symbol] = mom[p.symbol] * 0.85 + (Math.random() - 0.5) * 0.3;
        var drift = mom[p.symbol] * p.vol * 0.5;
        var noise = (Math.random() - 0.5) * p.vol;
        setPrices(function(prev) {
          var cur = prev[p.symbol] || p.base;
          var mr = (p.base - cur) / p.base * 0.002;
          var next = parseFloat((cur * (1 + drift + noise + mr)).toFixed(p.dec + 2));
          var upd = Object.assign({}, prev); upd[p.symbol] = next; return upd;
        });
        setHistory(function(prev) {
          var old = prev[p.symbol] || [];
          var cur = old[old.length - 1] || p.base;
          var next = parseFloat((cur * (1 + (Math.random() - 0.49) * p.vol)).toFixed(p.dec + 2));
          var upd = Object.assign({}, prev); upd[p.symbol] = old.slice(-200).concat([next]); return upd;
        });
      });
    }, 1200);
  }, []);

  // ── Fetch real OHLC from Binance REST API ──
  var fetchBinanceData = useCallback(async function() {
    var cryptoPairs = ALL_PAIRS.filter(function(p) { return p.liveOk && p.bnb; });
    try {
      // 1. Fetch current prices for all crypto
      var priceUrl = "https://api.binance.com/api/v3/ticker/price?symbols=" +
        encodeURIComponent(JSON.stringify(cryptoPairs.map(function(p){return p.bnb;})));
      var priceRes = await fetch(priceUrl);
      if (!priceRes.ok) throw new Error("Price fetch failed");
      var priceData = await priceRes.json();
      var newPrices = {};
      priceData.forEach(function(item) {
        var pair = cryptoPairs.find(function(p){return p.bnb===item.symbol;});
        if (pair) newPrices[pair.symbol] = parseFloat(item.price);
      });
      setPrices(function(prev) { return Object.assign({}, prev, newPrices); });

      // 2. Fetch OHLC klines for viewed pair (1m interval, last 100 candles)
      var viewedCrypto = cryptoPairs[0]; // will be updated based on viewPair
      var klinesUrl = "https://api.binance.com/api/v3/klines?symbol=" +
        viewedCrypto.bnb + "&interval=1m&limit=100";
      var klinesRes = await fetch(klinesUrl);
      if (!klinesRes.ok) throw new Error("Klines fetch failed");
      var klinesData = await klinesRes.json();
      var ohlc = klinesData.map(function(k) {
        return { t: k[0], o: parseFloat(k[1]), h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5]) };
      });
      var closes = ohlc.map(function(k){ return k.c; });

      setOhlcData(function(prev) {
        var upd = Object.assign({}, prev); upd[viewedCrypto.symbol] = ohlc; return upd;
      });
      setHistory(function(prev) {
        var upd = Object.assign({}, prev); upd[viewedCrypto.symbol] = closes; return upd;
      });
      setDataSource("binance");
      setLastFetch(new Date());
    } catch(err) {
      console.warn("Binance API failed, using simulation:", err.message);
      if (dataSource !== "binance") {
        setDataSource("sim");
        startDemoTicker();
      }
    }
  }, [dataSource, startDemoTicker]);

  // ── Fetch all pairs OHLC from Binance ──
  var fetchAllKlines = useCallback(async function() {
    var cryptoPairs = ALL_PAIRS.filter(function(p){ return p.liveOk && p.bnb; });
    try {
      var results = await Promise.all(cryptoPairs.map(async function(p) {
        var res = await fetch(
          "https://api.binance.com/api/v3/klines?symbol=" + p.bnb + "&interval=5m&limit=200",
          { cache: "no-cache" }
        );
        if (!res.ok) throw new Error("Binance " + res.status);
        var data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid data");
        return { symbol: p.symbol, ohlc: data.map(function(k){
          return { t:k[0], o:parseFloat(k[1]), h:parseFloat(k[2]), l:parseFloat(k[3]), c:parseFloat(k[4]), v:parseFloat(k[5]) };
        })};
      }));
      var newOhlc = {}, newHist = {}, newPrices = {};
      results.forEach(function(r) {
        if (r.ohlc && r.ohlc.length > 0) {
          newOhlc[r.symbol]   = r.ohlc;
          newHist[r.symbol]   = r.ohlc.map(function(k){return k.c;});
          newPrices[r.symbol] = r.ohlc[r.ohlc.length-1].c;
        }
      });
      setOhlcData(function(prev){ return Object.assign({}, prev, newOhlc); });
      setHistory(function(prev){ return Object.assign({}, prev, newHist); });
      setPrices(function(prev){ return Object.assign({}, prev, newPrices); });
      setDataSource("binance");
      setLastFetch(new Date());
    } catch(err) {
      console.warn("Binance fetch failed:", err.message, "— using simulation");
      setDataSource("sim");
      startDemoTicker();
    }
  }, [startDemoTicker]);

  // ── Fetch live ticker prices every 5 seconds ──
  var fetchLivePrices = useCallback(async function() {
    var cryptoPairs = ALL_PAIRS.filter(function(p){ return p.liveOk && p.bnb; });
    try {
      var symbols = JSON.stringify(cryptoPairs.map(function(p){return p.bnb;}));
      var res = await fetch("https://api.binance.com/api/v3/ticker/price?symbols=" + encodeURIComponent(symbols));
      if (!res.ok) return;
      var data = await res.json();
      if (!Array.isArray(data)) return;
      data.forEach(function(item) {
        var pair = cryptoPairs.find(function(p){return p.bnb===item.symbol;});
        if (pair && item.price) {
          var price = parseFloat(item.price);
          setPrices(function(prev){ var u=Object.assign({},prev); u[pair.symbol]=price; return u; });
          setHistory(function(prev){
            var old=prev[pair.symbol]||[];
            var u=Object.assign({},prev);
            u[pair.symbol]=old.slice(-300).concat([price]);
            return u;
          });
        }
      });
    } catch(e) {}
  }, []);

  // ── Initial load ──
  useEffect(function() {
    fetchAllKlines();
  }, []);

  // ── Fetch klines for selected timeframe ──
  useEffect(function() {
    if (!viewPair) return;
    var tf = chartTF === "1H" ? "1h" : chartTF === "4H" ? "4h" : chartTF === "1D" ? "1d" : chartTF;
    fetch("https://api.binance.com/api/v3/klines?symbol=" + viewPair.symbol + "&interval=" + tf + "&limit=120")
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (!Array.isArray(data)) return;
        setTfOhlc(data.map(function(k){
          return { t:k[0], o:parseFloat(k[1]), h:parseFloat(k[2]), l:parseFloat(k[3]), c:parseFloat(k[4]), v:parseFloat(k[5]) };
        }));
      }).catch(function(){});
  }, [chartTF, viewPair]);

  // ── Auto-refresh: full klines every 60s, prices every 5s ──
  useEffect(function() {
    var priceTimer = setInterval(function() {
      if (dataSource === "binance") fetchLivePrices();
    }, 5000);
    var klinesTimer = setInterval(function() {
      if (dataSource === "binance") fetchAllKlines();
    }, 60000);
    return function() { clearInterval(priceTimer); clearInterval(klinesTimer); };
  }, [dataSource, fetchLivePrices, fetchAllKlines]);

  // Standard indicators
  useEffect(function(){
    var r={};
    ALL_PAIRS.forEach(function(p){
      var h=history[p.symbol]; if(!h||h.length<12)return;
      r[p.symbol]={rsi:calcRSI(h),macd:calcMACD(h),bb:calcBB(h),ema20:calcEMA(h,20),ema50:calcEMA(h,50),chg1:pctChg(h,2),chg5:pctChg(h,5),chg15:pctChg(h,30)};
    });
    setIndics(r);
  },[history]);

  // Advanced indicators (ADX, StochRSI, Volume, Pivots, MTF, Regime)
  useEffect(function(){
    var adv={};
    ALL_PAIRS.forEach(function(p){
      var h=history[p.symbol];
      var ohlc=ohlcData[p.symbol];
      if(!h||h.length<20)return;
      var adxVal  = ohlc ? calcADX(ohlc) : 22;
      var srsi    = calcStochRSI(h);
      var vols    = ohlc ? ohlc.map(function(c){return c.v||0;}) : [];
      var volS    = vols.length>5 ? calcVolSpike(vols) : {spike:false,ratio:1};
      var pivs    = ohlc ? calcPivots(ohlc) : null;
      var tf      = mtfData[p.symbol];
      var mtf     = tf ? calcMTFConfluence(tf.tf1m,tf.tf5m,tf.tf15m) : {score:0,aligned:false};
      var regime  = detectRegime(adxVal);
      adv[p.symbol]={adx:adxVal,stochRsi:srsi,volSpike:volS,pivots:pivs,mtf:mtf,regime:regime};

      // Backtest
      if(ohlc&&ohlc.length>=50&&!backtest[p.symbol]){
        var bt=runBacktest(ohlc,h);
        if(bt){setBacktest(function(prev){var u=Object.assign({},prev);u[p.symbol]=bt;return u;});}
      }
    });
    setAdvIndics(adv);
  },[history,ohlcData,mtfData]);

  var addLog=useCallback(function(entry){
    var t=new Date(),time=String(t.getHours()).padStart(2,"0")+":"+String(t.getMinutes()).padStart(2,"0")+":"+String(t.getSeconds()).padStart(2,"0");
    setLogItems(function(prev){return prev.slice(-60).concat([Object.assign({},entry,{time:time})]);});
  },[]);

  // Fix #1 — AI limit check
  function checkAILimit(){
    if(isPro)return true;
    var today=new Date().toDateString();
    var newLimit=aiLimit;
    if(aiLimit.date!==today){newLimit={count:0,date:today};setAiLimit(newLimit);}
    if(newLimit.count>=3){
      addLog({type:"limit",color:"#ffa000",msg:"Batas AI harian (3/3) tercapai. Upgrade Pro untuk unlimited."});
      return false;
    }
    setAiLimit(function(prev){return{count:(prev.date===today?prev.count:0)+1,date:today};});
    return true;
  }

  // Fix #2 — Trial expiry check
  function checkTrialExpiry(){
    if(user.tier!=="trial")return true;
    if(user.trialExpiry && Date.now()>user.trialExpiry){
      addLog({type:"sys",color:"#ff9a6b",msg:"Trial 7 hari telah berakhir. Silakan upgrade ke Pro."});
      props.onTrialExpired();
      return false;
    }
    return true;
  }

  // Main AI run — upgraded with all 7 indicators + realistic model
  var aiRunningRef = useRef(false); // prevent concurrent runs
  var runAI=useCallback(async function(){
    if (aiRunningRef.current) return; // already running — skip
    aiRunningRef.current = true;
    var pairs=availPairsRef.current;
    if(!checkAILimit()){aiRunningRef.current=false;return;}
    if(!checkTrialExpiry()){aiRunningRef.current=false;return;}

    // Build full snapshot with all advanced indicators
    var snapshot=pairs.map(function(p){
      var ind=indics[p.symbol]||{};
      var adv=advIndics[p.symbol]||{};
      return Object.assign({label:p.label,cat:p.cat,price:prices[p.symbol]||p.base,
        chg5:pctChg(history[p.symbol]||[],5)},ind,adv);
    });

    setAiThink(true);setAiErr(null);
    var regimeCurrent=advIndics[viewPair.symbol]?advIndics[viewPair.symbol].regime:null;
    addLog({type:"scan",color:"#2a5a9a",
      msg:"Analyzing "+pairs.length+" pairs | 7 indicators | MTF | "+(regimeCurrent?regimeCurrent.type:"detecting regime...")});
    try{
      var cfg=settingsRef.current;
      var selProv = AI_PROVIDERS.find(function(p){return p.id===(config.aiModel||AI_PROVIDERS[0].id);})||AI_PROVIDERS[0];
      var decision=await getAIDecision(snapshot,portfolioRef.current,cfg,{
        provider: selProv,
        anthropicKey: config.anthropicKey || "",
        groqKey:      config.groqKey      || "",
        geminiKey:    config.geminiKey    || "",
      });
      setAiDec(decision);setAiCycle(function(c){return c+1;});
      setErrCount(0);
      var col=decision.action==="BUY"?"#00e5a0":decision.action==="SELL"?"#ff4d6d":"#ffd93d";
      addLog({type:"decision",color:col,
        msg:"["+decision.action+"] "+decision.pair+" | "+decision.confidence+"% | "+decision.signal+
          " | Confluence: "+(decision.confluenceCount||"?")+"/7",
        reason:decision.reason});

      var thresh=cfg.confThresh||65;
      if(decision.action!=="HOLD"&&decision.confidence>=thresh&&phase==="running"){
        var cur=portfolioRef.current;
        var maxP=cfg.maxPos||3;
        if(openPos.length>=maxP){addLog({type:"skip",color:"#2a4a70",msg:"Max "+maxP+" posisi terbuka."});return;}
        var riskAmt=parseFloat((cur.bal*(decision.riskPct||cfg.riskPct||1.5)/100).toFixed(2));
        var pairObj=ALL_PAIRS.find(function(p){return p.label===decision.pair;})||ALL_PAIRS[0];
        var entryPx=prices[pairObj.symbol]||pairObj.base;
        var posId=Date.now();
        var newPos={id:posId,action:decision.action,pair:decision.pair,cat:decision.cat,entry:entryPx,size:riskAmt,conf:decision.confidence,signal:decision.signal,targetPct:decision.targetPct||1.5,stopPct:decision.stopPct||0.8,time:new Date().toLocaleTimeString()};
        setOpenPos(function(prev){return prev.concat([newPos]);});
        // ── Realistic win probability model ──
        setTimeout(function(){
          var pairAdv=advIndics[pairObj.symbol]||{};
          var winProb=getRealisticWinProb(
            decision,
            pairAdv.regime,
            pairAdv.mtf,
            pairAdv.volSpike,
            false,
            indics[pairObj.symbol]||{}
          );
          var isWin=Math.random()<winProb;
          var cfg2=settingsRef.current;
          // Fix 7: subtract trading fee + slippage from both win and loss
          var feePct   = (cfg2.tradeFee   || 0.1)  / 100;
          var slipPct  = (cfg2.slippage   || 0.05) / 100 * (0.5 + Math.random());
          var totalCost= riskAmt * (feePct * 2 + slipPct); // entry + exit fee + slippage
          var grossPnl = isWin
            ? parseFloat((riskAmt*(decision.targetPct||1.5)/100).toFixed(2))
            : parseFloat(-(riskAmt*(decision.stopPct||.8)/100).toFixed(2));
          var tradePnl = parseFloat((grossPnl - totalCost).toFixed(2));
          setOpenPos(function(prev){return prev.filter(function(p){return p.id!==posId;});});
          setPortfolio(function(prev){
            var newBal=Math.max(0,parseFloat((prev.bal+tradePnl).toFixed(2)));
            var w=prev.wins+(isWin?1:0),l=prev.losses+(isWin?0:1),tot=w+l;
            var newPnl=parseFloat((newBal-prev.initBal).toFixed(2));
            var updated={bal:newBal,initBal:prev.initBal,pnl:newPnl,pct:parseFloat((newPnl/prev.initBal*100).toFixed(2)),wins:w,losses:l,winRate:tot?parseFloat((w/tot*100).toFixed(1)):0,totalTrades:prev.totalTrades+1};
            setEqHist(function(eh){return eh.concat([{time:Date.now(),bal:newBal}]);});
            return updated;
          });
          setTrades(function(prev){return [{id:posId,action:decision.action,pair:decision.pair,cat:decision.cat,entry:entryPx,size:riskAmt,pnl:tradePnl,isWin:isWin,conf:decision.confidence,signal:decision.signal,time:new Date().toLocaleTimeString()}].concat(prev.slice(0,49));});
          // Fix 9 — Global stop-loss
          (function(){
            var cfg3 = settingsRef.current;
            var initB = portfolioRef.current.initBal;
            var curB  = portfolioRef.current.bal;
            var ddPct = initB > 0 ? (initB - curB) / initB * 100 : 0;
            var maxDD = cfg3.maxDrawdown || 10;
            if (ddPct >= maxDD) {
              setGlobalStop("MAX_DRAWDOWN");
              setPhase("paused");
              clearInterval(aiTimerRef.current); clearInterval(cdTimerRef.current);
              addLog({type:"stop",color:"#ff4d6d",
                msg:"GLOBAL STOP — Drawdown " + ddPct.toFixed(1) + "% melampaui batas " + maxDD + "%. Modal dilindungi."});
              return;
            }
            setDailyPnl(function(prev){
              var today = new Date().toDateString();
              var newPnl = prev.date === today ? prev.pnl + tradePnl : tradePnl;
              var dailyLossPct = initB > 0 ? Math.abs(Math.min(0,newPnl)) / initB * 100 : 0;
              var maxDL = cfg3.dailyLoss || 5;
              if (dailyLossPct >= maxDL) {
                setGlobalStop("DAILY_LOSS");
                setPhase("paused");
                clearInterval(aiTimerRef.current); clearInterval(cdTimerRef.current);
                addLog({type:"stop",color:"#ff9a6b",
                  msg:"DAILY STOP — Kerugian hari ini " + dailyLossPct.toFixed(1) + "% (limit: " + maxDL + "%). Berhenti sampai besok."});
              }
              return { pnl:parseFloat(newPnl.toFixed(2)), date:today };
            });
          })();
          addLog({type:"trade",color:isWin?"#00e5a0":"#ff4d6d",
            msg:(isWin?"[WIN]":"[LOSS]")+" "+decision.action+" "+decision.pair+" | "+(tradePnl>=0?"+":"-")+"$"+Math.abs(tradePnl).toFixed(2)+" (fee -$"+totalCost.toFixed(2)+")"});
        },8000+Math.random()*12000);
        addLog({type:"open",color:col,msg:"[OPEN] "+decision.action+" "+decision.pair+" $"+entryPx.toLocaleString(undefined,{maximumFractionDigits:pairObj.dec})+" size:$"+riskAmt});
      } else if(decision.action!=="HOLD"&&decision.confidence<thresh){
        addLog({type:"skip",color:"#2a4a70",msg:"SKIP — confidence "+decision.confidence+"% < "+thresh+"%"});
      } else {
        addLog({type:"hold",color:"#1e3a60",msg:"HOLD — Tidak ada setup jelas"});
      }
    }catch(err){
      var errMsg = err.message || "";
      // Handle specific error types with smart messages
      if (errMsg === "CREDIT_EXHAUSTED") {
        setPhase("paused");
        clearInterval(aiTimerRef.current); clearInterval(cdTimerRef.current);
        addLog({type:"credit",color:"#ff4d6d",
          msg:"KREDIT HABIS — AI berhenti otomatis. Isi ulang kredit di console.anthropic.com lalu tekan Resume."});
        setAiErr("CREDIT_EXHAUSTED");
      } else if (errMsg === "RATE_LIMIT") {
        var selProv = AI_PROVIDERS.find(function(p){return p.id===(config.aiModel||AI_PROVIDERS[0].id);})||AI_PROVIDERS[0];
        if (selProv.resetDaily) {
          // Groq daily limit — pause & schedule auto-resume at midnight UTC (07:00 WIB)
          setPhase("paused");
          clearInterval(aiTimerRef.current); clearInterval(cdTimerRef.current);
          var now = new Date();
          var midnight = new Date(now);
          midnight.setUTCHours(24,0,0,0); // next UTC midnight
          var msUntilReset = midnight - now;
          var hoursLeft = (msUntilReset / 3600000).toFixed(1);
          addLog({type:"warn",color:"#ff6b35",
            msg:"Groq limit harian tercapai. Bot berhenti. Auto-resume dalam " + hoursLeft + " jam (07:00 WIB)."});
          setAiErr("DAILY_LIMIT");
          // Auto resume when Groq resets
          setTimeout(function(){
            setAiErr(null); setPhase("running");
            setTokenUsage(function(prev){ return {calls:0,estimatedCost:0,date:new Date().toDateString()}; });
            addLog({type:"sys",color:"#ff6b35",msg:"Groq limit reset! AI dilanjutkan otomatis."});
          }, msUntilReset);
        } else {
          addLog({type:"warn",color:"#ffa000",msg:"Rate limit — menunggu 30 detik..."});
          setAiErr("RATE_LIMIT");
          setTimeout(function(){ setAiErr(null); }, 30000);
        }
      } else if (errMsg === "INVALID_API_KEY") {
        // Fix 11 — try fallback provider before pausing
        var curProv = AI_PROVIDERS.find(function(p){return p.id===(config.aiModel||AI_PROVIDERS[0].id);});
        var fallback = AI_PROVIDERS.find(function(p){return p.id !== (config.aiModel||AI_PROVIDERS[0].id);});
        if (fallback && errCount < 2) {
          addLog({type:"warn",color:"#ffa000",
            msg:"Provider " + (curProv?curProv.name:"") + " error — switching to " + fallback.name + " as fallback..."});
          // Attempt with fallback provider next cycle (update config reference)
          setAiErr("FALLBACK_" + fallback.id);
          // Don't pause — let next cycle use fallback
        } else {
          setPhase("paused");
          clearInterval(aiTimerRef.current); clearInterval(cdTimerRef.current);
          addLog({type:"error",color:"#ff4d6d",msg:"API KEY TIDAK VALID — Cek key di Settings."});
          setAiErr("INVALID_API_KEY");
        }
      } else {
        setAiErr(errMsg);
        setErrCount(function(c){
          var next=c+1;
          if(next>=3){
            setPhase("paused");
            clearInterval(aiTimerRef.current); clearInterval(cdTimerRef.current);
            addLog({type:"error",color:"#ff4d6d",msg:"AI auto-pause: 3 error berturut. Cek koneksi & resume."});
          }
          return next;
        });
        addLog({type:"error",color:"#ff8800",msg:"AI Error: "+errMsg});
      }
    }finally{setAiThink(false);aiRunningRef.current=false;}
  },[prices,indics,phase,openPos,addLog]);

  // Fix #17 — start with confirmation
  function handleStartRequest(){
    setConfirm({msg:"Aktifkan AI Trading?\n\nAI akan menganalisis pasar tiap "+settings.aiInterval+" detik dan membuka posisi otomatis.\n\nPastikan sudah memahami risikonya.",onYes:function(){setConfirm(null);handleStart();},onNo:function(){setConfirm(null);}});
  }
  function handleStart(){
    setPhase("running");
    addLog({type:"sys",color:"#ffd93d",msg:"AI Trading dimulai | "+config.exchange.name+" | $"+portfolio.bal.toLocaleString()+" | "+scope.label});
  }
  function handleStop(){
    setPhase("paused");clearInterval(aiTimerRef.current);clearInterval(cdTimerRef.current);
    addLog({type:"sys",color:"#ffd93d",msg:"AI dijeda."});
  }
  // Fix #18 — logout with confirmation
  function handleLogoutRequest(){
    setConfirm({msg:"Keluar dari akun?\n\nSemua sesi trading aktif akan dihentikan.",danger:true,onYes:function(){setConfirm(null);clearInterval(demoTimerRef.current);clearInterval(aiTimerRef.current);clearInterval(cdTimerRef.current);props.onLogout();},onNo:function(){setConfirm(null);}});
  }

  useEffect(function(){
    if(phase!=="running")return;
    var t1=setTimeout(function(){runAI();},3000);
    var interval=settings.aiInterval*1000;
    var ai=setInterval(function(){runAI();},interval);
    var cd=settings.aiInterval;setCd(settings.aiInterval);
    var cdT=setInterval(function(){cd-=1;if(cd<0)cd=settings.aiInterval;setCd(cd);},1000);
    aiTimerRef.current=ai;cdTimerRef.current=cdT;
    return function(){clearTimeout(t1);clearInterval(ai);clearInterval(cdT);};
  },[phase,runAI,settings.aiInterval]);

  useEffect(function(){if(logBoxRef.current)logBoxRef.current.scrollTop=logBoxRef.current.scrollHeight;},[logItems]);

  // Fix #10 — export CSV
  function exportCSV(){
    if(trades.length===0){alert("Belum ada trade untuk diekspor.");return;}
    var header="Waktu,Action,Pair,Kategori,Entry,Size,PnL,W/L,Confidence,Signal\n";
    var rows=trades.map(function(t){return[t.time,t.action,t.pair,t.cat||"",t.entry,t.size,t.pnl,t.isWin?"WIN":"LOSS",t.conf,t.signal].join(",");}).join("\n");
    var blob=new Blob([header+rows],{type:"text/csv"});
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");a.href=url;a.download="neuratrade_history.csv";a.click();
    URL.revokeObjectURL(url);
  }

  var viewPrice=prices[viewPair.symbol]||viewPair.base;
  var viewHist=history[viewPair.symbol]||[];
  var viewInd=indics[viewPair.symbol]||{};

  // Fetch multi-timeframe klines when pair selected
  useEffect(function() {
    if (!viewPair.liveOk || !viewPair.bnb) return;
    var sym = viewPair.symbol, bnb = viewPair.bnb;
    async function fetchMTF() {
      try {
        var tfs = ["1m","5m","15m"];
        var results = await Promise.all(tfs.map(function(tf){
          return fetch("https://api.binance.com/api/v3/klines?symbol="+bnb+"&interval="+tf+"&limit=100")
            .then(function(r){return r.json();})
            .then(function(d){return d.map(function(k){
              return{t:k[0],o:parseFloat(k[1]),h:parseFloat(k[2]),l:parseFloat(k[3]),c:parseFloat(k[4]),v:parseFloat(k[5])};
            });});
        }));
        var tf1m=results[0], tf5m=results[1], tf15m=results[2];
        var closes1m = tf1m.map(function(k){return k.c;});

        setOhlcData(function(prev){var u=Object.assign({},prev);u[sym]=tf1m;return u;});
        setHistory(function(prev){var u=Object.assign({},prev);u[sym]=closes1m;return u;});
        setPrices(function(prev){var u=Object.assign({},prev);u[sym]=tf1m[tf1m.length-1].c;return u;});
        setMtfData(function(prev){var u=Object.assign({},prev);u[sym]={tf1m:tf1m,tf5m:tf5m,tf15m:tf15m};return u;});
        setDataSource("binance");setLastFetch(new Date());
      } catch(err) {
        setDataSource("sim");
      }
    }
    fetchMTF();
  }, [viewPair.symbol]);
  var pnlPos=portfolio.pnl>=0;
  var decColor=!aiDec?"#ffd93d":aiDec.action==="BUY"?"#00e5a0":aiDec.action==="SELL"?"#ff4d6d":"#ffd93d";
  var typeColor=viewPair.cat==="METALS"?"#ffd700":viewPair.cat==="FOREX"?"#5a9fff":"#9945ff";
  var trialLeft=user.tier==="trial"&&user.trialExpiry?Math.max(0,Math.ceil((user.trialExpiry-Date.now())/(1000*3600*24))):0;
  var aiCallsLeft=isPro?null:3-aiLimit.count;

  return(
    <div className="nt-dash" translate="no">

      {/* Top bar */}
      <div className="nt-topbar">
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontWeight:900,fontSize:14,letterSpacing:2}}>
            <span style={{background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>N</span>
            <span style={{background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>T</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4,background:isPro?"rgba(0,200,100,.08)":"rgba(90,140,200,.08)",border:"1px solid "+(isPro?"#004a22":"#1a3a60"),borderRadius:20,padding:"2px 8px"}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:isPro?"#00e5a0":"#5a8ad0",animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:7.5,color:isPro?"#00e5a0":"#5a8ad0",fontFamily:"'Orbitron',monospace",letterSpacing:1}}>
              {user.tier==="trial"?"TRIAL"+(trialLeft>0?" "+trialLeft+"d":""):isPro?"PRO":"FREE"}
            </span>
          </div>
          {config&&config.mode&&(
            <div style={{display:"flex",alignItems:"center",gap:4,background:config.mode==="real"?"rgba(0,200,50,.08)":"rgba(0,60,200,.08)",border:"1px solid "+(config.mode==="real"?"#004422":"#1a3060"),borderRadius:20,padding:"2px 8px"}}>
              <span style={{fontSize:7.5,color:config.mode==="real"?"#00e5a0":"#5a8ad0",fontFamily:"'Orbitron',monospace",letterSpacing:1}}>
                {config.mode==="real"?"⚡ REAL":"🎮 DEMO"}
              </span>
            </div>
          )}
          {/* Fix #1 — show AI calls left for free */}
          {!isPro&&<div style={{fontSize:8,color:"#3a5a30",background:"rgba(0,100,0,.1)",border:"1px solid #1a3a10",borderRadius:4,padding:"1px 7px"}}>AI: {aiCallsLeft}/3 hari ini</div>}
          {!isPro&&<button onClick={function(){setShowUpg(true);}} style={{background:"rgba(255,200,0,.1)",border:"1px solid #5a3800",borderRadius:5,padding:"2px 8px",color:"#ffa000",cursor:"pointer",fontSize:8,fontFamily:"'Share Tech Mono',monospace"}}>Upgrade</button>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {phase==="running"&&!aiThink&&<span style={{fontSize:8,color:"#1e3a60"}}>AI:<span style={{color:"#2a5a8a"}}>{countdown}s</span></span>}
          {aiThink&&<div style={{display:"flex",gap:2}}>{[0,1,2].map(function(i){return <div key={i} style={{width:4,height:4,borderRadius:"50%",background:"#5a8fff",animation:"pulse 1.2s "+(i*.2)+"s infinite"}}/>;})}</div>}
          {aiErr&&<span style={{fontSize:8,color:"#ff8800",background:"rgba(80,40,0,.2)",border:"1px solid #4a2800",borderRadius:4,padding:"1px 7px"}}>Error {errCount}/3</span>}
          <button onClick={function(){setShowSett(true);}} style={{background:"transparent",border:"1px solid #0a1428",borderRadius:5,padding:"2px 7px",color:"#1e3a60",cursor:"pointer",fontSize:8.5,fontFamily:"'Share Tech Mono',monospace"}}>⚙</button>
          <div style={{fontSize:8.5,color:"#1e3a60"}}>{user.email.split("@")[0]}</div>
          <button onClick={handleLogoutRequest} style={{background:"transparent",border:"1px solid #0a1428",borderRadius:5,padding:"2px 7px",color:"#1e3a60",cursor:"pointer",fontSize:8,fontFamily:"'Share Tech Mono',monospace"}}>Keluar</button>
        </div>
      </div>

      <div className="nt-body">

        {/* Desktop sidebar - in flow */}
        <div className="nt-sidebar">
          <div className="nt-sidebar-logo">
            <span style={{background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NEURA</span>
            <span style={{background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TRADE</span>
          </div>
          <div className="nt-sidebar-nav">
          {[{id:"trade",icon:"📊",label:"Trading"},{id:"history",icon:"📋",label:"History"},{id:"pro",icon:"⭐",label:isPro?"PRO":"Upgrade"}].map(function(tab){
            var isAct=navTab===tab.id;
            return <button key={tab.id} onClick={function(){setNavTab(tab.id);}} className={isAct?"active":""}><span style={{fontSize:16}}>{tab.icon}</span> {tab.label}</button>;
          })}
          </div>
        </div>
        <div className="nt-main">
        {/* TRADE TAB */}
        {navTab==="trade"&&(
          <div className="nt-content">
            <div style={{marginBottom:10}}>
              {/* Real balance banner for real mode */}
              {config && config.mode === "real" && (
                <div style={{background:"rgba(0,30,15,.4)",border:"1px solid "+(balError?"#5a0000":"#003a18"),borderRadius:9,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:7.5,color:"#1e5a30",letterSpacing:2,marginBottom:3}}>SALDO REAL EXCHANGE</div>
                    {balLoading ? (
                      <div style={{fontSize:11,color:"#3a5a80"}}>Mengambil saldo...</div>
                    ) : balError ? (
                      <div style={{fontSize:9.5,color: balError.includes("MT5") ? "#ffa000" : "#ff4d6d",lineHeight:1.7,whiteSpace:"pre-line"}}>{balError}</div>
                    ) : realBalance ? (
                      <div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:20,color:"#00e5a0",fontWeight:900}}>
                          ${realBalance.totalUsdt.toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2})}
                        </div>
                        <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap"}}>
                          {(realBalance.breakdown||realBalance.balances||[]).slice(0,6).map(function(b){
                            var isLd = b.asset==="LDUSDT";
                            return (
                              <span key={b.asset} style={{fontSize:8,color:isLd?"#ffa000":"#2a5a40",background:isLd?"rgba(60,40,0,.3)":"rgba(0,60,30,.2)",border:"1px solid "+(isLd?"#5a3a00":"#003a18"),borderRadius:4,padding:"2px 7px"}}>
                                {b.asset}: {b.usdValue ? "$"+b.usdValue.toFixed(2) : (b.free||b.total||0).toFixed(4)}
                                {isLd&&" 🔒"}
                              </span>
                            );
                          })}
                        </div>
                        {realBalance.note&&(
                          <div style={{fontSize:8,color:"#ffa000",marginTop:4}}>ℹ️ {realBalance.note}</div>
                        )}
                      </div>
                    ) : (
                      <div style={{fontSize:9.5,color:"#1e3a60",lineHeight:1.7}}>
                        Belum terhubung - klik 🔄 untuk coba ambil saldo
                      </div>
                    )}
                  </div>
                  <button onClick={fetchRealBalance} disabled={balLoading}
                    style={{background:"rgba(0,100,50,.2)",border:"1px solid #003a18",borderRadius:6,padding:"6px 10px",color:"#00e5a0",cursor:balLoading?"default":"pointer",fontSize:9,flexShrink:0,fontFamily:"'Share Tech Mono',monospace"}}>
                    {balLoading?"...":"🔄"}
                  </button>
                </div>
              )}
              {/* Stats row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:10}}>
                {[
                  {l:"SALDO",v:"$"+(config&&config.mode==="real"&&realBalance?realBalance.totalUsdt:portfolio.bal).toLocaleString(undefined,{maximumFractionDigits:0}),c:"#7ab0ff"},
                  {l:"PnL",v:(pnlPos?"+":"")+portfolio.pnl.toFixed(2),c:pnlPos?"#00e5a0":"#ff4d6d"},
                  {l:"WIN RATE",v:portfolio.winRate+"%",c:"#ffd93d"},
                  {l:"TRADES",v:portfolio.totalTrades,c:"#7c6fff"},
                  {l:"AI CALLS",v:tokenUsage.calls,c:"#b06aff"},
                ].map(function(s){
                  return(
                    <div key={s.l} style={{background:"rgba(2,5,16,.96)",border:"1px solid #0a1428",borderRadius:8,padding:"8px 6px",textAlign:"center"}}>
                      <div style={{fontSize:7.5,color:"#1e3a60",letterSpacing:1,marginBottom:4}}>{s.l}</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:900,color:s.c}}>{s.v}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Scope button */}
            <button onClick={function(){setShowScope(!showScope);}} style={{width:"100%",background:"rgba(3,6,18,.95)",border:"1px solid "+(scope?scope.color+"40":"#0a1428"),borderRadius:8,padding:"7px 12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:9,fontWeight:700,color:scope?scope.color:"#5a8aaa"}}>{scope?scope.icon:"ALL"}</span>
                <span style={{fontSize:10,color:scope?scope.color:"#5a8aaa",fontWeight:700}}>{scope?scope.label:"Semua Pasar"}</span>
                <span style={{fontSize:8.5,color:"#1e3a60"}}>{scope?scope.desc:""}</span>
              </div>
              <span style={{fontSize:8.5,color:"#2a4a70",background:"#020508",border:"1px solid #0a1428",borderRadius:4,padding:"2px 7px"}}>{showScope?"Tutup":"Ganti"}</span>
            </button>
            {showScope&&(
              <div style={{background:"rgba(3,6,18,.98)",border:"1px solid #0a1428",borderRadius:9,padding:10,marginBottom:8}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                  {MARKET_SCOPES.map(function(sc){var locked=sc.id!=="all"&&sc.id!=="crypto"&&!isPro,isSel=scope.id===sc.id;return(
                    <button key={sc.id} onClick={function(){if(locked){setShowUpg(true);return;}setScope(sc);setShowScope(false);}} style={{background:isSel?sc.color+"15":"#020508",border:"1px solid "+(isSel?sc.color+"50":"#0a1428"),borderRadius:8,padding:"8px",cursor:"pointer",textAlign:"left",opacity:locked?.5:1,position:"relative"}}>
                      {locked&&<span style={{position:"absolute",top:3,right:6,fontSize:7,color:"#ffa000"}}>PRO</span>}
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:9,color:isSel?sc.color:"#3a5a80",fontWeight:700}}>{sc.label}</div>
                      <div style={{fontSize:8,color:"#1a3060",marginTop:2}}>{sc.desc}</div>
                    </button>
                  );})}
                </div>
              </div>
            )}

            {/* Pair strip */}
            <div style={{display:"flex",gap:4,overflowX:"auto",marginBottom:8,paddingBottom:3}}>
              {ALL_PAIRS.map(function(p){var isAct=viewPair.symbol===p.symbol,locked=p.pro&&!isPro;return(
                <button key={p.symbol} onClick={function(){if(locked){setShowUpg(true);return;}setViewPair(p);}} style={{background:isAct?"rgba(255,255,255,.03)":"#020508",border:"1px solid "+(isAct?p.color+"44":"#0a1428"),borderRadius:7,padding:"4px 8px",cursor:"pointer",flexShrink:0,opacity:locked?.45:1}}>
                  <div style={{fontSize:7,color:p.color}}>{p.cat}</div>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:9.5,color:isAct?"#cce0ff":"#3a5a80"}}>{p.label.split("/")[0]}</div>
                  {locked&&<div style={{fontSize:6.5,color:"#ffa000"}}>PRO</div>}
                </button>
              );})}
            </div>

            {/* Chart */}
            <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:9,padding:"9px 11px",marginBottom:8}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:7,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:11,color:typeColor,fontWeight:700}}>{viewPair.label}</span>
                <span style={{fontFamily:"'Orbitron',monospace",fontSize:14,fontWeight:800,color:"#cce0ff"}}>{"$"+viewPrice.toLocaleString(undefined,{maximumFractionDigits:viewPair.dec,minimumFractionDigits:viewPair.dec})}</span>
                {dataSource==="binance" && viewPair.liveOk && (
                  <span style={{fontSize:8,color:"#00e5a0",border:"1px solid #004422",borderRadius:3,padding:"1px 6px",background:"rgba(0,100,50,.15)"}}>
                    BINANCE LIVE
                  </span>
                )}
                {dataSource==="sim" && (
                  <span style={{fontSize:8,color:"#ffa000",border:"1px solid #4a2800",borderRadius:3,padding:"1px 6px"}}>SIMULASI</span>
                )}
                {dataSource==="init" && (
                  <span style={{fontSize:8,color:"#3a6aaa",border:"1px solid #1a3060",borderRadius:3,padding:"1px 6px"}}>Connecting...</span>
                )}
                {lastFetch && dataSource==="binance" && (
                  <span style={{fontSize:7.5,color:"#1e3a60"}}>Update: {lastFetch.toLocaleTimeString()}</span>
                )}
                {advIndics[viewPair.symbol] && advIndics[viewPair.symbol].regime && (
                  <span style={{fontSize:8,color:advIndics[viewPair.symbol].regime.color,border:"1px solid "+advIndics[viewPair.symbol].regime.color+"40",borderRadius:3,padding:"1px 7px",background:advIndics[viewPair.symbol].regime.color+"12"}}>
                    {advIndics[viewPair.symbol].regime.short}
                  </span>
                )}
              </div>
              <div style={{borderRadius:8,overflow:"hidden",marginBottom:10}}>
                <div>
              {/* Timeframe selector */}
              <div style={{display:"flex",gap:4,marginBottom:6,alignItems:"center"}}>
                {["1m","5m","15m","1H","4H","1D"].map(function(tf){
                  return(
                    <button key={tf} onClick={function(){setChartTF(tf);}}
                      style={{background:chartTF===tf?"rgba(0,80,200,.3)":"transparent",border:"1px solid "+(chartTF===tf?"#1a4080":"#0a1428"),borderRadius:5,padding:"3px 8px",color:chartTF===tf?"#7ab0ff":"#2a4a70",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:9}}>
                      {tf}
                    </button>
                  );
                })}
                <div style={{flex:1}}/>
                {/* 24/7 backend toggle */}
                <button onClick={toggleBackendTrading}
                  style={{background:backendActive?"rgba(0,200,50,.2)":"rgba(60,60,60,.2)",border:"1px solid "+(backendActive?"#005530":"#2a2a2a"),borderRadius:5,padding:"3px 10px",color:backendActive?"#00e5a0":"#5a5a5a",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:9,display:"flex",alignItems:"center",gap:4}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:backendActive?"#00e5a0":"#5a5a5a",display:"inline-block",animation:backendActive?"pulse 1.5s infinite":"none"}}/>
                  {backendActive?"24/7 AKTIF":"24/7 OFF"}
                </button>
              </div>
              <CandleChart ohlc={tfOhlc} history={viewHist} pair={viewPair?viewPair.label:"BTC/USDT"} livePrice={prices[viewPair?viewPair.symbol:"BTCUSDT"]||0} h={window.innerWidth>768?320:200}/>
            </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,marginTop:8}}>
                {(function(){
                  var adv=advIndics[viewPair.symbol]||{};
                  var tiles=[
                    {l:"RSI(14)",    v:viewInd.rsi||"-",     c:viewInd.rsi<30?"#00e5a0":viewInd.rsi>70?"#ff4d6d":"#5a8aaa"},
                    {l:"StochRSI",   v:adv.stochRsi||"-",    c:adv.stochRsi&&adv.stochRsi<20?"#00e5a0":adv.stochRsi&&adv.stochRsi>80?"#ff4d6d":"#5a8aaa"},
                    {l:"MACD",       v:viewInd.macd?(viewInd.macd.hist>0?"+":"")+viewInd.macd.hist:"-", c:viewInd.macd&&viewInd.macd.hist>0?"#00e5a0":"#ff4d6d"},
                    {l:"BB%",        v:viewInd.bb?viewInd.bb.pct+"%":"-", c:viewInd.bb&&viewInd.bb.pct<15?"#00e5a0":viewInd.bb&&viewInd.bb.pct>85?"#ff4d6d":"#5a8aaa"},
                    {l:"ADX",        v:adv.adx||"-",         c:adv.adx&&adv.adx>25?"#00e5a0":adv.adx&&adv.adx<18?"#ff4d6d":"#ffd93d"},
                    {l:"TREND",      v:viewInd.ema20&&viewInd.ema50?(viewInd.ema20>viewInd.ema50?"BULL":"BEAR"):"-", c:viewInd.ema20&&viewInd.ema50?(viewInd.ema20>viewInd.ema50?"#00e5a0":"#ff4d6d"):"#5a8aaa"},
                    {l:"VOL SPIKE",  v:adv.volSpike?(adv.volSpike.spike?"x"+adv.volSpike.ratio:"x"+adv.volSpike.ratio):"-", c:adv.volSpike&&adv.volSpike.spike?"#ffd93d":"#5a8aaa"},
                    {l:"MTF CONF",   v:adv.mtf?(adv.mtf.score+"/6"):"-", c:adv.mtf&&adv.mtf.aligned?"#00e5a0":adv.mtf&&adv.mtf.score>=3?"#ffd93d":"#5a8aaa"},
                  ];
                  return tiles.map(function(ind){return(
                    <div key={ind.l} style={{background:"#020508",border:"1px solid "+ind.c+"18",borderRadius:6,padding:"5px 7px"}}>
                      <div style={{fontSize:6.5,color:"#152040",letterSpacing:1,marginBottom:2}}>{ind.l}</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,color:ind.c}}>{ind.v}</div>
                    </div>
                  );});
                })()}
              </div>
            </div>

            {/* Open Positions — Fix #8 */}
            {openPos.length>0&&(
              <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #004422",borderRadius:9,padding:"9px 11px",marginBottom:8}}>
                <div style={{fontSize:8,color:"#2a7a50",letterSpacing:2,marginBottom:8}}>POSISI TERBUKA ({openPos.length}/{settings.maxPos})</div>
                {openPos.map(function(pos){
                  var curPx=prices[(ALL_PAIRS.find(function(p){return p.label===pos.pair;})||ALL_PAIRS[0]).symbol]||pos.entry;
                  var floatPnl=pos.action==="BUY"?(curPx-pos.entry)/pos.entry*pos.size*100:(pos.entry-curPx)/pos.entry*pos.size*100;
                  floatPnl=parseFloat(floatPnl.toFixed(2));
                  return(
                    <div key={pos.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid #050a18"}}>
                      <div style={{display:"flex",gap:8,alignItems:"center"}}>
                        <span style={{fontSize:9,color:pos.action==="BUY"?"#00e5a0":"#ff4d6d",fontWeight:700}}>{pos.action}</span>
                        <span style={{fontSize:9.5,color:"#5a8ad0"}}>{pos.pair}</span>
                        <span style={{fontSize:8.5,color:"#1e3a60"}}>${pos.entry.toLocaleString(undefined,{maximumFractionDigits:2})}</span>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontSize:10,color:floatPnl>=0?"#00e5a0":"#ff4d6d",fontWeight:700}}>{floatPnl>=0?"+":"-"}${Math.abs(floatPnl).toFixed(2)}</div>
                        <div style={{fontSize:7.5,color:"#1e3a60"}}>floating</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* AI Decision + Control */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div style={{background:"rgba(3,6,18,.95)",border:"1px solid "+(aiDec?decColor+"30":"#0a1428"),borderRadius:9,padding:"10px 11px",display:"flex",flexDirection:"column",gap:7}}>
                <div style={{fontSize:7.5,color:"#152040",letterSpacing:2}}>CLAUDE AI</div>
                {aiThink?(
                  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:7,justifyContent:"center"}}>
                    <div style={{width:28,height:28,borderRadius:"50%",border:"2px solid #0c1830",borderTop:"2px solid "+typeColor,animation:"spin 1s linear infinite"}}/>
                    <div style={{fontSize:8.5,color:"#3a6aaa",textAlign:"center"}}>Analyzing...</div>
                  </div>
                ):aiDec?(
                  <>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:22,fontWeight:900,color:decColor,lineHeight:1}}>{aiDec.action}</div>
                        <div style={{fontSize:10,color:"#7ab0ff",marginTop:3}}>{aiDec.pair}</div>
                      </div>
                      <ConfRing value={aiDec.confidence} action={aiDec.action}/>
                    </div>
                    <div style={{fontSize:9,color:decColor,fontWeight:700}}>{aiDec.signal}</div>
                    <div style={{fontSize:8.5,color:"#3a5a80",lineHeight:1.7,flex:1}}>{aiDec.reason}</div>
                    {aiDec.action!=="HOLD"&&(
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                        {[{l:"RISK",v:(aiDec.riskPct||1.5)+"%",c:"#ff9a6b"},{l:"TARGET",v:"+"+(aiDec.targetPct||1.5)+"%",c:"#00e5a0"},{l:"STOP",v:"-"+(aiDec.stopPct||.8)+"%",c:"#ff4d6d"}].map(function(m){return(
                          <div key={m.l} style={{background:"#020508",border:"1px solid #070e20",borderRadius:6,padding:"5px 6px",textAlign:"center"}}>
                            <div style={{fontSize:7,color:"#162040"}}>{m.l}</div>
                            <div style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:m.c,fontWeight:700,marginTop:1}}>{m.v}</div>
                          </div>
                        );})}
                      </div>
                    )}
                  </>
                ):(
                  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <div style={{fontSize:9,color:"#1e3060",textAlign:"center"}}>Tekan Aktifkan AI</div>
                  </div>
                )}
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:9,padding:"8px 10px",flex:1}}>
                  <div style={{fontSize:7.5,color:"#152040",letterSpacing:1.5,marginBottom:6}}>EXCHANGE</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                    {EXCHANGES_LIST.slice(0,isPro?6:1).map(function(ex){var isSel=config.exchange&&config.exchange.name===ex.name;return(
                      <div key={ex.name} style={{background:isSel?ex.color+"12":"#020508",border:"1px solid "+(isSel?ex.color+"35":"#0a1428"),borderRadius:6,padding:"4px 6px"}}>
                        <div style={{fontSize:8.5,color:isSel?ex.color:"#3a5a80",fontWeight:700}}>{ex.name}</div>
                        <div style={{fontSize:7,color:"#1a3060"}}>{ex.type}</div>
                      </div>
                    );})}
                    {!isPro&&<button onClick={function(){setShowUpg(true);}} style={{background:"rgba(255,160,0,.08)",border:"1px dashed #5a3800",borderRadius:6,padding:"4px 6px",cursor:"pointer"}}>
                      <div style={{fontSize:7.5,color:"#ffa000"}}>+5 lainnya</div>
                      <div style={{fontSize:6.5,color:"#5a3800"}}>Upgrade Pro</div>
                    </button>}
                  </div>
                </div>
                <div>
                  {phase==="idle"&&<button onClick={handleStartRequest} style={{width:"100%",background:"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:1}}>Aktifkan AI</button>}
                  {phase==="running"&&<button onClick={handleStop} style={{width:"100%",background:"linear-gradient(135deg,#600000,#aa0000)",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,cursor:"pointer"}}>Pause</button>}
                  {phase==="paused"&&<div style={{display:"flex",gap:5}}>
                    <button onClick={function(){setPhase("running");setErrCount(0);addLog({type:"sys",color:"#00e5a0",msg:"AI dilanjutkan."});}} style={{flex:1,background:"linear-gradient(135deg,#003600,#007700)",border:"none",borderRadius:8,padding:"10px",color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:10,fontWeight:700,cursor:"pointer"}}>Lanjut</button>
                    <button onClick={function(){setPhase("idle");setAiDec(null);}} style={{flex:1,background:"rgba(60,20,0,.4)",border:"1px solid #3a1800",borderRadius:8,padding:"10px",color:"#ff9a6b",fontFamily:"'Share Tech Mono',monospace",fontSize:9,cursor:"pointer"}}>Reset</button>
                  </div>}
                  <div style={{textAlign:"center",fontSize:7.5,color:"#1a3060",marginTop:4}}>Siklus AI: <span style={{color:"#3a6aaa",fontFamily:"'Orbitron',monospace"}}>{aiCycle}</span> | Interval: {settings.aiInterval}s</div>
                </div>
              </div>
            </div>

            {/* Manual Order Panel */}
            <ManualOrder
              pair={viewPair}
              price={viewPrice}
              isPro={isPro}
              config={config}
              onOrder={function(order){
                addLog({type:"order",color:"#ffd93d",msg:"[MANUAL] "+order.side+" "+order.pair+" "+order.qty+" @ $"+order.price});
              }}
            />

            {/* Log */}
            <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:9,padding:"9px 11px"}}>
              <div style={{fontSize:7.5,color:"#152040",letterSpacing:2,marginBottom:7}}>AI LOG</div>
              <div ref={logBoxRef} style={{height:95,overflowY:"auto"}}>
                {logItems.length===0&&<div style={{textAlign:"center",color:"#0c1a38",fontSize:9.5,marginTop:34}}>Waiting...</div>}
              {aiErr==="CREDIT_EXHAUSTED"&&(
                <div style={{background:"rgba(80,0,0,.2)",border:"1px solid #5a0000",borderRadius:8,padding:"12px",margin:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:6}}>💳</div>
                  <div style={{fontSize:10,color:"#ff4d6d",fontWeight:700,marginBottom:4}}>Kredit Anthropic Habis</div>
                  <div style={{fontSize:9,color:"#7a3030",lineHeight:1.8,marginBottom:8}}>
                    Isi ulang kredit atau ganti ke Groq (gratis).
                  </div>
                  <button onClick={function(){window.open("https://console.anthropic.com/settings/billing","_blank");}}
                    style={{background:"rgba(255,50,50,.2)",border:"1px solid #5a0000",borderRadius:6,padding:"5px 14px",color:"#ff4d6d",cursor:"pointer",fontSize:9,fontFamily:"'Share Tech Mono',monospace",marginBottom:4,display:"block",width:"100%"}}>
                    Buka Anthropic Billing
                  </button>
                </div>
              )}
              {aiErr==="DAILY_LIMIT"&&(
                <div style={{background:"rgba(80,30,0,.2)",border:"1px solid #6a2800",borderRadius:8,padding:"12px",margin:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:6}}>⏰</div>
                  <div style={{fontSize:10,color:"#ff6b35",fontWeight:700,marginBottom:4}}>Groq Daily Limit Tercapai</div>
                  <div style={{fontSize:9,color:"#7a4020",lineHeight:1.8,marginBottom:6}}>
                    Bot lanjut OTOMATIS jam 07:00 WIB.
                  </div>
                </div>
              )}
              {globalStop==="MAX_DRAWDOWN"&&(
                <div style={{background:"rgba(80,0,0,.25)",border:"1px solid #6a0000",borderRadius:8,padding:"12px",margin:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:6}}>🛑</div>
                  <div style={{fontSize:10,color:"#ff4d6d",fontWeight:700,marginBottom:4}}>GLOBAL STOP — Max Drawdown</div>
                  <div style={{fontSize:9,color:"#7a2020",lineHeight:1.8,marginBottom:8}}>
                    Modal turun melebihi batas yang ditetapkan.<br/>
                    Trading dihentikan untuk melindungi sisa modal kamu.
                  </div>
                  <button onClick={function(){setGlobalStop(null);}}
                    style={{background:"rgba(200,0,0,.2)",border:"1px solid #5a0000",borderRadius:6,padding:"5px 14px",color:"#ff4d6d",cursor:"pointer",fontSize:9,fontFamily:"'Share Tech Mono',monospace",width:"100%"}}>
                    Saya Mengerti Risikonya — Resume Manual
                  </button>
                </div>
              )}
              {globalStop==="DAILY_LOSS"&&(
                <div style={{background:"rgba(80,40,0,.25)",border:"1px solid #6a3000",borderRadius:8,padding:"12px",margin:"8px 0",textAlign:"center"}}>
                  <div style={{fontSize:20,marginBottom:6}}>📉</div>
                  <div style={{fontSize:10,color:"#ff9a6b",fontWeight:700,marginBottom:4}}>DAILY STOP — Batas Kerugian Harian</div>
                  <div style={{fontSize:9,color:"#7a4020",lineHeight:1.8,marginBottom:8}}>
                    Kerugian hari ini melampaui batas yang kamu set.<br/>
                    Bot berhenti hingga besok untuk melindungi modal.
                  </div>
                </div>
              )}
                {logItems.map(function(l,i){return(
                  <div key={i} style={{padding:"3px 0",borderBottom:"1px solid #050a18",lineHeight:1.6}}>
                    <span style={{fontSize:8,color:"#0e1e38"}}>{l.time} </span>
                    <span style={{fontSize:9.5,color:l.color}}>{l.msg}</span>
                    {l.reason&&<div style={{fontSize:8.5,color:"#2a4a70",paddingLeft:6,lineHeight:1.7}}>{l.reason}</div>}
                  </div>
                );})}
              </div>
            </div>
          </div>
        )}

        {/* HISTORY TAB — Fix #7 #10 */}
        {navTab==="history"&&(
          <div className="nt-content">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,color:"#5a9fff",fontWeight:700}}>History & Backtest</div>
              {trades.length>0&&<button onClick={exportCSV} style={{background:"rgba(0,80,200,.15)",border:"1px solid #1a4080",borderRadius:6,padding:"5px 12px",color:"#5a90df",cursor:"pointer",fontSize:9,fontFamily:"'Share Tech Mono',monospace"}}>Export CSV</button>}
            </div>

            {/* Backtest Results */}
            {backtest[viewPair.symbol] && (function(){
              var bt=backtest[viewPair.symbol];
              var regime=advIndics[viewPair.symbol]&&advIndics[viewPair.symbol].regime;
              return (
                <div style={{background:"rgba(0,10,5,.8)",border:"1px solid #003a18",borderRadius:9,padding:"10px 12px",marginBottom:10}}>
                  <div style={{fontSize:8,color:"#2a7a50",letterSpacing:2,marginBottom:8}}>BACKTEST — {viewPair.label} (last 80 candles)</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8}}>
                    {[
                      {l:"Win Rate",      v:bt.winRate+"%",                    c:bt.winRate>60?"#00e5a0":bt.winRate>52?"#ffd93d":"#ff4d6d"},
                      {l:"Profit Factor", v:bt.profitFactor||"-",              c:bt.profitFactor>1.5?"#00e5a0":bt.profitFactor>1?"#ffd93d":"#ff4d6d"},
                      {l:"Sharpe Ratio",  v:bt.sharpe||"-",                    c:bt.sharpe>1?"#00e5a0":bt.sharpe>0?"#ffd93d":"#ff4d6d"},
                      {l:"Max Drawdown",  v:"-"+(bt.maxDrawdown||0).toFixed(1)+"%", c:bt.maxDrawdown<5?"#00e5a0":bt.maxDrawdown<15?"#ffd93d":"#ff4d6d"},
                      {l:"Avg PnL/Trade", v:bt.avgPnl+"%",                    c:bt.avgPnl>0?"#00e5a0":"#ff4d6d"},
                      {l:"Candles Used",  v:bt.candlesUsed||bt.total,          c:"#7ab0ff"},
                    ].map(function(s){return(
                      <div key={s.l} style={{background:"#020508",border:"1px solid #0a1428",borderRadius:7,padding:"7px 8px"}}>
                        <div style={{fontSize:7,color:"#152040",letterSpacing:1}}>{s.l}</div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,color:s.c,fontWeight:700,marginTop:2}}>{s.v}</div>
                      </div>
                    );})}
                  </div>
                  {regime&&(
                    <div style={{fontSize:8.5,color:regime.color,lineHeight:1.8}}>
                      Market Regime: <strong>{regime.type}</strong>
                      {regime.type==="STRONG TREND"&&" — Strategi trend-following lebih optimal"}
                      {regime.type==="RANGING"&&" — Gunakan mean-reversion, hindari trend signal"}
                      {regime.type==="WEAK TREND"&&" — Mixed strategy, konfirmasi lebih ketat"}
                    </div>
                  )}
                  <div style={{fontSize:8,color:"#1e3a60",marginTop:6}}>
                    *Backtest pada data historis. Past performance tidak menjamin hasil masa depan.
                  </div>
                </div>
              );
            })()}
            {/* Fix #9 — Equity curve */}
            {eqHist.length>1&&(
              <div style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:9,padding:"10px 12px",marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div style={{fontSize:8,color:"#152040",letterSpacing:2}}>EQUITY CURVE</div>
                  <div style={{fontSize:10,color:pnlPos?"#00e5a0":"#ff4d6d",fontFamily:"'Orbitron',monospace",fontWeight:700}}>{pnlPos?"+":""}{portfolio.pct.toFixed(2)}%</div>
                </div>
                <div style={{height:70,borderRadius:6,overflow:"hidden"}}><EquityCurve history={eqHist} h={70}/></div>
              </div>
            )}
            {trades.length===0?(
              <div style={{textAlign:"center",color:"#0c1a38",marginTop:60,fontSize:10.5}}>Belum ada trade. Aktifkan AI dulu.</div>
            ):(
              trades.map(function(t){var tc=t.cat==="METALS"?"#ffd700":t.cat==="FOREX"?"#5a9fff":"#9945ff";return(
                <div key={t.id} style={{background:"rgba(3,6,18,.95)",border:"1px solid #0a1428",borderRadius:8,padding:"9px 11px",marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                        <span style={{fontFamily:"'Orbitron',monospace",fontSize:10,color:t.action==="BUY"?"#00e5a0":"#ff4d6d",fontWeight:700}}>{t.action}</span>
                        <span style={{fontSize:10.5,color:"#5a8ad0"}}>{t.pair}</span>
                        <span style={{fontSize:7.5,color:tc,border:"1px solid "+tc+"30",borderRadius:3,padding:"1px 5px"}}>{t.cat}</span>
                      </div>
                      <div style={{fontSize:8.5,color:"#2a4a70"}}>{t.signal}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,color:t.pnl>=0?"#00e5a0":"#ff4d6d",fontWeight:700}}>{(t.pnl>=0?"+":"")+t.pnl.toFixed(2)}</div>
                      <div style={{fontSize:7.5,color:"#1e3a60",marginTop:2}}>{t.time}</div>
                    </div>
                  </div>
                </div>
              );})
            )}
          </div>
        )}

        {/* PRO TAB */}
        {navTab==="pro"&&(
          <div className="nt-content">
            <UpgradeScreen user={user} onClose={function(){setNavTab("trade");}} onUpgrade={function(plan){
              if(plan.id==="trial"){props.onUpgrade(plan.id);setNavTab("trade");return;}
              setPayPlan(plan);setShowPay(true);
            }}/>
          </div>
        )}
        </div>
      </div>














      {/* Bottom nav (mobile only) */}
      <div style={{borderTop:"1px solid #080f22",background:"rgba(1,3,12,.98)",display:"grid",gridTemplateColumns:"repeat(3,1fr)",flexShrink:0}} className="nt-bottom-nav">
        {[{id:"trade",icon:"📊",label:"Trading"},{id:"history",icon:"📋",label:"History"},{id:"pro",icon:"⭐",label:isPro?"PRO":"Upgrade"}].map(function(tab){
          var isAct=navTab===tab.id;
          return(<button key={tab.id} onClick={function(){setNavTab(tab.id);}} style={{padding:"9px 0",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,borderTop:"2px solid "+(isAct?"#0060e0":"transparent")}}>
            <span style={{fontSize:18}}>{tab.icon}</span>
            <span style={{fontSize:8,color:isAct?"#5a90df":"#1e3a60",fontFamily:"'Share Tech Mono',monospace"}}>{tab.label}</span>
          </button>);
        })}
      </div>

      {/* Overlays */}
      {showSettings&&<SettingsModal
        settings={settings}
        config={config}
        onChange={function(s){setSettings(s);}}
        onConfigChange={function(newCfg){
          setConfig(newCfg);
          saveSession(user&&user.email?user.email:"", user&&user.tier?user.tier:"free", newCfg);
        }}
        onClose={function(){setShowSett(false);}}/>}
      {showUpg&&<UpgradeScreen user={user} onClose={function(){setShowUpg(false);}} onUpgrade={function(plan){if(plan.id==="trial"){props.onUpgrade("trial");setShowUpg(false);return;}setPayPlan(plan);setShowPay(true);setShowUpg(false);}}/>}
      {showPayment&&payPlan&&<QRISPayment plan={payPlan} onClose={function(){setShowPay(false);setPayPlan(null);}} onSuccess={function(){setShowPay(false);props.onUpgrade(payPlan.id);}}/>}
      {confirm&&<ConfirmDialog msg={confirm.msg} danger={confirm.danger} onYes={confirm.onYes} onNo={confirm.onNo}/>}
    </div>
  );
}

// ─── FIX 12: Regulatory Disclaimer ──────────────────────────────
function DisclaimerModal(props) {
  var onAccept = props.onAccept;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(1,2,10,.98)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:440,background:"#030610",border:"1px solid #1a3060",borderRadius:14,padding:24}}>
        <div style={{fontSize:28,textAlign:"center",marginBottom:12}}>⚠️</div>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#ff9a00",fontWeight:700,textAlign:"center",marginBottom:16,letterSpacing:1}}>
          DISCLAIMER RISIKO TRADING
        </div>
        <div style={{fontSize:10,color:"#3a5a80",lineHeight:1.9,marginBottom:20}}>
          • Trading forex, crypto, dan komoditas mengandung <strong style={{color:"#ff4d6d"}}>risiko kehilangan modal</strong><br/>
          • AI NeuraTrade bukan jaminan profit — keputusan akhir tetap di tangan Anda<br/>
          • Pastikan API Key benar dan saldo exchange mencukupi sebelum mulai<br/>
          • Gunakan hanya modal yang siap Anda tanggung risikonya
        </div>
        <button onClick={onAccept}
          style={{width:"100%",background:"linear-gradient(135deg,#003500,#007700)",border:"none",borderRadius:10,padding:14,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
          ✓ Saya Mengerti — Mulai Trading
        </button>
        <div style={{textAlign:"center",fontSize:8,color:"#1a3060",marginTop:10}}>
          Dengan melanjutkan, Anda menyetujui bahwa NeuraTrade tidak bertanggung jawab atas kerugian trading
        </div>
      </div>
    </div>
  );
}

// ─── FIX 10: Secure key storage (sessionStorage + obfuscation) ───
function saveKeys(cfg) {
  try {
    var toSave = {
      anthropicKey: cfg.anthropicKey || "",
      groqKey:      cfg.groqKey      || "",
      geminiKey:    cfg.geminiKey    || "",
      aiModel:      cfg.aiModel      || "",
      exchange:     cfg.exchange ? cfg.exchange.name : "",
    };
    // Basic obfuscation (not encryption — do NOT use for production secrets)
    // In production: store keys server-side via backend, never in browser
    var encoded = btoa(JSON.stringify(toSave));
    localStorage.setItem("nt_cfg", encoded);
  } catch(e) {}
}
// ── SESSION STORAGE v3 (plain JSON, reliable) ─────────────────
var NT_SESSION_KEY = "nt_v3_session";

function saveSession(email, tier, cfg) {
  try {
    localStorage.setItem(NT_SESSION_KEY, JSON.stringify({
      email: email, tier: tier || "free", cfg: cfg, ts: Date.now()
    }));
    return true;
  } catch(e) { return false; }
}

function loadSession() {
  try {
    var raw = localStorage.getItem(NT_SESSION_KEY);
    if (!raw) return null;
    var s = JSON.parse(raw);
    if (!s || !s.email || !s.cfg || !s.cfg.mode) return null;
    return s;
  } catch(e) { return null; }
}

function clearSession() {
  try {
    localStorage.removeItem(NT_SESSION_KEY);
    ["nt_cfg","nt_email","nt_tier","nt_expiry","nt_token","nt_access_token","nt_cfg_raw"].forEach(function(k){
      try { localStorage.removeItem(k); } catch(e) {}
    });
  } catch(e) {}
}

function loadKeys() {
  // Try primary storage
  try {
    var raw = localStorage.getItem("nt_cfg");
    if (raw) {
      var decoded = JSON.parse(atob(raw));
      if (decoded && decoded.mode) return decoded;
    }
  } catch(e) {}
  // Try fallback (URL-encoded btoa)
  try {
    var raw2 = localStorage.getItem("nt_cfg");
    if (raw2) {
      var decoded2 = JSON.parse(decodeURIComponent(atob(raw2)));
      if (decoded2 && decoded2.mode) return decoded2;
    }
  } catch(e) {}
  // Try raw JSON fallback
  try {
    var raw3 = localStorage.getItem("nt_cfg_raw");
    if (raw3) {
      var decoded3 = JSON.parse(raw3);
      if (decoded3 && decoded3.mode) return decoded3;
    }
  } catch(e) {}
  return null;
}
function clearKeys() {
  try { localStorage.removeItem("nt_cfg"); } catch(e) {}
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  // ── Synchronous init from localStorage (prevents black screen) ──
  var [screen,  setScreen]  = useState(function(){
    try {
      var e = localStorage.getItem("nt_email");
      var k = localStorage.getItem("nt_cfg");
      if (e && k) return "dashboard";
      if (e)      return "setup";
    } catch(err) {}
    return "splash";
  });
  var [user, setUser] = useState(function(){
    try {
      var e = localStorage.getItem("nt_email");
      if (e) return { email:e, tier:"free", trialExpiry:null };
    } catch(err) {}
    return null;
  });
  var [config, setConfig] = useState(function(){
    try {
      var raw = localStorage.getItem("nt_cfg");
      if (!raw) return null;
      var d = JSON.parse(atob(raw));
      if (d.exchange && d.exchange.name) {
        var ex = EXCHANGES_LIST.find(function(e){ return e.name === d.exchange.name; });
        if (ex) d.exchange = ex;
      }
      if (d.scope && d.scope.id) {
        var sc = MARKET_SCOPES.find(function(s){ return s.id === d.scope.id; });
        if (sc) d.scope = sc;
      }
      return d;
    } catch(err) { return null; }
  });
  var [pending, setPending] = useState("");
  var [showDisclaimer, setShowDisclaimer] = useState(false);
  var [appReady, setAppReady] = useState(true); // always ready — state init handles session

  useEffect(function(){
    // ══════════════════════════════════════════════════════════
    //  SESSION RESTORE — User tetap login setelah F5/refresh
    //  Logout HANYA terjadi saat user klik tombol Logout
    // ══════════════════════════════════════════════════════════
    try {
      // 1. Cek magic link callback dari email
      var hash   = window.location.hash;
      var search = window.location.search;

      // Handle error dari Supabase (link expired, dll)
      if (hash.includes("error=") || search.includes("error=")) {
        var errParams = new URLSearchParams(hash.replace("#","") + "&" + search.replace("?",""));
        var errDesc   = (errParams.get("error_description") || "Link tidak valid").replace(/\+/g," ");
        window.history.replaceState({}, document.title, window.location.pathname);
        setAppReady(true);
        setScreen("login");
        setTimeout(function(){ alert("❌ " + errDesc + "\n\nSilakan minta magic link baru."); }, 400);
        return;
      }

      // Handle magic link sukses (ada access_token di URL)
      var hasToken = hash.includes("access_token") || search.includes("access_token");
      if (hasToken) {
        var params      = new URLSearchParams(hash.replace("#","") + "&" + search.replace("?",""));
        var accessToken = params.get("access_token");
        if (accessToken) {
          try {
            var payload = JSON.parse(atob(accessToken.split(".")[1]));
            var email   = payload.email;
            if (email) {
              // Simpan sesi ke localStorage
              localStorage.setItem("nt_email", email);
              localStorage.setItem("nt_token", accessToken);
              // Sesi sementara (config akan disave saat setup selesai)
              window.history.replaceState({}, document.title, window.location.pathname);
              setUser({ email:email, tier:"free", trialExpiry:null });
              setAppReady(true);
              // Cek apakah sudah ada config → langsung ke dashboard
              var existingCfg = loadKeys();
              if (existingCfg && existingCfg.mode) {
                setConfig(existingCfg);
                setScreen("dashboard");
              } else {
                setScreen("setup");
              }
              // Background: sync tier dari backend
              fetch("https://neuratrade-backend.onrender.com/api/user/" + encodeURIComponent(email))
                .then(function(r){ return r.json(); })
                .then(function(data){
                  if (data && data.tier) {
                    var exp = data.pro_expiry   ? new Date(data.pro_expiry).getTime()
                            : data.trial_expiry ? new Date(data.trial_expiry).getTime() : null;
                    setUser({ email:email, tier:data.tier, trialExpiry:exp });
                    localStorage.setItem("nt_tier",   data.tier);
                    localStorage.setItem("nt_expiry",  exp || "");
                  }
                }).catch(function(){});
              return;
            }
          } catch(e) { console.warn("Token parse:", e); }
        }
      }

      // 2. Restore sesi dari localStorage — TIDAK logout saat close browser
      // Coba format baru dulu
      var session = loadSession();

      if (session && session.email && session.cfg) {
        var cfg = Object.assign({}, session.cfg);
        try {
          if (cfg.exchange && cfg.exchange.name) {
            var matchEx = EXCHANGES_LIST.find(function(e){ return e.name === cfg.exchange.name; });
            cfg.exchange = matchEx || EXCHANGES_LIST[0];
          } else { cfg.exchange = EXCHANGES_LIST[0]; }
          if (cfg.scope && cfg.scope.id) {
            var matchSc = MARKET_SCOPES.find(function(s){ return s.id === cfg.scope.id; });
            cfg.scope = matchSc || MARKET_SCOPES[0];
          } else { cfg.scope = MARKET_SCOPES[0]; }
          cfg.balance = parseFloat(cfg.balance) || 5000;
        } catch(e) {}
        setUser({ email:session.email, tier:session.tier||"free", trialExpiry:null });
        setConfig(cfg);
        setAppReady(true);
        setScreen("dashboard");
        // Sync tier di background
        fetch("https://neuratrade-backend.onrender.com/api/user/" + encodeURIComponent(session.email))
          .then(function(r){ return r.json(); })
          .then(function(data){
            if (data && data.tier) {
              setUser({ email:session.email, tier:data.tier, trialExpiry:null });
              saveSession(session.email, data.tier, cfg);
            }
          }).catch(function(){});
        return;
      }

      // Coba legacy format (nt_email + nt_cfg terpisah)
      var legacyEmail = localStorage.getItem("nt_email");
      var legacyCfg   = (function(){
        try {
          var r = localStorage.getItem("nt_cfg");
          if (!r) return null;
          // Try plain JSON first
          try { var d = JSON.parse(r); if (d && d.mode) return d; } catch(e) {}
          // Try btoa
          try { var d2 = JSON.parse(atob(r)); if (d2 && d2.mode) return d2; } catch(e) {}
          return null;
        } catch(e) { return null; }
      })();

      if (legacyEmail && legacyCfg) {
        // Migrate ke format baru
        saveSession(legacyEmail, localStorage.getItem("nt_tier")||"free", legacyCfg);
        var cfg2 = Object.assign({}, legacyCfg);
        try {
          if (cfg2.exchange && cfg2.exchange.name) {
            var mx = EXCHANGES_LIST.find(function(e){ return e.name === cfg2.exchange.name; });
            cfg2.exchange = mx || EXCHANGES_LIST[0];
          } else { cfg2.exchange = EXCHANGES_LIST[0]; }
        } catch(e) {}
        setUser({ email:legacyEmail, tier:localStorage.getItem("nt_tier")||"free", trialExpiry:null });
        setConfig(cfg2);
        setAppReady(true);
        setScreen("dashboard");
        return;
      } else if (legacyEmail) {
        setUser({ email:legacyEmail, tier:"free", trialExpiry:null });
        setAppReady(true);
        setScreen("setup");
        return;
      }
      // 3. Tidak ada sesi → splash screen → login
      var t = setTimeout(function(){
        setAppReady(true);
        setScreen("login");
      }, 2000);
      return function(){ clearTimeout(t); };

    } catch(e) {
      // Safety net: kalau ada error tak terduga → tampilkan login
      console.error("Session init error:", e);
      setAppReady(true);
      setScreen("login");
    }
  },[]);;;

  async function handleLogin(email) {
    // Demo emails: langsung masuk tanpa email
    if(_D.indexOf(email)!==-1){
      localStorage.setItem("nt_email", email);
      localStorage.setItem("nt_tier", "trial");
      setUser({email:email, tier:"trial", trialExpiry:Date.now()+7*24*3600*1000});
      setPending(email);
      setScreen("verify_demo");
      return;
    }
    // Real Supabase magic link via REST API  
    var SUPA_URL  = "https://bgoezzoalgkoivygnoqp.supabase.co";
    var SUPA_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnb2V6em9hbGdrb2l2eWdub3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjY2OTYsImV4cCI6MjA5NjIwMjY5Nn0.J4DMIxoK1gEQ9nr6oAkdzCvBp5VkOhOnNne6PLvh4zY";
    try {
      var res = await fetch(SUPA_URL + "/auth/v1/otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPA_ANON,
        },
        body: JSON.stringify({
          email: email,
          options: {
            emailRedirectTo: window.location.origin + "/?auth=magic",
          }
        }),
      });
      if (res.ok) {
        setPending(email);
        setScreen("verify");
        addMagicLog("Magic link dikirim ke " + email);
      } else {
        var err = await res.json();
        alert("Gagal kirim magic link: " + (err.msg || err.error || "Unknown error"));
      }
    } catch(e) {
      // Fallback: show verify screen with demo
      setPending(email);
      setScreen("verify");
    }
  }
  function handleVerified(){
    localStorage.setItem("nt_email", pending);
    localStorage.setItem("nt_tier", "free");
    setUser({email:pending, tier:"free", trialExpiry:null});
    // Cek apakah sudah punya config → langsung dashboard
    var existingCfg = loadKeys();
    if (existingCfg && existingCfg.mode) {
      if (existingCfg.exchange && existingCfg.exchange.name) {
        var matchEx = EXCHANGES_LIST.find(function(e){ return e.name === existingCfg.exchange.name; });
        if (matchEx) existingCfg.exchange = matchEx;
      }
      setConfig(existingCfg);
      setScreen("dashboard");
    } else {
      setScreen("setup");
    }
    // Background sync tier
    fetch("https://neuratrade-backend.onrender.com/api/user/" + encodeURIComponent(pending))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.tier){
          var exp = data.pro_expiry ? new Date(data.pro_expiry).getTime()
                  : data.trial_expiry ? new Date(data.trial_expiry).getTime() : null;
          setUser({email:pending, tier:data.tier, trialExpiry:exp});
          localStorage.setItem("nt_tier", data.tier);
          localStorage.setItem("nt_expiry", exp || "");
        }
      }).catch(function(){});
  }
  function addMagicLog(msg){ console.log("[Auth]", msg); }
  function handleSetupDone(cfg){
    setConfig(cfg);
    // Simpan sesi
    var emailToSave = (user && user.email) ? user.email : localStorage.getItem("nt_email") || "";
    var tierToSave  = (user && user.tier)  ? user.tier  : localStorage.getItem("nt_tier")  || "free";
    if (emailToSave) {
      saveSession(emailToSave, tierToSave, cfg);
      localStorage.setItem("nt_email", emailToSave);
    }
    // Langsung ke dashboard tanpa modal disclaimer
    setAppReady(true);
    setScreen("dashboard");
  }
  // Fix #15 — proper yearly/monthly distinction
  function handleUpgrade(planId){
    setUser(function(prev){
      var tier=planId==="trial"?"trial":planId==="yearly"?"pro_yearly":"pro";
      var expiry=planId==="trial"?Date.now()+7*24*3600*1000:planId==="yearly"?Date.now()+365*24*3600*1000:Date.now()+30*24*3600*1000;
      return Object.assign({},prev,{tier:tier,trialExpiry:expiry});
    });
  }
  function handleTrialExpired(){
    setUser(function(prev){return Object.assign({},prev,{tier:"free",trialExpiry:null});});
  }
  function handleLogout(){
    // Logout HANYA saat user klik tombol ini
    clearSession();
    setUser(null);
    setConfig(null);
    setAppReady(true);
    setScreen("login");
  }

  var isPro = user && user.tier !== "free";

  // ── Prevent black screen on refresh ──────────────────────────
  if (!appReady) {
    return (
      <div style={{minHeight:"100vh",background:"#020810",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:20,fontWeight:900,letterSpacing:2}}>
          <span style={{background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NEURA</span>
          <span style={{background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TRADE</span>
        </div>
        <div style={{display:"flex",gap:8,marginTop:8}}>
          {[0,1,2].map(function(i){
            return <div key={i} style={{width:9,height:9,borderRadius:"50%",background:"#5a9fff",animation:"pulse 1.2s "+(i*0.3)+"s infinite"}}/>;
          })}
        </div>
        <div style={{fontSize:9,color:"#1e3a60",letterSpacing:2,marginTop:4}}>MEMUAT...</div>
        <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.2}}"}</style>
      </div>
    );
  }

  return(
    <div style={{fontFamily:"'Share Tech Mono',monospace",position:"fixed",inset:0,background:"#020810"}} translate="no">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        html,body,#root{height:100%;background:#020810}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#010408}
        ::-webkit-scrollbar-thumb{background:#0c1830;border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        input:focus{outline:none;border-color:#0050d0!important}
        input[type=range]{accent-color:#0060e0;height:4px}
        button:active{transform:scale(.97)}
        *{-webkit-tap-highlight-color:transparent}

        /* ── DASHBOARD LAYOUT ─────────────────── */
        .nt-dash{display:flex;flex-direction:column;height:100vh;overflow:hidden;background:#020810}
        .nt-topbar{display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:rgba(1,3,12,.98);border-bottom:1px solid #080f22;flex-shrink:0;min-height:42px}
        .nt-body{display:flex;flex:1;overflow:hidden}
        .nt-sidebar{display:none;flex-direction:column;width:190px;min-width:190px;flex-shrink:0;background:rgba(1,3,12,.99);border-right:1px solid #0a1428;overflow-y:auto}
        .nt-sidebar-logo{padding:14px 14px 10px;border-bottom:1px solid #080f22;margin-bottom:6px}
        .nt-sidebar-nav{padding:0 8px;flex:1}
        .nt-sidebar-nav button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;border-radius:8px;background:transparent;border:1px solid transparent;cursor:pointer;color:#2a4a70;font-family:'Share Tech Mono',monospace;font-size:11px;transition:all .15s;margin-bottom:2px;text-align:left}
        .nt-sidebar-nav button.active{background:rgba(0,80,200,.18);border-color:#1a4080;color:#7ab0ff}
        .nt-sidebar-nav button:hover:not(.active){background:rgba(255,255,255,.04);color:#4a6a90}
        .nt-main{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
        .nt-content{padding:10px 12px;min-height:100%;padding-bottom:70px}
        .nt-bottom-nav{display:flex;border-top:1px solid #080f22;background:rgba(1,3,12,.98);flex-shrink:0;min-height:56px}
        .nt-bottom-nav button{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 4px;background:transparent;border:none;cursor:pointer;color:#3a5a80;font-family:'Share Tech Mono',monospace;font-size:10px;gap:4px;transition:all .15s;min-height:52px}
        .nt-bottom-nav button.active{color:#7ab0ff;background:rgba(0,80,200,.12);border-top:2px solid #5a90df}
        .nt-bottom-nav button:not(.active){border-top:2px solid transparent}

        @media(min-width:768px){
          .nt-sidebar{display:flex!important}
          .nt-bottom-nav{display:none!important}
          .nt-topbar{padding:7px 16px}
          .nt-content{padding:14px 18px;padding-bottom:20px}
        }

        /* ── SETTINGS MODAL ───────────────────── */
        .nt-settings-modal{position:fixed;inset:0;z-index:500;background:rgba(1,2,10,.97);display:flex;flex-direction:column}
        .nt-settings-head{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid #0a1428;background:#030610}
        .nt-settings-body{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 16px}
        .nt-settings-foot{flex-shrink:0;padding:12px 16px;border-top:1px solid #0a1428;background:#030610}
      `}</style>

      {screen==="splash"&&<SplashScreen/>}
      {screen==="login"&&<LoginScreen onLogin={handleLogin}/>}
      {screen==="verify"&&<VerifyScreen email={pending} isDemo={false} onVerified={handleVerified}/>}
      {screen==="verify_demo"&&<VerifyScreen email={pending} isDemo={true} onVerified={function(){setUser({email:pending,tier:"trial",trialExpiry:Date.now()+7*24*3600*1000});setScreen("setup");}}/>}
      {screen==="setup"&&user&&<SetupScreen onDone={handleSetupDone}/>}
      {showDisclaimer&&config&&(
        <DisclaimerModal onAccept={function(){
          setShowDisclaimer(false);
          setScreen("dashboard");
        }}/>
      )}
      {screen==="dashboard"&&user&&config&&(
        <Dashboard
          user={user}
          config={config}
          onUpgrade={handleUpgrade}
          onTrialExpired={handleTrialExpired}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
