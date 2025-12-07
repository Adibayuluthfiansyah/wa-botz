/**
 * OLD MESSAGE FILTER
 * 
 * Filter untuk mengabaikan pesan yang terlalu lama (old messages).
 * Berguna saat bot restart untuk tidak memproses message history lama.
 * 
 * CARA KERJA:
 * 1. Hitung umur pesan (sekarang - timestamp pesan)
 * 2. Jika umur > MESSAGE_MAX_AGE => SKIP
 * 3. Jika umur <= MESSAGE_MAX_AGE => LANJUT
 * 
 * KENAPA PENTING:
 * - Saat bot restart, whatsapp-web.js bisa "replay" pesan-pesan lama
 * - Tanpa filter ini, bot akan reply ke semua pesan lama => SPAM!
 * - Dengan filter ini, bot hanya proses pesan yang masih fresh
 */

const { MESSAGE_MAX_AGE } = require('../config');
const logger = require('../utils/logger');

/**
 * Check apakah pesan sudah terlalu lama (old message)
 * 
 * @param {Object} message - WhatsApp message object
 * @returns {boolean} true jika pesan sudah lama (harus di-skip)
 */
function isOldMessage(message) {
  // Hitung umur pesan dalam detik
  // Date.now() = waktu sekarang dalam ms, convert ke detik dengan /1000
  // message.timestamp = waktu pesan dalam detik (Unix timestamp)
  const messageAge = (Date.now() / 1000) - message.timestamp;
  
  // Check apakah umur pesan melebihi batas
  const isTooOld = messageAge > MESSAGE_MAX_AGE;
  
  // Jika pesan terlalu lama, log untuk debugging
  if (isTooOld) {
    const ageInHours = Math.round(messageAge / 3600);
    logger.skip(`Old message (${ageInHours}h old)`, message);
  }
  
  return isTooOld;
}

/**
 * Middleware filter untuk old messages
 * 
 * @param {Object} message - WhatsApp message object
 * @returns {boolean} true jika pesan harus diproses, false jika harus di-skip
 * 
 * USAGE DALAM MESSAGE PIPELINE:
 * if (!oldMessageFilter(message)) return; // Skip pesan
 */
function oldMessageFilter(message) {
  // Return false jika pesan lama (harus di-skip)
  // Return true jika pesan fresh (boleh diproses)
  return !isOldMessage(message);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  isOldMessage,
  oldMessageFilter
};
