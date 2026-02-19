document.addEventListener('DOMContentLoaded', () => {
    // --- 基本設定 ---
    let score = 0;
    let currentDirection = ''; // 'left' or 'right'
    let gameState = 'WAITING'; // 'WAITING' (回答待ち), 'RESULT' (判定表示中)

    const ranks = [
        { min: 0, name: '応募者' }, { min: 1, name: 'アルバイト級' },
        { min: 3, name: 'インターン級' }, { min: 5, name: '契約社員級' },
        { min: 10, name: '正社員級' }, { min: 15, name: '主任級' },
        { min: 20, name: '課長級' }, { min: 30, name: '部長級' },
        { min: 40, name: '役員級' }, { min: 50, name: '代表取締役社長' }
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
        // 🦆(デフォルト左向き)
        if (currentDirection === 'left') {
            screen.innerHTML = '🦆';
        } else {
            screen.innerHTML = '<span style="transform: scaleX(-1); display:inline-block;">🦆</span>';
        }

        // 正誤判定
        if (selected === currentDirection) {
            // 【正解】
            score++;
            scoreDisplay.innerText = score;
            rankDisplay.innerText = getRank(score);
            feedback.style.color = '#4CAF50';
            feedback.innerText = '⭕ 正解！';
            btnNext.style.display = 'inline-block'; // 「次に進む」を表示
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
    document.getElementById('btn-ranking').addEventListener('click', () => {
        const playerName = prompt("ランキングに登録する名前を入力してください:", "名無し社員");
        if (playerName) {
            alert(`【ランキング登録】\n名前: ${playerName}\nスコア: ${score}\n階級: ${getRank(score)}`);
        }
    });

    // 初回スタート
    nextRound();
});