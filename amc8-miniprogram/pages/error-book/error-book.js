// pages/error-book/error-book.js
const app = getApp();
const { getCategoryLabel, showToast } = require('../../utils/util');

Page({
  data: {
    questions: [],
    loading: true,
    language: 'cn',
  },

  onLoad() {
    this.setData({ language: app.globalData.language });
    this._loadErrorBook();
  },

  onShow() {
    this._loadErrorBook();
  },

  _loadErrorBook() {
    this.setData({ loading: true });
    const lang = this.data.language;
    wx.cloud.callFunction({
      name: 'getErrorBook',
      data: {},
      success: res => {
        if (res.result && res.result.code === 0) {
          const questions = (res.result.questions || []).map(q => ({
            ...q,
            categoryLabel: getCategoryLabel(q.category?.[0] || '', lang),
          }));
          this.setData({ questions, loading: false });
        } else {
          this.setData({ loading: false });
        }
      },
      fail: err => {
        console.error('getErrorBook failed:', err);
        this.setData({ loading: false });
      },
    });
  },

  onQuestionTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/question-detail/question-detail?id=${id}` });
  },

  onRemove(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '移除错题',
      content: '确定从错题本中移除该题目吗？',
      success: res => {
        if (!res.confirm) return;
        wx.cloud.callFunction({
          name: 'updateErrorBook',
          data: { questionId: id, action: 'remove' },
          success: () => {
            showToast('已移除');
            this.setData({ questions: this.data.questions.filter(q => q._id !== id) });
          },
          fail: () => showToast('移除失败，请重试'),
        });
      },
    });
  },

  onClearAll() {
    if (this.data.questions.length === 0) return;
    wx.showModal({
      title: '清空错题本',
      content: '确定清空所有错题记录吗？',
      success: res => {
        if (!res.confirm) return;
        wx.showLoading({ title: '清空中…', mask: true });
        wx.cloud.callFunction({
          name: 'clearErrorBook',
          data: {},
          success: result => {
            wx.hideLoading();
            const { removed = 0, failed = 0 } = result.result || {};
            if (failed > 0) {
              showToast(`已清空 ${removed} 条，${failed} 条清除失败`);
              // Reload to accurately reflect what remains in the DB
              this._loadErrorBook();
            } else {
              showToast('🎉 错题本已清空！', 'success');
              this.setData({ questions: [] });
            }
          },
          fail: () => {
            wx.hideLoading();
            showToast('清空失败，请重试');
          },
        });
      },
    });
  },

  onLangToggle() {
    const lang = this.data.language === 'cn' ? 'en' : 'cn';
    app.switchLanguage(lang);
    this.setData({ language: lang });
    // Re-map category labels for the new language
    const questions = this.data.questions.map(q => ({
      ...q,
      categoryLabel: getCategoryLabel(q.category?.[0] || '', lang),
    }));
    this.setData({ questions });
  },
});

