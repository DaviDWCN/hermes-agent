// Cloud Function: updateErrorBook
// Add or remove a question from the user's error book.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { questionId, action } = event; // action: 'add' | 'remove'

  if (!questionId) return { code: 400, message: '缺少 questionId' };

  const col = db.collection('error_book');

  if (action === 'add') {
    // Upsert: avoid duplicates
    const existing = await col.where({ openid, question_id: questionId }).limit(1).get();
    if (existing.data.length === 0) {
      await col.add({ data: { openid, question_id: questionId, added_at: new Date() } });
    }
    return { code: 0, action: 'added' };
  } else if (action === 'remove') {
    const existing = await col.where({ openid, question_id: questionId }).limit(1).get();
    if (existing.data.length > 0) {
      await col.doc(existing.data[0]._id).remove();
    }
    return { code: 0, action: 'removed' };
  }

  return { code: 400, message: '无效的 action' };
};
