if (!window._supabase) {
	const url = 'https://vcsnquepttevlmhgyeje.supabase.co';
	const key = 'sb_publishable_S6iay_evMqvHMLsgThkWOQ_pX3ghA4R';
	window._supabase = supabase.createClient(url, key);
}

function escapeHTML(str) {
	return str.replace(/[&<>"']/g, function (m) {
		return {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		}[m];
	});
}

(function () {
	// 1. 設定（あなたのプロジェクトのURLとキーに書き換えてください）
	const _supabase = window._supabase;

	// 2. ランキングを取得して表示する関数
	async function fetchGlobalRanking() {
		try {
			const { data: players, error } = await _supabase
				.from('ranking')
				.select('name, score, rank, created_at')
				.order('score', { ascending: false })
				.order('created_at', { ascending: false })
				.limit(15);

			if (error) throw error;

			const tbody = document.getElementById('global-ranking-body');
			if (!tbody) return;

			if (players.length === 0) {
				tbody.innerHTML =
					'<tr><td colspan="3" style="padding:20px; text-align:center;">登録者がいません。</td></tr>';
				return;
			}

			tbody.innerHTML = ''; // ローディング表示を消す

			players.forEach((player, index) => {
				const isPresident = player.score >= 8;
				const row = `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.3s;" 
                        onmouseover="this.style.background='rgba(200, 166, 94, 0.05)'" 
                        onmouseout="this.style.background='transparent'">
                        <td style="padding: 12px 5px;">${index + 1}</td>
                        <td style="padding: 12px 5px;">
                            <div style="font-weight: bold; ${isPresident ? 'color: #D4AF37;' : ''}">${escapeHTML(player.name)}</div>
                            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5);">${player.rank}</div>
                        </td>
                        <td style="padding: 12px 5px; text-align: right; font-family: 'Courier New', monospace; font-size: 1.1rem; ${isPresident ? 'color: #D4AF37;' : ''}">
                            ${player.score}
                        </td>
                    </tr>
                `;
				tbody.insertAdjacentHTML('beforeend', row);
			});
		} catch (err) {
			console.error('Ranking Fetch Error:', err);
			const tbody = document.getElementById('global-ranking-body');
			if (tbody)
				tbody.innerHTML =
					'<tr><td colspan="3" style="text-align:center; color:#ff4a4a;">データ取得失敗</td></tr>';
		}
	}

	// ページ読み込み時に実行
	document.addEventListener('DOMContentLoaded', fetchGlobalRanking);
})();
