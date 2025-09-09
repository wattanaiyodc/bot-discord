const { getTargets, deleteMessagesLater } = require("../utils");
const { EmbedBuilder } = require("discord.js");

module.exports = async (message, args) => {
  const TARGET_USERS = getTargets();

  // สร้าง Embed
  const embed = new EmbedBuilder()
    .setTitle("🎯 Target Users")
    .setColor(0x00FF00) // สีเขียว
    .setTimestamp();

  if (TARGET_USERS.length === 0) {
    embed.setDescription("📭 ยังไม่มี target users");
  } else {
    embed.setDescription(
      TARGET_USERS.map((id, i) => `**${i + 1}.** <@${id}>`).join("\n")
    );
  }

  const reply = await message.reply({ embeds: [embed] });

  // ลบข้อความผู้ใช้ + bot หลัง 10 วิ
  deleteMessagesLater([message, reply], 10000);
};
