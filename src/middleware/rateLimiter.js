/**
 * RATE LIMITER
 * 
 * Anti-spam protection: limit jumlah pesan per user dalam periode waktu tertentu.
 * Prevent abuse dan protect server resources.
 * 
 * CARA KERJA:
 * 1. Track jumlah pesan per user dalam database
 * 2. Jika melebihi limit => Kirim warning + Block
 * 3. Setelah periode waktu habis => Reset counter
 * 
 * DEFAULT LIMIT:
 * - 20 pesan per jam per user
 * - Warning dikirim saat user mencapai limit
 * - Pesan selanjutnya di-block sampai reset time
 * 
 * KENAPA PENTING:
 * - Prevent spam/abuse dari user jahat
 * - Protect API quota (Groq AI, dll)
 * - Protect server resources
 * - Fair usage untuk semua user
 */

const { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW, MESSAGES } = require('../config');
const logger = require('../utils/logger');

/**
 * Check rate limit status untuk user
 * 
 * @param {string} phoneNumber - Nomor user
 * @param {Object} db - Database service
 * @returns {Promise<Object>} { allowed: boolean, current: number, limit: number, resetTime: Date }
 */
async function checkRateLimit(phoneNumber, db) {
  try {
    // Get current rate limit data dari database
    let rateLimitData = await db.getRateLimit(phoneNumber);
    
    const now = Date.now();
    
    // Jika belum ada data atau sudah expired, buat baru
    if (!rateLimitData || now > rateLimitData.reset_time) {
      rateLimitData = {
        phone: phoneNumber,
        count: 0,
        reset_time: now + RATE_LIMIT_WINDOW
      };
      await db.saveRateLimit(rateLimitData);
    }
    
    // Check apakah masih dalam limit
    const allowed = rateLimitData.count < RATE_LIMIT_MAX;
    
    return {
      allowed,
      current: rateLimitData.count,
      limit: RATE_LIMIT_MAX,
      resetTime: new Date(rateLimitData.reset_time)
    };
    
  } catch (error) {
    logger.error('Error checking rate limit', error);
    // Jika error, allow (better UX than false positive block)
    return {
      allowed: true,
      current: 0,
      limit: RATE_LIMIT_MAX,
      resetTime: new Date(Date.now() + RATE_LIMIT_WINDOW)
    };
  }
}

/**
 * Increment counter rate limit untuk user
 * 
 * @param {string} phoneNumber - Nomor user
 * @param {Object} db - Database service
 * @returns {Promise<number>} Current count setelah increment
 */
async function incrementRateLimit(phoneNumber, db) {
  try {
    const newCount = await db.incrementRateLimit(phoneNumber);
    return newCount;
  } catch (error) {
    logger.error('Error incrementing rate limit', error);
    return 0;
  }
}

/**
 * Send rate limit warning ke user
 * 
 * @param {Object} message - WhatsApp message object
 * @param {number} current - Current count
 * @param {number} limit - Max limit
 */
async function sendRateLimitWarning(message, current, limit) {
  try {
    await message.reply(MESSAGES.RATE_LIMIT_WARNING);
    logger.warn(`Rate limit reached: ${current}/${limit} for ${message.from}`);
  } catch (error) {
    logger.error('Error sending rate limit warning', error);
  }
}

/**
 * Middleware filter untuk rate limiting
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @param {Object} db - Database service
 * @returns {Promise<boolean>} true jika pesan harus diproses, false jika harus di-skip
 * 
 * LOGIC:
 * 1. Check current rate limit
 * 2. Jika masih dalam limit:
 *    - Increment counter
 *    - Return true (lanjut proses)
 * 3. Jika sudah melebihi limit:
 *    - Send warning (hanya sekali di limit pertama kali)
 *    - Return false (skip)
 * 
 * USAGE:
 * const chat = await message.getChat();
 * if (!await rateLimitFilter(message, chat, db)) return;
 */
async function rateLimitFilter(message, chat, db) {
  const sender = message.from;
  const chatName = chat.name || 'Unknown';
  
  // 1. Check rate limit status
  const status = await checkRateLimit(sender, db);
  
  // 2. Jika sudah melebihi limit => Block
  if (!status.allowed) {
    // Send warning hanya sekali (saat count = limit exactly)
    if (status.current === RATE_LIMIT_MAX) {
      await sendRateLimitWarning(message, status.current, status.limit);
    }
    
    logger.skip(`Rate limit exceeded (${status.current}/${status.limit}) from ${chatName}`, message);
    return false; // Skip pesan
  }
  
  // 3. Masih dalam limit, increment counter
  const newCount = await incrementRateLimit(sender, db);
  
  // Log untuk monitoring
  logger.debug(`Rate limit: ${newCount}/${status.limit} for ${chatName}`);
  
  return true; // Lanjut proses
}

/**
 * Reset rate limit untuk user tertentu (admin function)
 * 
 * @param {string} phoneNumber - Nomor user
 * @param {Object} db - Database service
 * @returns {Promise<boolean>} true jika berhasil reset
 */
async function resetRateLimit(phoneNumber, db) {
  try {
    await db.deleteRateLimit(phoneNumber);
    logger.info(`Rate limit reset for ${phoneNumber}`);
    return true;
  } catch (error) {
    logger.error('Error resetting rate limit', error);
    return false;
  }
}

/**
 * Get rate limit stats untuk semua user (admin dashboard)
 * 
 * @param {Object} db - Database service
 * @returns {Promise<Array>} Array of { phone, count, reset_time }
 */
async function getRateLimitStats(db) {
  try {
    const stats = await db.getAllRateLimits();
    return stats;
  } catch (error) {
    logger.error('Error getting rate limit stats', error);
    return [];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  checkRateLimit,
  incrementRateLimit,
  sendRateLimitWarning,
  rateLimitFilter,
  resetRateLimit,
  getRateLimitStats
};
