/* ============================================
   KAGAMI INDUSTRIAL - Main JavaScript
   共通ロジック・ナビゲーション・イースターエッグ
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initHeader();
  initScrollAnimations();
  initAccordions();
  initHiddenCommand();
  highlightActiveNav();
});

// キャプチャ段階で全ての通常リンクを強制遷移させるハンドラ（モバイルで別のリスナが preventDefault している場合のフォールバック）
// NOTE: removed aggressive capture-phase link fallback (caused side effects)
// Debug handlers: non-intrusively log touch/click on anchors to trace which handler prevents navigation.
document.addEventListener(
  'touchstart',
  (e) => {
    try {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      console.log('link-debug touchstart on', a.href || a.getAttribute('href'), 'defaultPrevented=', e.defaultPrevented);
    } catch (err) {
      console.error('link-debug touchstart error', err);
    }
  },
  { capture: true }
);

document.addEventListener(
  'click',
  (e) => {
    try {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      console.log('link-debug click on', a.href || a.getAttribute('href'), 'captureDefaultPrevented=', e.defaultPrevented);
      Promise.resolve().then(() => {
        console.log('link-debug post-click defaultPrevented=', e.defaultPrevented, 'target=', a.outerHTML);
      });
    } catch (err) {
      console.error('link-debug click error', err);
    }
  },
  { capture: true }
);

// Fallback: if a touchstart happened on a link but navigation didn't occur, navigate on touchend.
let __lastTouchAnchor = null;
document.addEventListener(
  'touchstart',
  (e) => {
    try {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      __lastTouchAnchor = a;
    } catch (err) {
      __lastTouchAnchor = null;
    }
  },
  { capture: true }
);

document.addEventListener(
  'touchend',
  (e) => {
    try {
      const a = __lastTouchAnchor && (__lastTouchAnchor.contains(e.target) || __lastTouchAnchor === e.target) ? __lastTouchAnchor : e.target && e.target.closest ? e.target.closest('a') : null;
      __lastTouchAnchor = null;
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || href.startsWith('javascript:')) return;
      // if the event or anchor was prevented elsewhere, do nothing
      if (e.defaultPrevented) return;
      // if link has target=_blank, open in new tab
      if (a.target === '_blank') {
        window.open(a.href, '_blank');
        return;
      }
      // finally navigate
      console.log('link-debug touchend navigating to', a.href);
      window.location.href = a.href;
    } catch (err) {
      console.error('link-debug touchend error', err);
    }
  },
  { passive: true }
);

/* ---------- Header & Navigation ---------- */
function initHeader() {
  const header = document.querySelector('.site-header');
  const hamburger = document.querySelector('.hamburger');
  const mobileOverlay = document.querySelector('.mobile-nav-overlay');

  // Scroll effect
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    });
  }

  // Hamburger menu
  if (hamburger && mobileOverlay) {
    const toggleMobileMenu = (e) => {
      if (e && e.cancelable) e.preventDefault();
      hamburger.classList.toggle('active');
      mobileOverlay.classList.toggle('active');
      document.body.style.overflow = mobileOverlay.classList.contains('active') ? 'hidden' : '';
    };

    hamburger.addEventListener('click', toggleMobileMenu);
    // touchstart support for mobile (prevent double click by allowing passive:false)
    hamburger.addEventListener('touchstart', toggleMobileMenu, {
      passive: false,
    });

    // Close on link click
    mobileOverlay.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }
}

/* ---------- Active Nav Highlight ---------- */
function highlightActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav__item a, .mobile-nav__list a').forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

/* ---------- Scroll Animations ---------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');
  if (!elements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.classList.add('visible');
          }, index * 100);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  elements.forEach((el) => observer.observe(el));
}

/* ---------- Accordions ---------- */
function initAccordions() {
  document.querySelectorAll('.accordion__header').forEach((header) => {
    header.addEventListener('click', () => {
      const accordion = header.parentElement;
      const body = accordion.querySelector('.accordion__body');
      const isActive = accordion.classList.contains('active');

      // Close all others in same group
      const group = accordion.closest('.accordion-group');
      if (group) {
        group.querySelectorAll('.accordion.active').forEach((openAcc) => {
          if (openAcc !== accordion) {
            openAcc.classList.remove('active');
            openAcc.querySelector('.accordion__body').style.maxHeight = '0';
          }
        });
      }

      accordion.classList.toggle('active');
      if (!isActive) {
        body.style.maxHeight = body.scrollHeight + 'px';
      } else {
        body.style.maxHeight = '0';
      }
    });
  });
}

/* ---------- Hidden Command (8810 / ハヤト) ---------- */
function initHiddenCommand() {
  let inputBuffer = '';
  const secretCode = '8810';

  document.addEventListener('keydown', (e) => {
    // Only track number keys
    if (/^\d$/.test(e.key)) {
      inputBuffer += e.key;
    } else {
      inputBuffer = '';
      return;
    }

    // Keep only last 4 characters
    if (inputBuffer.length > secretCode.length) {
      inputBuffer = inputBuffer.slice(-secretCode.length);
    }

    if (inputBuffer === secretCode) {
      inputBuffer = '';
      triggerGoldenSign();
    }
  });
}

function triggerGoldenSign() {
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = 'golden-sign-overlay';
  overlay.innerHTML = '<div class="golden-sign">加賀美隼人</div>';
  document.body.appendChild(overlay);

  // Create gold particles
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'gold-particle';
    particle.style.left = Math.random() * 100 + 'vw';
    particle.style.bottom = '-10px';
    particle.style.animationDuration = 1.5 + Math.random() * 2 + 's';
    particle.style.animationDelay = Math.random() * 0.5 + 's';
    particle.style.width = 3 + Math.random() * 8 + 'px';
    particle.style.height = particle.style.width;
    particle.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
    document.body.appendChild(particle);
  }

  // Activate
  requestAnimationFrame(() => {
    overlay.classList.add('active');
  });

  // Remove after animation
  setTimeout(() => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      document.querySelectorAll('.gold-particle').forEach((p) => p.remove());
    }, 500);
  }, 3000);

  // Close on click
  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    setTimeout(() => {
      overlay.remove();
      document.querySelectorAll('.gold-particle').forEach((p) => p.remove());
    }, 500);
  });
}

/* ---------- Smooth Scroll for Anchor Links ---------- */
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const target = document.querySelector(link.getAttribute('href'));
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

/* ---------- Counter Animation ---------- */
function animateCounters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const target = parseInt(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    const duration = 2000;
    const start = performance.now();

    function update(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(target * eased).toLocaleString() + suffix;
      if (progress < 1) requestAnimationFrame(update);
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
    observer.observe(el);
  });
}

// Initialize counters if they exist
if (document.querySelector('[data-count]')) {
  animateCounters();
}
