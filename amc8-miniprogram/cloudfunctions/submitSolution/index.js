// Cloud Function: submitSolution
// Handles content safety check + insert into user_solutions.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { questionId, text, imgList = [], methodTag } = event;

  if (!questionId || !text) {
    return { code: 400, message: '缺少必要参数' };
  }

  // Content safety check via WeChat API
  try {
    const safetyResult = await cloud.openapi.security.msgSecCheck({
      content: text,
      scene: 2,
      version: 2,
      openid,
    });
    if (safetyResult.result && safetyResult.result.suggest !== 'pass') {
      return { code: 403, message: '内容包含违规信息，请修改后重新提交' };
    }
  } catch (err) {
    console.error('msgSecCheck error:', err);
    // Fail open for network errors, but log for manual review
  }

  // Insert solution document
  const now = new Date();
  const doc = {
    q_id: questionId,
    user_info: {
      openid,
      // nickname and avatar set from client side via userInfo permission
      nickname: event.nickname || '匿名用户',
      avatar_url: event.avatarUrl || '',
    },
    text,
    img_list: imgList,
    vote_count: 0,
    method_tag: methodTag || '',
    created_at: now,
    updated_at: now,
    status: 'published', // 'published' | 'hidden'
  };

  const res = await db.collection('user_solutions').add({ data: doc });

  return { code: 0, solutionId: res._id };
};
