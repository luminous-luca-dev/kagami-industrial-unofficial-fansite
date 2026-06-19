// --- Web Audio API 初期化 ---
let audioCtx;
const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

// --- アプリケーションの状態 (State) ---
const state = {
    bpm: 120,
    isPlaying: false,
    currentStep: 0,
    nextNoteTime: 0,
    scheduleAheadTime: 0.1, // 100ms先までスケジュール
    lookahead: 25.0,        // タイマーのチェック間隔(ms)
    timerID: null,
    // トラック構成: ドラムセットを模した3トラック
    tracks: [
        { id: 'kick', name: '🥁 キック (バスドラ)', steps: Array(16).fill(false), freq: 150 },
        { id: 'snare', name: '🥁 スネア', steps: Array(16).fill(false), freq: 250 },
        { id: 'hihat', name: '🥁 ハイハット', steps: Array(16).fill(false), freq: 8000 }
    ]
};

// --- サウンド合成 (ここを将来的にサンプル音源再生に置き換えます) ---
function playSound(trackId, time) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const track = state.tracks.find(t => t.id === trackId);
    
    if (trackId === 'kick') {
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
        gainNode.gain.setValueAtTime(1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.start(time);
        osc.stop(time + 0.5);
    } else if (trackId === 'snare') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, time);
        gainNode.gain.setValueAtTime(1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc.start(time);
        osc.stop(time + 0.2);
    } else if (trackId === 'hihat') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(8000, time);
        gainNode.gain.setValueAtTime(0.3, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
        osc.start(time);
        osc.stop(time + 0.05);
    }
}

// --- スケジューリング・エンジン (プロ品質の要) ---
function nextNote() {
    const secondsPerBeat = 60.0 / state.bpm;
    state.nextNoteTime += 0.25 * secondsPerBeat; // 16分音符
    state.currentStep = (state.currentStep + 1) % 16;
}

function scheduleNote(stepNumber, time) {
    // UIの更新を予約 (setTimeoutで視覚的な同期をとる)
    requestAnimationFrame(() => {
        document.querySelectorAll('.step').forEach(el => el.classList.remove('current-step'));
        state.tracks.forEach((track, trackIndex) => {
            const stepEl = document.querySelector(`.track[data-index="${trackIndex}"] .step[data-step="${stepNumber}"]`);
            if (stepEl) stepEl.classList.add('current-step');
        });
    });

    // 音の再生をスケジュール
    state.tracks.forEach(track => {
        if (track.steps[stepNumber]) {
            playSound(track.id, time);
        }
    });
}

function scheduler() {
    // audioContextの現在時刻より先の音を予約していく
    while (state.nextNoteTime < audioCtx.currentTime + state.scheduleAheadTime) {
        scheduleNote(state.currentStep, state.nextNoteTime);
        nextNote();
    }
    state.timerID = setTimeout(scheduler, state.lookahead);
}

// --- プレイコントロール ---
document.getElementById('playBtn').addEventListener('click', () => {
    initAudio();
    if (!state.isPlaying) {
        state.isPlaying = true;
        state.currentStep = 0;
        state.nextNoteTime = audioCtx.currentTime + 0.05;
        scheduler();
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    state.isPlaying = false;
    clearTimeout(state.timerID);
    document.querySelectorAll('.step').forEach(el => el.classList.remove('current-step'));
});

document.getElementById('bpm').addEventListener('change', (e) => {
    state.bpm = e.target.value;
});

// --- UI描画処理 ---
function renderTracks() {
    const tracksContainer = document.getElementById('tracks');
    tracksContainer.innerHTML = '';

    state.tracks.forEach((track, trackIndex) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track';
        trackDiv.dataset.index = trackIndex;

        const infoDiv = document.createElement('div');
        infoDiv.className = 'track-info';
        infoDiv.textContent = track.name;
        trackDiv.appendChild(infoDiv);

        const stepsDiv = document.createElement('div');
        stepsDiv.className = 'steps';

        track.steps.forEach((isActive, stepIndex) => {
            const stepBtn = document.createElement('div');
            stepBtn.className = `step ${isActive ? 'active' : ''}`;
            stepBtn.dataset.step = stepIndex;
            
            // ノートの入力・削除
            stepBtn.addEventListener('click', () => {
                initAudio();
                state.tracks[trackIndex].steps[stepIndex] = !state.tracks[trackIndex].steps[stepIndex];
                stepBtn.classList.toggle('active');
            });
            stepsDiv.appendChild(stepBtn);
        });

        trackDiv.appendChild(stepsDiv);
        tracksContainer.appendChild(trackDiv);
    });
}

// --- 初心者向けテンプレート機能 ---
const templates = {
    rockBeat: [
        [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false], // Kick
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], // Snare
        [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]  // Hihat
    ],
    fourOnFloor: [
        [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false]
    ],
    clear: [
        Array(16).fill(false), Array(16).fill(false), Array(16).fill(false)
    ]
};

document.querySelectorAll('.template-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const type = e.target.dataset.type;
        state.tracks.forEach((track, i) => {
            track.steps = [...templates[type][i]];
        });
        renderTracks();
    });
});

// --- 保存機能 (.txt形式でJSONを保存) ---
document.getElementById('saveBtn').addEventListener('click', () => {
    const saveData = JSON.stringify({ bpm: state.bpm, tracks: state.tracks }, null, 2);
    const blob = new Blob([saveData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_song.txt';
    a.click();
    URL.revokeObjectURL(url);
});

// --- 読み込み機能 ---
document.getElementById('loadBtn').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const loadedData = JSON.parse(event.target.result);
            state.bpm = loadedData.bpm;
            document.getElementById('bpm').value = state.bpm;
            state.tracks = loadedData.tracks;
            renderTracks();
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。正しいフォーマットか確認してください。');
        }
    };
    reader.readAsText(file);
});

// 初期描画
renderTracks();