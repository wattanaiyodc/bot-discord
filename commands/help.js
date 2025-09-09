const { deleteMessagesLater } = require("../utils");

module.exports = async (message, args) => {
  const commandsList = [
    "!room - role สำหรับห้องล็อค",
    "!addtarget @user - เพิ่ม user เข้า TARGET_USERS",
    "!removetarget @user - ลบ user ออกจาก TARGET_USERS",
    "!listtargets - แสดง target users ปัจจุบัน",
    "!help หรือ !commands - แสดงคำสั่งทั้งหมด"
  ];

  const reply = await message.reply("📜 คำสั่งที่มี:\n" + commandsList.join("\n"));
  deleteMessagesLater([message, reply]);
};
