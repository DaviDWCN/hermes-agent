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

  async _loadErrorBook() {
    this.setData({ loading: true });
    const db = wx.cloud.database();
    try {
      // Get error book entries
      const ebRes = await db.collection('error_book')
        .orderBy('added_at', 'desc')
        .get();

      if (ebRes.data.length === 0) {
        this.setData({ questions: [], loading: false });
        return;
      }

      const qIds = ebRes.data.map(e => e.question_id);

      // Fetch question details (batch, up to 20)
      const questions = [];
      for (let i = 0; i < qIds.length; i += 20) {
        const batch = qIds.slice(i, i + 20);
        const qRes = await db.collection('questions')
          .where({ _id: db.command.in(batch) })
          .get();
        questions.push(...qRes.data);
      }

      // Maintain error-book order
      const qMap = {};
      questions.forEach(q => { qMap[q._id] = q; });
      const ordered = ebRes.data
        .map(e => qMap[e.question_id])
        .filter(Boolean)
        .map(q => ({ ...q, categoryLabel: getCategoryLabel(q.category?.[0] || '', this.data.language) }));

      this.setData({ questions: ordered, loading: false });
    } catch (err) {
      console.error(err);
      this.setData({ loading: false });
    }
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
        });
      },
    });
  },

  onClearAll() {
    if (this.data.questions.length === 0) return;
    wx.showModal({
      title: '清空错题本',
      content: '确定清空所有错题记录吗？',
      success: async res => {
        if (!res.confirm) return;
        const db = wx.cloud.database();
        const ebRes = await db.collection('error_book').get();
        await Promise.all(ebRes.data.map(e => db.collection('error_book').doc(e._id).remove()));
        this.setData({ questions: [] });
        showToast('🎉 错题本已清空！', 'success');
      },
    });
  },

  onLangToggle() {
    const lang = this.data.language === 'cn' ? 'en' : 'cn';
    app.switchLanguage(lang);
    this.setData({ language: lang });
  },
});
