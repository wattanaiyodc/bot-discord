// roles.js
const { SECRET_ROLE_NAME } = require("./config");

/**
 * ฟังก์ชันหาหรือสร้าง role
 * @param {Guild} guild - guild ที่ต้องการสร้าง role
 * @returns {Role} role ที่เจอหรือสร้างใหม่
 */
async function getOrCreateRole(guild) {
  // หา role ที่มีชื่อ SECRET_ROLE_NAME
  let role = guild.roles.cache.find(r => r.name === SECRET_ROLE_NAME);

  // ถ้าไม่เจอ ให้สร้างใหม่
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
      return null;
    }
  }

  return role;
}

module.exports = getOrCreateRole;
