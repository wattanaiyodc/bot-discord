require("dotenv").config();
const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

// ----------------- ตั้งค่า -----------------
const SECRET_ROLE_NAME = "room";                        // Role ที่อนุญาตให้เข้าห้อง
const SECRET_VOICE_CHANNEL_ID = "1414694646633861173";  // ID ห้องลับ (Voice Channel)

const TARGET_USERS = ["365479916965199876", "576009303425548288"];
const TARGET_TEXT_CHANNEL_ID = process.env.TARGET_TEXT_CHANNEL_ID;
const TIMEOUT_MS = 8000;
// -------------------------------------------

// ฟังก์ชันหาหรือสร้าง role
async function getOrCreateRole(guild) {
  let role = guild.roles.cache.find(r => r.name === SECRET_ROLE_NAME);
  if (!role) {
    try {
      role = await guild.roles.create({
        name: SECRET_ROLE_NAME,
        color: "Green",
        reason: "Role สำหรับเข้าห้องลับ",
      });
      console.log(`สร้าง role ${SECRET_ROLE_NAME} เรียบร้อย`);
    } catch (err) {
      console.error("สร้าง role ไม่สำเร็จ:", err);
    }
  }
  return role;
}

// ฟังก์ชันถามคำถาม
async function askQuestion(channel, userId, questionText, expectedAnswers, timeout = TIMEOUT_MS) {
  const questionMsg = await channel.send(`<@${userId}> ${questionText}`);
  let collectedMessage;

  return new Promise((resolve) => {
    const collector = channel.createMessageCollector({
      filter: (msg) => msg.author.id === userId,
      time: timeout,
      max: 1,
    });

    collector.on("collect", (msg) => {
      collectedMessage = msg;
      const answer = msg.content.trim().toLowerCase();

      const matched = expectedAnswers.find((exp) => answer.includes(exp.toLowerCase()));
      resolve({ result: !!matched, matched, botMsg: questionMsg, userMsg: collectedMessage });
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        resolve({ result: false, matched: null, botMsg: questionMsg, userMsg: null });
      }
    });
  });
}

// ฟังก์ชันลบข้อความ
function deleteMessagesLater(messages, delay = 5000) {
  setTimeout(() => {
    messages.forEach((msg) => msg?.delete().catch(() => {}));
  }, delay);
}

// ----------------- Ready -----------------
client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// ----------------- คำสั่ง !room เพื่อขอ role -----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content.toLowerCase() === "!room") {
    const role = await getOrCreateRole(message.guild);
    if (!role) return message.reply("⚠️ ไม่สามารถสร้าง role ได้");

    let botReply;
    try {
      await message.member.roles.add(role);
      botReply = await message.reply(`✅ คุณได้รับ role \`${SECRET_ROLE_NAME}\` แล้ว! ตอนนี้สามารถเข้าห้องลับได้`);
    } catch (err) {
      console.error(err);
      botReply = await message.reply("⚠️ บอทไม่มีสิทธิ์เพิ่ม role ให้คุณ");
    }

    // ลบข้อความผู้ใช้และบอทหลัง 5 วินาที
    deleteMessagesLater([message, botReply]);
  }
});

// ----------------- ตรวจสอบ VoiceStateUpdate -----------------
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  const member = newState.member || oldState.member;
  const role = member.guild.roles.cache.find(r => r.name === SECRET_ROLE_NAME);

  // ---------- [ห้องลับ room] ----------
  if (newState.channelId === SECRET_VOICE_CHANNEL_ID) {
    if (!role || !member.roles.cache.has(role.id)) {
      try {
        await newState.disconnect();
        const dmMsg = await member.send(`❌ คุณไม่มี role \`${SECRET_ROLE_NAME}\` เลยไม่สามารถเข้าห้องลับได้`);
        // ลบ DM ของบอทได้เอง, แต่ DM ของผู้ใช้ไม่สามารถลบจากบอท
      } catch (err) {
        console.error("เตะออกไม่สำเร็จ:", err);
      }
    }
  }

  if (oldState.channelId === SECRET_VOICE_CHANNEL_ID && newState.channelId !== SECRET_VOICE_CHANNEL_ID) {
    if (role && member.roles.cache.has(role.id)) {
      try {
        await member.roles.remove(role);
        await member.send(`🚪 คุณออกจากห้องลับแล้ว Role \`${SECRET_ROLE_NAME}\` ถูกถอดออก`);
      } catch (err) {
        console.error("ถอด role ไม่สำเร็จ:", err);
      }
    }
  }

  // ---------- [ระบบถามคำถามเฉพาะ TARGET_USERS] ----------
  if (!oldState.channel && newState.channel) {
    const userId = member.user.id;
    if (TARGET_USERS.includes(userId)) {
      try {
        const textChannel = newState.guild.channels.cache.get(TARGET_TEXT_CHANNEL_ID);
        if (!textChannel || !textChannel.isTextBased()) return;

        // ❓ คำถามแรก
        const { result: ok1, matched: ans1, botMsg: q1Bot, userMsg: q1User } =
          await askQuestion(textChannel, userId, "เล่น talerunner กันมั้ย", ["ไม่เล่น", "รักนะ Corgi"]);

        if (!ok1) {
          await newState.disconnect();
          const failMsg = await textChannel.send(`❌ <@${userId}> ถูกเตะเพราะตอบผิด/ไม่ตอบ`);
          deleteMessagesLater([q1Bot, q1User, failMsg]);
          return;
        }

        if (ans1.toLowerCase() === "รักนะ corgi") {
          const successMsg = await textChannel.send(`<@${userId}> ✅ คุณผ่านการตรวจสอบแล้ว!`);
          deleteMessagesLater([q1Bot, q1User, successMsg]);
          return;
        }

        // ❓ ถ้าตอบ "ไม่เล่น" → ถามคำถามที่สอง
        const { result: ok2, botMsg: q2Bot, userMsg: q2User } =
          await askQuestion(textChannel, userId, "กูรู้นะว่ามึงเล่น", ["รักนะ Corgi"]);

        if (!ok2) {
          await newState.disconnect();
          const failMsg = await textChannel.send(`❌ <@${userId}> ไม่อยากโดนเตะบอกรักนะ Corgi ก่อน`);
          deleteMessagesLater([q1Bot, q1User, q2Bot, q2User, failMsg]);
          return;
        }

        const successMsg = await textChannel.send(`<@${userId}> ✅ คุณผ่านการตรวจสอบแล้ว!`);
        deleteMessagesLater([q1Bot, q1User, q2Bot, q2User, successMsg]);

      } catch (err) {
        console.error("ส่งข้อความในห้องไม่สำเร็จ:", err);
        await newState.disconnect();
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
