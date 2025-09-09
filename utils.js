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
  for (const q of questions) {
    const questionMsg = await channel.send(`<@${userId}> ${q.text}`);
    let collectedMessage;

    lastResult = await new Promise((resolve) => {
      const collector = channel.createMessageCollector({
        filter: (msg) => msg.author.id === userId,
        time: timeout,
        max: 1
      });

      collector.on("collect", (msg) => {
        collectedMessage = msg;
        const answer = msg.content.trim().toLowerCase();
        const matched = q.expectedAnswers.find(e => answer.includes(e.toLowerCase()));
        resolve({ result: !!matched, botMsg: questionMsg, userMsg: collectedMessage, answer });
      });

      collector.on("end", (collected) => {
        if (collected.size === 0) resolve({ result: false, botMsg: questionMsg, userMsg: null, answer: null });
      });
    });

    deleteMessagesLater([questionMsg, collectedMessage], [5000, 500]); // ลบข้อความ bot ก่อน 5 วินาที, user 0.5 วินาที

    if (lastResult.result && q.followUp) questions.push(q.followUp);
    if (!lastResult.result) break;
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
