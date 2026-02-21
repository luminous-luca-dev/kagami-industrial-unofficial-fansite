const _supabase = window._supabase;

const NG_WORDS = ["死ね", "馬鹿", "ハゲ", "カス"]; // ここに禁止用語を追加



document.addEventListener('DOMContentLoaded', () => {
    // --- 基本設定 ---
    let score = 0;
    let currentDirection = ''; // 'left' or 'right'
    let gameState = 'WAITING'; // 'WAITING' (回答待ち), 'RESULT' (判定表示中)

    const ranks = [
        { min: 0, name: 'アルバイト級' }, { min: 1, name: '正社員級' },
        { min: 2, name: '主任級' }, { min: 3, name: '係長級' },
        { min: 4, name: '課長級' }, { min: 5, name: '部長級' },
        { min: 6, name: '役員級' }, { min: 7, name: '副社長級' },
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

    function getRank(s) {
        let r = ranks[0].name;
        ranks.forEach(rank => { if (s >= rank.min) r = rank.name; });
        return r;
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
        console.log("Next Round Started. Answer is: " + currentDirection);
    }

    // --- 判定処理 ---
    function checkAnswer(selected) {
        // すでに判定中なら入力を受け付けない（これが重要！）
        if (gameState !== 'WAITING') return;
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
                setTimeout(() => {
                    controls.style.display = 'none';
                    // ゲームオーバー画面を流用するか、専用のクリア表示を出す
                    gameOverScreen.style.display = 'block';
                    // クリア用メッセージに書き換え
                    gameOverScreen.querySelector('h3').innerText = '🎉 すべてのペリカンの向きを当てられました！';
                    gameOverScreen.querySelector('h3').style.color = '#FFD700'; // ゴールド
                    document.getElementById('final-rank').innerText = '代表取締役社長級（ペリカンマスター）';
                    feedback.innerText = '🎊 おめでとうございます！「ペリカン多くないですか!?」';
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
                document.getElementById('final-rank').innerText = getRank(score);
            }, 1000);
        }
    }

    // --- イベント割り当て (.onclickを使うことで重複登録を防ぐ) ---
    btnLeft.onclick = (e) => {
        e.preventDefault();
        btnLeft.classList.add('selected');
        checkAnswer('left');
    };

    btnRight.onclick = (e) => {
        e.preventDefault();
        btnRight.classList.add('selected');
        checkAnswer('right');
    };

    btnNext.onclick = (e) => {
        e.preventDefault();
        nextRound();
    };

    document.getElementById('btn-retry').onclick = () => {
        score = 0;
        scoreDisplay.innerText = "0";
        rankDisplay.innerText = ranks[0].name;
        controls.style.display = 'block';
        gameOverScreen.style.display = 'none';
        nextRound();
    };

    // ランキング
    document.getElementById('btn-ranking').onclick = async () => {
        const playerName = prompt("ランキングに登録する名前を10文字以内で入力してください:", "名無し社員");
        
        // NGワードチェック
        const isInvalid = NG_WORDS.some(word => playerName.includes(word));
        
        if (isInvalid) {
            alert("不適切な表現が含まれているため、登録できません。");
            return; // 処理を中断
        }
        if (playerName.length > 10) {
            alert("社内規定により、氏名は10文字以内でお願いします。");
            return;
        }
        if (playerName) {
            // --- データベースへ保存 ---
            const { data, error } = await _supabase
                .from('ranking')
                .insert([
                    { name: playerName, score: score, rank: getRank(score) }
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
                .limit(10); // 上位10名

            if (fetchError) {
                alert('ランキングの取得に失敗しました。');
            } else {
                let rankingTable = "🏆 【オンライン TOP 10】\n";
                topPlayers.forEach((entry, index) => {
                    rankingTable += `${index + 1}位: ${entry.name} - ${entry.score}点 (${entry.rank})\n`;
                });
                alert(rankingTable);
            }
        }
    };

    // 初回スタート
    nextRound();
});