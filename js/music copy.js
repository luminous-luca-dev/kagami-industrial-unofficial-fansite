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
    scheduleAheadTime: 0.1,
    lookahead: 25.0,
    timerID: null,
    // 最初は空のトラックリストからスタート（ユーザーが自由に追加）
    tracks: []
};

// --- トラックの追加関数 ---
function createNewTrack(name = "新トラック", steps = null, fileName = "音源未選択") {
    const trackId = "track_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    return {
        id: trackId,
        name: name,
        steps: steps ? steps : Array(16).fill(false),
        audioBuffer: null, // デコードされた音声データをここに保持
        fileName: fileName  // UI表示用のファイル名
    };
}

// --- 音声ファイルのインポート・デコード処理 ---
async function handleFileImport(trackId, file) {
    initAudio();
    if (!file) return;

    const track = state.tracks.find(t => t.id === trackId);
    if (!track) return;

    track.fileName = file.name;
    
    try {
        // ファイルを ArrayBuffer として読み込む
        const arrayBuffer = await file.arrayBuffer();
        // Web Audio API で音声データ(AudioBuffer)にデコード
        track.audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        // UIを更新してファイル名を表示
        renderTracks();
    } catch (error) {
        alert("音声ファイルの解析に失敗しました。対応フォーマット(wav/mp3等)か確認してください。");
        track.fileName = "読み込み失敗";
        renderTracks();
    }
}

// --- オーディオファイルの再生ロジック ---
function playSound(track, time) {
    // 音源がインポートされていない場合は、代わりに仮のビープ音を鳴らす（親切設計）
    if (!track.audioBuffer) {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(440, time);
        gainNode.gain.setValueAtTime(0.1, time);
        gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
        osc.start(time);
        osc.stop(time + 0.1);
        return;
    }

    // インポートされたオーディオを再生するためのソースノードを作成
    const bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = track.audioBuffer; // デコード済みのデータをセット

    // 音量調整用のゲインノードを作成
    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(1.0, time); // 音量は100%

    // ルーティング: Source -> Gain -> Destination(スピーカー)
    bufferSource.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // 指定された正確なタイミングで再生開始
    bufferSource.start(time);
}

// --- スケジューリング・エンジン ---
function nextNote() {
    const secondsPerBeat = 60.0 / state.bpm;
    state.nextNoteTime += 0.25 * secondsPerBeat; // 16分音符
    state.currentStep = (state.currentStep + 1) % 16;
}

function scheduleNote(stepNumber, time) {
    requestAnimationFrame(() => {
        document.querySelectorAll('.step').forEach(el => el.classList.remove('current-step'));
        state.tracks.forEach((track) => {
            const stepEl = document.querySelector(`.track[data-id="${track.id}"] .step[data-step="${stepNumber}"]`);
            if (stepEl) stepEl.classList.add('current-step');
        });
    });

    state.tracks.forEach(track => {
        if (track.steps[stepNumber]) {
            playSound(track, time);
        }
    });
}

function scheduler() {
    while (state.nextNoteTime < audioCtx.currentTime + state.scheduleAheadTime) {
        scheduleNote(state.currentStep, state.nextNoteTime);
        nextNote();
    }
    state.timerID = setTimeout(scheduler, state.lookahead);
}

// --- UIの描画 (可変トラック対応) ---
function renderTracks() {
    const tracksContainer = document.getElementById('tracks');
    tracksContainer.innerHTML = '';

    if (state.tracks.length === 0) {
        tracksContainer.innerHTML = `<p style="color:#aaa; text-align:center; padding:40px;">トラックがありません。「トラックを追加」ボタンを押してください。</p>`;
        return;
    }

    state.tracks.forEach((track) => {
        const trackDiv = document.createElement('div');
        trackDiv.className = 'track';
        trackDiv.dataset.id = track.id;

        // トラック情報 (名前入力、ファイル選択、削除ボタン)
        const infoDiv = document.createElement('div');
        infoDiv.className = 'track-info';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'track-name-input';
        nameInput.value = track.name;
        nameInput.addEventListener('change', (e) => {
            track.name = e.target.value;
        });

        const trackControls = document.createElement('div');
        trackControls.className = 'track-controls';

        // 外部音源ファイルインポート用のラベル&インプット
        const fileLabel = document.createElement('label');
        fileLabel.className = 'file-import-label';
        fileLabel.textContent = `📁 ${track.fileName}`;
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'audio/*';
        fileInput.addEventListener('change', (e) => {
            handleFileImport(track.id, e.target.files[0]);
        });
        fileLabel.appendChild(fileInput);

        // トラック削除ボタン
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn danger';
        deleteBtn.textContent = '❌';
        deleteBtn.addEventListener('click', () => {
            state.tracks = state.tracks.filter(t => t.id !== track.id);
            renderTracks();
        });

        trackControls.appendChild(fileLabel);
        trackControls.appendChild(deleteBtn);

        infoDiv.appendChild(nameInput);
        infoDiv.appendChild(trackControls);
        trackDiv.appendChild(infoDiv);

        // ステップ（16個のボタン）
        const stepsDiv = document.createElement('div');
        stepsDiv.className = 'steps';

        track.steps.forEach((isActive, stepIndex) => {
            const stepBtn = document.createElement('div');
            stepBtn.className = `step ${isActive ? 'active' : ''}`;
            stepBtn.dataset.step = stepIndex;
            
            stepBtn.addEventListener('click', () => {
                initAudio();
                track.steps[stepIndex] = !track.steps[stepIndex];
                stepBtn.classList.toggle('active');
            });
            stepsDiv.appendChild(stepBtn);
        });

        trackDiv.appendChild(stepsDiv);
        tracksContainer.appendChild(trackDiv);
    });
}

// --- イベントリスナー ---
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
    state.bpm = parseInt(e.target.value, 10);
});

document.getElementById('addTrackBtn').addEventListener('click', () => {
    const newTrack = createNewTrack(`トラック ${state.tracks.length + 1}`);
    state.tracks.push(newTrack);
    renderTracks();
});

// --- 保存機能 (txt形式 / 音源バイナリは除外してパターンのみ) ---
document.getElementById('saveBtn').addEventListener('click', () => {
    // AudioBuffer自体は巨大なためテキスト保存できません。トラック構造とパターンのみ保存します。
    const cleanTracks = state.tracks.map(t => ({
        name: t.name,
        steps: t.steps,
        fileName: t.fileName
    }));
    const saveData = JSON.stringify({ bpm: state.bpm, tracks: cleanTracks }, null, 2);
    const blob = new Blob([saveData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'my_composition.txt';
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
            
            // 保存データからトラックを復元（音源ファイルは再インポートが必要になります）
            state.tracks = loadedData.tracks.map(t => createNewTrack(t.name, t.steps, t.fileName));
            
            renderTracks();
        } catch (error) {
            alert('ファイルの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
});

// 初期状態で2つ空のトラックを作っておく
state.tracks.push(createNewTrack("🥁 キック"));
state.tracks.push(createNewTrack("✨ ハイハット"));
renderTracks();