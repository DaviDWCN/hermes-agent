// pages/question-bank/question-bank.js
const app = getApp();
const { getCategoryLabel, CATEGORY_LABELS } = require('../../utils/util');

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
    this.setData({ language: app.globalData.language });
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
        const { questions = [], total } = res.result;
        const list = reset ? questions : [...this.data.questions, ...questions];
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
    this.setData({ language: lang });
  },

  onReachBottom() {
    this._loadQuestions(false);
  },

  onPullDownRefresh() {
    this._loadQuestions(true);
    wx.stopPullDownRefresh();
  },
});
