/* ============================================
   KAGAMI INDUSTRIAL - Schrödinger's Pelican Mini-Game (English)
   ============================================ */

const NG_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'dick', '死ね', '馬鹿', 'ハゲ', 'カス'];

document.addEventListener('DOMContentLoaded', () => {
  let score = 0;
  let currentDirection = '';
  let gameState = 'WAITING';

  const ranks = [
    { min: 0, name: 'Part-Time Intern' },
    { min: 1, name: 'Full-Time Employee' },
    { min: 2, name: 'Senior Associate' },
    { min: 3, name: 'Assistant Manager' },
    { min: 4, name: 'Section Chief' },
    { min: 5, name: 'General Manager' },
    { min: 6, name: 'Executive Director' },
    { min: 7, name: 'Vice President' },
    { min: 8, name: 'President & CEO Class' },
  ];

  const screen = document.getElementById('game-screen');
  const scoreDisplay = document.getElementById('game-score');
  const rankDisplay = document.getElementById('game-rank');
  const feedback = document.getElementById('game-feedback');
  const btnLeft = document.getElementById('btn-select-left');
  const btnRight = document.getElementById('btn-select-right');
  const btnNext = document.getElementById('btn-next');
  const gameOverScreen = document.getElementById('game-over-screen');
  const finalRank = document.getElementById('final-rank');
  const btnRetry = document.getElementById('btn-retry');
  const btnRanking = document.getElementById('btn-ranking');

  nextRound();

  function getRank(s) {
    let r = ranks[0].name;
    ranks.forEach((rank) => {
      if (s >= rank.min) r = rank.name;
    });
    return r;
  }

  async function saveMiniGameScore(finalScore, finalRankName) {
    const savedPlayerId = localStorage.getItem('kagami_employee_id');
    if (!savedPlayerId) return;

    const _supabase = window._supabase;
    if (!_supabase) return;

    try {
      const { data: currentProfile, error: fetchError } = await _supabase.from('profiles').select('perikan_score').eq('player_id', savedPlayerId).single();
      if (fetchError) return;

      const dbScore = currentProfile && currentProfile.perikan_score ? currentProfile.perikan_score : 0;

      if (finalScore > dbScore) {
        await _supabase
          .from('profiles')
          .update({
            perikan_score: finalScore,
            perikan_rank: finalRankName,
          })
          .eq('player_id', savedPlayerId);
      }
    } catch (err) {
      console.error('Score save error:', err);
    }
  }

  function nextRound() {
    gameState = 'WAITING';
    if (btnLeft) {
      btnLeft.disabled = false;
      btnLeft.classList.remove('selected');
    }
    if (btnRight) {
      btnRight.disabled = false;
      btnRight.classList.remove('selected');
    }
    if (btnNext) btnNext.style.display = 'none';
    if (feedback) {
      feedback.innerText = '';
      feedback.style.color = '';
    }
    if (screen) screen.innerHTML = '📦';

    currentDirection = Math.random() < 0.5 ? 'left' : 'right';
  }

  function checkAnswer(selected) {
    if (gameState !== 'WAITING') return;
    gameState = 'RESULT';

    if (btnLeft) btnLeft.disabled = true;
    if (btnRight) btnRight.disabled = true;

    const imgPath = '../perikan.png';
    if (currentDirection === 'left') {
      screen.innerHTML = `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: contain; transform: scaleX(-1);">`;
    } else {
      screen.innerHTML = `<img src="${imgPath}" style="width: 100%; height: 100%; object-fit: contain;">`;
    }

    if (selected === currentDirection) {
      score++;
      if (scoreDisplay) scoreDisplay.innerText = score;
      const currentRank = getRank(score);
      if (rankDisplay) rankDisplay.innerText = currentRank;

      if (feedback) {
        feedback.innerText = 'Correct! The Pelican stays!';
        feedback.style.color = '#4fc3f7';
      }

      if (btnNext) {
        btnNext.style.display = 'block';
        btnNext.focus();
      }
    } else {
      if (feedback) {
        feedback.innerText = 'Incorrect! The Pelican escaped!';
        feedback.style.color = '#ff4a4a';
      }

      const finalRankTitle = getRank(score);
      if (finalRank) finalRank.innerText = finalRankTitle;

      if (gameOverScreen) gameOverScreen.style.display = 'block';
      const controls = document.getElementById('game-controls');
      if (controls) controls.style.display = 'none';

      saveMiniGameScore(score, finalRankTitle);
    }
  }

  function resetGame() {
    score = 0;
    if (scoreDisplay) scoreDisplay.innerText = '0';
    if (rankDisplay) rankDisplay.innerText = ranks[0].name;
    if (gameOverScreen) gameOverScreen.style.display = 'none';
    const controls = document.getElementById('game-controls');
    if (controls) controls.style.display = 'block';
    nextRound();
  }

  if (btnLeft) btnLeft.addEventListener('click', () => checkAnswer('left'));
  if (btnRight) btnRight.addEventListener('click', () => checkAnswer('right'));
  if (btnNext) btnNext.addEventListener('click', nextRound);
  if (btnRetry) btnRetry.addEventListener('click', resetGame);

  if (btnRanking) {
    btnRanking.addEventListener('click', async () => {
      try {
        const inputName = prompt('Enter your name for the leaderboard (Max 10 chars):', 'Anonymous');
        if (!inputName) return;
        const playerName = inputName.trim();
        if (!playerName) return;

        if (NG_WORDS.some((word) => playerName.toLowerCase().includes(word))) {
          alert('Inappropriate language detected. Registration cancelled.');
          return;
        }

        const _supabase = window._supabase;
        if (!_supabase) return;

        const currentRank = getRank(score);
        const { error } = await _supabase.from('ranking').insert([
          {
            name: playerName,
            score: score,
            rank: currentRank,
          },
        ]);

        if (error) {
          alert('Failed to register ranking.');
          return;
        }

        alert('Registered to Leaderboard! Refreshing rankings...');
        location.reload();
      } catch (e) {
        console.error(e);
      }
    });
  }
});
