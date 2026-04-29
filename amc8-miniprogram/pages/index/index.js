// pages/index/index.js — Home Page
const app = getApp();
const { CATEGORY_LABELS } = require('../../utils/util');

const CATEGORY_ICONS = {
  number_theory:        '🔢',
  algebra:              '✏️',
  geometry:             '📐',
  combinatorics:        '🎲',
  counting_probability: '📊',
};

Page({
  data: {
    language: 'cn',
    categories: Object.keys(CATEGORY_LABELS).map(k => ({
      key: k,
      label: CATEGORY_LABELS[k],
      icon: CATEGORY_ICONS[k] || '📖',
    })),
    recentYears: [2023, 2022, 2021, 2020, 2019],
    stats: { totalQuestions: 0, totalSolutions: 0 },
  },

  onLoad() {
    this.setData({ language: app.globalData.language });
    this._loadStats();
  },

  onShow() {
    this.setData({ language: app.globalData.language });
  },

  _loadStats() {
    const db = wx.cloud.database();
    Promise.all([
      db.collection('questions').count(),
      db.collection('user_solutions').count(),
    ]).then(([qRes, sRes]) => {
      this.setData({
        'stats.totalQuestions': qRes.total,
        'stats.totalSolutions': sRes.total,
      });
    }).catch(() => {});
  },

  onCategoryTap(e) {
    const cat = e.currentTarget.dataset.cat;
    app.globalData.selectedCategory = cat;
    wx.navigateTo({ url: `/pages/question-bank/question-bank?category=${cat}` });
  },

  onYearTap(e) {
    const year = e.currentTarget.dataset.year;
    app.globalData.selectedYear = year;
    wx.navigateTo({ url: `/pages/question-bank/question-bank?year=${year}` });
  },

  onBrowseAll() {
    wx.switchTab({ url: '/pages/question-bank/question-bank' });
  },

  onAboutTap() {
    wx.showModal({
      title: '关于本小程序',
      content: '本小程序为个人公益项目，题目版权归 MAA（美国数学协会）所有。解析内容为社区共创，版权归原作者所有。如有侵权请联系我们。',
      showCancel: false,
    });
  },

  onComplaintTap() {
    wx.showModal({
      title: '版权投诉',
      content: '如发现侵权内容，请发送邮件至 dmca@amc8-helper.example.com，我们将在24小时内处理。',
      showCancel: false,
    });
  },
});
