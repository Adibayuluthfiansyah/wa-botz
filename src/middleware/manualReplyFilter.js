/**
 * MANUAL REPLY FILTER
 * 
 * Filter untuk mendeteksi apakah Anda (admin) sudah reply manual ke pesan user.
 * Jika sudah, bot akan skip agar tidak ada duplicate reply.
 * 
 * CARA KERJA:
 * 1. Get chat object dari message
 * 2. Check last message in chat
 * 3. Jika last message dari Anda (fromMe) DAN waktunya setelah pesan user => SKIP
 * 4. Jika belum ada reply manual => LANJUT
 * 
 * KENAPA PENTING:
 * - Dalam hybrid mode, Anda dan bot bisa jawab bersamaan
 * - Kalau Anda sudah jawab, bot tidak perlu jawab lagi
 * - Prevent duplicate response yang membingungkan user
 */

const logger = require('../utils/logger');

/**
 * Check apakah pesan sudah dijawab manual oleh admin
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @returns {boolean} true jika sudah ada manual reply
 */
async function hasManualReply(message, chat) {
  try {
    // Check apakah chat object valid
    if (!chat || !chat.lastMessage) {
      return false;
    }
    
    // Ambil last message di chat
    const lastMessage = chat.lastMessage;
    
    // Check apakah last message dari admin (fromMe = true)
    if (!lastMessage.fromMe) {
      return false; // Last message dari user, bukan admin
    }
    
    // Check timing: apakah admin reply setelah pesan user ini?
    // Toleransi 5 menit (300 detik) sebelum dan sesudah
    const timeDiff = message.timestamp - lastMessage.timestamp;
    const hasRecentReply = timeDiff < 300 && timeDiff > -300;
    
    if (hasRecentReply) {
      logger.skip('Manual reply detected', message);
      return true;
    }
    
    return false;
    
  } catch (error) {
    // Jika ada error saat check, log tapi tetap lanjut
    // Lebih baik bot reply daripada silent karena error
    logger.warn('Could not check manual reply status', error.message);
    return false;
  }
}

/**
 * Middleware filter untuk manual reply detection
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @returns {boolean} true jika pesan harus diproses, false jika harus di-skip
 * 
 * USAGE:
 * const chat = await message.getChat();
 * if (!await manualReplyFilter(message, chat)) return;
 */
async function manualReplyFilter(message, chat) {
  // Return false jika sudah ada manual reply (harus di-skip)
  // Return true jika belum ada manual reply (boleh diproses)
  const replied = await hasManualReply(message, chat);
  return !replied;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  hasManualReply,
  manualReplyFilter
};
