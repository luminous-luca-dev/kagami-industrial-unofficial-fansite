// ============================================
// KAGAMI INDUSTRIAL - 認証・セッション管理システム
// ============================================
// Supabase クライアントは js/supabase-client.js で初期化済み
// window._supabase はブラウザのグローバル変数として参照可能

// ページが読み込まれたら自動的にログイン状態をチェック
document.addEventListener('DOMContentLoaded', async () => {
  await checkLoginStatus();

  // ログインボタンのイベント登録
  const loginBtn = document.getElementById('login-submit-btn');
  if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
  }

  // ログアウトボタンのイベント登録
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});

// 1. ログイン処理を行う関数
async function handleLogin() {
  const idInput = document.getElementById('login-id-input');
  if (!idInput || !idInput.value.trim()) {
    alert('社員IDを入力してください。');
    return;
  }

  const inputId = idInput.value.trim();

  try {
    // SupabaseにそのIDの社員がいるか問い合わせる
    const { data, error } = await _supabase.from('profiles').select('*').eq('player_id', inputId).single(); // 1件だけ取得

    if (error || !data) {
      alert('社員IDが見つかりません。正しいIDを入力するか、新しく社員証を発行してください。');
      return;
    }

    // IDが実在したら、ブラウザのローカルストレージに保存（これがログイン維持の鍵！）
    localStorage.setItem('kagami_employee_id', data.player_id);

    alert(`ログインしました！お疲れ様です、${data.username}さん。`);

    // 画面の表示を更新
    await checkLoginStatus();
  } catch (err) {
    console.error('ログイン処理中にエラーが発生しました:', err);
    alert('ログインに失敗しました。');
  }
}

// 2. ログイン状態をチェックして画面表示を切り替える関数
async function checkLoginStatus() {
  // ブラウザがIDを覚えているか確認
  const savedSavedId = localStorage.getItem('kagami_employee_id');

  const loginForm = document.getElementById('login-form');
  const statusArea = document.getElementById('user-status-area');

  if (!savedSavedId) {
    // 【未ログイン状態】ログインフォームを表示し、ステータスを隠す
    if (loginForm) loginForm.style.display = 'block';
    if (statusArea) statusArea.style.display = 'none';
    return;
  }

  try {
    // 覚えているIDを使って、最新のユーザー情報をSupabaseから取得
    const { data, error } = await _supabase.from('profiles').select('*').eq('player_id', savedSavedId).single();

    if (error || !data) {
      // DB側にデータがなければ、古い情報として記憶を消去
      localStorage.removeItem('kagami_employee_id');
      if (loginForm) loginForm.style.display = 'block';
      if (statusArea) statusArea.style.display = 'none';
      return;
    }

    // 【ログイン済状態】フォームを隠して、ユーザー情報を画面に反映
    if (loginForm) loginForm.style.display = 'none';
    if (statusArea) statusArea.style.display = 'block';

    // 画面の各パーツに文字を流し込む
    const nameEl = document.getElementById('status-username');
    const idEl = document.getElementById('status-empid');
    const orangeEl = document.getElementById('status-title-orange');
    const pelicanEl = document.getElementById('status-title-pelican');
    const orangescoreEl = document.getElementById('status-score-orange');
    const pelicanscoreEl = document.getElementById('status-score-pelican');

    if (nameEl) nameEl.innerText = data.username;
    if (idEl) idEl.innerText = data.player_id;
    if (orangeEl) orangeEl.innerText = data.orange_rank || '未獲得';
    if (pelicanEl) pelicanEl.innerText = data.perikan_rank || '未獲得';
    if (orangescoreEl) orangescoreEl.innerText = data.orange_score || 0;
    if (pelicanscoreEl) pelicanscoreEl.innerText = data.perikan_score || 0;
  } catch (err) {
    console.error('ステータスチェック中に例外が発生しました:', err);
  }
}

// 3. ログアウト処理を行う関数
function handleLogout() {
  // ブラウザの記憶を消すだけ！
  localStorage.removeItem('kagami_employee_id');
  alert('ログアウトしました。本日もお疲れ様でした！');

  // 表示を未ログイン状態に戻す
  const loginForm = document.getElementById('login-form');
  const statusArea = document.getElementById('user-status-area');
  if (loginForm) loginForm.style.display = 'block';
  if (statusArea) statusArea.style.display = 'none';

  // 入力欄を空にする
  const idInput = document.getElementById('login-id-input');
  if (idInput) idInput.value = '';
}
