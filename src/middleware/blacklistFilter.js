/**
 * BLACKLIST FILTER
 * 
 * Filter untuk mengabaikan pesan dari nomor-nomor yang ada di blacklist.
 * Berguna untuk block kontak personal/spam yang tidak boleh dijawab bot.
 * 
 * CARA KERJA:
 * 1. Check apakah sender ada di PERSONAL_CONTACTS array
 * 2. Jika ada => SKIP (jangan reply)
 * 3. Jika tidak => LANJUT (boleh diproses)
 * 
 * KENAPA PENTING:
 * - Kalau pakai nomor pribadi untuk bot, ada kontak yang tidak boleh dapat auto-reply
 * - Contoh: teman, keluarga, kontak bisnis personal
 * - Prevent awkward situation (bot reply ke chat personal)
 */

const { PERSONAL_CONTACTS } = require('../config');
const logger = require('../utils/logger');

/**
 * Check apakah sender ada di blacklist
 * 
 * @param {string} sender - Nomor pengirim (format: 628xxx@c.us)
 * @returns {boolean} true jika ada di blacklist
 */
function isBlacklisted(sender) {
  return PERSONAL_CONTACTS.includes(sender);
}

/**
 * Middleware filter untuk blacklist check
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object (optional, for logging)
 * @returns {boolean} true jika pesan harus diproses, false jika harus di-skip
 * 
 * USAGE:
 * if (!blacklistFilter(message)) return;
 */
function blacklistFilter(message, chat = null) {
  const sender = message.from;
  const blacklisted = isBlacklisted(sender);
  
  if (blacklisted) {
    const chatName = chat?.name || 'Unknown';
    logger.skip(`Personal contact in blacklist (${chatName})`, message);
  }
  
  // Return false jika blacklisted (harus di-skip)
  // Return true jika tidak blacklisted (boleh diproses)
  return !blacklisted;
}

/**
 * Add nomor ke blacklist (runtime, tidak persist)
 * Untuk persist, tambahkan langsung ke config/constants.js
 * 
 * @param {string} phoneNumber - Nomor yang akan di-blacklist
 * @returns {boolean} true jika berhasil ditambahkan
 */
function addToBlacklist(phoneNumber) {
  if (!isBlacklisted(phoneNumber)) {
    PERSONAL_CONTACTS.push(phoneNumber);
    logger.info(`Added to blacklist: ${phoneNumber}`);
    return true;
  }
  return false; // Sudah ada di blacklist
}

/**
 * Remove nomor dari blacklist (runtime, tidak persist)
 * 
 * @param {string} phoneNumber - Nomor yang akan di-remove
 * @returns {boolean} true jika berhasil di-remove
 */
function removeFromBlacklist(phoneNumber) {
  const index = PERSONAL_CONTACTS.indexOf(phoneNumber);
  if (index > -1) {
    PERSONAL_CONTACTS.splice(index, 1);
    logger.info(`Removed from blacklist: ${phoneNumber}`);
    return true;
  }
  return false; // Tidak ada di blacklist
}

/**
 * Get list blacklist (untuk admin commands)
 * 
 * @returns {Array<string>} Array nomor yang di-blacklist
 */
function getBlacklist() {
  return [...PERSONAL_CONTACTS]; // Return copy, bukan reference
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  isBlacklisted,
  blacklistFilter,
  addToBlacklist,
  removeFromBlacklist,
  getBlacklist
};
