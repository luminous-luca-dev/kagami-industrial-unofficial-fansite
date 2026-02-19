// perikan.js
(function() {
    let score = 0;
    let currentDirection = ''; 
    let isTransitioning = false; // 連打防止用フラグ

    const ranks = [
        { min: 0, name: '応募者' },
        { min: 1, name: 'アルバイト級' },
        { min: 3, name: 'インターン級' },
        { min: 5, name: '契約社員級' },
        { min: 10, name: '正社員級' },
        { min: 15, name: '主任級' },
        { min: 20, name: '課長級' },
        { min: 30, name: '部長級' },
        { min: 40, name: '役員級' },
        { min: 50, name: '代表取締役社長' }
    ];

    const screen = document.getElementById('game-screen');
    const scoreDisplay = document.getElementById('game-score');
    const rankDisplay = document.getElementById('game-rank');
    const feedback = document.getElementById('game-feedback');
    const btnLeft = document.getElementById('btn-select-left');
    const btnRight = document.getElementById('btn-select-right');
    const btnSubmit = document.getElementById('btn-submit'); // 「次へ」ボタンとして再利用
    const controls = document.getElementById('game-controls');
    const gameOverScreen = document.getElementById('game-over-screen');

    // 初期化：決定ボタンのテキストを「次へ」に変えて隠しておく
    if(btnSubmit) {
        btnSubmit.innerText = '次の問題へ';
        btnSubmit.style.display = 'none';
    }

    function nextRound() {
        isTransitioning = false;
        btnLeft.disabled = false;
        btnRight.disabled = false;
        btnLeft.classList.remove('selected');
        btnRight.classList.remove('selected');
        btnSubmit.style.display = 'none';
        feedback.innerText = '';
        screen.innerHTML = '📦';
        currentDirection = Math.random() < 0.5 ? 'left' : 'right';
    }

    function getRank(currentScore) {
        let currentRank = ranks[0].name;
        for (let i = 0; i < ranks.length; i++) {
            if (currentScore >= ranks[i].min) {
                currentRank = ranks[i].name;
            }
        }
        return currentRank;
    }

    // 判定ロジック
    function handleSelect(selected) {
        if (isTransitioning) return;
        isTransitioning = true;

        // ボタンの無効化
        btnLeft.disabled = true;
        btnRight.disabled = true;

        // 選択した方を強調
        if (selected === 'left') btnLeft.classList.add('selected');
        else btnRight.classList.add('selected');

        // ペリカン表示
        if (currentDirection === 'left') {
            screen.innerHTML = '<span style="transform: scaleX(-1); display:inline-block;">🦆</span>';
        } else {
            screen.innerHTML = '🦆';
        }

        if (selected === currentDirection) {
            // 正解
            score++;
            scoreDisplay.innerText = score;
            rankDisplay.innerText = getRank(score);
            feedback.style.color = '#4CAF50';
            feedback.innerText = '⭕ 正解！適性ありです！';
            
            // 「次へ」ボタンを表示
            btnSubmit.style.display = 'inline-block';
            btnSubmit.disabled = false;
        } else {
            // 不正解
            feedback.style.color = '#ff4a4a';
            feedback.innerText = '❌ 不正解...検査終了';
            
            setTimeout(() => {
                controls.style.display = 'none';
                gameOverScreen.style.display = 'block';
                document.getElementById('final-rank').innerText = getRank(score);
            }, 1000);
        }
    }

    // イベントリスナー
    btnLeft.addEventListener('click', () => handleSelect('left'));
    btnRight.addEventListener('click', () => handleSelect('right'));
    
    // 「次へ」ボタン
    btnSubmit.addEventListener('click', () => {
        nextRound();
    });

    // リトライ処理
    document.getElementById('btn-retry').addEventListener('click', () => {
        score = 0;
        scoreDisplay.innerText = score;
        rankDisplay.innerText = getRank(score);
        controls.style.display = 'block';
        gameOverScreen.style.display = 'none';
        nextRound();
    });

    // ランキング（省略なし）
    document.getElementById('btn-ranking').addEventListener('click', () => {
        const playerName = prompt("ランキングに登録する名前を入力してください:", "名無し社員");
        if (playerName) {
            alert(`【登録完了】\n名前: ${playerName}\nスコア: ${score}\n階級: ${getRank(score)}`);
        }
    });

    if(screen) nextRound();
})();