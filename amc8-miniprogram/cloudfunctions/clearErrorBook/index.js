// Cloud Function: clearErrorBook
// Deletes all error book entries for the current user in a single server-side operation,
// avoiding N client→cloud round trips that would occur when removing entries one by one.
// Paginates to handle users with >100 entries (server SDK .get() hard limit is 100).

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const PAGE_LIMIT = 100;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  let totalRemoved = 0;
  let totalFailed = 0;
  const MAX_ITERATIONS = 50; // safety cap: 50 × 100 = 5000 entries max

  // Loop until no more records remain (handles >100 entries)
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const res = await db.collection('error_book')
      .where({ openid })
      .limit(PAGE_LIMIT)
      .get();

    if (res.data.length === 0) break;

    const results = await Promise.allSettled(
      res.data.map(e => db.collection('error_book').doc(e._id).remove())
    );

    totalRemoved += results.filter(r => r.status === 'fulfilled').length;
    totalFailed  += results.filter(r => r.status === 'rejected').length;

    // If some deletes failed, stop to avoid an infinite loop on stuck records
    if (totalFailed > 0) break;

    if (i === MAX_ITERATIONS - 1) {
      console.warn('clearErrorBook: reached safety iteration limit; some records may remain');
    }
  }

  return { code: 0, removed: totalRemoved, failed: totalFailed };
};
