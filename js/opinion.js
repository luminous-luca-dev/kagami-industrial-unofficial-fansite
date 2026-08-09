// ================================================================
//  KAGAMI INDUSTRIAL — opinion.js
//  業務改善・提案ボックス（目安箱 / 意見窓口）ロジック
// ================================================================
(function () {
  'use strict';

  // Supabase クライアント
  let supabase = null;
  if (window.supabase) {
    // auth.js または グローバル設定からSupabase接続情報を取得
    const SUPABASE_URL = window.SUPABASE_URL || 'https://xxx.supabase.co'; // 既存 auth.js 準拠
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'xxx';
    try {
      if (window.supabaseClient) {
        supabase = window.supabaseClient;
      }
    } catch (e) {
      console.warn('[Opinion] Supabase client init fallback:', e);
    }
  }

  // DOM 参照
  const opinionForm = document.getElementById('opinionForm');
  const categorySelect = document.getElementById('categorySelect');
  const contentInput = document.getElementById('contentInput');
  const submitBtn = document.getElementById('submitBtn');
  const meterCountEl = document.getElementById('meterCount');
  const meterBarFillEl = document.getElementById('meterBarFill');
  const recentFeedEl = document.getElementById('recentFeed');
  const mascotStage = document.getElementById('mascotStage');
  const mascotBubble = document.getElementById('mascotBubble');

  // セッションローカルの投稿数フォールバック (DBが無い場合のダミー)
  const LOCAL_STORAGE_COUNT_KEY = 'kgi_opinion_count';
  const LOCAL_STORAGE_ITEMS_KEY = 'kgi_opinion_items';

  let currentCount = parseInt(localStorage.getItem(LOCAL_STORAGE_COUNT_KEY) || '142', 10);

  // マスコットのセリフ差分テーブル
  const MASCOT_MESSAGES = {
    normal: ['どんなご意見でも大歓迎です！', 'ポテッと投稿お待ちしてます♪', '社長にも届くかも…！？', '誤字脱字のご指摘も助かります！'],
    tap: ['わっ！突かれました！', 'ハヤトプス「ガオッ！」', 'にじたうん「ぷにっ」', 'アイデア、ひらめきました？'],
    thanks: ['貴重なご意見ありがとうございます！', 'しっかり社内稟議（送信）完了です！', '加賀美インダストリアルが進化します！'],
  };

  // ─────────────────────────────────────────────────────────────
  //  マスコット（にじたうん＆ハヤトプス）差分＆アニメーション制御
  // ─────────────────────────────────────────────────────────────
  function setMascotState(state) {
    if (!mascotStage) return;
    mascotStage.setAttribute('data-state', state);

    // 吹き出しメッセージ更新
    const msgList = MASCOT_MESSAGES[state] || MASCOT_MESSAGES.normal;
    const randomMsg = msgList[Math.floor(Math.random() * msgList.length)];
    if (mascotBubble) {
      mascotBubble.textContent = randomMsg;
    }

    if (state === 'tap') {
      setTimeout(() => {
        if (mascotStage.getAttribute('data-state') === 'tap') {
          setMascotState('normal');
        }
      }, 1500);
    }
  }

  if (mascotStage) {
    mascotStage.addEventListener('click', () => {
      setMascotState('tap');
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  メーター表示更新
  // ─────────────────────────────────────────────────────────────
  function updateMeterDisplay(count) {
    currentCount = count;
    localStorage.setItem(LOCAL_STORAGE_COUNT_KEY, count.toString());

    if (meterCountEl) {
      // 数値カウントアップ表示
      meterCountEl.textContent = count.toLocaleString('ja-JP');
    }

    if (meterBarFillEl) {
      // 200件を基準としたパーセンテージ計算
      const pct = Math.min(100, Math.max(10, Math.floor((count / 250) * 100)));
      meterBarFillEl.style.width = pct + '%';
    }
  }

  // ─────────────────────────────────────────────────────────────
  //  Supabase `ringisho` または ローカルストレージからのデータ読み込み
  // ─────────────────────────────────────────────────────────────
  async function loadOpinions() {
    let opinions = [];

    if (window.supabaseClient) {
      try {
        const { data, error, count } = await window.supabaseClient.from('ringisho').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(12);

        if (!error && data) {
          if (count !== null) updateMeterDisplay(142 + count);
          opinions = data;
        }
      } catch (e) {
        console.warn('[Opinion] Supabase fetch error, fallback to local:', e);
      }
    }

    // バックアップ/ローカル表示
    if (opinions.length === 0) {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (localRaw) {
        try {
          opinions = JSON.parse(localRaw);
        } catch (e) {}
      }
    }

    // デモ用サンプル（初期表示）
    if (opinions.length === 0) {
      opinions = [
        { category: '休憩室アイデア', content: '休憩室にカードゲーム対戦スペースを作ってほしいです！', created_at: new Date(Date.now() - 3600000 * 5).toISOString() },
        { category: 'サイト内容のご指摘', content: '昇進試験の問4の記述、旧型ロボットの型番が最新仕様と異なります。', created_at: new Date(Date.now() - 3600000 * 24).toISOString() },
        { category: '新サービス提案', content: '加賀美リゾートの限定グッズ通販ページが欲しいです。', created_at: new Date(Date.now() - 3600000 * 48).toISOString() },
      ];
    }

    renderFeed(opinions);
    updateMeterDisplay(currentCount);
  }

  // ─────────────────────────────────────────────────────────────
  //  フィード描画
  // ─────────────────────────────────────────────────────────────
  function renderFeed(items) {
    if (!recentFeedEl) return;

    if (!items || items.length === 0) {
      recentFeedEl.innerHTML = '<p class="submit-note">まだ届いたご意見はありません。</p>';
      return;
    }

    const html = items
      .map((item) => {
        const date = new Date(item.created_at || Date.now());
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const cat = item.category || 'ご意見';

        return `
        <div class="feed-item-card">
          <div class="feed-item-header">
            <span class="feed-cat-badge">${escapeHtml(cat)}</span>
            <span class="feed-date">${dateStr}</span>
          </div>
          <div class="feed-content">${escapeHtml(item.content)}</div>
        </div>
      `;
      })
      .join('');

    recentFeedEl.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  送信処理
  // ─────────────────────────────────────────────────────────────
  if (opinionForm) {
    opinionForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const category = categorySelect.value;
      const content = contentInput.value.trim();

      if (!content) {
        alert('意見・提案内容を入力してください。');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = '送信中...';

      // ユーザーID（auth.jsがあれば使用）
      let playerId = 'anonymous';
      if (typeof window.getOrCreatePlayerId === 'function') {
        playerId = window.getOrCreatePlayerId();
      }

      const newRecord = {
        player_id: playerId,
        category: category,
        content: content,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      let success = false;

      // Supabase `ringisho` へ挿入
      if (window.supabaseClient) {
        try {
          const { error } = await window.supabaseClient.from('ringisho').insert([newRecord]);
          if (!error) success = true;
        } catch (err) {
          console.warn('[Opinion] Supabase insert error:', err);
        }
      }

      // ローカルストレージにも保存 (オフライン・デモ両対応)
      const localRaw = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      let localItems = localRaw ? JSON.parse(localRaw) : [];
      localItems.unshift(newRecord);
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(localItems.slice(0, 50)));

      // 送信完了アニメーション・マスコット差分
      currentCount++;
      updateMeterDisplay(currentCount);
      setMascotState('thanks');

      // フォームリセット
      contentInput.value = '';
      submitBtn.disabled = false;
      submitBtn.innerHTML = '✨ 送信完了しました！';

      setTimeout(() => {
        submitBtn.innerHTML = '🚀 社長室・担当者へ送信する';
        setMascotState('normal');
      }, 4000);

      // フィード再ロード
      loadOpinions();
    });
  }

  // ─────────────────────────────────────────────────────────────
  //  クイックタグクリック時の入力補完
  // ─────────────────────────────────────────────────────────────
  document.querySelectorAll('.quick-tag-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tagText = btn.dataset.tag || btn.textContent.trim();
      const cat = btn.dataset.cat;

      if (cat && categorySelect) {
        categorySelect.value = cat;
      }

      if (contentInput) {
        if (!contentInput.value.includes(tagText)) {
          contentInput.value = tagText + ' ' + contentInput.value;
        }
        contentInput.focus();
      }

      document.querySelectorAll('.quick-tag-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // ─────────────────────────────────────────────────────────────
  //  初期化
  // ─────────────────────────────────────────────────────────────
  loadOpinions();
})();
