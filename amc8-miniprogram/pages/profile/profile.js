// pages/profile/profile.js
const app = getApp();

const BADGE_ICONS = {
  solver_10:   '⭐',
  solver_50:   '🌟',
  solver_100:  '🏆',
  votes_50:    '💡',
  votes_200:   '👑',
  error_clear: '📗',
};

Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    stats: { totalSolutions: 0, totalVotes: 0, errorBookCount: 0, badges: [] },
    mySolutions: [],
    badgeIcons: BADGE_ICONS,
    loading: true,
  },

  onLoad() {
    this._getUserInfo();
  },

  onShow() {
    this._loadStats();
  },

  _getUserInfo() {
    const cached = app.globalData.userInfo;
    if (cached) {
      this.setData({ userInfo: cached, hasUserInfo: true });
    }
  },

  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      app.globalData.userInfo = e.detail.userInfo;
      this.setData({ userInfo: e.detail.userInfo, hasUserInfo: true });
    }
  },

  _loadStats() {
    this.setData({ loading: true });
    wx.cloud.callFunction({
      name: 'getUserStats',
      data: {},
      success: res => {
        if (res.result.code === 0) {
          const stats = res.result.userStats;
          app.globalData.userStats = stats;
          this.setData({ stats, loading: false });
          this._loadMySolutions(stats.openid);
        }
      },
      fail: () => this.setData({ loading: false }),
    });
  },

  _loadMySolutions(openid) {
    const db = wx.cloud.database();
    db.collection('user_solutions')
      .where({ 'user_info.openid': openid })
      .orderBy('created_at', 'desc')
      .limit(10)
      .get()
      .then(res => this.setData({ mySolutions: res.data }))
      .catch(() => {});
  },

  onGoErrorBook() {
    wx.navigateTo({ url: '/pages/error-book/error-book' });
  },

  onSolutionTap(e) {
    const qId = e.currentTarget.dataset.qid;
    wx.navigateTo({ url: `/pages/question-detail/question-detail?id=${qId}` });
  },

  onShareApp() {
    wx.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage'] });
  },

  onShareAppMessage() {
    return {
      title: 'AMC 8 备考助手 — 免费多解法共享平台',
      path: '/pages/index/index',
    };
  },
});
