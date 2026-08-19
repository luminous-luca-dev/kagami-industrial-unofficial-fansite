/* ============================================
   KAGAMI INDUSTRIAL - Language Switcher Logic
   言語切替ロジック
   ============================================ */

/**
 * 現在ページに対応する他言語版URLを生成する
 * @param {'ja'|'en'} targetLang
 * @returns {string} URL
 */
export function getAltLangUrl(targetLang) {
  const path = window.location.pathname;
  // en/ 配下かどうか
  const isEnPage = /\/en(\/|$)/.test(path);
  // ファイル名（末尾スラッシュ or index.html → index.html）
  const filename = path.split('/').filter(Boolean).pop() || 'index.html';
  const page = filename.endsWith('.html') ? filename : filename + '/index.html';

  if (targetLang === 'en' && !isEnPage) {
    // ルートからen/へ
    return '/en/' + page;
  } else if (targetLang === 'ja' && isEnPage) {
    // en/からルートへ
    return '/' + page;
  }
  return '#';
}

/**
 * 現在ページの言語を返す
 * @returns {'ja'|'en'}
 */
export function getCurrentLang() {
  return /\/en(\/|$)/.test(window.location.pathname) ? 'en' : 'ja';
}

/**
 * 言語切替 UI を初期化する
 */
export function initLangSwitcher() {
  const currentLang = getCurrentLang();

  // ===== PC ドロップダウン =====
  const switcher = document.querySelector('.lang-switcher');
  const toggle = document.querySelector('.lang-switcher__toggle');
  const dropdown = document.querySelector('.lang-switcher__dropdown');

  if (switcher && toggle && dropdown) {
    // アクティブ言語をマーク
    dropdown.querySelectorAll('.lang-switcher__item').forEach((item) => {
      if (item.dataset.lang === currentLang) {
        item.classList.add('active');
      }
    });

    // hrefを現在ページに合わせて設定
    dropdown.querySelectorAll('.lang-switcher__item').forEach((item) => {
      const lang = item.dataset.lang;
      if (lang !== currentLang) {
        item.href = getAltLangUrl(lang);
      } else {
        item.href = '#';
        item.addEventListener('click', (e) => e.preventDefault());
      }
    });

    // ドロップダウン開閉
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      switcher.classList.toggle('open');
    });

    toggle.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      switcher.classList.toggle('open');
    }, { passive: false });

    // 外クリックで閉じる
    document.addEventListener('click', () => {
      switcher.classList.remove('open');
    });
  }

  // ===== モバイル 言語切替 =====
  document.querySelectorAll('.mobile-lang-switcher__item').forEach((item) => {
    const lang = item.dataset.lang;
    if (lang === currentLang) {
      item.classList.add('active');
      item.href = '#';
      item.addEventListener('click', (e) => e.preventDefault());
    } else {
      item.href = getAltLangUrl(lang);
    }
  });
}
