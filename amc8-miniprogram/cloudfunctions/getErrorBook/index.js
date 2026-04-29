// Cloud Function: getErrorBook
// Returns error book entries for the current user, joined with question details.
// Running in a cloud function ensures openid is sourced from the server context,
// not from client input, preventing any cross-user data access.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const MAX_BATCH = 20;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // Fetch this user's error book entries, newest first
  const ebRes = await db
    .collection('error_book')
    .where({ openid })
    .orderBy('added_at', 'desc')
    .limit(100)
    .get();

  if (ebRes.data.length === 0) {
    return { code: 0, questions: [] };
  }

  const qIds = ebRes.data.map(e => e.question_id);

  // Batch-fetch question details (cloud DB 'in' supports up to 100 values)
  const questions = [];
  for (let i = 0; i < qIds.length; i += MAX_BATCH) {
    const batch = qIds.slice(i, i + MAX_BATCH);
    const qRes = await db
      .collection('questions')
      .where({ _id: _.in(batch) })
      .get();
    questions.push(...qRes.data);
  }

  // Restore error-book insertion order (newest first)
  const qMap = {};
  questions.forEach(q => { qMap[q._id] = q; });
  const ordered = ebRes.data
    .map(e => qMap[e.question_id])
    .filter(Boolean);

  return { code: 0, questions: ordered };
};
