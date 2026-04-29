/**
 * Utility: format a question's content for display,
 * normalizing LaTeX delimiters for towxml / wx-katex.
 *
 * @param {string} raw  - Raw LaTeX/Markdown content from DB
 * @returns {string}    - Processed content ready for renderer
 */
function formatMathContent(raw) {
  if (!raw) return '';
  // Ensure display math uses $$ ... $$
  let out = raw.replace(/\\\[(.+?)\\\]/gs, '$$$$$1$$$$');
  // Ensure inline math uses $ ... $
  out = out.replace(/\\\((.+?)\\\)/g, '$$$1$$');
  return out;
}

/**
 * Utility: truncate text to a given length with ellipsis.
 */
function truncate(str, maxLen = 60) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen) + '…';
}

/**
 * Utility: convert category identifier to Chinese label.
 */
const CATEGORY_LABELS = {
  number_theory:       '数论',
  algebra:             '代数',
  geometry:            '几何',
  combinatorics:       '组合',
  counting_probability:'计数与概率',
};

const CATEGORY_LABELS_EN = {
  number_theory:       'Number Theory',
  algebra:             'Algebra',
  geometry:            'Geometry',
  combinatorics:       'Combinatorics',
  counting_probability:'Counting & Probability',
};

function getCategoryLabel(cat, lang = 'cn') {
  const map = lang === 'cn' ? CATEGORY_LABELS : CATEGORY_LABELS_EN;
  return map[cat] || cat;
}

/**
 * Utility: return difficulty label (1-5 scale).
 */
function getDifficultyLabel(d) {
  const clamped = Math.min(5, Math.max(0, Math.round(d) || 0));
  return '★'.repeat(clamped) + '☆'.repeat(5 - clamped);
}

/**
 * Utility: format relative timestamp (e.g. "3分钟前").
 */
function timeAgo(value) {
  if (!value) return '';
  const now = Date.now();
  // Cloud DB returns Timestamp objects (with a .toDate() method) or Date objects or ISO strings
  let then;
  if (typeof value === 'string') {
    then = new Date(value).getTime();
  } else if (value instanceof Date) {
    then = value.getTime();
  } else if (value && typeof value.toDate === 'function') {
    then = value.toDate().getTime();
  } else {
    then = Number(value);
  }
  if (!then || isNaN(then)) return '';
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return new Date(then).toLocaleDateString('zh-CN');
}

/**
 * Utility: method tag display label.
 */
const METHOD_TAG_LABELS = {
  direct_computation:    '直接计算',
  pattern_recognition:   '规律发现',
  enumeration:           '暴力枚举',
  clever_construction:   '巧妙构造',
  complementary_counting:'互补计数',
  area_ratio:            '面积比',
  equation_setup:        '方程建模',
  python_verify:         'Python 验证',
  visual_diagram:        '画图秒杀',
};

function getMethodLabel(tag) {
  return METHOD_TAG_LABELS[tag] || tag;
}

/**
 * Utility: show a short success/failure toast.
 */
function showToast(title, icon = 'none', duration = 1500) {
  wx.showToast({ title, icon, duration });
}

/**
 * Utility: vibrate on correct answer (light).
 */
function vibrateCorrect() {
  wx.vibrateShort({ type: 'light' });
}

/**
 * Utility: vibrate on wrong answer (heavy).
 */
function vibrateWrong() {
  wx.vibrateShort({ type: 'heavy' });
}

module.exports = {
  formatMathContent,
  truncate,
  getCategoryLabel,
  getDifficultyLabel,
  timeAgo,
  getMethodLabel,
  showToast,
  vibrateCorrect,
  vibrateWrong,
  CATEGORY_LABELS,
  CATEGORY_LABELS_EN,
  METHOD_TAG_LABELS,
};
