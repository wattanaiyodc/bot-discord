const { askQuestionFlow, markUserFailed } = require("./utils");

// Question Sets
const QUESTION_SETS = [
  {
    question: "เล่น talerunner กันมั้ย",
    answers: ["ไม่เล่น", "รักนะ corgi"],
    followUp: { question: "กูรู้นะว่ามึงเล่น", answers: ["รักนะ corgi"] }
  },
  {
    question: "วันนี้อยากเล่นเกมอะไร",
    answers: ["talesrunner", "รักนะ corgi"]
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
  let result;

  // ❓ คำถามแรก
  result = await askQuestionFlow(channel, userId, [questionSet], timeout);

  // ✅ ถ้าพิมพ์ "รักนะ corgi" → ผ่านทันที
  if (result.answer?.toLowerCase() === "รักนะ corgi") {
    console.log(`[Pass Free] ${userId} → ตอบ "รักนะ corgi", ผ่านทันที`);
    return { result: true, answer: "รักนะ corgi" };
  }

  // ❌ ถ้าตอบผิด/ไม่ตอบ
  if (!result.result) {
    markUserFailed(userId);
    console.log(`[Fail] ${userId} → ตอบผิด/ไม่ตอบ`);
    return result;
  }

  // 👉 ถ้ามี follow-up
  if (questionSet.followUp) {
    result = await askQuestionFlow(channel, userId, [questionSet.followUp], timeout);

    // ✅ ถ้าพิมพ์ "รักนะ corgi" → ผ่านทันที
    if (result.answer?.toLowerCase() === "รักนะ corgi") {
      console.log(`[Pass Free] ${userId} → ตอบ "รักนะ corgi" (follow-up), ผ่านทันที`);
      return { result: true, answer: "รักนะ corgi" };
    }

    // ❌ ถ้าตอบผิด/ไม่ตอบ follow-up
    if (!result.result) {
      markUserFailed(userId);
      console.log(`[Fail] ${userId} → ตอบผิด/ไม่ตอบ (follow-up)`);
    }
  }

  return result;
}

module.exports = { askRandomQuestion };
