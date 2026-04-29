// pages/submit-solution/submit-solution.js
const app = getApp();
const { showToast, METHOD_TAG_LABELS } = require('../../utils/util');

const METHOD_TAGS = Object.keys(METHOD_TAG_LABELS).map(k => ({
  key: k,
  label: METHOD_TAG_LABELS[k],
}));

const MAX_IMAGES = 3;

Page({
  data: {
    questionId: null,
    question: null,
    language: 'cn',

    text: '',
    imgList: [],
    selectedMethodTag: '',
    methodTags: METHOD_TAGS,

    submitting: false,
    textLength: 0,
    MAX_TEXT: 2000,
    maxImages: MAX_IMAGES,

    // Math toolbar shortcuts
    mathShortcuts: [
      { label: '分数', template: '\\frac{}{}' },
      { label: '根号', template: '\\sqrt{}' },
      { label: '求和', template: '\\sum_{}^{}' },
      { label: '积分', template: '\\int_{}^{}' },
      { label: '上标', template: '^{}' },
      { label: '下标', template: '_{}' },
      { label: '向量', template: '\\vec{}' },
      { label: '角度', template: '\\angle' },
      { label: '约等', template: '\\approx' },
      { label: '无穷', template: '\\infty' },
      { label: '∈', template: '\\in' },
      { label: '∀', template: '\\forall' },
    ],
  },

  onLoad(options) {
    const { questionId } = options;
    if (!questionId) { wx.navigateBack(); return; }
    this.setData({ questionId, language: app.globalData.language });
    this._loadQuestion(questionId);
  },

  _loadQuestion(id) {
    wx.cloud.callFunction({
      name: 'getQuestions',
      data: { questionId: id },
      success: res => this.setData({ question: res.result.question }),
      fail: () => {},
    });
  },

  onTextInput(e) {
    const text = e.detail.value;
    this.setData({ text, textLength: text.length });
  },

  onMethodTagTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ selectedMethodTag: key === this.data.selectedMethodTag ? '' : key });
  },

  onMathShortcutTap(e) {
    const tpl = e.currentTarget.dataset.tpl;
    const newText = this.data.text + ' $' + tpl + '$ ';
    this.setData({ text: newText, textLength: newText.length });
  },

  onChooseImage() {
    if (this.data.imgList.length >= MAX_IMAGES) {
      showToast(`最多上传${MAX_IMAGES}张图片`);
      return;
    }
    wx.chooseMedia({
      count: MAX_IMAGES - this.data.imgList.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: res => {
        const localPaths = res.tempFiles.map(f => f.tempFilePath);
        this.setData({ imgList: [...this.data.imgList, ...localPaths] });
      },
    });
  },

  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const imgList = [...this.data.imgList];
    imgList.splice(idx, 1);
    this.setData({ imgList });
  },

  async onSubmit() {
    const { text, imgList, selectedMethodTag, questionId } = this.data;
    if (!text.trim()) { showToast('请填写解题思路'); return; }
    if (this.data.submitting) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中…', mask: true });

    try {
      // Upload images first
      const uploadedUrls = [];
      for (const localPath of imgList) {
        // Extract extension from local temp path, ignoring any query string
        const basename = localPath.split('/').pop().split('?')[0];
        const dotIdx = basename.lastIndexOf('.');
        const ext = dotIdx !== -1 ? basename.slice(dotIdx + 1).toLowerCase() || 'jpg' : 'jpg';
        const cloudPath = `solutions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: localPath });
        uploadedUrls.push(uploadRes.fileID);
      }

      // Get user info
      let nickname = '匿名用户';
      let avatarUrl = '';
      try {
        const info = await new Promise((resolve, reject) =>
          wx.getUserProfile({ desc: '用于展示解法作者信息', success: resolve, fail: reject }));
        nickname = info.userInfo.nickName;
        avatarUrl = info.userInfo.avatarUrl;
      } catch (_) {}

      // Call cloud function
      const res = await new Promise((resolve, reject) =>
        wx.cloud.callFunction({
          name: 'submitSolution',
          data: { questionId, text, imgList: uploadedUrls, methodTag: selectedMethodTag, nickname, avatarUrl },
          success: resolve,
          fail: reject,
        }));

      wx.hideLoading();

      if (res.result.code === 0) {
        showToast('🎉 提交成功！', 'success', 2000);
        setTimeout(() => wx.navigateBack(), 1800);
      } else {
        showToast(res.result.message || '提交失败');
      }
    } catch (err) {
      wx.hideLoading();
      showToast('提交失败，请重试');
      console.error(err);
    } finally {
      this.setData({ submitting: false });
    }
  },
});
