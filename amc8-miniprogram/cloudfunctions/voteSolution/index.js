// Cloud Function: voteSolution
// Toggle an upvote on a solution. Prevents duplicate votes.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { solutionId } = event;

  if (!solutionId) return { code: 400, message: '缺少 solutionId' };

  const votesCol = db.collection('votes');

  // Check if user already voted
  const existing = await votesCol
    .where({ solution_id: solutionId, openid })
    .limit(1)
    .get();

  const solutionRef = db.collection('user_solutions').doc(solutionId);

  if (existing.data.length > 0) {
    // Already voted → remove vote (toggle off)
    await votesCol.doc(existing.data[0]._id).remove();
    await solutionRef.update({ data: { vote_count: _.inc(-1) } });
    return { code: 0, action: 'unvoted' };
  } else {
    // New vote → add record and increment counter
    await votesCol.add({ data: { solution_id: solutionId, openid, created_at: new Date() } });
    await solutionRef.update({ data: { vote_count: _.inc(1) } });
    return { code: 0, action: 'voted' };
  }
};
