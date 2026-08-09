// ================================================================
//  KAGAMI FINANCE — finance.js
//  加賀美ファイナンス 取引デモ ロジック
//
//  通貨単位: KGM (加賀美コイン) — 円のような仮想通貨単位
//  株価も KGM 建て。売買コストは KGM で計算。
// ================================================================
(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  //  銘柄定義
  //  各社の価格変動は実在企業のボラティリティ・ドリフトを参考に設定
  //    KGI  ← バンダイナムコ   (中高ボラ、ゆるやかな上昇)
  //    KGR  ← 任天堂          (中ボラ、安定成長)
  //    KGF  ← 東京エレクトロン (高ボラ、強い上昇)
  //    KGT  ← Google/Alphabet (中高ボラ、テック成長)
  //    KGMN ← トヨタ          (低ボラ、安定)
  // ─────────────────────────────────────────────────────────────
  const STOCKS = {
    KGI:  {
      name:     '加賀美インダストリアル',
      baseKgm:  3200,
      vol:      0.022,
      drift:    0.00010,
      desc:     '産業用ロボット・精密機械'
    },
    KGR:  {
      name:     '加賀美リゾート',
      baseKgm:  1480,
      vol:      0.018,
      drift:    0.00015,
      desc:     'ホテル・リゾート・観光事業'
    },
    KGF:  {
      name:     '加賀美フィナンシャル',
      baseKgm:  8750,
      vol:      0.028,
      drift:    0.00012,
      desc:     '金融・証券・投資事業'
    },
    KGT:  {
      name:     '加賀美テクノロジー',
      baseKgm:  15600,
      vol:      0.025,
      drift:    0.00020,
      desc:     'IT・AI・半導体事業'
    },
    KGMN: {
      name:     '加賀美マリン',
      baseKgm:  2960,
      vol:      0.016,
      drift:    0.00007,
      desc:     '海運・物流・造船事業'
    }
  };

  // ─────────────────────────────────────────────────────────────
  //  設定値
  // ─────────────────────────────────────────────────────────────
  const INITIAL_BALANCE_KGM = 50000;   // 初期残高 (KGM)
  const STORAGE_KEY         = 'kfg_finance_v3';
  const LIVE_TICK_MS        = 2500;    // ライブティック間隔 (ms)
  const TOPUP_AMOUNT        = 10000;   // DEBUGボタンの補充量

  // ローソク足カラー (gold: 上昇 / navy: 下落)
  const CANDLE_UP_COLOR        = 'rgba(200, 166, 94,  1)';
  const CANDLE_DOWN_COLOR      = 'rgba(18,  44,  79,  1)';
  const CANDLE_UNCHANGED_COLOR = 'rgba(120, 120, 120, 1)';

  // ─────────────────────────────────────────────────────────────
  //  DOM 参照
  // ─────────────────────────────────────────────────────────────
  const symbolSelect     = document.getElementById('symbolSelect');
  const timeframeToggle  = document.getElementById('timeframeToggle');
  const chartTypeToggle  = document.getElementById('chartTypeToggle');
  const marketCanvas     = document.getElementById('marketChart');
  const chartArea        = document.getElementById('chartArea');
  const kgmBalanceEl     = document.getElementById('kgmBalance');
  const currentPriceEl   = document.getElementById('currentPrice');
  const tradePriceEl     = document.getElementById('tradePriceDisplay');
  const priceChangeEl    = document.getElementById('priceChange');
  const currentTickerEl  = document.getElementById('currentTicker');
  const currentNameEl    = document.getElementById('currentSymbolName');
  const currentDescEl    = document.getElementById('currentSymbolDesc');
  const qtyInput         = document.getElementById('qtyInput');
  const qtyMinus         = document.getElementById('qtyMinus');
  const qtyPlus          = document.getElementById('qtyPlus');
  const buyBtn           = document.getElementById('buyBtn');
  const sellBtn          = document.getElementById('sellBtn');
  const costKgmEl        = document.getElementById('costKgm');
  const holdingsBody     = document.getElementById('holdingsBody');
  const totalPnlEl       = document.getElementById('totalPnl');
  const tradeMsgEl       = document.getElementById('tradeMsg');
  const topupBtn         = document.getElementById('topupBtn');
  const toastContainer   = document.getElementById('toastContainer');
  const historyBody      = document.getElementById('historyBody');
  const historyClearBtn  = document.getElementById('historyClearBtn');

  // ─────────────────────────────────────────────────────────────
  //  アプリ状態
  // ─────────────────────────────────────────────────────────────
  let state = {
    balanceKgm: INITIAL_BALANCE_KGM,
    holdings:   {},  // sym → { shares: number, totalCostKgm: number }
    lastPrice:  {},  // sym → number (KGM)
    openPrice:  {},  // sym → number (セッション始値)
    history:    []   // 取引履歴 { ts, sym, type, qty, price, total, pnl }
  };

  let chartInstance   = null;
  let marketData      = [];  // 現在表示中のローソクデータ
  let liveTimer       = null;
  let currentSymbol   = 'KGI';
  let currentTf       = '1mo';
  let currentChartType = 'candlestick';

  // ─────────────────────────────────────────────────────────────
  //  localStorage — 保存・復元
  // ─────────────────────────────────────────────────────────────
  function loadState () {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        state.balanceKgm = typeof s.balanceKgm === 'number' ? s.balanceKgm : INITIAL_BALANCE_KGM;
        state.holdings   = s.holdings && typeof s.holdings === 'object' ? s.holdings : {};
        state.history    = Array.isArray(s.history) ? s.history : [];
      }
    } catch (e) {
      console.warn('[Finance] loadState failed:', e);
    }
  }

  function saveState () {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balanceKgm: state.balanceKgm,
        holdings:   state.holdings,
        history:    state.history.slice(-200)  // 最大200件保存
      }));
    } catch (e) {
      console.warn('[Finance] saveState failed:', e);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  シード付き疑似乱数 (LCG)
  //  同じシードから同じ系列を生成 → 銘柄×日付で再現性のある履歴
  // ─────────────────────────────────────────────────────────────
  function makeRng (seed) {
    let s = (seed >>> 0) | 0;
    return function () {
      s = Math.imul(1664525, s) + 1013904223 | 0;
      return (s >>> 0) / 4294967296;
    };
  }

  /**
   * Box–Muller 変換で N(0,1) 乱数を生成
   * @param {function} rng - 一様乱数生成器
   */
  function gaussRng (rng) {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  // ─────────────────────────────────────────────────────────────
  //  日付系列生成
  // ─────────────────────────────────────────────────────────────
  function buildDateSeries (timeframe) {
    const now = Date.now();
    let count, stepMs;

    switch (timeframe) {
      case 'realtime': count = 48; stepMs = 5    * 60 * 1000;          break;
      case '1d':       count = 32; stepMs = 15   * 60 * 1000;          break;
      case '1w':       count = 5;  stepMs = 24   * 60 * 60 * 1000;     break;
      case '1mo':      count = 22; stepMs = 24   * 60 * 60 * 1000;     break;
      case '3mo':      count = 66; stepMs = 24   * 60 * 60 * 1000;     break;
      default:         count = 22; stepMs = 24   * 60 * 60 * 1000;
    }

    const start = now - count * stepMs;
    const dates = [];
    for (let i = 0; i < count; i++) {
      dates.push(new Date(start + i * stepMs));
    }
    return dates;
  }

  // ─────────────────────────────────────────────────────────────
  //  幾何ブラウン運動 (GBM) による合成価格データ生成
  //  価格: dS = S(μ dt + σ √dt Z)  (Z ~ N(0,1))
  // ─────────────────────────────────────────────────────────────
  function buildSyntheticData (symbol, timeframe) {
    const stock = STOCKS[symbol];
    if (!stock) return [];

    const dates = buildDateSeries(timeframe);
    const n     = dates.length;

    // シード: 銘柄ハッシュ × 今日の日付 → 日次で一貫した過去データ
    const todayOrdinal = Math.floor(Date.now() / 86400000);
    const symHash = symbol.split('').reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 17);
    const rng = makeRng((todayOrdinal * 1000003) ^ symHash);

    // GBM パラメータ
    const isIntraday = timeframe === 'realtime' || timeframe === '1d';
    const dt = isIntraday ? 5 / (252 * 6.5 * 60) : 1 / 252;  // 年率換算
    const mu    = stock.drift;
    const sigma = stock.vol;

    // 初期価格を基準値付近にランダムに設定
    let price = stock.baseKgm * (1 + (rng() - 0.5) * 0.06);

    const data = [];
    for (let i = 0; i < n; i++) {
      const z        = gaussRng(rng);
      const logReturn = (mu - 0.5 * sigma * sigma) * dt + sigma * Math.sqrt(dt) * z;
      const open  = price;
      price       = Math.max(1, price * Math.exp(logReturn));
      const close = price;

      // ヒゲの生成 (リアリティのある上下幅)
      const bodyAbs = Math.abs(close - open);
      const wickAmp = price * sigma * 0.25 * (rng() * 0.8 + 0.2);
      const high  = Math.max(open, close) + bodyAbs * (rng() * 0.5 + 0.1) + wickAmp;
      const low   = Math.min(open, close) - bodyAbs * (rng() * 0.5 + 0.1) - wickAmp * 0.75;

      data.push({
        date: dates[i],
        t:    dates[i].getTime(),
        o:    Math.max(1, open),
        h:    Math.max(1, high),
        l:    Math.max(1, low),
        c:    Math.max(1, close)
      });
    }

    return data;
  }

  // ─────────────────────────────────────────────────────────────
  //  日付ラベルフォーマット
  // ─────────────────────────────────────────────────────────────
  function formatLabel (date, timeframe) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const mo = date.getMonth() + 1;
    const dd = date.getDate();
    if (timeframe === 'realtime' || timeframe === '1d') return `${hh}:${mm}`;
    return `${mo}/${dd}`;
  }

  /** KGM 数値を "1,234" 形式の文字列に整形 */
  function fmtKgm (v) {
    if (v === null || v === undefined || isNaN(v)) return '--';
    return Math.round(v).toLocaleString('ja-JP');
  }

  /** KGM 数値を小数2桁まで整形 */
  function fmtKgmDec (v, digits = 2) {
    if (v === null || v === undefined || isNaN(v)) return '--';
    return Number(v).toFixed(digits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  // ─────────────────────────────────────────────────────────────
  //  ローソク足カスタム Canvas 描画
  //  chartjs-chart-financial は Chart.js v4 との互換性問題があるため
  //  Canvas 2D API で直接描画する
  // ─────────────────────────────────────────────────────────────

  /** ローソク足を Canvas に直接描画 */
  function renderCandlestickCanvas (data) {
    // Chart.js インスタンスは使わないので既存を破棄
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    const canvas  = marketCanvas;
    const ctx     = canvas.getContext('2d');
    const W       = canvas.offsetWidth  || canvas.parentElement?.clientWidth  || 800;
    const H       = canvas.offsetHeight || canvas.parentElement?.clientHeight || 400;
    canvas.width  = W;
    canvas.height = H;

    const PAD_L = 10, PAD_R = 70, PAD_T = 20, PAD_B = 40;
    const plotW = W - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;

    // 価格レンジ
    const allLows  = data.map(d => d.l);
    const allHighs = data.map(d => d.h);
    let priceMin = Math.min(...allLows)  * 0.998;
    let priceMax = Math.max(...allHighs) * 1.002;
    if (priceMax === priceMin) { priceMin *= 0.99; priceMax *= 1.01; }

    // 座標変換関数
    const xOf = i  => PAD_L + (i + 0.5) * (plotW / data.length);
    const yOf = p  => PAD_T + plotH - plotH * (p - priceMin) / (priceMax - priceMin);

    ctx.clearRect(0, 0, W, H);

    // ── グリッド線 ──
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    const gridCount = 5;
    for (let g = 0; g <= gridCount; g++) {
      const y = PAD_T + g * plotH / gridCount;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    }

    // ── Y軸ラベル ──
    ctx.fillStyle  = 'rgba(255,255,255,0.32)';
    ctx.font       = "9px 'Montserrat', sans-serif";
    ctx.textAlign  = 'left';
    for (let g = 0; g <= gridCount; g++) {
      const price = priceMax - g * (priceMax - priceMin) / gridCount;
      const y     = PAD_T + g * plotH / gridCount;
      ctx.fillText(fmtKgm(price), W - PAD_R + 6, y + 3);
    }

    // ── X軸ラベル ──
    ctx.textAlign = 'center';
    const labelStep = Math.max(1, Math.floor(data.length / 8));
    for (let i = 0; i < data.length; i += labelStep) {
      const x   = xOf(i);
      const lbl = formatLabel(data[i].date, currentTf);
      ctx.fillText(lbl, x, H - PAD_B + 14);
    }

    // ── ローソク足描画 ──
    const candleW = Math.max(2, Math.floor(plotW / data.length * 0.65));

    data.forEach((d, i) => {
      const x    = xOf(i);
      const isUp = d.c >= d.o;
      const colorUp   = '#c8a65e';
      const colorDown = '#3a5a7f';

      const bodyTop    = yOf(Math.max(d.o, d.c));
      const bodyBottom = yOf(Math.min(d.o, d.c));
      const bodyH      = Math.max(1, bodyBottom - bodyTop);
      const wickTop    = yOf(d.h);
      const wickBottom = yOf(d.l);

      // ヒゲ
      ctx.strokeStyle = isUp ? colorUp : colorDown;
      ctx.lineWidth   = Math.max(1, candleW * 0.15);
      ctx.beginPath();
      ctx.moveTo(x, wickTop);
      ctx.lineTo(x, wickBottom);
      ctx.stroke();

      // 胴体
      ctx.fillStyle = isUp ? colorUp : colorDown;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
    });

    // ── 最新価格ライン (点線) ──
    const latestY = yOf(data[data.length - 1].c);
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(200,166,94,0.4)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, latestY);
    ctx.lineTo(W - PAD_R, latestY);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── トゥールチップ用データ保存 (hover は後で) ──
    candleRenderCache = { data, xOf, yOf, candleW, PAD_L, PAD_R, PAD_T, PAD_B, W, H };
  }

  // キャッシュ (ホバー時再利用)
  let candleRenderCache = null;

  // Canvas hover トゥールチップ
  function initCandleHover () {
    const canvas   = marketCanvas;
    const tooltipEl = document.getElementById('candleTooltip') || createCandleTooltip();

    canvas.addEventListener('mousemove', e => {
      if (currentChartType !== 'candlestick' || !candleRenderCache) {
        tooltipEl.style.display = 'none';
        return;
      }
      const rect  = canvas.getBoundingClientRect();
      const mx    = (e.clientX - rect.left) * (canvas.width / rect.width);
      const { data, xOf, candleW } = candleRenderCache;
      let nearest = -1, minDist = Infinity;
      data.forEach((_, i) => {
        const d = Math.abs(mx - xOf(i));
        if (d < minDist && d < candleW * 2) { minDist = d; nearest = i; }
      });
      if (nearest < 0) { tooltipEl.style.display = 'none'; return; }
      const d = data[nearest];
      const change = d.c - d.o;
      const sign   = change >= 0 ? '+' : '';
      tooltipEl.innerHTML =
        `<div class="ct-label">${formatLabel(d.date, currentTf)}</div>` +
        `<div>始値 <b>${fmtKgm(d.o)}</b></div>` +
        `<div>高値 <b>${fmtKgm(d.h)}</b></div>` +
        `<div>安値 <b>${fmtKgm(d.l)}</b></div>` +
        `<div>終値 <b>${fmtKgm(d.c)}</b></div>` +
        `<div class="${change>=0?'ct-up':'ct-down'}">${sign}${fmtKgm(change)} KGM</div>`;
      const containerRect = canvas.parentElement.getBoundingClientRect();
      let tx = e.clientX - containerRect.left + 12;
      let ty = e.clientY - containerRect.top  - 10;
      if (tx + 160 > containerRect.width) tx -= 175;
      tooltipEl.style.left    = tx + 'px';
      tooltipEl.style.top     = ty + 'px';
      tooltipEl.style.display = 'block';
    });

    canvas.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
  }

  function createCandleTooltip () {
    const el = document.createElement('div');
    el.id    = 'candleTooltip';
    el.style.cssText =
      'position:absolute;display:none;background:rgba(10,18,28,0.95);' +
      'border:1px solid rgba(200,166,94,0.25);color:rgba(255,255,255,0.78);' +
      'font-size:11px;font-family:Montserrat,sans-serif;padding:8px 12px;' +
      'border-radius:3px;pointer-events:none;z-index:100;line-height:1.7;' +
      'min-width:130px;';
    el.innerHTML += '<style>.ct-label{color:#c8a65e;font-weight:700;margin-bottom:2px}' +
      '.ct-up{color:#c8a65e;font-weight:600}.ct-down{color:#7aadd6;font-weight:600}</style>';
    chartArea.style.position = 'relative';
    chartArea.appendChild(el);
    return el;
  }

  // ─────────────────────────────────────────────────────────────
  //  チャート描画 (ローソク: Canvas直描 / ライン: Chart.js)
  // ─────────────────────────────────────────────────────────────
  function renderChart (data, type) {
    if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

    // ローソク足: Canvas 直描
    if (type === 'candlestick') {
      renderCandlestickCanvas(data);
      return;
    }

    // ── ラインチャート (Chart.js) ──────────────────────────────
    const labels      = data.map(d => formatLabel(d.date, currentTf));
    const closePrices = data.map(d => d.c);
    const ctx         = marketCanvas.getContext('2d');

    // Canvas サイズをリセット (ローソク足描画後にサイズが変わっている場合)
    {
      const W = marketCanvas.offsetWidth  || marketCanvas.parentElement?.clientWidth  || 800;
      const H = marketCanvas.offsetHeight || marketCanvas.parentElement?.clientHeight || 400;
      marketCanvas.width  = W;
      marketCanvas.height = H;
    }

    const scaleOpts = {
      x: {
        type:   'category',
        grid:   { color: 'rgba(255,255,255,0.04)', drawTicks: false },
        border: { color: 'rgba(255,255,255,0.07)' },
        ticks:  { color: 'rgba(255,255,255,0.32)', maxTicksLimit: 8,
                  font: { family: "'Montserrat', sans-serif", size: 9 } }
      },
      y: {
        position: 'right',
        grid:   { color: 'rgba(255,255,255,0.04)' },
        border: { color: 'rgba(255,255,255,0.07)' },
        ticks:  { color: 'rgba(255,255,255,0.32)',
                  font: { family: "'Montserrat', sans-serif", size: 9 },
                  callback: v => fmtKgm(v) }
      }
    };

    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:           'Close',
          data:            closePrices,
          borderColor:     'rgba(200, 166, 94, 0.9)',
          borderWidth:     2,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'transparent';
            const grad = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            grad.addColorStop(0,   'rgba(200, 166, 94, 0.28)');
            grad.addColorStop(0.7, 'rgba(200, 166, 94, 0.06)');
            grad.addColorStop(1,   'rgba(200, 166, 94, 0)');
            return grad;
          },
          fill:                 true,
          tension:              0.35,
          pointRadius:          0,
          pointHoverRadius:     5,
          pointHoverBackgroundColor: '#c8a65e',
          pointHoverBorderColor:     '#fff',
          pointHoverBorderWidth:     2
        }]
      },
      options: {
        responsive:          true,
        maintainAspectRatio: false,
        animation:           { duration: 250 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10,18,28,0.94)',
            titleColor:      'rgba(200,166,94,0.9)',
            bodyColor:       'rgba(255,255,255,0.72)',
            borderColor:     'rgba(200,166,94,0.2)',
            borderWidth:     1,
            padding:         10,
            cornerRadius:    3,
            titleFont:       { family: "'Montserrat', sans-serif", size: 10, weight: '600' },
            bodyFont:        { family: "'Montserrat', sans-serif", size: 9 },
            callbacks: {
              label: ctx => `${fmtKgm(ctx.parsed.y)} KGM`
            }
          }
        },
        scales: scaleOpts
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  ライブティック (2.5秒ごとに最新足を微細更新)
  // ─────────────────────────────────────────────────────────────
  function simulateTick (symbol) {
    if (!marketData.length) return;
    const last  = marketData[marketData.length - 1];
    const stock = STOCKS[symbol];
    if (!stock) return;

    // 短期 GBM ティック (≒5分足 dt)
    const dt  = 5 / (252 * 390);  // 252取引日 × 1日390分
    const z   = (Math.random() + Math.random() + Math.random() - 1.5) * 1.414; // 近似正規
    const logR = (stock.drift - 0.5 * stock.vol * stock.vol) * dt
               + stock.vol * Math.sqrt(dt) * z;
    const newClose = Math.max(1, last.c * Math.exp(logR));

    // データ更新
    last.c = newClose;
    last.h = Math.max(last.h, newClose);
    last.l = Math.min(last.l, newClose);

    // チャート更新
    if (currentChartType === 'candlestick') {
      // Canvas 直描: 差分更新のためデータ配列を書き換えてから再描画
      renderCandlestickCanvas(marketData);
    } else if (chartInstance) {
      // ライン: Chart.js の最後のデータ点を更新
      const ds = chartInstance.data.datasets[0].data;
      if (ds.length > 0) {
        chartInstance.data.datasets[0].data[ds.length - 1] = newClose;
        chartInstance.update('none');
      }
    }

    updatePriceDisplay(symbol, newClose);
    updateHoldingsTable();
    updateChartBackground(symbol);
    // 保有している他銘柄の価格も微細更新して評価損益が常に「--」にならないようにする
    Object.keys(state.holdings).forEach(s => {
      if (s !== symbol && !state.lastPrice[s]) {
        const st = STOCKS[s];
        if (st) state.lastPrice[s] = st.baseKgm;
      }
    });
  }

  function startLiveUpdates (symbol) {
    if (liveTimer) clearInterval(liveTimer);
    liveTimer = setInterval(() => simulateTick(symbol), LIVE_TICK_MS);
  }

  // ─────────────────────────────────────────────────────────────
  //  価格表示更新
  // ─────────────────────────────────────────────────────────────
  function updatePriceDisplay (symbol, price) {
    if (price == null || isNaN(price)) {
      currentPriceEl.textContent = '--';
      tradePriceEl.textContent   = '--';
      priceChangeEl.textContent  = '';
      priceChangeEl.className    = 'chart-price-change';
      return;
    }

    state.lastPrice[symbol] = price;
    const open = state.openPrice[symbol] ?? price;

    currentPriceEl.textContent = fmtKgm(price);
    tradePriceEl.textContent   = fmtKgm(price);

    // 変化率計算
    const diff    = price - open;
    const pct     = (diff / open) * 100;
    const sign    = diff >= 0 ? '+' : '';
    const cls     = diff >= 0 ? 'up' : 'down';
    priceChangeEl.textContent = `${sign}${fmtKgm(diff)} (${sign}${pct.toFixed(2)}%)`;
    priceChangeEl.className   = `chart-price-change ${cls}`;

    updateCostDisplay();
  }

  /** 概算コスト表示を更新 */
  function updateCostDisplay () {
    const price = state.lastPrice[currentSymbol];
    const qty   = getQty();
    if (price == null) { costKgmEl.textContent = '-- KGM'; return; }
    costKgmEl.textContent = fmtKgm(price * qty) + ' KGM';
  }

  /** 入力数量を取得 (最小 1) */
  function getQty () {
    return Math.max(1, parseInt(qtyInput.value) || 1);
  }

  // ─────────────────────────────────────────────────────────────
  //  チャート背景更新 (含み損益に応じて bg-default / profit / loss)
  // ─────────────────────────────────────────────────────────────
  function updateChartBackground (symbol) {
    chartArea.classList.remove('bg-profit', 'bg-loss', 'bg-default');

    const h     = state.holdings[symbol];
    const price = state.lastPrice[symbol];

    if (!h || h.shares <= 0 || price == null) {
      chartArea.classList.add('bg-default');
      return;
    }

    const pnl = price * h.shares - h.totalCostKgm;
    if      (pnl > 0) chartArea.classList.add('bg-profit');
    else if (pnl < 0) chartArea.classList.add('bg-loss');
    else              chartArea.classList.add('bg-default');
  }

  // ─────────────────────────────────────────────────────────────
  //  保有テーブル更新
  // ─────────────────────────────────────────────────────────────
  function updateHoldingsTable () {
    const syms = Object.keys(state.holdings).filter(s => (state.holdings[s]?.shares ?? 0) > 0);

    if (syms.length === 0) {
      holdingsBody.innerHTML = '<tr class="holdings-empty-row"><td colspan="5">保有銘柄はありません</td></tr>';
      totalPnlEl.textContent = '-- KGM';
      totalPnlEl.className   = 'holdings-footer__value';
      return;
    }

    let totalPnl       = 0;
    let hasLivePrice   = false;

    const rows = syms.map(sym => {
      const h        = state.holdings[sym];
      const avgCost  = h.totalCostKgm / h.shares;
      const curPrice = state.lastPrice[sym] ?? null;
      const stock    = STOCKS[sym] || { name: sym };

      let pnlText  = '--';
      let pnlClass = '';

      if (curPrice != null) {
        const pnl = curPrice * h.shares - h.totalCostKgm;
        totalPnl     += pnl;
        hasLivePrice  = true;
        const sign    = pnl >= 0 ? '+' : '';
        pnlText  = `${sign}${fmtKgm(pnl)} KGM`;
        pnlClass = pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
      }

      return `<tr>
        <td>
          ${stock.name}
          <span class="holding-sym-code">${sym}</span>
        </td>
        <td>${h.shares.toLocaleString('ja-JP')}</td>
        <td>${fmtKgm(avgCost)}</td>
        <td>${curPrice != null ? fmtKgm(curPrice) : '--'}</td>
        <td class="${pnlClass}">${pnlText}</td>
      </tr>`;
    });

    holdingsBody.innerHTML = rows.join('');

    // 合計評価損益
    if (hasLivePrice) {
      const sign = totalPnl >= 0 ? '+' : '';
      totalPnlEl.textContent = `${sign}${fmtKgm(totalPnl)} KGM`;
      totalPnlEl.className   = 'holdings-footer__value ' + (totalPnl >= 0 ? 'pnl-positive' : 'pnl-negative');
    } else {
      totalPnlEl.textContent = '-- KGM';
      totalPnlEl.className   = 'holdings-footer__value';
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  残高表示更新 (フラッシュアニメーション付き)
  // ─────────────────────────────────────────────────────────────
  function updateBalance () {
    kgmBalanceEl.textContent = fmtKgm(state.balanceKgm);
    // フラッシュアニメーション
    kgmBalanceEl.classList.remove('flash');
    void kgmBalanceEl.offsetWidth; // reflow
    kgmBalanceEl.classList.add('flash');
  }

  // ─────────────────────────────────────────────────────────────
  //  トースト通知
  // ─────────────────────────────────────────────────────────────
  function showToast (message, type = 'info') {
    const toast = document.createElement('div');
    toast.className   = `toast toast--${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // RAF でトランジション起動
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('toast--visible'));
    });

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 380);
    }, 3200);
  }

  // ─────────────────────────────────────────────────────────────
  //  取引ステータスメッセージ
  // ─────────────────────────────────────────────────────────────
  let tradeMsgTimer = null;
  function setTradeMsg (msg, type = '') {
    if (tradeMsgTimer) clearTimeout(tradeMsgTimer);
    tradeMsgEl.textContent = msg;
    tradeMsgEl.className   = 'trade-msg' + (type ? ` ${type}` : '');
    if (msg) {
      tradeMsgTimer = setTimeout(() => {
        tradeMsgEl.textContent = '';
        tradeMsgEl.className   = 'trade-msg';
      }, 4000);
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  取引履歴テーブル更新
  // ─────────────────────────────────────────────────────────────
  function updateHistoryTable () {
    if (!historyBody) return;
    if (!state.history || state.history.length === 0) {
      historyBody.innerHTML = '<tr class="holdings-empty-row"><td colspan="7">取引履歴はありません</td></tr>';
      return;
    }
    // 新しい順に表示
    const rows = [...state.history].reverse().map(r => {
      const stock  = STOCKS[r.sym] || { name: r.sym };
      const dt     = new Date(r.ts);
      const tsStr  = `${dt.getMonth()+1}/${dt.getDate()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;
      const isBuy  = r.type === 'buy';
      const badge  = isBuy
        ? '<span class="trade-badge trade-badge--buy">買</span>'
        : '<span class="trade-badge trade-badge--sell">売</span>';
      let pnlCell = '--';
      if (!isBuy && r.pnl != null) {
        const sign = r.pnl >= 0 ? '+' : '';
        const cls  = r.pnl >= 0 ? 'pnl-positive' : 'pnl-negative';
        pnlCell = `<span class="${cls}">${sign}${fmtKgm(r.pnl)}</span>`;
      }
      return `<tr>
        <td>${tsStr}</td>
        <td>${stock.name}<span class="holding-sym-code">${r.sym}</span></td>
        <td style="text-align:center">${badge}</td>
        <td>${r.qty.toLocaleString('ja-JP')}</td>
        <td>${fmtKgm(r.price)}</td>
        <td>${fmtKgm(r.total)}</td>
        <td>${pnlCell}</td>
      </tr>`;
    });
    historyBody.innerHTML = rows.join('');
  }

  // ─────────────────────────────────────────────────────────────
  //  全体リフレッシュ (銘柄・時間足変更時)
  // ─────────────────────────────────────────────────────────────
  function refreshAll () {
    const sym   = currentSymbol;
    const stock = STOCKS[sym];

    // シンボル名表示更新
    if (currentTickerEl) currentTickerEl.textContent = sym;
    if (currentNameEl)   currentNameEl.textContent   = stock?.name ?? sym;
    if (currentDescEl)   currentDescEl.textContent   = stock?.desc ?? '';

    // 合成データ生成
    marketData = buildSyntheticData(sym, currentTf);
    if (!marketData.length) return;

    // セッション始値 (初回のみ設定)
    if (!state.openPrice[sym]) {
      state.openPrice[sym] = marketData[0].c;
    }

    // チャート描画
    renderChart(marketData, currentChartType);

    // 最新価格で各表示更新
    const latestPrice = marketData[marketData.length - 1].c;
    state.lastPrice[sym] = latestPrice;
    updatePriceDisplay(sym, latestPrice);
    updateHoldingsTable();
    updateChartBackground(sym);

    // ライブ更新スタート
    startLiveUpdates(sym);

    // 残高表示
    kgmBalanceEl.textContent = fmtKgm(state.balanceKgm);
  }

  // ─────────────────────────────────────────────────────────────
  //  購入ロジック
  // ─────────────────────────────────────────────────────────────
  function doBuy () {
    const sym   = currentSymbol;
    const price = state.lastPrice[sym];
    const qty   = getQty();

    if (price == null || isNaN(price)) {
      setTradeMsg('価格が取得できていません。少しお待ちください。', 'error');
      return;
    }

    const cost = price * qty;
    if (cost > state.balanceKgm) {
      const shortfall = cost - state.balanceKgm;
      setTradeMsg(`残高不足です (不足: ${fmtKgm(shortfall)} KGM)`, 'error');
      showToast(`💸 残高不足 — あと ${fmtKgm(shortfall)} KGM 必要です`, 'error');
      return;
    }

    // 残高を減らして保有を増やす
    state.balanceKgm -= cost;
    if (!state.holdings[sym]) {
      state.holdings[sym] = { shares: 0, totalCostKgm: 0 };
    }
    state.holdings[sym].shares       += qty;
    state.holdings[sym].totalCostKgm += cost;

    // 履歴に追加
    state.history.push({ ts: Date.now(), sym, type: 'buy', qty, price, total: cost, pnl: null });

    saveState();
    updateBalance();
    updateHoldingsTable();
    updateHistoryTable();
    updateCostDisplay();
    updateChartBackground(sym);

    const stock = STOCKS[sym];
    setTradeMsg(`${stock?.name ?? sym} ${qty}株を購入しました`, 'success');
    showToast(`✅ ${sym} ${qty.toLocaleString()}株 購入 — ${fmtKgm(cost)} KGM`, 'success');
  }

  // ─────────────────────────────────────────────────────────────
  //  売却ロジック
  // ─────────────────────────────────────────────────────────────
  function doSell () {
    const sym     = currentSymbol;
    const holding = state.holdings[sym];
    const price   = state.lastPrice[sym];
    const qty     = getQty();

    if (!holding || holding.shares < qty) {
      const have = holding?.shares ?? 0;
      setTradeMsg(`保有株数が不足しています (保有: ${have}株)`, 'error');
      showToast(`📉 保有不足 — ${sym} は ${have}株しか保有していません`, 'error');
      return;
    }

    if (price == null || isNaN(price)) {
      setTradeMsg('価格が取得できていません。少しお待ちください。', 'error');
      return;
    }

    // 売却金額
    const proceeds = price * qty;

    // 按分で取得コストを減算 (平均コスト法)
    const avgCost = holding.totalCostKgm / holding.shares;
    holding.shares       -= qty;
    holding.totalCostKgm -= avgCost * qty;
    holding.totalCostKgm  = Math.max(0, holding.totalCostKgm); // 丸め誤差対策

    // 保有ゼロなら削除
    if (holding.shares <= 0) {
      delete state.holdings[sym];
    }

    state.balanceKgm += proceeds;

    // 履歴に追加
    const pnl  = proceeds - avgCost * qty;
    state.history.push({ ts: Date.now(), sym, type: 'sell', qty, price, total: proceeds, pnl });

    saveState();
    updateBalance();
    updateHoldingsTable();
    updateHistoryTable();
    updateCostDisplay();
    updateChartBackground(sym);

    const sign = pnl >= 0 ? '+' : '';
    const stock = STOCKS[sym];
    setTradeMsg(`${stock?.name ?? sym} ${qty}株を売却しました (損益: ${sign}${fmtKgm(pnl)} KGM)`, 'success');
    showToast(`💰 ${sym} ${qty.toLocaleString()}株 売却 — ${fmtKgm(proceeds)} KGM 受取`, 'info');
  }

  // ─────────────────────────────────────────────────────────────
  //  イベントリスナー
  // ─────────────────────────────────────────────────────────────

  // 銘柄変更
  symbolSelect.addEventListener('change', () => {
    currentSymbol = symbolSelect.value;
    setTradeMsg('');
    refreshAll();
  });

  // 時間足切り替え
  timeframeToggle.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      timeframeToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTf = btn.dataset.value;
      refreshAll();
    });
  });

  // チャートタイプ切り替え
  chartTypeToggle.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      chartTypeToggle.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChartType = btn.dataset.value;
      if (marketData.length) renderChart(marketData, currentChartType);
    });
  });

  // 数量 +/-
  qtyMinus.addEventListener('click', () => {
    const v = parseInt(qtyInput.value) || 1;
    qtyInput.value = Math.max(1, v - 1);
    updateCostDisplay();
  });

  qtyPlus.addEventListener('click', () => {
    const v = parseInt(qtyInput.value) || 1;
    qtyInput.value = v + 1;
    updateCostDisplay();
  });

  qtyInput.addEventListener('input', updateCostDisplay);

  // 売買ボタン
  buyBtn.addEventListener('click',  doBuy);
  sellBtn.addEventListener('click', doSell);

  // DEBUG: KGM 補充
  topupBtn.addEventListener('click', () => {
    state.balanceKgm += TOPUP_AMOUNT;
    saveState();
    updateBalance();
    showToast(`🔧 DEBUG: +${fmtKgm(TOPUP_AMOUNT)} KGM を追加しました`, 'info');
  });

  // プリセット株数ボタン
  document.querySelectorAll('.qty-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const qty = parseInt(btn.dataset.qty);
      if (!isNaN(qty)) {
        qtyInput.value = qty;
        updateCostDisplay();
        document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active-preset'));
        btn.classList.add('active-preset');
      }
    });
  });

  // qtyInput 変更時にプリセットハイライトをリセット
  qtyInput.addEventListener('change', () => {
    document.querySelectorAll('.qty-preset-btn').forEach(b => b.classList.remove('active-preset'));
  });

  // 履歴クリア
  if (historyClearBtn) {
    historyClearBtn.addEventListener('click', () => {
      if (confirm('取引履歴をすべて削除しますか？')) {
        state.history = [];
        saveState();
        updateHistoryTable();
        showToast('🗑️ 履歴をクリアしました', 'info');
      }
    });
  }

  // 定期リフレッシュ (2分ごとにデータ再生成)
  setInterval(refreshAll, 2 * 60 * 1000);

  // ウィンドウリサイズ時にチャートを再描画
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (marketData.length) renderChart(marketData, currentChartType);
    }, 150);
  });

  // ─────────────────────────────────────────────────────────────
  //  初期化
  // ─────────────────────────────────────────────────────────────
  loadState();
  currentSymbol = symbolSelect.value;
  kgmBalanceEl.textContent = fmtKgm(state.balanceKgm);

  // 保有銘柄の価格を全銘柄について初期化 (「--」を防ぐ)
  Object.keys(STOCKS).forEach(sym => {
    if (!state.lastPrice[sym]) {
      const d = buildSyntheticData(sym, '1mo');
      if (d.length) state.lastPrice[sym] = d[d.length - 1].c;
    }
  });

  updateHoldingsTable();
  updateHistoryTable();
  initCandleHover(); // ローソク足ホバートゥールチップ初期化
  refreshAll();

})();
