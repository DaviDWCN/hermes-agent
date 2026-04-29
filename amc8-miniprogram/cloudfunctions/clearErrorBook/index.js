// Cloud Function: clearErrorBook
// Deletes all error book entries for the current user in a single server-side operation,
// avoiding N client→cloud round trips that would occur when removing entries one by one.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  // Fetch all entries for this user
  const res = await db.collection('error_book').where({ openid }).get();
  if (res.data.length === 0) {
    return { code: 0, removed: 0 };
  }

  // Delete all in parallel
  const results = await Promise.allSettled(
    res.data.map(e => db.collection('error_book').doc(e._id).remove())
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.length - succeeded;

  return { code: 0, removed: succeeded, failed };
};
