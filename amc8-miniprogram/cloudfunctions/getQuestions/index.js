// Cloud Function: getQuestions
// Queries the 'questions' collection with optional filters.

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const VALID_CATEGORIES = new Set([
  'number_theory', 'algebra', 'geometry', 'combinatorics', 'counting_probability',
]);
const MIN_YEAR = 2000;
const MAX_YEAR = 2030;
const MAX_PAGE_SIZE = 50;

exports.main = async (event) => {
  const {
    year,
    category,
    difficulty,
    page = 1,
    questionId,
  } = event;

  // Normalize and cap pageSize
  const pageSize = Math.min(Math.max(1, parseInt(event.pageSize, 10) || 20), MAX_PAGE_SIZE);

  // Fetch a single question by ID
  if (questionId) {
    if (typeof questionId !== 'string' || questionId.length > 64) {
      return { code: 400, message: '无效的 questionId' };
    }
    const res = await db.collection('questions').doc(questionId).get();
    return { code: 0, question: res.data };
  }

  // Validate optional filter parameters
  if (year !== undefined && year !== null && year !== '') {
    const y = Number(year);
    if (!Number.isInteger(y) || y < MIN_YEAR || y > MAX_YEAR) {
      return { code: 400, message: '无效的年份参数' };
    }
  }
  if (category !== undefined && category !== null && category !== '') {
    if (!VALID_CATEGORIES.has(category)) {
      return { code: 400, message: '无效的题目分类' };
    }
  }
  if (difficulty !== undefined && difficulty !== null) {
    const d = Number(difficulty);
    if (!Number.isInteger(d) || d < 1 || d > 5) {
      return { code: 400, message: '无效的难度值' };
    }
  }

  // Build query conditions
  const query = {};
  if (year)       query.year = Number(year);
  if (category)   query.category = _.elemMatch(_.eq(category));
  if (difficulty) query.difficulty = Number(difficulty);

  const skip = (Math.max(1, parseInt(page, 10)) - 1) * pageSize;

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
    page: parseInt(page, 10),
    pageSize,
    questions: dataRes.data,
  };
};
