/**
 * OPT-IN FILTER
 * 
 * Filter untuk memastikan new user harus "activate" diri dengan trigger keywords.
 * Prevent bot reply ke pesan random dari user yang tidak explicitly mau pakai bot.
 * 
 * CARA KERJA:
 * 1. Check apakah user sudah activated (ada di database)
 * 2. Jika belum activated:
 *    - Check apakah pesan ada trigger keywords
 *    - Jika ada => Activate user, lanjut proses
 *    - Jika tidak => Skip pesan
 * 3. Jika sudah activated:
 *    - Lanjut proses (user bebas kirim pesan apa saja)
 * 
 * KENAPA PENTING:
 * - Prevent bot reply ke pesan yang tidak intended untuk bot
 * - User harus explicitly "start" conversation dengan bot
 * - Setelah first interaction, conversation bisa natural (no keyword requirement)
 * 
 * CONTOH:
 * User A (new): "test" => BOT SKIP (no trigger)
 * User A (new): "halo" => BOT ACTIVATE + REPLY (ada trigger)
 * User A (activated): "test" => BOT REPLY (sudah activated)
 */

const { TRIGGER_KEYWORDS } = require('../config');
const { containsTriggerKeywords, containsBotKeywords } = require('./contextDetector');
const logger = require('../utils/logger');

/**
 * Check apakah user sudah activated
 * 
 * @param {string} phoneNumber - Nomor user
 * @param {Object} db - Database service
 * @returns {Promise<boolean>} true jika user sudah activated
 */
async function isUserActivated(phoneNumber, db) {
  try {
    const user = await db.getActivatedUser(phoneNumber);
    return user && user.activated;
  } catch (error) {
    logger.error('Error checking user activation', error);
    return false;
  }
}

/**
 * Activate user (save to database)
 * 
 * @param {string} phoneNumber - Nomor user
 * @param {Object} db - Database service
 * @returns {Promise<boolean>} true jika berhasil activated
 */
async function activateUser(phoneNumber, db) {
  try {
    await db.activateUser(phoneNumber);
    logger.info(`User activated: ${phoneNumber}`);
    return true;
  } catch (error) {
    logger.error('Error activating user', error);
    return false;
  }
}

/**
 * Middleware filter untuk opt-in system
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @param {Object} db - Database service
 * @returns {Promise<boolean>} true jika pesan harus diproses, false jika harus di-skip
 * 
 * LOGIC:
 * 1. Check apakah user sudah activated
 * 2. Jika sudah => PASS (lanjut)
 * 3. Jika belum:
 *    a. Check trigger keywords atau bot keywords
 *    b. Jika ada => ACTIVATE + PASS
 *    c. Jika tidak => SKIP
 * 
 * USAGE:
 * const chat = await message.getChat();
 * if (!await optInFilter(message, chat, db)) return;
 */
async function optInFilter(message, chat, db) {
  const sender = message.from;
  const messageText = message.body || '';
  const chatName = chat.name || 'Unknown';
  
  // 1. Check apakah user sudah activated
  const activated = await isUserActivated(sender, db);
  
  if (activated) {
    // User sudah activated, boleh kirim pesan apa saja
    return true;
  }
  
  // 2. User belum activated, check apakah ada trigger/bot keywords
  const hasTrigger = containsTriggerKeywords(messageText);
  const hasBotKeyword = containsBotKeywords(messageText);
  
  if (hasTrigger || hasBotKeyword) {
    // Ada trigger/bot keyword, activate user
    await activateUser(sender, db);
    logger.info(`User activated via ${hasTrigger ? 'trigger' : 'bot'} keyword: ${chatName}`);
    return true; // Lanjut proses
  }
  
  // 3. User belum activated DAN tidak ada trigger => SKIP
  logger.skip(`New user without trigger keyword (${chatName}): "${messageText}"`, message);
  return false;
}

/**
 * Get statistics aktivasi user (untuk admin dashboard)
 * 
 * @param {Object} db - Database service
 * @returns {Promise<Object>} { total: number, today: number, thisWeek: number }
 */
async function getActivationStats(db) {
  try {
    const stats = await db.getActivationStats();
    return stats;
  } catch (error) {
    logger.error('Error getting activation stats', error);
    return { total: 0, today: 0, thisWeek: 0 };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  isUserActivated,
  activateUser,
  optInFilter,
  getActivationStats
};
