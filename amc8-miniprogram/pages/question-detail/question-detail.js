// pages/question-detail/question-detail.js
const app = getApp();
const { getCategoryLabel, getMethodLabel, timeAgo, vibrateCorrect, vibrateWrong, showToast } = require('../../utils/util');

Page({
  data: {
    question: null,
    loading: true,
    language: 'cn',

    // Answer interaction
    selectedOption: null,  // 'A'-'E'
    answered: false,
    isCorrect: false,

    // Solution Hub
    solutions: [],
    solutionSort: 'votes', // 'votes' | 'latest'
    solutionsLoading: false,
    solutionPage: 1,
    solutionHasMore: true,

    // UI state
    showOfficialSolution: false,
    inErrorBook: false,
  },

  onLoad(options) {
    const { id } = options;
    if (!id) { wx.navigateBack(); return; }
    this._questionId = id;
    this._voting = false;
    this.setData({ language: app.globalData.language });
    this._loadQuestion(id);
    this._checkErrorBook(id);
  },

  _loadQuestion(id) {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'getQuestions',
      data: { questionId: id },
      success: res => {
        const q = res.result && res.result.question;
        if (!q) {
          this.setData({ loading: false });
          wx.showToast({ title: '题目不存在', icon: 'none' });
          setTimeout(() => wx.navigateBack(), 1500);
          return;
        }
        const lang = this.data.language;
        const enriched = {
          ...q,
          categoryLabels: (q.category || []).map(c => getCategoryLabel(c, lang)),
          difficultyLabel: '★'.repeat(Math.min(5, q.difficulty || 0)) + '☆'.repeat(Math.max(0, 5 - (q.difficulty || 0))),
        };
        this.setData({ question: enriched, loading: false });
        wx.setNavigationBarTitle({ title: `${q.year} AMC 8 #${q.problem_number}` });
        this._loadSolutions(true);
      },
      fail: () => {
        this.setData({ loading: false });
        wx.showToast({ title: '加载失败', icon: 'none' });
      },
    });
  },

  _loadSolutions(reset = false) {
    if (this.data.solutionsLoading) return;
    const page = reset ? 1 : this.data.solutionPage;
    this.setData({ solutionsLoading: true });

    const db = wx.cloud.database();
    const sort = this.data.solutionSort === 'votes' ? 'vote_count' : 'created_at';

    db.collection('user_solutions')
      .where({ q_id: this._questionId, status: 'published' })
      .orderBy(sort, 'desc')
      .skip((page - 1) * 10)
      .limit(10)
      .get()
      .then(res => {
        const incoming = res.data.map(s => ({
          ...s,
          timeLabel: timeAgo(s.created_at),
          methodLabel: getMethodLabel(s.method_tag),
        }));
        const solutions = reset ? incoming : [...this.data.solutions, ...incoming];
        this.setData({
          solutions,
          solutionsLoading: false,
          solutionPage: page + 1,
          solutionHasMore: incoming.length === 10,
        });
      })
      .catch(() => this.setData({ solutionsLoading: false }));
  },

  _checkErrorBook(id) {
    wx.cloud.callFunction({
      name: 'checkErrorBook',
      data: { questionId: id },
      success: res => {
        if (res.result && res.result.code === 0) {
          this.setData({ inErrorBook: res.result.inBook });
        }
      },
      fail: () => {},
    });
  },

  onOptionTap(e) {
    if (this.data.answered) return;
    const option = e.currentTarget.dataset.option;
    const correct = this.data.question.answer;
    const isCorrect = option === correct;

    this.setData({ selectedOption: option, answered: true, isCorrect });

    if (isCorrect) {
      vibrateCorrect();
      showToast('🎉 回答正确！', 'success', 1500);
    } else {
      vibrateWrong();
      showToast('❌ 回答错误，查看解法吧', 'none', 2000);
      // Auto-add to error book
      this._toggleErrorBook(true);
    }
  },

  onToggleOfficialSolution() {
    this.setData({ showOfficialSolution: !this.data.showOfficialSolution });
  },

  onLangToggle() {
    const lang = this.data.language === 'cn' ? 'en' : 'cn';
    app.switchLanguage(lang);
    const q = this.data.question;
    if (q) {
      // Re-compute category labels for the new language
      this.setData({
        language: lang,
        'question.categoryLabels': (q.category || []).map(c => getCategoryLabel(c, lang)),
      });
    } else {
      this.setData({ language: lang });
    }
  },

  onSortChange(e) {
    const sort = e.currentTarget.dataset.sort;
    if (sort === this.data.solutionSort) return;
    this.setData({ solutionSort: sort });
    this._loadSolutions(true);
  },

  onVote(e) {
    if (this._voting) return;
    const solutionId = e.currentTarget.dataset.id;
    this._voting = true;
    wx.cloud.callFunction({
      name: 'voteSolution',
      data: { solutionId },
      success: res => {
        const { action } = res.result;
        // Update local vote count optimistically
        const solutions = this.data.solutions.map(s => {
          if (s._id === solutionId) {
            return {
              ...s,
              vote_count: s.vote_count + (action === 'voted' ? 1 : -1),
              voted: action === 'voted',
            };
          }
          return s;
        });
        this.setData({ solutions });
      },
      fail: () => showToast('点赞失败，请重试'),
      complete: () => { this._voting = false; },
    });
  },

  onSubmitSolution() {
    wx.navigateTo({ url: `/pages/submit-solution/submit-solution?questionId=${this._questionId}` });
  },

  onLoadMoreSolutions() {
    this._loadSolutions(false);
  },

  onToggleErrorBook() {
    this._toggleErrorBook(!this.data.inErrorBook);
  },

  _toggleErrorBook(add) {
    wx.cloud.callFunction({
      name: 'updateErrorBook',
      data: { questionId: this._questionId, action: add ? 'add' : 'remove' },
      success: () => {
        this.setData({ inErrorBook: add });
        showToast(add ? '已加入错题本 📚' : '已从错题本移除');
      },
    });
  },
});
