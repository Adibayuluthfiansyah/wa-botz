/**
 * CONTEXT DETECTOR
 * 
 * Smart filter untuk membedakan chat personal vs chat untuk bot.
 * Berguna saat pakai nomor pribadi yang mix antara chat personal & bot queries.
 * 
 * CARA KERJA:
 * 1. Analyze pesan: ada bot keywords atau tidak?
 * 2. Analyze sender: contact pribadi atau public user?
 * 3. Analyze chat name: pola nama yang indicate public user (Ibu/Bapak)
 * 4. Decision: apakah ini chat untuk bot atau personal chat?
 * 
 * LOGIC DECISION:
 * - Ada bot keywords => BOT (always)
 * - Public user (not in contacts) => BOT
 * - Chat name contain Ibu/Bapak/Pak/Bu => BOT (likely public user)
 * - Contact pribadi + no bot keywords => PERSONAL (skip)
 * 
 * KENAPA PENTING:
 * - Prevent bot reply ke chat personal (awkward!)
 * - Allow bot reply ke public user (intended behavior)
 * - Smart detection tanpa perlu manual blacklist semua kontak
 */

const { BOT_KEYWORDS, TRIGGER_KEYWORDS } = require('../config');
const logger = require('../utils/logger');

/**
 * Check apakah pesan mengandung bot keywords
 * 
 * @param {string} messageText - Text pesan (lowercase)
 * @returns {boolean} true jika ada bot keywords
 */
function containsBotKeywords(messageText) {
  const lowerText = messageText.toLowerCase();
  return BOT_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Check apakah pesan mengandung trigger keywords
 * 
 * @param {string} messageText - Text pesan (lowercase)
 * @returns {boolean} true jika ada trigger keywords
 */
function containsTriggerKeywords(messageText) {
  const lowerText = messageText.toLowerCase();
  return TRIGGER_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

/**
 * Check apakah sender adalah public user (bukan contact pribadi)
 * 
 * @param {Object} chat - WhatsApp chat object
 * @returns {boolean} true jika likely public user
 */
function isLikelyPublicUser(chat) {
  // User bukan saved contact => likely public user
  if (!chat.isMyContact) {
    return true;
  }
  
  // Check nama chat untuk pattern yang indicate public user
  const chatName = (chat.name || '').toLowerCase();
  
  // Pattern: "Ibu", "Bapak", "Pak", "Bu" (formal addressing)
  const publicUserPatterns = ['ibu', 'bapak', 'pak ', 'bu ', 'bpk', 'bp '];
  const hasPublicPattern = publicUserPatterns.some(pattern => 
    chatName.includes(pattern)
  );
  
  return hasPublicPattern;
}

/**
 * Detect context: apakah ini chat untuk bot atau personal chat?
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @returns {Object} { isForBot: boolean, reason: string }
 */
function detectContext(message, chat) {
  const messageText = message.body || '';
  const sender = message.from;
  const chatName = chat.name || 'Unknown';
  
  // 1. Check bot keywords (highest priority)
  if (containsBotKeywords(messageText)) {
    return {
      isForBot: true,
      reason: 'Contains bot keywords'
    };
  }
  
  // 2. Check public user indicators
  if (isLikelyPublicUser(chat)) {
    return {
      isForBot: true,
      reason: 'Public user'
    };
  }
  
  // 3. Check trigger keywords (for personal contacts who want to use bot)
  if (containsTriggerKeywords(messageText)) {
    return {
      isForBot: true,
      reason: 'Contains trigger keywords'
    };
  }
  
  // 4. Default: jika contact pribadi + no keywords => assume personal chat
  if (chat.isMyContact) {
    return {
      isForBot: false,
      reason: 'Personal chat (saved contact, no bot keywords)'
    };
  }
  
  // 5. Fallback: kalau tidak bisa determine, assume for bot (safer)
  return {
    isForBot: true,
    reason: 'Fallback (unable to determine, assume bot)'
  };
}

/**
 * Middleware filter untuk context detection
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @returns {boolean} true jika pesan harus diproses, false jika harus di-skip
 * 
 * USAGE:
 * const chat = await message.getChat();
 * if (!contextDetectorFilter(message, chat)) return;
 */
function contextDetectorFilter(message, chat) {
  const context = detectContext(message, chat);
  
  if (!context.isForBot) {
    const chatName = chat.name || 'Unknown';
    logger.skip(`Personal chat without bot keywords from ${chatName}`, message);
  }
  
  // Log context detection result
  logger.debug(`Context: ${context.reason} (isForBot: ${context.isForBot})`);
  
  // Return true jika untuk bot (boleh diproses)
  // Return false jika personal chat (harus di-skip)
  return context.isForBot;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  containsBotKeywords,
  containsTriggerKeywords,
  isLikelyPublicUser,
  detectContext,
  contextDetectorFilter
};
