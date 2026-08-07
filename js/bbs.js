// --- 初期設定とグローバル変数 ---
if (!window._supabase) {
  const url = 'https://vcsnquepttevlmhgyeje.supabase.co';
  const key = 'sb_publishable_S6iay_evMqvHMLsgThkWOQ_pX3ghA4R';
  window._supabase = supabase.createClient(url, key);
}
const _supabase = window._supabase; // 既存の共通クライアントを参照
let currentUser = null;
let currentReplyParentId = null; // 返信先のID

// いいねした投稿をローカルに記憶する配列
let likedPosts = JSON.parse(localStorage.getItem('bbs_liked_posts')) || [];

document.addEventListener('DOMContentLoaded', async () => {
  // 送信ボタンにクリックイベントを紐付け（★これを追加しないとボタンが反応しません）
  const postBtn = document.getElementById('post-btn');
  if (postBtn) {
    postBtn.addEventListener('click', submitPost);
  }

  await initBBS();
});

async function initBBS() {
  const savedPlayerId = localStorage.getItem('kagami_employee_id');

  if (!savedPlayerId) {
    document.getElementById('form-container').innerHTML = `
            <div class="guest-message">⚠ 投稿するには社員ログイン（IDの登録）が必要です。</div>
        `;
  } else {
    // profilesテーブルから現在のユーザー情報を引っ張ってくる
    try {
      const { data, error } = await _supabase.from('profiles').select('*').eq('player_id', savedPlayerId).single();

      if (!error && data) {
        currentUser = data;
        const maskedId = maskPlayerId(currentUser.player_id);

        document.getElementById('user-preview').innerText = currentUser.username || '名無し社員';
        document.getElementById('current-employee-id').innerText = maskedId;
      } else {
        document.getElementById('user-preview').innerText = '名無し社員';
        document.getElementById('current-employee-id').innerText = maskPlayerId(savedPlayerId);
        currentUser = {
          player_id: savedPlayerId,
          username: '名無し社員',
          perikan_rank: '未所属',
          orange_rank: '未所属',
        };
      }
    } catch (e) {
      console.error(e);
    }
  }

  // 投稿一覧の取得
  await fetchTimeline();
}

// IDの下4桁を隠す便利関数
function maskPlayerId(id) {
  if (!id) return '****';
  return id.replace(/.{4}$/, '****');
}

// タイムライン取得処理
async function fetchTimeline() {
  try {
    // 全投稿を取得（新しい順）
    const { data: posts, error } = await _supabase
      .from('bbs_posts')
      .select(
        `
                *,
                profiles:player_id (
                    username,
                    perikan_rank,
                    orange_rank
                )
            `
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    const timelineEl = document.getElementById('timeline');
    timelineEl.innerHTML = '';

    // 親投稿（parent_id が NULL のもの）と、返信投稿に分ける
    const parentPosts = posts.filter((p) => !p.parent_id);
    const replyPosts = posts.filter((p) => p.parent_id);

    // 親投稿をループ処理（新着順に上から並べる）
    parentPosts.forEach((post) => {
      const postHtml = createPostCardHtml(post, false);
      timelineEl.appendChild(postHtml);

      // この親に対する返信を古い順（会話の流れ順）に並び替えて直下に挿入
      const repliesForThis = replyPosts.filter((r) => r.parent_id === post.id).reverse();

      repliesForThis.forEach((reply) => {
        const replyHtml = createPostCardHtml(reply, true);
        timelineEl.appendChild(replyHtml);
      });
    });
  } catch (err) {
    console.error('タイムライン取得エラー:', err);
  }
}

// 投稿カードのHTML要素を生成する関数
function createPostCardHtml(post, isReply) {
  const card = document.createElement('div');
  card.className = `post-card ${isReply ? 'is-reply' : ''}`;
  card.id = `post-${post.id}`;

  const maskedId = maskPlayerId(post.player_id);
  const formattedTime = new Date(post.created_at).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // いいね状態の判定
  const isLiked = likedPosts.includes(post.id);

  // 称号バッジの組み立て（データがあるときだけ薄く表示）
  let displayName = '名無し社員';
  let badgeHtml = '';
  if (post.profiles) {
    if (post.profiles.username) displayName = post.profiles.username; // ★この1行を追加
    if (post.profiles.perikan_rank) badgeHtml += `<span class="badge">🦆 ${post.profiles.perikan_rank}</span>`;
    if (post.profiles.orange_rank) badgeHtml += `<span class="badge orange">🍊 ${post.profiles.orange_rank}</span>`;
  }

  card.innerHTML = `
        <div class="post-header">
            <div class="meta-left">
                <span class="author-name" id="author-name-${post.id}">${escapeHtml(displayName)}</span>
                <span class="author-id">${maskedId}</span>
                <div class="author-badges">${badgeHtml}</div>
            </div>
            <span class="post-time">${formattedTime}</span>
        </div>
        <div class="post-content" id="content-${post.id}">${escapeHtml(post.content)}</div>
        <div class="post-actions">
            <button class="action-btn ${isLiked ? 'like-active' : ''}" onclick="toggleLike(${post.id})">
                ❤️ <span id="like-count-${post.id}">${post.likes || 0}</span>
            </button>
            ${!isReply ? `<button class="action-btn" onclick="setReplyTarget(${post.id})">💬 返信</button>` : ''}
            <button class="action-btn btn-hide-toggle" onclick="toggleMosaic(${post.id}, this)">👁 隠す</button>
        </div>
    `;
  return card;
}

// 投稿送信処理
async function submitPost() {
  const inputEl = document.getElementById('post-content');
  const content = inputEl.value.trim();

  if (!content) return;
  if (!currentUser) {
    alert('投稿権限がありません。');
    return;
  }

  try {
    const { error } = await _supabase.from('bbs_posts').insert([
      {
        player_id: currentUser.player_id,
        content: content,
        parent_id: currentReplyParentId, // 返信なら親IDが入る
      },
    ]);

    if (error) throw error;

    // フォームリセット
    inputEl.value = '';
    cancelReply();

    // 再読み込み
    await fetchTimeline();
  } catch (err) {
    console.error('投稿エラー:', err);
    alert('投稿の送信に失敗しました。');
  }
}

// 返信モードのセット（引数をIDのみに簡略化）
function setReplyTarget(postId) {
  currentReplyParentId = postId;
  const nameEl = document.getElementById(`author-name-${postId}`);
  const name = nameEl ? nameEl.innerText : '社員';
  const badge = document.getElementById('reply-badge');
  badge.innerHTML = `👤 ${name} さんへの返信中 <span onclick="cancelReply()">×</span>`;
  badge.style.display = 'block';
  document.getElementById('post-content').focus();
}

// 返信モードの解除
function cancelReply() {
  currentReplyParentId = null;
  document.getElementById('reply-badge').style.display = 'none';
}

// いいねのトグル処理
async function toggleLike(postId) {
  const likeBtn = document.querySelector(`#post-${postId} .action-btn:first-child`);
  const countSpan = document.getElementById(`like-count-${postId}`);

  // 画面に表示されている現在の数値をその場で読み込む（なければ0）
  let currentLikes = parseInt(countSpan.innerText, 10) || 0;
  let newLikes = currentLikes;

  if (likedPosts.includes(postId)) {
    // すでにいいね済みなら解除
    likedPosts = likedPosts.filter((id) => id !== postId);
    newLikes = Math.max(0, newLikes - 1);
    likeBtn.classList.remove('like-active');
  } else {
    // 新規いいね
    likedPosts.push(postId);
    newLikes += 1;
    likeBtn.classList.add('like-active');
  }

  // ローカルストレージ保存
  localStorage.setItem('bbs_liked_posts', JSON.stringify(likedPosts));
  countSpan.innerText = newLikes;

  // DB更新
  await _supabase.from('bbs_posts').update({ likes: newLikes }).eq('id', postId);
}

// モザイクのトグル処理
function toggleMosaic(postId, btn) {
  const contentEl = document.getElementById(`content-${postId}`);
  if (contentEl.classList.contains('mosaic-active')) {
    contentEl.classList.remove('mosaic-active');
    btn.innerText = '👁 隠す';
  } else {
    contentEl.classList.add('mosaic-active');
    btn.innerText = '👁 表示';
  }
}

// エスケープ処理（XSS対策）
function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

// ログアウト処理
function logoutBBS() {
  if (confirm('社内掲示板からログアウトしますか？')) {
    localStorage.removeItem('kagami_employee_id');
    location.reload(); // ページをリロードしてゲスト画面に戻す
  }
}
