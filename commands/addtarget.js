const { getTargets, addTarget, deleteMessagesLater } = require("../utils");

module.exports = async (message, args) => {
  const user = message.mentions.users.first();
  if (!user) return message.reply("⚠️ ต้อง tag user มาด้วย");

  const TARGET_USERS = getTargets();

  if (!TARGET_USERS.includes(user.id)) {
    addTarget(user.id);
    const reply = await message.reply(`✅ เพิ่ม <@${user.id}> เข้าไปใน TARGET_USERS แล้ว`);
    deleteMessagesLater([message, reply]);
  } else {
    const reply = await message.reply(`⚠️ <@${user.id}> มีอยู่แล้ว`);
    deleteMessagesLater([message, reply]);
  }
};
