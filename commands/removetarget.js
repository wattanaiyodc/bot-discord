const { getTargets, removeTarget, deleteMessagesLater } = require("../utils");
const { OWNER_ID } = require("../config");
// กำหนดว่าใครสามารถใช้ remove target ได้

module.exports = async (message, args) => {
  if (message.author.id !== OWNER_ID) {
    const reply = await message.reply("❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้");
    return deleteMessagesLater([message, reply]);
  }

  const user = message.mentions.users.first();
  if (!user) {
    const reply = await message.reply("⚠️ ต้อง tag user ที่ต้องการลบ");
    return deleteMessagesLater([message, reply]);
  }

  const TARGET_USERS = getTargets();
  if (TARGET_USERS.includes(user.id)) {
    removeTarget(user.id);
    const reply = await message.reply(`🗑️ ลบ <@${user.id}> ออกจาก TARGET_USERS แล้ว`);
    deleteMessagesLater([message, reply]);
  } else {
    const reply = await message.reply(`⚠️ <@${user.id}> ไม่มีใน TARGET_USERS`);
    deleteMessagesLater([message, reply]);
  }
};
