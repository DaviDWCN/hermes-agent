// pages/question-bank/question-bank.js
const app = getApp();
const { getCategoryLabel, CATEGORY_LABELS, getDifficultyLabel } = require('../../utils/util');

const YEARS = [];
for (let y = 2023; y >= 2000; y--) YEARS.push(y);

const ALL_CATEGORIES = [
  { key: '', label: '全部' },
  ...Object.keys(CATEGORY_LABELS).map(k => ({ key: k, label: CATEGORY_LABELS[k] })),
];

Page({
  data: {
    questions: [],
    loading: false,
    hasMore: true,
    page: 1,
    pageSize: 20,

    // Filters
    selectedYear: '',
    selectedCategory: '',
    years: [{ value: '', label: '全部年份' }, ...YEARS.map(y => ({ value: y, label: String(y) }))],
    categories: ALL_CATEGORIES,
    language: 'cn',
  },

  onLoad(options) {
    const lang = app.globalData.language || 'cn';
    const year = options.year || app.globalData.selectedYear || '';
    const category = options.category || app.globalData.selectedCategory || '';
    this.setData({ language: lang, selectedYear: year ? Number(year) : '', selectedCategory: category });
    this._loadQuestions(true);
  },

  onShow() {
    const lang = app.globalData.language;
    if (lang !== this.data.language) {
      // Language was changed in another tab; re-map existing category labels
      const questions = this.data.questions.map(q => ({
        ...q,
        categoryLabels: (q.category || []).map(c => getCategoryLabel(c, lang)),
      }));
      this.setData({ language: lang, questions });
    }
  },

  _loadQuestions(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    wx.cloud.callFunction({
      name: 'getQuestions',
      data: {
        year: this.data.selectedYear || undefined,
        category: this.data.selectedCategory || undefined,
        page,
        pageSize: this.data.pageSize,
      },
      success: res => {
        const lang = this.data.language;
        const { questions = [], total } = res.result;
        const mapped = questions.map(q => ({
          ...q,
          categoryLabels: (q.category || []).map(c => getCategoryLabel(c, lang)),
          difficultyLabel: getDifficultyLabel(q.difficulty),
        }));
        const list = reset ? mapped : [...this.data.questions, ...mapped];
        this.setData({
          questions: list,
          loading: false,
          hasMore: list.length < total,
          page: page + 1,
        });
      },
      fail: err => {
        console.error('getQuestions failed:', err);
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败，请重试', icon: 'none' });
      },
      complete: () => {
        wx.stopPullDownRefresh();
      },
    });
  },

  onYearChange(e) {
    const year = this.data.years[e.detail.value].value;
    this.setData({ selectedYear: year });
    this._loadQuestions(true);
  },

  onCategoryTap(e) {
    const cat = e.currentTarget.dataset.cat;
    this.setData({ selectedCategory: cat });
    this._loadQuestions(true);
  },

  onQuestionTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/question-detail/question-detail?id=${id}` });
  },

  onLangToggle() {
    const lang = this.data.language === 'cn' ? 'en' : 'cn';
    app.switchLanguage(lang);
    // Re-map category labels for the new language
    const questions = this.data.questions.map(q => ({
      ...q,
      categoryLabels: (q.category || []).map(c => getCategoryLabel(c, lang)),
    }));
    this.setData({ language: lang, questions });
  },

  onReachBottom() {
    this._loadQuestions(false);
  },

  onPullDownRefresh() {
    // Ensure the spinner is always stopped, even if _loadQuestions returns early
    // (e.g. when loading is already in progress and the call is a no-op).
    if (this.data.loading) {
      wx.stopPullDownRefresh();
      return;
    }
    this._loadQuestions(true);
    // stopPullDownRefresh is also called in _loadQuestions complete callback for the normal path
  },
});
