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

  // Loop until no more records remain (handles >100 entries)
  while (true) { // eslint-disable-line no-constant-condition
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
  }

  return { code: 0, removed: totalRemoved, failed: totalFailed };
};
