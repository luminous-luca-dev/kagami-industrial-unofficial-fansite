/* ============================================
   KAGAMI INDUSTRIAL - ID Card Generator
   社員証ジェネレーター
   ============================================ */

if (!window._supabase) {
  const url = 'https://vcsnquepttevlmhgyeje.supabase.co';
  const key = 'sb_publishable_S6iay_evMqvHMLsgThkWOQ_pX3ghA4R';
  window._supabase = supabase.createClient(url, key);
}

const logoImg = new Image();
logoImg.src = './android-chrome-192x192.png';

const ID_CONFIG = {
  width: 450,
  height: 280,
  departments: ['重工業部門 産業ロボット課', '重工業部門 建設機械課', '重工業部門 マテリアル研究課', 'ホビー事業部 玩具開発第1課', 'ホビー事業部 玩具開発第2課', 'ホビー事業部 玩具開発第3課', 'ホビー事業部 ダイキャストカー課', 'ホビー事業部 プラモデル課', 'ホビー事業部 TCG企画課', 'エンタテインメント事業部 配信技術課', 'エンタテインメント事業部 音響課', 'SMCラボ 先端技術研究室', 'SMCラボ マジック・テクノロジー融合課', '加賀美水道局 配管係', '加賀美水道局 施設管理係', '加賀美リゾート 開発推進課', '加賀美リゾート 現地交渉員', '加賀美損害保険 査定課', '加賀美損害保険 じゃくてんほけん課', '加賀美不動産 物件調査課', '加賀美不動産 特殊条件物件課', '西麻布加賀美セレモニーホール 演出課', '加賀美ホールディングス コンビニ事業課', '加賀美実業高校 野球部コーチ', '秘書室', '社長室 直轄チーム', '品質管理部 最終検品課', '広報部 バーチャル広報課', 'インドネシア支社 インフラ課'],
  ranks: ['一般社員', '主任', '係長', '課長補佐', '課長', '次長', '部長', '取締役', '常務取締役', '専務取締役', 'インターン', '嘱託社員', '技術顧問'],
};

// 新しいID発行関数（Supabaseのデータ件数から発行順を数え、重複も防ぐ）
async function generateUniqueEmployeeId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'; // 小文字の英数字

  // 1. 現在の profiles テーブルの全件数を取得して、次の発行順（4桁）を決める
  const { count, error: countError } = await _supabase.from('profiles').select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('データ件数の取得に失敗しました:', countError);
    throw countError;
  }

  // 現在の件数 + 1 を4桁にパディング（例: 1番目なら 0001, 12番目なら 0012）
  const sequenceNum = String((count || 0) + 1).padStart(4, '0');

  let isUnique = false;
  let empId = '';

  // 2. 万が一、ランダムな4桁が重複した場合に備えてループでチェック
  while (!isUnique) {
    let randomStr = '';
    for (let i = 0; i < 4; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // 指定のフォーマットに成形
    empId = `KI-${sequenceNum}-${randomStr}`;

    // Supabaseに同じIDが既に存在するか検索
    const { data, error } = await _supabase.from('profiles').select('player_id').eq('player_id', empId);

    if (error) {
      console.error('IDの重複チェックに失敗しました:', error);
      throw error;
    }

    // 検索結果が0件（まだ誰も使っていない）なら確定
    if (data.length === 0) {
      isUnique = true;
    }
  }

  return empId;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let uploadedPhoto = null; // 選択された画像を保持する変数

// 写真が選択された時のイベント
document.getElementById('employee-photo').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      // 1. Canvas描画用の変数に保存
      uploadedPhoto = img;

      // 2. プレビュー画像を表示する処理
      const previewContainer = document.getElementById('photo-preview-container');
      const previewImg = document.getElementById('photo-preview-img');

      previewImg.src = event.target.result; // 画像のURLをセット
      previewContainer.style.display = 'block'; // 非表示(none)から表示(block)へ
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

// ----------------------------------------------------
// 【新規追加】ページ滞在中の状態を保持する変数
// ----------------------------------------------------

let currentSessionId = null;
let currentSessionName = '';
let currentSessionReg = null;

async function generateIdCard(name) {
  if (!name || !name.trim()) {
    alert('お名前を入力してください。');
    return;
  }

  const genBtn = document.getElementById('generate-id-btn');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerText = '社員証を発行中...';
  }

  // 1. 社長判定
  const presidentNames = ['加賀美ハヤト', '加賀美隼人', '加賀美　ハヤト', '加賀美　隼人'];
  const isPresident = presidentNames.includes(name.trim());

  const regChoiceObj = document.querySelector('input[name="registration-choice"]:checked');
  const isRegistered = regChoiceObj ? regChoiceObj.value === 'yes' : false;

  // 2. 部署・役職・社員番号をここで確定させる（上書き防止！）
  const dept = isPresident ? '加賀美インダストリアル' : getRandomItem(ID_CONFIG.departments);
  const rank = isPresident ? '代表取締役社長' : getRandomItem(ID_CONFIG.ranks);

  // 3. 社員番号とデータベースの処理
  // 【変更】名前のチェックを外し、「IDがまだない」または「登録モード（ラジオボタン）が変わった」場合のみ新規IDを発行
  if (!currentSessionId || currentSessionReg !== isRegistered) {
    if (isPresident) {
      currentSessionId = 'KI-0001-BOSS';
    } else if (isRegistered) {
      // ▼ 登録する場合のみSupabaseに新規追加 ▼
      try {
        currentSessionId = await generateUniqueEmployeeId();

        const { error: insertError } = await _supabase.from('profiles').insert([
          {
            player_id: currentSessionId,
            username: name.trim(),
            perikan_rank: '',
            perikan_score: 0,
            orange_rank: '',
            orange_score: 0,
          },
        ]);

        if (insertError) throw insertError;

        localStorage.setItem('kagami_employee_id', currentSessionId);
      } catch (err) {
        console.error(err);
        alert('データベースへの登録に失敗しました。もう一度お試しください。');
        if (genBtn) {
          genBtn.disabled = false;
          genBtn.innerText = '社員証を発行する';
        }
        return;
      }
    } else {
      // ▼ 登録しない場合 ▼
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      currentSessionId = `KI-GUEST-${randomStr}`;
      localStorage.removeItem('kagami_employee_id');
    }

    // 最初の状態を記憶
    currentSessionName = name.trim();
    currentSessionReg = isRegistered;
  } else {
    // 【新規追加】すでにIDがあり、登録モードのまま「名前だけが変わった」場合の処理
    // IDは変えずに、データベースの既存レコードの名前だけを更新（UPDATE）する
    if (isRegistered && currentSessionName !== name.trim() && !isPresident) {
      try {
        const { error: updateError } = await _supabase.from('profiles').update({ username: name.trim() }).eq('player_id', currentSessionId);

        if (updateError) throw updateError;

        // 記憶している名前を更新
        currentSessionName = name.trim();
      } catch (err) {
        console.error(err);
        alert('データベースの名前更新に失敗しました。');
        if (genBtn) {
          genBtn.disabled = false;
          genBtn.innerText = '社員証を発行する';
        }
        return;
      }
    }
  }

  // 描画用のIDとして確定
  const empId = currentSessionId;
  // --- ▼ 追加：マイデスク専用URLの生成 ▼ ---
  // btoa() でIDを暗号化（ハッシュ化）してURLパラメータにする
  const deskUrl = window.location.origin + window.location.pathname + '?desk=' + btoa(empId);

  // ※ここで deskUrl をHTMLの任意の要素（inputタグなど）に出力して、
  // ユーザーがコピーできるUIをHTML側に追加してください。
  // 例: document.getElementById('desk-url-input').value = deskUrl;
  // --- ▲ 追加ここまで ▲ ---

  // （オプション）もし画面上に「〇〇としてログイン中」のような表示エリアがあれば、ここでテキストを更新してもOKです
  // document.getElementById('current-employee-id').innerText = empId;

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
  if (isPresident) {
    // 社長専用：情熱の赤グラデーション
    bgGrad.addColorStop(0, '#550000'); // 深い赤
    bgGrad.addColorStop(1, '#7e1717'); // 鮮やかな赤
  } else {
    // 一般社員：信頼の青グラデーション
    bgGrad.addColorStop(0, '#122C4F');
    bgGrad.addColorStop(1, '#1a3d6e');
  }
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
  ctx.moveTo(w * 0.3, 55);
  ctx.lineTo(w * 0.3, h);
  ctx.moveTo(0, h * 0.6);
  ctx.lineTo(w, h * 0.6);
  ctx.stroke();

  // Show canvas and download button
  canvas.style.display = 'block';
  const downloadBtn = document.getElementById('id-card-download');

  if (downloadBtn) {
    downloadBtn.style.display = 'inline-flex';

    // ボタンクリック時の挙動をスマホ共有対応に書き換え
    downloadBtn.onclick = async () => {
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const fileName = `kagami_industrial_id_${name.trim()}.jpg`;

      const xmp = buildXmpMetadata({
        title: '加賀美インダストリアル 社員証',
        description: `加賀美インダストリアル社員証: ${name.trim()} / ${dept} / ${rank}`,
        creator: '加賀美インダストリアル',
        subject: '社員証, 加賀美インダストリアル, 非公式',
        keywords: '社員証,加賀美インダストリアル,非公式',
        custom: {
          EmployeeID: empId,
          EmployeeName: name.trim(),
          Department: dept,
          Rank: rank,
        },
      });
      const finalDataUrl = insertXmpIntoJpegDataUrl(jpegDataUrl, xmp);

      // --- 方法2: Web Share API (スマホ用) ---
      if (navigator.share) {
        try {
          // Base64をBlobに変換してファイルオブジェクトを作成
          const blob = await (await fetch(finalDataUrl)).blob();
          const file = new File([blob], fileName, {
            type: 'image/jpeg',
          });

          // 共有可能かチェックしてから実行
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: '加賀美インダストリアル 非公式 社員証',
              text: '加賀美インダストリアルの非公式社員証を発行しました！\n#加賀美インダストリアル非公式HP　#加賀美ハヤト',
            });
            return; // 共有に成功したらここで終了
          }
        } catch (err) {
          console.error('Share failed:', err);
          // ユーザーキャンセル以外のエラーの場合は従来のダウンロードへ
        }
      }

      // --- 方法1: 従来のファイルダウンロード (PC or Share未対応スマホ用) ---
      const link = document.createElement('a');
      link.download = fileName;
      link.href = finalDataUrl;
      link.click();
    };
  }

  if (genBtn) {
    genBtn.disabled = false;
    genBtn.innerText = '社員証を発行する';
  }
}

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function utf8ToBinaryString(value) {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return binary;
}

function buildXmpMetadata({ title, description, creator, subject, keywords, custom }) {
  const escapedTitle = escapeXml(title || '');
  const escapedDescription = escapeXml(description || '');
  const escapedCreator = escapeXml(creator || '');
  const escapedSubject = escapeXml(subject || '');
  const escapedKeywords = escapeXml(keywords || '');

  let customTags = '';
  if (custom) {
    Object.keys(custom).forEach((key) => {
      const value = custom[key];
      if (value != null) {
        const escapedKey = escapeXml(key);
        customTags += `<KI:${escapedKey}>${escapeXml(String(value))}</KI:${escapedKey}>`;
      }
    });
  }

  return '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>' + '<x:xmpmeta xmlns:x="adobe:ns:meta/">' + '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">' + '<rdf:Description rdf:about="" xmlns:xmp="http://ns.adobe.com/xap/1.0/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:KI="http://kagami-industrial.example.com/ns/">' + `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${escapedTitle}</rdf:li></rdf:Alt></dc:title>` + `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${escapedDescription}</rdf:li></rdf:Alt></dc:description>` + `<dc:creator><rdf:Seq><rdf:li>${escapedCreator}</rdf:li></rdf:Seq></dc:creator>` + `<dc:subject><rdf:Bag><rdf:li>${escapedSubject}</rdf:li></rdf:Bag></dc:subject>` + `<xmp:Label>${escapedKeywords}</xmp:Label>` + `<xmp:MetadataDate>${new Date().toISOString()}</xmp:MetadataDate>` + customTags + '</rdf:Description>' + '</rdf:RDF>' + '</x:xmpmeta>' + '<?xpacket end="w"?>';
}

function insertXmpIntoJpegDataUrl(jpegDataUrl, xmpXml) {
  const prefix = 'data:image/jpeg;base64,';
  if (!jpegDataUrl.startsWith(prefix)) {
    return jpegDataUrl;
  }

  const jpegBinary = atob(jpegDataUrl.slice(prefix.length));
  const xmpHeader = 'http://ns.adobe.com/xap/1.0/\x00';
  const xmpPayload = utf8ToBinaryString(xmpXml);
  const app1Body = xmpHeader + xmpPayload;
  const app1Length = app1Body.length + 2;
  const app1Segment = '\xFF\xE1' + String.fromCharCode((app1Length >> 8) & 0xff, app1Length & 0xff) + app1Body;

  const newJpegBinary = jpegBinary.slice(0, 2) + app1Segment + jpegBinary.slice(2);
  return prefix + btoa(newJpegBinary);
}

// Bind to form buttons
document.addEventListener('DOMContentLoaded', () => {
  // --- ▼ 追加：専用URLおよびキャッシュからの復帰処理 ▼ ---
  const urlParams = new URLSearchParams(window.location.search);
  const deskParam = urlParams.get('desk');

  if (deskParam) {
    try {
      // Base64を復号化してIDを取り出す
      const decodedId = atob(deskParam);
      if (decodedId.startsWith('KI-')) {
        localStorage.setItem('kagami_employee_id', decodedId);
        currentSessionId = decodedId;
        // URLのパラメータを消してスッキリさせる
        window.history.replaceState(null, null, window.location.pathname);
        console.log('専用URLから復帰しました:', currentSessionId);
      }
    } catch (e) {
      // 不正なURLパラメータの場合は無視
    }
  } else {
    // URLにパラメータがない場合は、ローカルストレージのキャッシュを確認
    const cachedId = localStorage.getItem('kagami_employee_id');
    if (cachedId) {
      currentSessionId = cachedId;
      console.log('キャッシュから復帰しました:', currentSessionId);
    }
  }
  // --- ▲ 追加ここまで ▲ ---

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
