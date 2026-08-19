/* ============================================
   KAGAMI INDUSTRIAL - ID Card Generator (English)
   英語版 社員証ジェネレーター
   ============================================ */

if (!window._supabase) {
  const url = 'https://vcsnquepttevlmhgyeje.supabase.co';
  const key = 'sb_publishable_S6iay_evMqvHMLsgThkWOQ_pX3ghA4R';
  window._supabase = supabase.createClient(url, key);
}

const logoImg = new Image();
logoImg.src = '../android-chrome-192x192.png';

const ID_CONFIG_EN = {
  width: 450,
  height: 280,
  departments: [
    'Heavy Industry Div. Industrial Robotics Dept.',
    'Heavy Industry Div. Construction Machinery Dept.',
    'Heavy Industry Div. Materials Research Dept.',
    'Hobby Div. Toy Development Section 1',
    'Hobby Div. Toy Development Section 2',
    'Hobby Div. Toy Development Section 3',
    'Hobby Div. Die-Cast Car Dept.',
    'Hobby Div. Plastic Model Kit Dept.',
    'Hobby Div. TCG Planning Dept.',
    'Entertainment Div. Stream Tech Dept.',
    'Entertainment Div. Audio Engineering Dept.',
    'SMC Lab Advanced Tech Research Unit',
    'SMC Lab Magic-Tech Integration Dept.',
    'Kagami Waterworks Pipeline Dept.',
    'Kagami Waterworks Facility Management',
    'Kagami Resort Development Promotion',
    'Kagami Resort Field Liaison Team',
    'Kagami Insurance Claims Assessment',
    'Kagami Insurance Weakness Protection Dept.',
    'Kagami Real Estate Property Inspection',
    'Kagami Real Estate Special Conditions Dept.',
    'Nishiazabu Ceremony Hall Production Dept.',
    'Kagami Holdings Convenience Retail Dept.',
    'Kagami Tech High Baseball Coaching Staff',
    'Executive Secretariat',
    'Presidential Direct Operations Team',
    'Quality Control Final Inspection Dept.',
    'Public Relations Virtual PR Dept.',
    'Indonesia Branch Infrastructure Dept.'
  ],
  ranks: [
    'Associate',
    'Senior Associate',
    'Assistant Manager',
    'Deputy Manager',
    'Manager',
    'Senior Manager',
    'General Manager',
    'Director',
    'Managing Director',
    'Executive VP',
    'Intern',
    'Advisor',
    'Technical Consultant'
  ]
};

async function generateUniqueEmployeeId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const { count, error: countError } = await _supabase.from('profiles').select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('Failed to get profile count:', countError);
    throw countError;
  }

  const sequenceNum = String((count || 0) + 1).padStart(4, '0');
  let isUnique = false;
  let empId = '';

  while (!isUnique) {
    let randomStr = '';
    for (let i = 0; i < 4; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    empId = `KI-${sequenceNum}-${randomStr}`;

    const { data, error } = await _supabase.from('profiles').select('player_id').eq('player_id', empId);
    if (error) {
      console.error('Duplicate ID check failed:', error);
      throw error;
    }
    if (data.length === 0) {
      isUnique = true;
    }
  }

  return empId;
}

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

let uploadedPhoto = null;

document.getElementById('employee-photo').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      uploadedPhoto = img;
      const previewContainer = document.getElementById('photo-preview-container');
      const previewImg = document.getElementById('photo-preview-img');
      previewImg.src = event.target.result;
      previewContainer.style.display = 'block';
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
});

let currentSessionId = null;
let currentSessionName = '';
let currentSessionReg = null;

async function generateIdCard(name) {
  if (!name || !name.trim()) {
    alert('Please enter your name.');
    return;
  }

  const genBtn = document.getElementById('generate-id-btn');
  if (genBtn) {
    genBtn.disabled = true;
    genBtn.innerText = 'Generating ID Card...';
  }

  const presidentNames = ['加賀美ハヤト', '加賀美隼人', '加賀美　ハヤト', '加賀美　隼人', 'Hayato Kagami', 'HAYATO KAGAMI', 'hayato kagami', 'President Kagami'];
  const isPresident = presidentNames.includes(name.trim());

  const regChoiceObj = document.querySelector('input[name="registration-choice"]:checked');
  const isRegistered = regChoiceObj ? regChoiceObj.value === 'yes' : false;

  const dept = isPresident ? 'Kagami Industrial Headquarters' : getRandomItem(ID_CONFIG_EN.departments);
  const rank = isPresident ? 'President & CEO' : getRandomItem(ID_CONFIG_EN.ranks);

  if (!currentSessionId || currentSessionReg !== isRegistered) {
    if (isPresident) {
      currentSessionId = 'KI-0001-BOSS';
    } else if (isRegistered) {
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
        alert('Failed to register employee ID. Please try again.');
        if (genBtn) {
          genBtn.disabled = false;
          genBtn.innerText = 'Generate ID Card';
        }
        return;
      }
    } else {
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      currentSessionId = `KI-GUEST-${randomStr}`;
      localStorage.removeItem('kagami_employee_id');
    }

    currentSessionName = name.trim();
    currentSessionReg = isRegistered;
  } else {
    if (isRegistered && currentSessionName !== name.trim() && !isPresident) {
      try {
        const { error: updateError } = await _supabase.from('profiles').update({ username: name.trim() }).eq('player_id', currentSessionId);
        if (updateError) throw updateError;
        currentSessionName = name.trim();
      } catch (err) {
        console.error(err);
        alert('Failed to update name in database.');
        if (genBtn) {
          genBtn.disabled = false;
          genBtn.innerText = 'Generate ID Card';
        }
        return;
      }
    }
  }

  const empId = currentSessionId;
  const canvas = document.getElementById('id-card-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = ID_CONFIG_EN.width * 2;
  canvas.height = ID_CONFIG_EN.height * 2;
  canvas.style.width = ID_CONFIG_EN.width + 'px';
  canvas.style.height = ID_CONFIG_EN.height + 'px';
  ctx.scale(2, 2);

  const w = ID_CONFIG_EN.width;
  const h = ID_CONFIG_EN.height;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, w, h);
  if (isPresident) {
    bgGrad.addColorStop(0, '#550000');
    bgGrad.addColorStop(1, '#7e1717');
  } else {
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
  ctx.fillRect(0, h - 3, w, 3);

  // Side stripe
  ctx.fillStyle = 'rgba(200, 166, 94, 0.1)';
  ctx.fillRect(0, 0, 6, h);

  // Header banner
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 5, w, 50);

  if (logoImg.complete) {
    ctx.drawImage(logoImg, 15, 15, 32, 32);
  } else {
    logoImg.onload = () => {
      ctx.drawImage(logoImg, 15, 15, 32, 32);
    };
  }

  // Company name
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '600 13px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('KAGAMI INDUSTRIAL', 56, 25);

  ctx.fillStyle = '#C8A65E';
  ctx.font = '500 8px Montserrat, sans-serif';
  ctx.fillText('KAGAMI INDUSTRIAL INC.', 56, 42);

  // Labels
  ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
  ctx.font = '600 9px Montserrat, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('EMPLOYEE ID CARD', w - 20, 30);

  ctx.fillStyle = 'rgba(200, 166, 94, 0.5)';
  ctx.font = '500 7px Montserrat, sans-serif';
  ctx.fillText('UNOFFICIAL / FANMADE', w - 20, 42);

  // Photo
  const photoX = 20;
  const photoY = 70;
  const photoW = 100;
  const photoH = 120;

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(photoX, photoY, photoW, photoH);

  if (uploadedPhoto) {
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

    ctx.save();
    ctx.beginPath();
    ctx.rect(photoX, photoY, photoW, photoH);
    ctx.clip();
    ctx.drawImage(img, sx, sy, sWidth, sHeight, photoX, photoY, photoW, photoH);
    ctx.restore();
  } else {
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

  ctx.strokeStyle = 'rgba(200, 166, 94, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(photoX, photoY, photoW, photoH);

  // Employee Data
  const dataX = 140;

  ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
  ctx.font = '500 8px Montserrat, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('NAME', dataX, 82);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 18px Montserrat, sans-serif';
  ctx.fillText(name.trim(), dataX, 106);

  ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
  ctx.font = '500 8px Montserrat, sans-serif';
  ctx.fillText('DEPARTMENT', dataX, 132);

  ctx.fillStyle = '#E5E5E5';
  ctx.font = '500 10.5px Montserrat, sans-serif';
  ctx.fillText(dept, dataX, 150);

  ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
  ctx.font = '500 8px Montserrat, sans-serif';
  ctx.fillText('RANK / TITLE', dataX, 175);

  ctx.fillStyle = '#E5E5E5';
  ctx.font = '500 11px Montserrat, sans-serif';
  ctx.fillText(rank, dataX, 193);

  ctx.fillStyle = 'rgba(200, 166, 94, 0.7)';
  ctx.font = '500 8px Montserrat, sans-serif';
  ctx.fillText('EMPLOYEE ID', dataX, 218);

  ctx.fillStyle = '#C8A65E';
  ctx.font = '700 13px Montserrat, sans-serif';
  ctx.fillText(empId, dataX, 236);

  // QR Deco
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

  // Lines
  ctx.strokeStyle = 'rgba(200, 166, 94, 0.05)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, 55);
  ctx.lineTo(w * 0.3, h);
  ctx.moveTo(0, h * 0.6);
  ctx.lineTo(w, h * 0.6);
  ctx.stroke();

  // Show
  canvas.style.display = 'block';
  const downloadBtn = document.getElementById('id-card-download');

  if (downloadBtn) {
    downloadBtn.style.display = 'inline-flex';
    downloadBtn.onclick = async () => {
      const jpegDataUrl = canvas.toDataURL('image/jpeg', 1.0);
      const fileName = `kagami_industrial_id_${name.trim()}.jpg`;

      if (navigator.share) {
        try {
          const blob = await (await fetch(jpegDataUrl)).blob();
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Kagami Industrial Unofficial Employee ID',
              text: 'Issued my official Kagami Industrial fan employee badge!\n#KagamiIndustrial #HayatoKagami',
            });
            return;
          }
        } catch (err) {
          console.error('Share failed:', err);
        }
      }

      const link = document.createElement('a');
      link.download = fileName;
      link.href = jpegDataUrl;
      link.click();
    };
  }

  if (genBtn) {
    genBtn.disabled = false;
    genBtn.innerText = 'Generate ID Card';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const deskParam = urlParams.get('desk');

  if (deskParam) {
    try {
      const decodedId = atob(deskParam);
      if (decodedId.startsWith('KI-')) {
        localStorage.setItem('kagami_employee_id', decodedId);
        currentSessionId = decodedId;
        window.history.replaceState(null, null, window.location.pathname);
      }
    } catch (e) {}
  } else {
    const cachedId = localStorage.getItem('kagami_employee_id');
    if (cachedId) {
      currentSessionId = cachedId;
    }
  }

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
