// utils.js
const fs = require("fs");
const path = require("path");
const { TIMEOUT_MS, DELETE_DELAY } = require("./config");

// ----------------- JSON TARGET_USERS -----------------
const FILE_PATH = path.join(__dirname, "targets.json");
let _TARGET_USERS = [];

function loadTargets() {
  if (fs.existsSync(FILE_PATH)) {
    try {
      const data = fs.readFileSync(FILE_PATH, "utf8");
      _TARGET_USERS = JSON.parse(data);
      console.log("✅ โหลด TARGET_USERS เรียบร้อย:", _TARGET_USERS);
    } catch (err) {
      console.error("❌ อ่าน targets.json ไม่ได้:", err);
    }
  } else {
    fs.writeFileSync(FILE_PATH, "[]");
    _TARGET_USERS = [];
    console.log("⚠️ targets.json ไม่เจอ! สร้างไฟล์ใหม่ว่าง ๆ ให้เรียบร้อย");
  }
}

function saveTargets() {
  fs.writeFileSync(FILE_PATH, JSON.stringify(_TARGET_USERS, null, 2));
}

// ----------------- TARGET_USERS -----------------
function getTargets() { return _TARGET_USERS; }
function addTarget(id) { if (!_TARGET_USERS.includes(id)) _TARGET_USERS.push(id); saveTargets(); }
function removeTarget(id) { const i = _TARGET_USERS.indexOf(id); if(i!==-1) _TARGET_USERS.splice(i,1); saveTargets(); }

// ----------------- Fail / Verified -----------------
const failedUsers = {};
function markUserFailed(userId) { failedUsers[userId] = true; }
function hasUserFailed(userId) { return !!failedUsers[userId]; }

const verifiedUsers = {};
function isUserVerified(userId) {
  const now = Date.now();
  return verifiedUsers[userId] && now - verifiedUsers[userId] < 30*60*1000;
}
function markUserVerified(userId) {
  verifiedUsers[userId] = Date.now();
}

// ----------------- ลบข้อความ (ปรับ) -----------------
/**
 * ลบข้อความหลายข้อความพร้อม delay แยก
 * @param {Array} messages - array ของ Discord Message
 * @param {Number|Array} delay - delay เดียวสำหรับทุกข้อความ หรือ array ของ delay แยกแต่ละข้อความ
 */
function deleteMessagesLater(messages, delay = DELETE_DELAY) {
  messages.forEach((msg, idx) => {
    if (!msg) return;
    let d = Array.isArray(delay) ? (delay[idx] || DELETE_DELAY) : delay;
    setTimeout(() => {
      msg.delete()
        .then(() => console.log(`[Delete] ลบข้อความของ ${msg.author.tag || "bot"}`))
        .catch(err => console.error("[Delete Error]", err));
    }, d);
  });
}

// ----------------- Dynamic Question -----------------
async function askQuestionFlow(channel, userId, questions, timeout = TIMEOUT_MS) {
  let lastResult = null;
  let isFirstQuestion = true;

  for (const q of questions) {
    // รองรับทั้ง field แบบเก่า/ใหม่
    const rawText = q.question ?? q.text;
    const answers = q.answers ?? q.expectedAnswers ?? [];

    // ถ้า malformed → แจ้งและข้าม
    if (!rawText || !Array.isArray(answers)) {
      console.warn("[askQuestionFlow] malformed question object:", q);
      continue;
    }

    // hint เฉพาะคำถามแรกถ้าเคย fail
    const hint = (isFirstQuestion && typeof hasUserFailed === "function" && hasUserFailed(userId))
      ? " 💡 "
      : "";

    const questionText = `${rawText}${hint}`;
    console.log(`[Question] ${userId} -> ${questionText}`);

    const questionMsg = await channel.send(`<@${userId}> ${questionText}`);
    let collectedMessage;

    lastResult = await new Promise((resolve) => {
      const collector = channel.createMessageCollector({
        filter: (msg) => msg.author.id === userId,
        time: timeout,
        max: 1
      });

      collector.on("collect", (msg) => {
        collectedMessage = msg;
        const answerRaw = msg.content.trim();
        const answer = answerRaw.toLowerCase();
        const matched = answers.find(a => typeof a === "string" && answer.includes(a.toLowerCase()));
        console.log(`[Answer collected] ${userId} -> "${answerRaw}" (matched: ${matched ?? false})`);
        resolve({ result: !!matched, botMsg: questionMsg, userMsg: collectedMessage, answer: answerRaw });
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) {
          console.log(`[Answer collected] ${userId} -> (no reply)`);
          resolve({ result: false, botMsg: questionMsg, userMsg: null, answer: null });
        }
      });
    });

    // ลบข้อความ (bot,user) — ปรับ delays ตามที่ต้องการ
    deleteMessagesLater([questionMsg, collectedMessage], [5000, 500]);

    // ถ้าตอบถูกและมี followUp ให้ถามต่อ
    if (lastResult.result && q.followUp) {
      // ensure followUp uses same shape (question/text + answers/expectedAnswers)
      questions.push(q.followUp);
    }

    if (!lastResult.result) break;
    isFirstQuestion = false;
  }

  return lastResult;
}

module.exports = {
  loadTargets,
  getTargets,
  addTarget,
  removeTarget,
  saveTargets,
  deleteMessagesLater,
  askQuestionFlow,
  isUserVerified,
  markUserVerified,
  hasUserFailed,
  markUserFailed
};
