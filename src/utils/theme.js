// 统一主题管理：替代分散在 main.js / Header.js / WorkAssistant.js 的主题逻辑
const STORAGE_KEY = 'theme';
const DARK_CLASS = 'dark';

function resolveAuto() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'auto';
}

export function getEffectiveTheme() {
  const stored = getStoredTheme();
  return stored === 'auto' ? resolveAuto() : stored;
}

export function applyTheme(mode) {
  const effective = mode === 'auto' ? resolveAuto() : mode;
  const html = document.documentElement;
  if (effective === 'dark') html.classList.add(DARK_CLASS);
  else html.classList.remove(DARK_CLASS);
  localStorage.setItem(STORAGE_KEY, mode);
  document.dispatchEvent(new CustomEvent('theme:change', { detail: { mode, effective } }));
}

export function setTheme(mode) {
  applyTheme(mode);
}

export function toggleTheme() {
  const current = getEffectiveTheme();
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

export function initTheme() {
  applyTheme(getStoredTheme());
  // 监听系统主题变化（仅 auto 模式生效）
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getStoredTheme() === 'auto') applyTheme('auto');
  });
}

export function onThemeChange(callback) {
  document.addEventListener('theme:change', (e) => callback(e.detail));
}

export function getThemeIcon() {
  return getEffectiveTheme() === 'dark' ? 'sun' : 'moon';
}
