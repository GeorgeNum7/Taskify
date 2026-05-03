const resources = {
  en: {},
  zh: {}
};

async function loadLocales() {
  const enRes = await fetch('/static/locales/en.json');
  const zhRes = await fetch('/static/locales/zh.json');
  resources.en = await enRes.json();
  resources.zh = await zhRes.json();
}

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
  const keys = key.split('.');
  let value = resources[currentLang];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el.tagName === 'INPUT' && el.type === 'submit') {
      el.value = t(key);
    } else {
      el.textContent = t(key);
    }
  });

  // 更新Cookie Banner
  const cookieMsg = document.getElementById('cookie-msg');
  const cookiePolicyLink = document.getElementById('cookie-policy-link');
  const acceptBtn = document.getElementById('accept-btn');
  const declineBtn = document.getElementById('decline-btn');

  if (cookieMsg) cookieMsg.textContent = t('cookie.text');
  if (cookiePolicyLink) cookiePolicyLink.textContent = t('cookie.policy');
  if (acceptBtn) acceptBtn.textContent = t('cookie.accept');
  if (declineBtn) declineBtn.textContent = t('cookie.decline');
}

function toggleLang() {
  currentLang = currentLang === 'en' ? 'zh' : 'en';
  localStorage.setItem('lang', currentLang);
  applyTranslations();
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = t('lang.toggle');
}

async function initI18n() {
  await loadLocales();
  applyTranslations();
  const btn = document.getElementById('lang-toggle');
  if (btn) {
    btn.textContent = t('lang.toggle');
    btn.addEventListener('click', toggleLang);
  }
}

document.addEventListener('DOMContentLoaded', initI18n);