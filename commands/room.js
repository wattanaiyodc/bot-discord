const getOrCreateRole  = require("../roles");
const { deleteMessagesLater } = require("../utils");
const { SECRET_ROLE_NAME, ROOM_PASSWORD } = require("../config");

module.exports = async (message, args) => {
  // args[0] = !room
  // args[1] = password
  const inputPassword = args[1];
  if (inputPassword !== ROOM_PASSWORD) {
    const reply = await message.reply("❌ รหัสผ่านไม่ถูกต้อง! ไม่สามารถรับ role ได้");
    return deleteMessagesLater([message, reply]);
  }

  // สร้างหรือหา role
  const role = await getOrCreateRole(message.guild);
  if (!role) {
    const reply = await message.reply("⚠️ ไม่สามารถสร้าง role ได้");
    return deleteMessagesLater([message, reply]);
  }

  try {
    await message.member.roles.add(role);
    const reply = await message.reply(`✅ คุณได้รับ role \`${SECRET_ROLE_NAME}\` แล้ว! ตอนนี้สามารถเข้าห้องลับ corgi ได้`);
    deleteMessagesLater([message, reply]);
  } catch (err) {
    console.error(err);
    const reply = await message.reply("⚠️ บอทไม่มีสิทธิ์เพิ่ม role ให้คุณ");
    deleteMessagesLater([message, reply]);
  }
};
