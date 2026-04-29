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

  // Helper: switch language globally and broadcast event
  switchLanguage(lang) {
    this.globalData.language = lang;
    // Pages listen to this via onShow or custom event bus
  },
});
