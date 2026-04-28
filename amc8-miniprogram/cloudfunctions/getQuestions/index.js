// Cloud Function: getQuestions
// Queries the 'questions' collection with optional filters.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event) => {
  const {
    year,
    category,
    difficulty,
    page = 1,
    pageSize = 20,
    questionId,
  } = event;

  // Fetch a single question by ID
  if (questionId) {
    const res = await db.collection('questions').doc(questionId).get();
    return { code: 0, question: res.data };
  }

  // Build query conditions
  let query = {};
  if (year)       query.year = year;
  if (category)   query.category = _.elemMatch(_.eq(category));
  if (difficulty) query.difficulty = difficulty;

  const skip = (page - 1) * pageSize;

  const [countRes, dataRes] = await Promise.all([
    db.collection('questions').where(query).count(),
    db.collection('questions')
      .where(query)
      .orderBy('year', 'desc')
      .orderBy('problem_number', 'asc')
      .skip(skip)
      .limit(pageSize)
      .get(),
  ]);

  return {
    code: 0,
    total: countRes.total,
    page,
    pageSize,
    questions: dataRes.data,
  };
};
