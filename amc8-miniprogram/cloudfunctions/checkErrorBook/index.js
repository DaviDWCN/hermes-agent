// Cloud Function: checkErrorBook
// Returns whether a specific question is in the current user's error book.
// Must run server-side so openid comes from wxContext, not client input,
// and so it can read documents created by cloud functions, which lack the
// `_openid` field that the client-side SDK auto-filters by.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { questionId } = event;

  if (!questionId || typeof questionId !== 'string' || questionId.length > 64) {
    return { code: 400, message: '缺少或无效的 questionId' };
  }

  const res = await db
    .collection('error_book')
    .where({ openid, question_id: questionId })
    .limit(1)
    .get();

  return { code: 0, inBook: res.data.length > 0 };
};
