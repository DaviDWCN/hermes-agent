// Cloud Function: submitSolution
// Handles content safety check + insert into user_solutions.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const VALID_METHOD_TAGS = new Set([
  'direct_computation', 'pattern_recognition', 'enumeration',
  'clever_construction', 'complementary_counting', 'area_ratio',
  'equation_setup', 'python_verify', 'visual_diagram', '',
]);

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 2000;
const MAX_IMAGES = 3;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { questionId, text, imgList = [], methodTag = '' } = event;

  // Input validation
  if (!questionId || typeof questionId !== 'string' || questionId.length > 64) {
    return { code: 400, message: '缺少或无效的 questionId' };
  }
  if (!text || typeof text !== 'string') {
    return { code: 400, message: '请填写解题内容' };
  }
  const trimmedText = text.trim();
  if (trimmedText.length < MIN_TEXT_LENGTH) {
    return { code: 400, message: `解题内容至少需要 ${MIN_TEXT_LENGTH} 个字符` };
  }
  if (trimmedText.length > MAX_TEXT_LENGTH) {
    return { code: 400, message: `解题内容不能超过 ${MAX_TEXT_LENGTH} 个字符` };
  }
  if (!Array.isArray(imgList) || imgList.length > MAX_IMAGES) {
    return { code: 400, message: `最多上传 ${MAX_IMAGES} 张图片` };
  }
  if (!VALID_METHOD_TAGS.has(methodTag)) {
    return { code: 400, message: '无效的解题方法标签' };
  }

  // Content safety check via WeChat API
  try {
    const safetyResult = await cloud.openapi.security.msgSecCheck({
      content: trimmedText,
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
      nickname: typeof event.nickname === 'string' ? event.nickname.slice(0, 32) : '匿名用户',
      avatar_url: typeof event.avatarUrl === 'string' ? event.avatarUrl.slice(0, 512) : '',
    },
    text: trimmedText,
    img_list: imgList,
    vote_count: 0,
    method_tag: methodTag,
    created_at: now,
    updated_at: now,
    status: 'published', // 'published' | 'hidden'
  };

  const res = await db.collection('user_solutions').add({ data: doc });

  return { code: 0, solutionId: res._id };
};
