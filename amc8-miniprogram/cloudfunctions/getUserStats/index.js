// Cloud Function: getUserStats
// Returns aggregated stats for the current user.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const $ = db.command.aggregate;

const BADGES = [
  { id: 'solver_10',    name: '解题新星',   desc: '累计分享10条解法', threshold: 10, field: 'totalSolutions' },
  { id: 'solver_50',    name: '解题达人',   desc: '累计分享50条解法', threshold: 50, field: 'totalSolutions' },
  { id: 'solver_100',   name: '解题大师',   desc: '累计分享100条解法',threshold: 100, field: 'totalSolutions' },
  { id: 'votes_50',     name: '智慧之星',   desc: '累计获得50次点赞', threshold: 50, field: 'totalVotes' },
  { id: 'votes_200',    name: '数学领袖',   desc: '累计获得200次点赞',threshold: 200, field: 'totalVotes' },
  { id: 'error_clear',  name: '错题清零',   desc: '错题本清空过一次',  threshold: 1, field: 'errorCleared' },
];

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // Use aggregation to count solutions and sum votes in one pass,
  // avoiding the 100-record limit of .get() for vote summation.
  const [aggRes, errorBookRes] = await Promise.all([
    db.collection('user_solutions')
      .aggregate()
      .match({ 'user_info.openid': openid })
      .group({
        _id: null,
        totalSolutions: $.sum(1),
        totalVotes: $.sum('$vote_count'),
      })
      .end(),
    db.collection('error_book').where({ openid }).count(),
  ]);

  const agg = aggRes.list[0] || { totalSolutions: 0, totalVotes: 0 };
  const totalSolutions = agg.totalSolutions || 0;
  const totalVotes = Math.max(0, agg.totalVotes || 0);
  const errorBookCount = errorBookRes.total;

  // Compute earned badges
  const stats = { totalSolutions, totalVotes, errorCleared: 0 };
  const earnedBadges = BADGES.filter(b => (stats[b.field] || 0) >= b.threshold);

  return {
    code: 0,
    userStats: {
      openid,
      totalSolutions,
      totalVotes,
      errorBookCount,
      badges: earnedBadges,
    },
  };
};
