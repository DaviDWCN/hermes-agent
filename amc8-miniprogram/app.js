// AMC 8 Assistant Mini Program - App Entry Point
App({
  onLaunch() {
    // Initialize cloud development
    if (!wx.cloud) {
      console.error('Please use WeChat base library 2.2.3 or above for cloud development.');
      return;
    }

    wx.cloud.init({
      env: 'amc8-assistant-prod', // Replace with your Cloud Environment ID
      traceUser: true,
    });

    // Restore language preference from local storage
    try {
      const saved = wx.getStorageSync('lang');
      if (saved === 'en' || saved === 'cn') {
        this.globalData.language = saved;
      }
    } catch (e) {
      console.warn('Failed to restore language preference:', e);
    }

    this._initUserSession();
  },

  _initUserSession() {
    wx.cloud.callFunction({
      name: 'getUserStats',
      data: {},
      success: res => {
        if (res.result && res.result.userStats) {
          this.globalData.userStats = res.result.userStats;
        }
      },
      fail: err => {
        console.warn('getUserStats failed (first launch is expected):', err);
      },
    });
  },

  globalData: {
    userInfo: null,
    userStats: {
      totalSolutions: 0,
      totalVotes: 0,
      errorBookCount: 0,
      badges: [],
    },
    // Active language: 'en' | 'cn'
    language: 'cn',
    // Active year filter
    selectedYear: null,
    // Active category filter
    selectedCategory: null,
  },

  // Helper: switch language globally and persist to storage
  switchLanguage(lang) {
    this.globalData.language = lang;
    try { wx.setStorageSync('lang', lang); } catch (_) {}
    // Pages listen to this via onShow or custom event bus
  },
});
