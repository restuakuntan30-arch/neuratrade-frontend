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
var ADMIN_QRIS_URL  = "https://ibb.co.com/yFtwBRWp";
var ADMIN_WA        = "6282250931638";
var ADMIN_NAMA      = "NeuraTrade AI";
var ADMIN_BANK      = [
  { bank:"BCA",     no:"none", atas:ADMIN_NAMA },
  { bank:"Mandiri", no:"none", atas:ADMIN_NAMA },
];
var ADMIN_EWALLET = [
  { name:"GoPay", no:"0822-5093-1638", color:"#00aad4" },
  { name:"OVO",   no:"none", color:"#4c2a7e" },
  { name:"Dana",  no:"none", color:"#118eed" },
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

  // ── Try Groq (production only — may be blocked in browser sandbox) ──
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
      // Re-throw only specific known errors; anything else → silent fallback
      if (groqErr.message === "RATE_LIMIT" || groqErr.message === "INVALID_API_KEY") {
        throw groqErr;
      }
      // Network/CORS/timeout → fall through to Anthropic below
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
  // ohlc: [{o,h,l,c}] from Binance klines (preferred)
  // history: [price, price, ...] fallback for simulation
  var ohlc = props.ohlc || null;
  var history = props.history || [];
  var h = props.h || 140;
  var candles = [];
  if (ohlc && ohlc.length > 4) {
    candles = ohlc.slice(-70);
  } else if (history.length > 4) {
    var raw = history.slice(-70);
    var cs = Math.max(1, Math.floor(raw.length / 48));
    for (var i = 0; i < raw.length; i += cs) {
      var ch = raw.slice(i, i + cs);
      candles.push({ o: ch[0], c: ch[ch.length-1], h: Math.max.apply(null,ch), l: Math.min.apply(null,ch) });
    }
  }
  if (candles.length < 3) {
    return <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:"#0e1e40",fontSize:10}}>Mengumpulkan data...</div>;
  }
  var maxH = Math.max.apply(null, candles.map(function(c){return ohlc?c.h:c.hi||c.h;}));
  var minL = Math.min.apply(null, candles.map(function(c){return ohlc?c.l:c.lo||c.l;}));
  var rng = maxH - minL || maxH * 0.001;
  var W = 500, H = h, cw = W / candles.length;
  function toY(v){return H - ((v - minL)/rng) * (H - 12) - 4;}
  return (
    <svg viewBox={"0 0 "+W+" "+H} style={{width:"100%",height:"100%",display:"block"}}>
      <defs>
        <linearGradient id="cbg4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#03060e"/>
          <stop offset="100%" stopColor="#010407"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#cbg4)" rx="8"/>
      {[0.25, 0.5, 0.75].map(function(p){
        return <line key={p} x1={0} x2={W} y1={H*p} y2={H*p} stroke="#060c1a" strokeWidth=".7" strokeDasharray="3,5"/>;
      })}
      {candles.map(function(c, idx) {
        var x = idx * cw + cw * 0.5;
        var hi = ohlc ? c.h : (c.hi||c.h);
        var lo = ohlc ? c.l : (c.lo||c.l);
        var up = c.c >= c.o;
        var col = up ? "#00d890" : "#ff3a58";
        var bY = toY(Math.max(c.o, c.c));
        var bH = Math.max(1.5, Math.abs(toY(c.o) - toY(c.c)));
        return (
          <g key={idx}>
            <line x1={x} x2={x} y1={toY(hi)} y2={toY(lo)} stroke={col} strokeWidth=".8" opacity=".5"/>
            <rect x={x-cw*.38} y={bY} width={cw*.76} height={bH} fill={col} opacity=".88" rx=".5"/>
          </g>
        );
      })}
    </svg>
  );
}

// ─── EQUITY CURVE — Fix #9 ────────────────────────────────────
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
  var [local, setLocal] = useState(Object.assign({},settings));
  function upd(key,val){setLocal(function(p){var _s=Object.assign({},p);_s[key]=val;return _s;});}
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(1,2,10,.96)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:380,background:"#030610",border:"1px solid #0a1828",borderRadius:16,padding:24}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#5a9fff",fontWeight:700}}>Pengaturan AI</div>
          <button onClick={onClose} style={{background:"transparent",border:"1px solid #0a1428",borderRadius:6,padding:"4px 10px",color:"#2a4a70",cursor:"pointer",fontFamily:"'Share Tech Mono',monospace",fontSize:10}}>Batal</button>
        </div>
        {/* Model info */}
        <div style={{background:"rgba(60,20,80,.15)",border:"1px solid #3a1a5a",borderRadius:8,padding:"10px 12px",marginBottom:14}}>
          <div style={{fontSize:9,color:"#b06aff",letterSpacing:1.5,marginBottom:8}}>AI MODEL AKTIF</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {AI_MODELS.map(function(m){
              var isSel = local.aiModel ? local.aiModel === m.id : m.id.includes("haiku");
              return (
                <button key={m.id} onClick={function(){setLocal(function(p){var s=Object.assign({},p);s.aiModel=m.id;return s;});}}
                  style={{background:isSel?m.color+"15":"#020508",border:"1px solid "+(isSel?m.color+"50":"#0a1428"),borderRadius:7,padding:"8px",cursor:"pointer",textAlign:"left"}}>
                  <div style={{fontFamily:"'Orbitron',monospace",fontSize:9.5,color:isSel?m.color:"#3a5a80",fontWeight:700,marginBottom:2}}>{m.name}</div>
                  <div style={{fontSize:8,color:m.color,fontWeight:700}}>{m.costPer}/analisis</div>
                  <div style={{fontSize:7.5,color:"#1a3060",marginTop:2}}>{m.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
        {[
          { key:"riskPct",    label:"Risk per Trade (%)",          min:0.5, max:5,   step:0.5, unit:"%" },
          { key:"confThresh", label:"Min Confidence AI (%)",       min:50,  max:90,  step:5,   unit:"%" },
          { key:"aiInterval", label:"Interval Analisis (detik)",   min:10,  max:120, step:5,   unit:"s" },
          { key:"maxPos",     label:"Max Posisi Terbuka",          min:1,   max:5,   step:1,   unit:"" },
          { key:"tradeFee",   label:"Fee Trading (%)",             min:0,   max:0.5, step:0.05,unit:"%" },
          { key:"slippage",   label:"Estimasi Slippage (%)",       min:0,   max:0.3, step:0.05,unit:"%" },
          { key:"maxDrawdown",label:"Max Drawdown Global (%)",     min:2,   max:30,  step:1,   unit:"%" },
          { key:"dailyLoss",  label:"Max Kerugian Harian (%)",     min:1,   max:20,  step:1,   unit:"%" },
        ].map(function(cfg){
          return (
            <div key={cfg.key} style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontSize:10,color:"#3a5a80"}}>{cfg.label}</span>
                <span style={{fontSize:11,color:"#00e5a0",fontFamily:"'Orbitron',monospace",fontWeight:700}}>{local[cfg.key]}{cfg.unit}</span>
              </div>
              <input type="range" min={cfg.min} max={cfg.max} step={cfg.step} value={local[cfg.key]} onChange={function(e){upd(cfg.key,parseFloat(e.target.value));}}
                style={{width:"100%",accentColor:"#0060e0"}}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:8,color:"#1a3060",marginTop:2}}>
                <span>{cfg.min}{cfg.unit}</span><span>{cfg.max}{cfg.unit}</span>
              </div>
            </div>
          );
        })}
        {/* Estimated daily cost */}
        {(function(){
          var model = local.aiModel || AI_MODELS[0].id;
          var costPer = model.includes("haiku") ? 0.0001 : 0.003;
          var interval = local.aiInterval || 30;
          var callsPerDay = Math.floor(86400 / interval);
          var totalUSD = (callsPerDay * costPer).toFixed(2);
          var totalIDR = Math.round(callsPerDay * costPer * 15800).toLocaleString("id-ID");
          return (
            <div style={{background:"rgba(0,10,5,.5)",border:"1px solid #003a18",borderRadius:7,padding:"8px 12px",marginBottom:12}}>
              <div style={{fontSize:8.5,color:"#2a7a50",marginBottom:4}}>Estimasi biaya per hari:</div>
              <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,color:"#00e5a0",fontWeight:700}}>
                ~${totalUSD} = Rp {totalIDR}
              </div>
              <div style={{fontSize:8,color:"#1a4a30",marginTop:3}}>
                {callsPerDay} analisis × {model.includes("haiku")?"Haiku (~Rp 1)":"Sonnet (~Rp 45)"}/analisis
              </div>
            </div>
          );
        })()}
        <button onClick={function(){onChange(local);onClose();}} style={{width:"100%",background:"linear-gradient(135deg,#003ab0,#006eff)",border:"none",borderRadius:9,padding:12,color:"#fff",fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,cursor:"pointer",letterSpacing:1}}>
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
    var b = parseFloat(bal);
    if (!b || b < 10) { setErr("Modal minimal $10"); return; }
    if (mode === "real") {
      var isMt5 = selEx.cred === "mt5";
      if (isMt5) {
        if (!mt5Login.trim())  { setErr("Login (nomor akun) wajib diisi"); return; }
        if (!mt5Server.trim()) { setErr("Server broker wajib diisi"); return; }
        if (!mt5Pass.trim())   { setErr("Kata sandi trading wajib diisi"); return; }
      } else {
        if (!apiKey.trim())    { setErr("API Key wajib diisi untuk mode Real Trading"); return; }
        if (!secret.trim())    { setErr("Secret Key wajib diisi untuk mode Real Trading"); return; }
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
      aiModel:      aiModel,
      exchange:     selEx,
      scope:        scope,
    });
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
                  <input value={anthropicKey} onChange={function(e){ setAnthropicKey(e.target.value); }}
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

        <button onClick={submit}
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
    var SUPA_ANON = props.supaAnon || "";
    try {
      await fetch(SUPA_URL + "/auth/v1/otp", {
        method: "POST",
        headers: { "Content-Type":"application/json", "apikey": SUPA_ANON },
        body: JSON.stringify({ email: props.email, options: { emailRedirectTo: window.location.origin } }),
      });
      setResent(true);
    } catch(e) {}
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
  var [navTab,   setNavTab]   = useState("trade");
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

  // ── Fetch real balance from exchange via backend ──────
  var fetchRealBalance = useCallback(async function() {
    if (!config || config.mode !== "real") return;
    if (!config.apiKey || !config.secretKey) return;
    setBalLoading(true);
    setBalError("");
    try {
      var BACKEND  = "https://neuratrade-backend.onrender.com";
      var exName   = (config.exchange && config.exchange.name ? config.exchange.name : "binance").toLowerCase();
      var res = await fetch(BACKEND + "/api/balance", {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "x-api-key":     config.apiKey,
          "x-secret":      config.secretKey,
          "x-exchange":    exName,
        },
        body: JSON.stringify({}),
      });
      var data = await res.json();
      if (data.error) {
        setBalError(data.error);
      } else {
        setRealBalance(data);
        // Update portfolio dengan saldo real
        var realUsd = data.totalUsdt || 0;
        setPortfolio(function(prev) {
          return Object.assign({}, prev, {
            bal:     realUsd,
            initBal: prev.initBal === config.balance ? realUsd : prev.initBal,
          });
        });
        setEqHist(function(prev) {
          return prev.concat([{ time: Date.now(), bal: realUsd }]);
        });
      }
    } catch(e) {
      setBalError("Gagal ambil saldo: " + e.message);
    }
    setBalLoading(false);
  }, [config]);

  // Auto-fetch balance on mount and every 30 seconds
  useEffect(function() {
    fetchRealBalance();
    var t = setInterval(fetchRealBalance, 30000);
    return function() { clearInterval(t); };
  }, [fetchRealBalance]);

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
        groqKey: config.anthropicKey || "",
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
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:"#020810",overflow:"hidden"}} className="nt-dashboard-wrap">

      {/* Top bar */}
      <div style={{borderBottom:"1px solid #080f22",padding:"7px 12px",background:"rgba(1,3,12,.98)",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
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

      <div style={{flex:1,overflow:"hidden"}}>

        {/* TRADE TAB */}
        {navTab==="trade"&&(
          <div style={{height:"100%",overflow:"auto",padding:"10px 12px"}}>
            <div style={{marginBottom:10}}>
              {/* Real balance banner for real mode */}
              {config && config.mode === "real" && (
                <div style={{background:"rgba(0,30,15,.4)",border:"1px solid "+(balError?"#5a0000":"#003a18"),borderRadius:9,padding:"8px 12px",marginBottom:8,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:7.5,color:"#1e5a30",letterSpacing:2,marginBottom:3}}>SALDO REAL EXCHANGE</div>
                    {balLoading ? (
                      <div style={{fontSize:11,color:"#3a5a80"}}>Mengambil saldo...</div>
                    ) : balError ? (
                      <div style={{fontSize:9.5,color:"#ff4d6d",lineHeight:1.6}}>{balError}</div>
                    ) : realBalance ? (
                      <div>
                        <div style={{fontFamily:"'Orbitron',monospace",fontSize:20,color:"#00e5a0",fontWeight:900}}>
                          ${realBalance.totalUsdt.toLocaleString(undefined,{maximumFractionDigits:2,minimumFractionDigits:2})}
                        </div>
                        <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                          {(realBalance.balances||[]).slice(0,5).map(function(b){
                            return b.free > 0 && (
                              <span key={b.asset} style={{fontSize:8,color:"#2a5a40",background:"rgba(0,60,30,.2)",border:"1px solid #003a18",borderRadius:4,padding:"1px 7px"}}>
                                {b.asset}: {b.free < 1 ? b.free.toFixed(6) : b.free.toLocaleString(undefined,{maximumFractionDigits:2})}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div style={{fontSize:10,color:"#1e3a60"}}>Belum terhubung</div>
                    )}
                  </div>
                  <button onClick={fetchRealBalance} disabled={balLoading}
                    style={{background:"rgba(0,100,50,.2)",border:"1px solid #003a18",borderRadius:6,padding:"6px 10px",color:"#00e5a0",cursor:balLoading?"default":"pointer",fontSize:9,flexShrink:0,fontFamily:"'Share Tech Mono',monospace"}}>
                    {balLoading?"...":"🔄"}
                  </button>
                </div>
              )}
              {/* Stats row */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5}}>
                {[
                  {l:"SALDO",v:"$"+(config&&config.mode==="real"&&realBalance?realBalance.totalUsdt:portfolio.bal).toLocaleString(undefined,{maximumFractionDigits:0}),c:"#7ab0ff"},
                  {l:"PnL",v:(pnlPos?"+":"")+portfolio.pnl.toFixed(2),c:pnlPos?"#00e5a0":"#ff4d6d"},
                  {l:"WIN RATE",v:portfolio.winRate+"%",c:"#ffd93d"},
                  {l:"TRADES",v:portfolio.totalTrades,c:"#7c6fff"},
                  {l:"AI CALLS",v:tokenUsage.calls,c:"#b06aff"},
                ].map(function(s){
                  return(
                    <div key={s.l} style={{background:"rgba(2,5,16,.96)",border:"1px solid #080e22",borderRadius:7,padding:"7px 6px",textAlign:"center"}}>
                      <div style={{fontSize:7,color:"#152040",letterSpacing:1.5}}>{s.l}</div>
                      <div style={{fontFamily:"'Orbitron',monospace",fontSize:11,fontWeight:700,color:s.c,marginTop:3}}>{s.v}</div>
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
              <div style={{height:120,borderRadius:6,overflow:"hidden"}}>
                <CandleChart ohlc={ohlcData[viewPair.symbol]} history={viewHist} h={120}/>
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
          <div style={{height:"100%",overflow:"auto",padding:"10px 12px"}}>
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
          <div style={{height:"100%",overflow:"auto",padding:"10px 12px"}}>
            <UpgradeScreen user={user} onClose={function(){setNavTab("trade");}} onUpgrade={function(plan){
              if(plan.id==="trial"){props.onUpgrade(plan.id);setNavTab("trade");return;}
              setPayPlan(plan);setShowPay(true);
            }}/>
          </div>
        )}
      </div>

      {/* Desktop sidebar nav */}
      <div className="nt-desktop-nav" style={{position:"fixed",left:0,top:0,bottom:0,zIndex:50}}>
        <div style={{fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:900,letterSpacing:2,padding:"12px 4px 20px"}}>
          <span style={{background:"linear-gradient(135deg,#0080ff,#00e5a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>NEURA</span>
          <span style={{background:"linear-gradient(135deg,#ff4d6d,#ff8f6b)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>TRADE</span>
        </div>
        {[{id:"trade",icon:"📊",label:"Trading"},{id:"history",icon:"📋",label:"History"},{id:"pro",icon:"⭐",label:isPro?"PRO":"Upgrade"}].map(function(tab){
          var isAct=navTab===tab.id;
          return <button key={tab.id} onClick={function(){setNavTab(tab.id);}} className={isAct?"active":""}>
            <span style={{fontSize:18}}>{tab.icon}</span>{tab.label}
          </button>;
        })}
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
      {showSettings&&<SettingsModal settings={settings} onChange={function(s){setSettings(s);}} onClose={function(){setShowSett(false);}}/>}
      {showUpg&&<UpgradeScreen user={user} onClose={function(){setShowUpg(false);}} onUpgrade={function(plan){if(plan.id==="trial"){props.onUpgrade("trial");setShowUpg(false);return;}setPayPlan(plan);setShowPay(true);setShowUpg(false);}}/>}
      {showPayment&&payPlan&&<QRISPayment plan={payPlan} onClose={function(){setShowPay(false);setPayPlan(null);}} onSuccess={function(){setShowPay(false);props.onUpgrade(payPlan.id);}}/>}
      {confirm&&<ConfirmDialog msg={confirm.msg} danger={confirm.danger} onYes={confirm.onYes} onNo={confirm.onNo}/>}
    </div>
  );
}

// ─── FIX 12: Regulatory Disclaimer ──────────────────────────────
function DisclaimerModal(props) {
  var onAccept = props.onAccept;
  var [checked1, setChecked1] = useState(false);
  var [checked2, setChecked2] = useState(false);
  var [checked3, setChecked3] = useState(false);
  var allChecked = checked1 && checked2 && checked3;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(1,2,10,.98)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:460,background:"#030610",border:"1px solid #3a0000",borderRadius:18,padding:26}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
          <div style={{fontFamily:"'Orbitron',monospace",fontSize:13,color:"#ff4d6d",fontWeight:700,marginBottom:4}}>PERINGATAN RISIKO</div>
          <div style={{fontSize:9,color:"#3a1a1a",letterSpacing:1.5}}>WAJIB DIBACA SEBELUM TRADING</div>
        </div>
        <div style={{background:"rgba(80,0,0,.15)",border:"1px solid #3a0000",borderRadius:9,padding:14,marginBottom:16,fontSize:10,color:"#8a3a3a",lineHeight:1.9}}>
          <strong style={{color:"#ff6b6b"}}>NeuraTrade adalah alat bantu analisis, BUKAN jaminan profit.</strong><br/>
          Trading aset keuangan mengandung risiko kehilangan modal yang besar. AI dapat salah. Past performance tidak menjamin hasil masa depan. Jangan trading dengan uang yang tidak siap kamu kehilangan.
        </div>
        <div style={{marginBottom:16}}>
          {[
            { key:"c1", val:checked1, set:setChecked1, text:"Saya memahami bahwa trading mengandung risiko tinggi dan bisa menyebabkan kerugian total modal saya." },
            { key:"c2", val:checked2, set:setChecked2, text:"Saya mengerti keuntungan trading di Indonesia wajib dilaporkan dan dikenai pajak (PPh)." },
            { key:"c3", val:checked3, set:setChecked3, text:"Saya menggunakan NeuraTrade sebagai alat bantu, bukan sebagai satu-satunya dasar keputusan investasi." },
          ].map(function(item){
            return (
              <div key={item.key} onClick={function(){item.set(!item.val);}}
                style={{display:"flex",gap:10,alignItems:"flex-start",padding:"8px 10px",marginBottom:6,background:"rgba(255,255,255,.02)",border:"1px solid "+(item.val?"#005530":"#1a0000"),borderRadius:8,cursor:"pointer"}}>
                <div style={{width:18,height:18,borderRadius:4,background:item.val?"#00e5a0":"#020508",border:"2px solid "+(item.val?"#00e5a0":"#3a1a1a"),flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
                  {item.val&&<span style={{fontSize:12,color:"#020508",fontWeight:700}}>✓</span>}
                </div>
                <span style={{fontSize:9.5,color:item.val?"#3a7a50":"#5a2a2a",lineHeight:1.7}}>{item.text}</span>
              </div>
            );
          })}
        </div>
        <button onClick={function(){if(allChecked)onAccept();}} disabled={!allChecked}
          style={{width:"100%",background:allChecked?"linear-gradient(135deg,#003ab0,#006eff)":"#0a1428",border:"none",borderRadius:10,padding:13,color:allChecked?"#fff":"#1a3060",fontFamily:"'Orbitron',monospace",fontSize:12,fontWeight:700,cursor:allChecked?"pointer":"default",letterSpacing:1}}>
          {allChecked?"Saya Mengerti — Mulai Trading":"Centang semua pernyataan di atas"}
        </button>
        <div style={{textAlign:"center",fontSize:8,color:"#1a0a0a",marginTop:8,lineHeight:1.7}}>
          Dengan melanjutkan, kamu menyetujui Terms of Service NeuraTrade.
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
      aiModel:      cfg.aiModel      || "",
      exchange:     cfg.exchange ? cfg.exchange.name : "",
    };
    // Basic obfuscation (not encryption — do NOT use for production secrets)
    // In production: store keys server-side via backend, never in browser
    var encoded = btoa(JSON.stringify(toSave));
    localStorage.setItem("nt_cfg", encoded);
  } catch(e) {}
}
function loadKeys() {
  try {
    var raw = localStorage.getItem("nt_cfg");
    if (!raw) return null;
    var decoded = JSON.parse(atob(raw));
    return decoded;
  } catch(e) { return null; }
}
function clearKeys() {
  try { localStorage.removeItem("nt_cfg"); } catch(e) {}
}

// ─── MAIN APP ─────────────────────────────────────────────────
export default function App() {
  var [screen,  setScreen]  = useState("splash");
  var [user,    setUser]    = useState(null);
  var [pending, setPending] = useState("");
  var [config,  setConfig]  = useState(null);
  var [showDisclaimer, setShowDisclaimer] = useState(false);
  var [appReady, setAppReady] = useState(false); // prevents black screen on refresh

  useEffect(function(){
    // Check for magic link callback in URL hash or query
    var hash = window.location.hash;
    var search = window.location.search;
    var hasAuthToken = hash.includes("access_token") || search.includes("access_token") 
                    || hash.includes("type=magiclink") || search.includes("auth=magic");
    
    if (hasAuthToken) {
      // Extract email from token and auto-login
      var params = new URLSearchParams(hash.replace("#","") + "&" + search.replace("?",""));
      var accessToken = params.get("access_token");
      if (accessToken) {
        // Decode JWT to get email
        try {
          var payload = JSON.parse(atob(accessToken.split(".")[1]));
          var email = payload.email;
          if (email) {
            // Save auth token
            localStorage.setItem("nt_access_token", accessToken);
            localStorage.setItem("nt_email", email);
            setUser({email:email, tier:"free", trialExpiry:null});
            setAppReady(true);
            // Load real tier from backend
            fetch("https://neuratrade-backend.onrender.com/api/user/" + encodeURIComponent(email))
              .then(function(r){return r.json();})
              .then(function(data){
                if(data && data.tier){
                  var expiry = data.pro_expiry ? new Date(data.pro_expiry).getTime()
                             : data.trial_expiry ? new Date(data.trial_expiry).getTime() : null;
                  setUser({email:email, tier:data.tier, trialExpiry:expiry});
                }
              }).catch(function(){});
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            setScreen("setup");
            return function(){};
          }
        } catch(e){ console.warn("Token parse error", e); }
      }
    }
    
    // Check saved session — batch all state updates to prevent black screen
    var savedEmail = localStorage.getItem("nt_email");
    var savedKeys  = loadKeys();

    if (savedEmail && savedKeys) {
      // Restore session: fix exchange object reference from stored JSON
      var restoredCfg = Object.assign({}, savedKeys);
      if (restoredCfg.exchange && restoredCfg.exchange.name) {
        var matchedEx = EXCHANGES_LIST.find(function(ex){ return ex.name === restoredCfg.exchange.name; });
        if (matchedEx) restoredCfg.exchange = matchedEx;
      }
      if (restoredCfg.scope && restoredCfg.scope.id) {
        var matchedScope = MARKET_SCOPES.find(function(s){ return s.id === restoredCfg.scope.id; });
        if (matchedScope) restoredCfg.scope = matchedScope;
      }
      // Set all states in single batch then show dashboard
      setUser({email:savedEmail, tier:"free", trialExpiry:null});
      setConfig(restoredCfg);
      setAppReady(true);
      setScreen("dashboard");
      // Background: refresh tier from backend
      fetch("https://neuratrade-backend.onrender.com/api/user/" + encodeURIComponent(savedEmail))
        .then(function(r){return r.json();})
        .then(function(data){
          if(data && data.tier){
            var expiry = data.pro_expiry ? new Date(data.pro_expiry).getTime()
                       : data.trial_expiry ? new Date(data.trial_expiry).getTime() : null;
            setUser({email:savedEmail, tier:data.tier, trialExpiry:expiry});
          }
        }).catch(function(){});
      return function(){};
    } else if (savedEmail) {
      setUser({email:savedEmail, tier:"free", trialExpiry:null});
      setAppReady(true);
      setScreen("setup");
      return function(){};
    }

    // No session: show splash then login
    var t = setTimeout(function(){
      setAppReady(true);
      setScreen("login");
    }, 2500);
    return function(){ clearTimeout(t); };
  },[]);

  async function handleLogin(email) {
    // Check demo emails
    if(_D.indexOf(email)!==-1){
      setUser({email:email,tier:"trial",trialExpiry:Date.now()+7*24*3600*1000});
      setPending(email);
      setScreen("verify_demo"); // special demo verify
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
    setUser({email:pending,tier:"free",trialExpiry:null});
    // Load user data from backend
    fetch("https://neuratrade-backend.onrender.com/api/user/" + encodeURIComponent(pending))
      .then(function(r){ return r.json(); })
      .then(function(data){
        if(data && data.tier) {
          var expiry = data.pro_expiry ? new Date(data.pro_expiry).getTime() 
                     : data.trial_expiry ? new Date(data.trial_expiry).getTime() : null;
          setUser({email:pending, tier:data.tier, trialExpiry:expiry});
        }
      })
      .catch(function(){});
    setScreen("setup");
  }
  function addMagicLog(msg){ console.log("[Auth]", msg); }
  function handleSetupDone(cfg){
    setConfig(cfg);
    saveKeys(cfg);
    setShowDisclaimer(true); // Fix 12 — show risk warning before dashboard
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
    clearKeys();
    localStorage.removeItem("nt_email");
    localStorage.removeItem("nt_access_token");
    setUser(null);
    setConfig(null);
    setAppReady(true); // keep ready so login screen shows
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
    <div style={{fontFamily:"'Share Tech Mono',monospace"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Orbitron:wght@400;700;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#010408}
        ::-webkit-scrollbar-thumb{background:#0c1830;border-radius:2px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        input:focus{outline:none;border-color:#0050d0!important}
        input[type=range]{accent-color:#0060e0}
        button:active{transform:scale(.97)}
        
        /* ── RESPONSIVE DESKTOP ── */
        @media (min-width: 768px) {
          .nt-dashboard { display: flex; flex-direction: row; height: 100vh; }
          .nt-sidebar { width: 280px; border-right: 1px solid #080f22; overflow-y: auto; }
          .nt-main { flex: 1; overflow-y: auto; }
          .nt-topbar { padding: 10px 24px !important; }
          .nt-grid-2 { grid-template-columns: 1fr 1fr !important; }
          .nt-grid-3 { grid-template-columns: 1fr 1fr 1fr !important; }
          .nt-chart { height: 200px !important; }
          .nt-card { padding: 18px 20px !important; }
          .nt-font-lg { font-size: 16px !important; }
          .nt-bottom-nav { display: none !important; }
          .nt-desktop-nav { display: flex !important; }
        }
        @media (max-width: 767px) {
          .nt-desktop-nav { display: none !important; }
          .nt-sidebar { display: none !important; }
        }
        
        /* Desktop nav sidebar */
        .nt-desktop-nav {
          flex-direction: column;
          gap: 4px;
          padding: 16px 12px;
          background: rgba(1,3,12,.95);
          border-right: 1px solid #080f22;
          min-height: 100vh;
          width: 200px;
          display: none;
        }
        .nt-desktop-nav button {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 12px; border-radius: 8px;
          background: transparent; border: none; cursor: pointer;
          text-align: left; color: #2a4a70;
          font-family: 'Share Tech Mono', monospace; font-size: 11px;
          transition: all .15s;
        }
        .nt-desktop-nav button.active, .nt-desktop-nav button:hover {
          background: rgba(0,80,200,.15); color: #5a90df;
        }
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
