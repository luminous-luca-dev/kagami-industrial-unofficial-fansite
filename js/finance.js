// finance.js — lightweight demo trading logic using Chart.js and Yahoo Finance endpoints
(function(){
  const symbolSelect = document.getElementById('symbolSelect');
  const rangeSelect = document.getElementById('rangeSelect');
  const chartTypeSelect = document.getElementById('chartTypeSelect');
  const marketCanvas = document.getElementById('marketChart');
  const currentPriceEl = document.getElementById('currentPrice');
  const qtyInput = document.getElementById('qtyInput');
  const buyBtn = document.getElementById('buyBtn');
  const sellBtn = document.getElementById('sellBtn');
  const holdingsBody = document.getElementById('holdingsBody');
  const kgmBalanceEl = document.getElementById('kgmBalance');
  const costKgmEl = document.getElementById('costKgm');
  const topupBtn = document.getElementById('topupBtn');
  const chartArea = document.getElementById('chartArea');

  // Config
  const DEFAULT_KGM_TO_JPY = 1000; // 1 KGM = 1000 JPY initially
  const storageKey = 'kfg_demo_data_v1';

  // state
  let state = {
    kgmToJpy: DEFAULT_KGM_TO_JPY,
    balanceKgm: 5000,
    holdings: {}, // symbol -> {shares, totalCostJpy}
    chart: null,
    lastPrice: null
  };

  function loadState(){
    try{
      const raw = localStorage.getItem(storageKey);
      if(raw) Object.assign(state, JSON.parse(raw));
    }catch(e){console.warn('loadState',e)}
  }
  function saveState(){
    localStorage.setItem(storageKey, JSON.stringify({kgmToJpy:state.kgmToJpy, balanceKgm:state.balanceKgm, holdings:state.holdings}));
  }

  // Synthetic market data only: no external HTTP proxy required
  function fetchMarketData(symbol, range){
    const dates = buildDateSeries(range);
    return Promise.resolve(buildSyntheticMarketData(symbol, dates, range));
  }

  function buildDateSeries(range){
    const end = new Date();
    let count;
    if(range === 'realtime') count = 12;
    else if(range === '1d') count = 8;
    else if(range === '5d') count = 16;
    else if(range === '1mo') count = 22;
    else count = 66;
    const dates = [];
    for(let i = count - 1; i >= 0; i -= 1){
      const date = new Date(end);
      if(range === 'realtime') date.setMinutes(end.getMinutes() - i * 5);
      else date.setDate(end.getDate() - i);
      dates.push(date);
    }
    return dates;
  }

  function buildSyntheticMarketData(symbol, dates, range){
    const basePrices = {
      'KGM': 1000,
      '7974.T': 62000,
      '7203.T': 1900,
      '7832.T': 8500,
      'GOOGL': 135
    };
    const rangeVol = {
      'realtime': 0.06,
      '1d': 0.04,
      '5d': 0.035,
      '1mo': 0.03,
      '3mo': 0.025
    }[range] || 0.03;
    const volFactors = {
      'KGM': 0.015,
      '7974.T': 0.03,
      '7203.T': 0.02,
      '7832.T': 0.025,
      'GOOGL': 0.03
    };
    const base = basePrices[symbol] || 1000;
    const vol = volFactors[symbol] || 0.02;
    let previousClose = base * (1 + (Math.random() - 0.5) * 0.02);
    return dates.map((date, index)=>{
      const driftRate = symbol === 'KGM' ? 0.00015 : 0.00008;
      const frameReturn = (Math.random() - 0.5) * rangeVol * 2 + driftRate;
      const close = Math.max(1, previousClose * (1 + frameReturn));
      const rangeSize = close * vol * 0.18;
      const high = Math.max(close, close + Math.abs(rangeSize * (Math.random() * 0.6 + 0.2)));
      const low = Math.min(close, close - Math.abs(rangeSize * (Math.random() * 0.6 + 0.2)));
      const open = previousClose;
      previousClose = close;
      return {
        t: date.getTime(),
        o: Math.max(1, open),
        h: high,
        l: Math.max(1, low),
        c: close,
        symbol,
        volatility: vol
      };
    });
  }

  function formatJPY(v){ return v===null? '--' : Math.round(v).toLocaleString() + ' 円'; }

  function formatDateLabel(date){
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function simulateLiveTick(symbol){
    if(!state.marketData || state.marketData.length === 0) return;
    const last = state.marketData[state.marketData.length - 1];
    const vol = last.volatility || 0.02;
    const drift = symbol === 'KGM' ? 0.00003 : 0.00002;
    const change = last.c * ((Math.random() - 0.5) * vol * 0.12 + drift);
    const newClose = Math.max(1, last.c + change);
    last.c = newClose;
    last.h = Math.max(last.h, newClose);
    last.l = Math.min(last.l, newClose);
    if(state.chart){
      const dataset = state.chart.data.datasets[0].data;
      const item = dataset[dataset.length - 1];
      if(item){
        item.c = newClose;
        item.h = Math.max(item.h, newClose);
        item.l = Math.min(item.l, newClose);
        if(state.chart.config.type !== 'candlestick'){
          item.y = newClose;
        }
      }
      state.chart.update('none');
    }
    updatePriceDisplay(symbol, newClose);
    updateHoldingsTable();
  }

  function startLiveUpdates(symbol){
    if(state.liveTimer) clearInterval(state.liveTimer);
    state.liveTimer = setInterval(()=> simulateLiveTick(symbol), 2500);
  }

  function renderChart(data, type){
    if(state.chart) state.chart.destroy();
    if(state.chart) state.chart.destroy();
    const ctx = marketCanvas.getContext('2d');
    const labels = data.map(d => formatDateLabel(new Date(d.t)));
    if(type === 'candlestick'){
      state.chart = new Chart(ctx, {
        type: 'candlestick',
        data: { labels, datasets: [{ label: 'Price', data: data.map((d,i)=>({x: labels[i], o:d.o, h:d.h, l:d.l, c:d.c})) }] },
        options: { plugins:{legend:{display:false}}, scales:{ x:{ type:'category' }, y:{ beginAtZero:false } } }
      });
    }else{
      state.chart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets:[{ label:'Close', data: data.map(d=>d.c), borderColor: 'rgba(18,44,79,0.9)', backgroundColor:'rgba(18,44,79,0.08)', pointRadius:0, fill:true, tension:0.25 }] },
        options: { plugins:{legend:{display:false}}, scales:{ x:{ type:'category' }, y:{ beginAtZero:false } } }
      });
    }
  }

  function updateHoldingsTable(){
    holdingsBody.innerHTML = '';
    Object.keys(state.holdings).forEach(sym=>{
      const h = state.holdings[sym];
      const avg = h.totalCostJpy / h.shares;
      // current value compute if we have last price
      const cur = (state.lastPrice && state.lastPrice[sym]) ? state.lastPrice[sym] : null;
      let pnlText = '--';
      if(cur!==null && cur!==undefined){
        const value = cur * h.shares;
        const pnl = value - h.totalCostJpy;
        pnlText = (pnl>=0?'+':'') + Math.round(pnl).toLocaleString() + ' JPY';
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${sym}</td><td>${h.shares}</td><td>${Math.round(avg).toLocaleString()}</td><td>${pnlText}</td>`;
      holdingsBody.appendChild(tr);
    });
  }

  function setChartBackgroundByPnl(symbol){
    // determine pnl for symbol
    const h = state.holdings[symbol];
    if(!h){ chartArea.classList.remove('bg-profit','bg-loss'); chartArea.classList.add('bg-default'); return; }
    const cur = (state.lastPrice && state.lastPrice[symbol]) ? state.lastPrice[symbol] : null;
    if(cur==null){ chartArea.classList.add('bg-default'); return; }
    const value = cur * h.shares; const pnl = value - h.totalCostJpy;
    if(pnl>0) { chartArea.classList.remove('bg-loss'); chartArea.classList.add('bg-profit'); }
    else if(pnl<0) { chartArea.classList.remove('bg-profit'); chartArea.classList.add('bg-loss'); }
    else { chartArea.classList.remove('bg-profit','bg-loss'); chartArea.classList.add('bg-default'); }
  }

  function updatePriceDisplay(symbol, price){
    const notice = document.getElementById('marketNotice');
    if(price==null){ currentPriceEl.textContent='--'; costKgmEl.textContent='--';
      if(notice) notice.textContent = '市場データが取得できませんでした。代替データを使用しています。';
      return; }
    currentPriceEl.textContent = Math.round(price).toLocaleString();
    const qty = Number(qtyInput.value) || 1;
    const costJpy = price * qty;
    const costKgm = (costJpy / state.kgmToJpy);
    costKgmEl.textContent = (Math.round(costKgm*100)/100).toLocaleString();
    // store lastPrice for symbol
    state.lastPrice = state.lastPrice || {};
    state.lastPrice[symbol] = price;
    setChartBackgroundByPnl(symbol);
    if(notice) notice.textContent = '';
  }

  function refreshAll(){
    const sym = symbolSelect.value;
    const range = rangeSelect.value;
    fetchMarketData(sym, range).then(data=>{
      state.marketData = data;
      renderChart(data, chartTypeSelect.value);
      const latest = data[data.length-1].c;
      updatePriceDisplay(sym, latest);
      updateHoldingsTable();
      startLiveUpdates(sym);
      kgmBalanceEl.textContent = Math.round(state.balanceKgm).toLocaleString();
    }).catch(err=>{
      console.error('market fetch',err);
      alert('市場データの取得に失敗しました。');
    });
  }

  // buy logic
  buyBtn.addEventListener('click', ()=>{
    const sym = symbolSelect.value;
    const qty = Number(qtyInput.value) || 1;
    const price = state.lastPrice && state.lastPrice[sym];
    if(!price){ alert('価格が取得できていません'); return; }
    const costJpy = price * qty;
    const costKgm = costJpy / state.kgmToJpy;
    if(costKgm > state.balanceKgm){ alert('KGM残高が不足しています'); return; }
    // deduct
    state.balanceKgm -= costKgm;
    state.holdings[sym] = state.holdings[sym] || {shares:0, totalCostJpy:0};
    state.holdings[sym].totalCostJpy += costJpy;
    state.holdings[sym].shares += qty;
    saveState();
    updateHoldingsTable();
    kgmBalanceEl.textContent = Math.round(state.balanceKgm).toLocaleString();
    setChartBackgroundByPnl(sym);
  });

  sellBtn.addEventListener('click', ()=>{
    const sym = symbolSelect.value;
    const qty = Number(qtyInput.value) || 1;
    const holding = state.holdings[sym];
    const price = state.lastPrice && state.lastPrice[sym];
    if(!holding || holding.shares < qty){ alert('保有株数が不足しています'); return; }
    if(!price){ alert('価格が取得できていません'); return; }
    const saleJpy = price * qty;
    const saleKgm = saleJpy / state.kgmToJpy;
    state.balanceKgm += saleKgm;
    holding.shares -= qty;
    holding.totalCostJpy = Math.max(0, holding.totalCostJpy - (holding.totalCostJpy / (holding.shares + qty) * qty));
    if(holding.shares === 0){ delete state.holdings[sym]; }
    saveState();
    updateHoldingsTable();
    kgmBalanceEl.textContent = Math.round(state.balanceKgm).toLocaleString();
    setChartBackgroundByPnl(sym);
  });

  // debug top-up
  topupBtn.addEventListener('click', ()=>{
    state.balanceKgm += 1000; saveState(); kgmBalanceEl.textContent = Math.round(state.balanceKgm).toLocaleString();
  });

  // update cost preview when qty changes
  qtyInput.addEventListener('input', ()=>{
    const sym = symbolSelect.value; const price = state.lastPrice && state.lastPrice[sym]; updatePriceDisplay(sym, price);
  });

  // symbol/range/type change
  [symbolSelect, rangeSelect, chartTypeSelect].forEach(el=>el.addEventListener('change', refreshAll));

  // init
  loadState();
  kgmBalanceEl.textContent = Math.round(state.balanceKgm).toLocaleString();
  updateHoldingsTable();
  // initial load
  refreshAll();

  // periodic refresh
  setInterval(()=>{ refreshAll(); }, 1000 * 60 * 2); // 2分ごと

})();
