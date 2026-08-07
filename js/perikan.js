// NOTE: defer reading `window._supabase` until it's actually needed
const NG_WORDS = ['死ね', '馬鹿', 'ハゲ', 'カス']; // ここに禁止用語を追加

document.addEventListener('DOMContentLoaded', () => {
	// --- 基本設定 ---
	let score = 0;
	let currentDirection = ''; // 'left' or 'right'
	let gameState = 'WAITING'; // 'WAITING' (回答待ち), 'RESULT' (判定表示中)

	const ranks = [
		{ min: 0, name: 'アルバイト級' },
		{ min: 1, name: '正社員級' },
		{ min: 2, name: '主任級' },
		{ min: 3, name: '係長級' },
		{ min: 4, name: '課長級' },
		{ min: 5, name: '部長級' },
		{ min: 6, name: '役員級' },
		{ min: 7, name: '副社長級' },
		{ min: 8, name: '代表取締役級' },
	];

	const screen = document.getElementById('game-screen');
	const scoreDisplay = document.getElementById('game-score');
	const rankDisplay = document.getElementById('game-rank');
	const feedback = document.getElementById('game-feedback');
	const btnLeft = document.getElementById('btn-select-left');
	const btnRight = document.getElementById('btn-select-right');
	const btnNext = document.getElementById('btn-next');
	const controls = document.getElementById('game-controls');
	const gameOverScreen = document.getElementById('game-over-screen');

	// 追加：要素が取得できているか確認（取得失敗なら詳細ログを出すが処理は継続）
	if (!btnLeft || !btnRight) {
		console.error(
			'perikan: btn-select-left / btn-select-right が見つかりません',
			{
				btnLeftExists: !!btnLeft,
				btnRightExists: !!btnRight,
				screen,
				scoreDisplay,
				rankDisplay,
				feedback,
				btnNext,
				controls,
				gameOverScreen,
			}
		);
		// 続行して、可能な限りフォールバックで動作させる
	}

	// タッチとクリックの二重発火を防ぐフラグ
	let lastInputWasTouch = false;

	// 追加：ページ読み込み時に初期ラウンドを開始（未呼び出しだとボタンが押しても反応しない可能性あり）
	nextRound();

	function getRank(s) {
		let r = ranks[0].name;
		ranks.forEach((rank) => {
			if (s >= rank.min) r = rank.name;
		});
		return r;
	}

	// --- Supabaseにミニゲームのハイスコアを自動保存する関数 ---
	async function saveMiniGameScore(finalScore, finalRank) {
		const savedPlayerId = localStorage.getItem('kagami_employee_id');

		if (!savedPlayerId) {
			console.log(
				'perikan: 未ログイン状態のため、スコアの自動保存をスキップしました。'
			);
			return;
		}

		const _supabase = window._supabase;
		if (!_supabase) {
			console.error(
				'perikan: Supabaseクライアントが初期化されていないため、保存できません。'
			);
			return;
		}

		try {
			// 1. まず現在のDBに保存されているスコアを取得する
			const { data: currentProfile, error: fetchError } = await _supabase
				.from('profiles')
				.select('perikan_score')
				.eq('player_id', savedPlayerId)
				.single();

			if (fetchError) {
				console.error(
					'perikan: 現在のスコア取得に失敗しました:',
					fetchError
				);
				return;
			}

			// DBの既存スコア（データがない、またはNULLの場合は0として扱う）
			const dbScore =
				currentProfile && currentProfile.perikan_score
					? currentProfile.perikan_score
					: 0;

			// 2. 今回のスコアが、過去のハイスコア以上（またはより高い）場合のみ更新する
			if (finalScore > dbScore) {
				const { error: updateError } = await _supabase
					.from('profiles')
					.update({
						perikan_score: finalScore,
						perikan_rank: finalRank,
					})
					.eq('player_id', savedPlayerId);

				if (updateError) {
					console.error(
						'perikan: 社員ステータスの更新に失敗しました:',
						updateError
					);
				} else {
					console.log(
						`perikan: ハイスコア更新！ (${dbScore}点 -> ${finalScore}点)`
					);
				}
			} else {
				console.log(
					`perikan: 今回のスコア(${finalScore}点)はハイスコア(${dbScore}点)以下のため、保存をスキップしました。`
				);
			}
		} catch (err) {
			console.error(
				'perikan: スコア保存中に通信例外が発生しました:',
				err
			);
		}
	}

	// --- 次のラウンドの準備 ---
	function nextRound() {
		gameState = 'WAITING'; // 状態を回答待ちに戻す

		// UIリセット
		btnLeft.disabled = false;
		btnRight.disabled = false;
		btnLeft.classList.remove('selected');
		btnRight.classList.remove('selected');
		btnNext.style.display = 'none';
		feedback.innerText = '';
		feedback.style.color = '';
		screen.innerHTML = '📦';

		// 正解を決定
		currentDirection = Math.random() < 0.5 ? 'left' : 'right';
		console.log('Next Round Started. Answer is: ' + currentDirection);
	}

	// --- 判定処理 ---
	function checkAnswer(selected) {
		console.log(
			'perikan: checkAnswer called with',
			selected,
			'gameState=',
			gameState
		);
		// すでに判定中なら入力を受け付けない（これが重要！）
		if (gameState !== 'WAITING') {
			console.log(
				'perikan: checkAnswer ignored because gameState=',
				gameState
			);
			return;
		}
		gameState = 'RESULT';

		// ボタンを即座に無効化
		btnLeft.disabled = true;
		btnRight.disabled = true;

		// ペリカン表示
		const imgPath = 'perikan.png';
		// 🦆(デフォルト左向き)
		if (currentDirection === 'left') {
			screen.innerHTML = `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: contain; transform: scaleX(-1);">`;
		} else {
			screen.innerHTML = `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: contain;">`;
		}

		// 正誤判定
		if (selected === currentDirection) {
			// 【正解】
			score++;
			scoreDisplay.innerText = score;
			rankDisplay.innerText = getRank(score);
			feedback.style.color = '#4CAF50';
			feedback.innerText = '⭕ 正解！';
			// ★スコア8（クリア）判定を追加
			if (score >= 8) {
				gameState = 'CLEAR'; // 状態をクリアに変更

				// ★【追加：クリア時に自動保存】
				saveMiniGameScore(score, '代表取締役社長級');

				setTimeout(() => {
					controls.style.display = 'none';
					// ゲームオーバー画面を流用するか、専用のクリア表示を出す
					gameOverScreen.style.display = 'block';
					// クリア用メッセージに書き換え
					gameOverScreen.querySelector('h3').innerText =
						'🎉 すべてのペリカンの向きを当てられました！';
					gameOverScreen.querySelector('h3').style.color = '#FFD700'; // ゴールド
					document.getElementById('final-rank').innerText =
						'代表取締役社長級（ペリカンマスター）';
					feedback.innerText =
						'🎊 おめでとうございます！「ペリカン多くないですか!?」';
				}, 500);
			} else {
				btnNext.style.display = 'inline-block'; // 次へボタンを表示
			}
		} else {
			// 【不正解】
			feedback.style.color = '#ff4a4a';
			feedback.innerText = '❌ 不正解...';

			// 1秒後にゲームオーバー画面へ（ここでのみsetTimeoutを使用）
			setTimeout(() => {
				controls.style.display = 'none';
				gameOverScreen.style.display = 'block';
				document.getElementById('final-rank').innerText =
					getRank(score);

				// ★【追加：ゲームオーバー時にその時点のスコアを自動保存】
				saveMiniGameScore(score, getRank(score));
			}, 1000);
		}
	}

	// --- イベント割り当て (.onclickを使うことで重複登録を防ぐ) ---
	// クリックとタッチの両方を扱う（タッチ後に発生するクリックを無視する）
	if (btnLeft) {
		btnLeft.addEventListener(
			'touchstart',
			(e) => {
				console.log('perikan: touchstart left');
				if (gameState !== 'WAITING') {
					console.log('perikan: touch ignored (not WAITING)');
					return;
				}
				if (e && e.cancelable) e.preventDefault();
				lastInputWasTouch = true;
				btnLeft.classList.add('selected');
				checkAnswer('left');
			},
			{ passive: false }
		);

		btnLeft.onclick = (e) => {
			console.log(
				'perikan: click left (lastInputWasTouch=',
				lastInputWasTouch,
				')'
			);
			if (gameState !== 'WAITING') {
				console.log('perikan: click ignored (not WAITING)');
				return;
			}
			if (lastInputWasTouch) {
				lastInputWasTouch = false;
				return;
			}
			e.preventDefault();
			btnLeft.classList.add('selected');
			checkAnswer('left');
		};
	}

	if (btnRight) {
		btnRight.addEventListener(
			'touchstart',
			(e) => {
				console.log('perikan: touchstart right');
				if (gameState !== 'WAITING') {
					console.log('perikan: touch ignored (not WAITING)');
					return;
				}
				if (e && e.cancelable) e.preventDefault();
				lastInputWasTouch = true;
				btnRight.classList.add('selected');
				checkAnswer('right');
			},
			{ passive: false }
		);

		btnRight.onclick = (e) => {
			console.log(
				'perikan: click right (lastInputWasTouch=',
				lastInputWasTouch,
				')'
			);
			if (gameState !== 'WAITING') {
				console.log('perikan: click ignored (not WAITING)');
				return;
			}
			if (lastInputWasTouch) {
				lastInputWasTouch = false;
				return;
			}
			e.preventDefault();
			btnRight.classList.add('selected');
			checkAnswer('right');
		};
	}

	// add touch support for next button
	if (btnNext) {
		btnNext.addEventListener(
			'touchstart',
			(e) => {
				console.log('perikan: touchstart next');
				if (e && e.cancelable) e.preventDefault();
				nextRound();
			},
			{ passive: false }
		);

		btnNext.onclick = (e) => {
			console.log('perikan: click next');
			e.preventDefault();
			nextRound();
		};
	}

	const btnRetryEl = document.getElementById('btn-retry');
	if (btnRetryEl) {
		btnRetryEl.addEventListener(
			'touchstart',
			(e) => {
				console.log('perikan: touchstart retry');
				if (e && e.cancelable) e.preventDefault();
				score = 0;
				scoreDisplay.innerText = '0';
				rankDisplay.innerText = ranks[0].name;
				controls.style.display = 'block';
				gameOverScreen.style.display = 'none';
				nextRound();
			},
			{ passive: false }
		);

		btnRetryEl.onclick = (e) => {
			console.log('perikan: click retry');
			e.preventDefault();
			score = 0;
			scoreDisplay.innerText = '0';
			rankDisplay.innerText = ranks[0].name;
			controls.style.display = 'block';
			gameOverScreen.style.display = 'none';
			nextRound();
		};
	}

	// ランキング登録（_supabase はここで遅延参照）
	const btnRankingEl = document.getElementById('btn-ranking');
	if (btnRankingEl) {
		// 共通ハンドラを定義して touchstart / click 両方を使えるようにする
		const rankingHandler = async (e) => {
			if (e && e.cancelable) e.preventDefault();
			console.log(
				'perikan: rankingHandler invoked (type=',
				e && e.type,
				')'
			);

			// 二重発火防止
			if (e && e.type === 'click' && lastInputWasTouch) {
				lastInputWasTouch = false;
				return;
			}

			const _supabase = window._supabase;
			if (!_supabase) {
				console.error(
					'perikan: Supabase client is not initialized yet.'
				);
				alert(
					'ランキング機能は現在利用できません（通信準備中）。後で再試行してください。'
				);
				return;
			}

			const inputName = prompt(
				'ランキングに登録する名前を10文字以内で入力してください:',
				'名無し社員'
			);
			if (inputName === null) return; // キャンセル
			const playerName = inputName.trim();
			if (playerName === '') return;

			// NGワードチェック
			const isInvalid = NG_WORDS.some((word) =>
				playerName.includes(word)
			);
			if (isInvalid) {
				alert('不適切な表現が含まれているため、登録できません。');
				return; // 処理を中断
			}
			if (playerName.length > 10) {
				alert('社内規定により、氏名は10文字以内でお願いします。');
				return;
			}

			// --- データベースへ保存 ---
			try {
				const { data, error } = await _supabase
					.from('ranking')
					.insert([
						{
							name: playerName,
							score: score,
							rank: getRank(score),
						},
					]);

				if (error) {
					console.error('保存エラー:', error);
					alert('登録に失敗しました。');
					return;
				}

				// --- 最新ランキングを取得して表示 ---
				const { data: topPlayers, error: fetchError } = await _supabase
					.from('ranking')
					.select('*')
					.order('score', { ascending: false }) // スコアが高い順
					.limit(10);

				if (fetchError) {
					alert('ランキングの取得に失敗しました。');
				} else {
					let rankingTable = '🏆 【オンライン TOP 10】\n';
					topPlayers.forEach((entry, index) => {
						rankingTable += `${index + 1}位: ${entry.name} - ${entry.score}点 (${entry.rank})\n`;
					});
					alert(rankingTable);
				}
			} catch (err) {
				console.error('rankingHandler error:', err);
				alert('通信エラーが発生しました。');
			}
		};

		btnRankingEl.addEventListener(
			'touchstart',
			(e) => {
				lastInputWasTouch = true;
				rankingHandler(e);
			},
			{ passive: false }
		);

		btnRankingEl.addEventListener('click', rankingHandler);
	}

	// 初回スタート
	nextRound();
});
