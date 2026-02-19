/* ============================================
   KAGAMI INDUSTRIAL - ID Card Generator
   社員証ジェネレーター
   ============================================ */

const logoImg = new Image();
logoImg.src = './android-chrome-192x192.png';

const ID_CONFIG = {
    width: 450,
    height: 280,
    departments: [
        '重工業部門 産業ロボット課',
        '重工業部門 建設機械課',
        '重工業部門 マテリアル研究課',
        'ホビー事業部 玩具開発第1課',
        'ホビー事業部 玩具開発第2課',
        'ホビー事業部 玩具開発第3課',
        'ホビー事業部 ダイキャストカー課',
        'ホビー事業部 プラモデル課',
        'ホビー事業部 TCG企画課',
        'エンタテインメント事業部 配信技術課',
        'エンタテインメント事業部 音響課',
        'SMCラボ 先端技術研究室',
        'SMCラボ マジック・テクノロジー融合課',
        '加賀美水道局 配管係',
        '加賀美水道局 施設管理係',
        '加賀美リゾート 開発推進課',
        '加賀美リゾート 現地交渉員',
        '加賀美損害保険 査定課',
        '加賀美損害保険 じゃくてんほけん課',
        '加賀美不動産 物件調査課',
        '加賀美不動産 特殊条件物件課',
        '西麻布加賀美セレモニーホール 演出課',
        '加賀美ホールディングス コンビニ事業課',
        '加賀美実業高校 野球部コーチ',
        '秘書室',
        '社長室 直轄チーム',
        '品質管理部 最終検品課',
        '広報部 バーチャル広報課',
        'インドネシア支社 インフラ課',
    ],
    ranks: [
        '一般社員', '主任', '係長', '課長補佐', '課長',
        '次長', '部長', '取締役', '常務取締役', '専務取締役',
        'インターン', '嘱託社員', '技術顧問',
    ]
};

function generateEmployeeId() {
    const year = new Date().getFullYear();
    const num = String(Math.floor(Math.random() * 9999) + 1).padStart(4, '0');
    return `KI-${year}-${num}`;
}

function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

let uploadedPhoto = null; // 選択された画像を保持する変数

// 写真が選択された時のイベント
document.getElementById('employee-photo').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            uploadedPhoto = img; // 画像オブジェクトを保存
            alert('写真を受け付けました。');
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

function generateIdCard(name) {
    if (!name || !name.trim()) {
        alert('お名前を入力してください。');
        return;
    }

    const canvas = document.getElementById('id-card-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = ID_CONFIG.width * 2; // retina
    canvas.height = ID_CONFIG.height * 2;
    canvas.style.width = ID_CONFIG.width + 'px';
    canvas.style.height = ID_CONFIG.height + 'px';
    ctx.scale(2, 2);

    const w = ID_CONFIG.width;
    const h = ID_CONFIG.height;

    // Background
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#122C4F');
    bgGrad.addColorStop(1, '#1a3d6e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Gold accent bar top
    const goldGrad = ctx.createLinearGradient(0, 0, w, 0);
    goldGrad.addColorStop(0, '#a8893e');
    goldGrad.addColorStop(0.5, '#f0d48a');
    goldGrad.addColorStop(1, '#C8A65E');
    ctx.fillStyle = goldGrad;
    ctx.fillRect(0, 0, w, 5);

    // Gold accent bar bottom
    ctx.fillRect(0, h - 3, w, 3);

    // Side stripe
    ctx.fillStyle = 'rgba(200, 166, 94, 0.1)';
    ctx.fillRect(0, 0, 6, h);

    // Company name header area
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, 5, w, 50);

    // Company logo mark
    // drawImage(画像, X座標, Y座標, 幅, 高さ)
    if (logoImg.complete) {
        ctx.drawImage(logoImg, 15, 15, 32, 32);
    } else {
        // 万が一読み込みが間に合っていない場合の保険
        logoImg.onload = () => {
            ctx.drawImage(logoImg, 15, 15, 32, 32);
        };
    }

    // Company name
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '600 14px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('加賀美インダストリアル', 56, 25);

    ctx.fillStyle = '#C8A65E';
    ctx.font = '500 8px Montserrat, sans-serif';
    ctx.fillText('KAGAMI INDUSTRIAL INC.', 56, 42);

    // "EMPLOYEE ID" label
    ctx.fillStyle = 'rgba(200, 166, 94, 0.6)';
    ctx.font = '600 9px Montserrat, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('EMPLOYEE ID CARD', w - 20, 32);

    // "UNOFFICIAL/FANMADE" label
    // 上のラベルより少し小さく、少し薄い色で、Y座標を少し下にずらして表示します
    ctx.fillStyle = 'rgba(200, 166, 94, 0.5)';
    ctx.font = '500 7px Montserrat, sans-serif';
    // textAlignは直前の 'right' が引き継がれます
    ctx.fillText('UNOFFICIAL / FANMADE', w - 20, 43);

    // --- Photo Area ---
    const photoX = 20;
    const photoY = 70;
    const photoW = 100;
    const photoH = 120;

    // 背景枠
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(photoX, photoY, photoW, photoH);

    if (uploadedPhoto) {
        // ★写真がある場合：中央トリミングして描画
        const img = uploadedPhoto;
        const imgRatio = img.width / img.height;
        const targetRatio = photoW / photoH;
        let sx, sy, sWidth, sHeight;

        if (imgRatio > targetRatio) {
            sHeight = img.height;
            sWidth = img.height * targetRatio;
            sx = (img.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = img.width;
            sHeight = img.width / targetRatio;
            sx = 0;
            sy = (img.height - sHeight) / 2;
        }

        ctx.save(); // 状態を保存
        // 枠からはみ出さないようにクリッピング（念のため）
        ctx.beginPath();
        ctx.rect(photoX, photoY, photoW, photoH);
        ctx.clip();
        
        ctx.drawImage(img, sx, sy, sWidth, sHeight, photoX, photoY, photoW, photoH);
        
        ctx.restore(); // 状態を戻す
    } else {
        // ★写真がない場合：従来のシルエットを描画
        ctx.fillStyle = 'rgba(200, 166, 94, 0.15)';
        ctx.beginPath();
        ctx.arc(70, 110, 25, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(70, 165, 40, 25, 0, Math.PI, 0, true);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.font = '600 7px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('NO PHOTO', 70, 200);
    }

    // 共通の枠線
    ctx.strokeStyle = 'rgba(200, 166, 94, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(photoX, photoY, photoW, photoH);

    // Employee data
    const dept = getRandomItem(ID_CONFIG.departments);
    const rank = getRandomItem(ID_CONFIG.ranks);
    const empId = generateEmployeeId();

    const dataX = 140;

    // Name
    ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
    ctx.font = '500 8px Montserrat, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('NAME / 氏名', dataX, 82);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 22px "Noto Sans JP", sans-serif';
    ctx.fillText(name.trim(), dataX, 108);

    // Department
    ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
    ctx.font = '500 8px Montserrat, sans-serif';
    ctx.fillText('DEPARTMENT / 所属', dataX, 135);

    ctx.fillStyle = '#E5E5E5';
    ctx.font = '500 12px "Noto Sans JP", sans-serif';
    ctx.fillText(dept, dataX, 153);

    // Rank
    ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
    ctx.font = '500 8px Montserrat, sans-serif';
    ctx.fillText('RANK / 役職', dataX, 177);

    ctx.fillStyle = '#E5E5E5';
    ctx.font = '500 12px "Noto Sans JP", sans-serif';
    ctx.fillText(rank, dataX, 195);

    // ID Number
    ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
    ctx.font = '500 8px Montserrat, sans-serif';
    ctx.fillText('ID NUMBER', dataX, 219);

    ctx.fillStyle = '#C8A65E';
    ctx.font = '700 14px Montserrat, sans-serif';
    ctx.fillText(empId, dataX, 238);

    // QR-code-like decoration
    const qrX = w - 65;
    const qrY = h - 65;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(qrX, qrY, 50, 50);
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (Math.random() > 0.4) {
                ctx.fillStyle = 'rgba(200, 166, 94, 0.2)';
                ctx.fillRect(qrX + 2 + i * 9, qrY + 2 + j * 9, 8, 8);
            }
        }
    }

    // Valid date
    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() + 1);
    const dateStr = `${validDate.getFullYear()}.${String(validDate.getMonth() + 1).padStart(2, '0')}.${String(validDate.getDate()).padStart(2, '0')}`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '400 7px Montserrat, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`VALID UNTIL: ${dateStr}`, 20, h - 12);

    // Geometric lines deco
    ctx.strokeStyle = 'rgba(200, 166, 94, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.3, 55); ctx.lineTo(w * 0.3, h);
    ctx.moveTo(0, h * 0.6); ctx.lineTo(w, h * 0.6);
    ctx.stroke();

    // Show canvas and download button
    canvas.style.display = 'block';
    const downloadBtn = document.getElementById('id-card-download');
    if (downloadBtn) {
        downloadBtn.style.display = 'inline-flex';
        downloadBtn.onclick = () => {
            const link = document.createElement('a');
            link.download = `kagami_industrial_id_${name.trim()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        };
    }
}

// Bind to form buttons
document.addEventListener('DOMContentLoaded', () => {
    const genBtn = document.getElementById('generate-id-btn');
    const nameInput = document.getElementById('employee-name');

    if (genBtn && nameInput) {
        genBtn.addEventListener('click', () => generateIdCard(nameInput.value));
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                generateIdCard(nameInput.value);
            }
        });
    }
});
