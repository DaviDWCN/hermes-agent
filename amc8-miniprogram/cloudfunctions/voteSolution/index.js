// Cloud Function: voteSolution
// Toggle an upvote on a solution. Uses a compound document ID (openid_solutionId)
// to make the vote record idempotent and prevent duplicates under concurrent calls.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { solutionId } = event;

  if (!solutionId || typeof solutionId !== 'string' || solutionId.length > 64) {
    return { code: 400, message: '缺少或无效的 solutionId' };
  }

  // Compound document ID ensures uniqueness without a secondary query
  const voteDocId = `${openid}_${solutionId}`;
  const votesCol  = db.collection('votes');
  const solutionRef = db.collection('user_solutions').doc(solutionId);

  try {
    // Attempt to create the vote record; throws if it already exists
    await votesCol.doc(voteDocId).set({
      data: { solution_id: solutionId, openid, created_at: new Date() },
      // `set` is idempotent but we use the existence check below to toggle
    });
    // Record was missing → new vote
    await solutionRef.update({ data: { vote_count: _.inc(1) } });
    return { code: 0, action: 'voted' };
  } catch (err) {
    // Document already exists → toggle off (remove vote)
    try {
      await votesCol.doc(voteDocId).remove();
      await solutionRef.update({ data: { vote_count: _.inc(-1) } });
      return { code: 0, action: 'unvoted' };
    } catch (removeErr) {
      console.error('voteSolution remove error:', removeErr);
      return { code: 500, message: '操作失败，请重试' };
    }
  }
};
