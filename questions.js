const { askQuestionFlow, markUserFailed } = require("./utils");

// Question Sets
const QUESTION_SETS = [
  {
    question: "เล่น talerunner กันมั้ย",
    answers: ["ไม่เล่น", "รักนะ Corgi"],
    followUp: { question: "กูรู้นะว่ามึงเล่น", answers: ["รักนะ Corgi"] }
  },
  {
    question: "วันนี้อยากเล่นเกมอะไร",
    answers: ["talesrunner", "รักนะ Corgi"]
  },
  {
    question: "ห้องนี้คือห้องของใคร",
    answers: ["แรคคูน", "รักนะ corgi"],
    followUp: {
      question: "แรคคูนชื่ออะไร",
      answers: ["ไฟล์ท", "รักนะ corgi"]
    }
  }
];

// Get Random Question Set
function getRandomQuestionSet() {
  const index = Math.floor(Math.random() * QUESTION_SETS.length);
  return QUESTION_SETS[index];
}

// Ask Random Question with special pass for "รักนะ corgi"
async function askRandomQuestion(channel, userId, timeout) {
  const questionSet = getRandomQuestionSet();
  const questions = [questionSet];

  const firstAnswerResult = await askQuestionFlow(channel, userId, questions, timeout);

  if (!firstAnswerResult.result) {
    markUserFailed(userId);
    console.log(`[Fail] ${userId} → ตอบผิด/ไม่ตอบ`);
    return firstAnswerResult;
  }

  // ถ้าตอบ "รักนะ corgi" รอบแรก → pass free
  if (firstAnswerResult.answer?.toLowerCase() === "รักนะ corgi") {
    console.log(`[Pass Free] ${userId} → ตอบ "รักนะ corgi" รอบแรก, ผ่านทันที`);
    return firstAnswerResult;
  }

  // ถ้าไม่ใช่ "รักนะ corgi" → ตรวจสอบ follow-up ปกติ
  if (questionSet.followUp) {
    questions.push(questionSet.followUp);
    const followUpResult = await askQuestionFlow(channel, userId, questions.slice(1), timeout);
    if (!followUpResult.result) markUserFailed(userId);
    return followUpResult;
  }

  return firstAnswerResult;
}

module.exports = { askRandomQuestion };
