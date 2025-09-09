const { Client, GatewayIntentBits, Events } = require("discord.js");
const { DISCORD_TOKEN, TARGET_TEXT_CHANNEL_ID, SECRET_VOICE_CHANNEL_ID, SECRET_ROLE_NAME } = require("./config");
const { getTargets, deleteMessagesLater, isUserVerified, markUserVerified, loadTargets } = require("./utils");
const { askRandomQuestion } = require("./questions");
const getOrCreateRole = require("./roles");

// โหลด TARGET_USERS ตอนเริ่ม
loadTargets();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// โหลดคำสั่ง
const commands = new Map();
commands.set("room", require("./commands/room"));
commands.set("addtarget", require("./commands/addtarget"));
commands.set("removetarget", require("./commands/removetarget"));
commands.set("listtargets", require("./commands/listtargets"));
commands.set("help", require("./commands/help"));
commands.set("commands", require("./commands/help"));

// ----------------- messageCreate -----------------
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  const args = message.content.trim().split(/\s+/);
  const commandName = args[0].slice(1).toLowerCase();

  if (commands.has(commandName)) {
    try {
      await commands.get(commandName)(message, args);
    } catch (err) {
      console.error(`[Error Command] ${commandName} ของ ${message.author.tag}`, err);
    }
  }
});

// ----------------- VoiceStateUpdate -----------------
client.on(Events.VoiceStateUpdate, async (oldState,newState) => {
  const member = newState.member || oldState.member;
  const TARGET_USERS = getTargets();

  // เช็ค role ห้องลับ
  const role = member.guild.roles.cache.find(r => r.name === SECRET_ROLE_NAME);
  if (newState.channelId === SECRET_VOICE_CHANNEL_ID && (!role || !member.roles.cache.has(role.id))) {
    try {
      console.log(`[Kick] ${member.user.tag} ไม่มี role ห้องลับ`);
      await newState.disconnect();
      await member.send(`❌ คุณไม่มี role \`${SECRET_ROLE_NAME}\` เลยไม่สามารถเข้าห้องลับได้`);
    } catch(err) { console.error(err); }
    return;
  }

  // ถ้าเป็น TARGET_USERS → ตรวจสอบ
  if (!oldState.channel && newState.channel && TARGET_USERS.includes(member.user.id)) {
    console.log(`[Voice] ${member.user.tag} เข้าห้อง`);

    // ข้ามถ้า verified 30 นาที
    if (isUserVerified(member.user.id)) {
      console.log(`[Verified] ${member.user.tag} ผ่านการตรวจสอบใน 30 นาทีที่ผ่านมา -> ข้ามการถาม`);
      return;
    }

    try {
      const textChannel = newState.guild.channels.cache.get(TARGET_TEXT_CHANNEL_ID);
      if (!textChannel || !textChannel.isTextBased()) return;

      const { result, botMsg, userMsg, answer } = await askRandomQuestion(textChannel, member.user.id);

      if (!result) {
        console.log(`[Fail] ${member.user.tag} ตอบผิด/ไม่ตอบ`);
        await newState.disconnect();
        const failMsg = await textChannel.send(`❌ <@${member.user.id}> ถูกเตะเพราะตอบผิด/ไม่ตอบ`);
        deleteMessagesLater([botMsg, userMsg, failMsg]);
        return;
      }

      markUserVerified(member.user.id);
      console.log(`[Pass] ${member.user.tag} ตอบถูก: ${answer} -> ผ่านการตรวจสอบ 30 นาที`);
      const successMsg = await textChannel.send(`<@${member.user.id}> ✅ คุณผ่านการตรวจสอบแล้ว!`);
      deleteMessagesLater([botMsg, userMsg, successMsg]);

    } catch(err) {
      console.error(`[Error] ตรวจสอบ ${member.user.tag} ไม่สำเร็จ`, err);
      await newState.disconnect();
    }
  }
});

client.once("ready", () => console.log(`✅ Logged in as ${client.user.tag}`));
client.login(DISCORD_TOKEN);
