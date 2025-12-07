/**
 * LOGGER UTILITY
 * 
 * Enhanced logging untuk monitoring dan debugging bot.
 * Semua log tercatat dengan timestamp dan level yang jelas.
 * 
 * LOG LEVELS:
 * - DEBUG: Detail teknis untuk debugging
 * - INFO: Informasi normal operation
 * - WARN: Warning yang perlu diperhatikan
 * - ERROR: Error yang perlu segera ditangani
 * - SKIP: Pesan yang di-skip (untuk hybrid mode monitoring)
 * 
 * FORMAT LOG:
 * [TIMESTAMP] [LEVEL] Message
 * 
 * TIPS:
 * - Gunakan DEBUG untuk development
 * - Gunakan INFO untuk production normal logs
 * - Gunakan WARN untuk anomali yang tidak critical
 * - Gunakan ERROR untuk masalah serius
 * - Gunakan SKIP untuk track filtered messages
 */

/**
 * Get formatted timestamp
 * 
 * @returns {string} Timestamp dalam format [HH:MM:SS]
 */
function getTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `[${hours}:${minutes}:${seconds}]`;
}

/**
 * Format log message dengan color (untuk terminal support ANSI)
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @returns {string} Formatted log string
 */
function formatLog(level, message) {
  const timestamp = getTimestamp();
  
  // ANSI color codes (work di most terminals)
  const colors = {
    DEBUG: '\x1b[36m',    // Cyan
    INFO: '\x1b[32m',     // Green
    WARN: '\x1b[33m',     // Yellow
    ERROR: '\x1b[31m',    // Red
    SKIP: '\x1b[35m',     // Magenta
    RESET: '\x1b[0m'      // Reset color
  };
  
  const color = colors[level] || colors.RESET;
  const reset = colors.RESET;
  
  return `${timestamp} ${color}[${level}]${reset} ${message}`;
}

/**
 * Log debug message
 * Untuk detail teknis dan debugging
 * 
 * @param {string} message - Debug message
 * @param {any} data - Optional data to log
 */
function debug(message, data = null) {
  console.log(formatLog('DEBUG', message));
  if (data) {
    console.log('  Data:', data);
  }
}

/**
 * Log info message
 * Untuk informasi normal operation
 * 
 * @param {string} message - Info message
 * @param {any} data - Optional data to log
 */
function info(message, data = null) {
  console.log(formatLog('INFO', message));
  if (data) {
    console.log('  Data:', data);
  }
}

/**
 * Log warning message
 * Untuk warning yang perlu diperhatikan
 * 
 * @param {string} message - Warning message
 * @param {any} data - Optional data to log
 */
function warn(message, data = null) {
  console.log(formatLog('WARN', message));
  if (data) {
    console.log('  Data:', data);
  }
}

/**
 * Log error message
 * Untuk error yang perlu segera ditangani
 * 
 * @param {string} message - Error message
 * @param {Error|string} error - Error object atau message
 */
function error(message, err = null) {
  console.log(formatLog('ERROR', message));
  if (err) {
    console.log('  Error:', err.message || err);
    if (err.stack) {
      console.log('  Stack:', err.stack);
    }
  }
}

/**
 * Log skipped message
 * Untuk track pesan yang di-filter/skip
 * 
 * @param {string} reason - Reason why message was skipped
 * @param {Object} message - WhatsApp message object
 */
function skip(reason, message) {
  const sender = message?.from || 'unknown';
  const text = message?.body ? `"${message.body.substring(0, 50)}..."` : '';
  console.log(formatLog('SKIP', `${reason} from ${sender} ${text}`));
}

/**
 * Log incoming message dengan detail lengkap
 * 
 * @param {Object} message - WhatsApp message object
 * @param {Object} chat - WhatsApp chat object
 * @param {Object} context - Additional context (workingHours, etc)
 */
function logIncomingMessage(message, chat, context = {}) {
  const separator = '='.repeat(70);
  const chatName = chat?.name || 'Unknown';
  const messageTime = new Date(message.timestamp * 1000).toLocaleString('id-ID');
  const messageAge = Math.round((Date.now() / 1000 - message.timestamp) / 60);
  
  console.log(`\n${separator}`);
  console.log(formatLog('INFO', 'INCOMING MESSAGE'));
  console.log(`From: ${chatName} (${message.from})`);
  console.log(`Text: ${message.body}`);
  console.log(`Time: ${messageTime}`);
  console.log(`Age: ${messageAge} minutes`);
  console.log(`Is Contact: ${chat?.isMyContact ? 'Yes' : 'No'}`);
  
  if (context.workingHours !== undefined) {
    console.log(`Working Hours: ${context.workingHours ? 'Yes' : 'No'}`);
  }
  
  console.log(separator + '\n');
}

/**
 * Log outgoing reply
 * 
 * @param {string} recipient - Recipient name or number
 * @param {string} reply - Reply text
 */
function logOutgoingReply(recipient, reply) {
  const preview = reply.length > 100 ? reply.substring(0, 100) + '...' : reply;
  console.log(formatLog('INFO', `Reply sent to ${recipient}: ${preview}`));
}

/**
 * Log bot startup
 * 
 * @param {Object} config - Bot configuration
 */
function logBotStartup(config = {}) {
  const separator = '='.repeat(70);
  console.log(`\n${separator}`);
  console.log(formatLog('INFO', 'BOT STARTING...'));
  
  if (config.botName) {
    console.log(`Bot Name: ${config.botName}`);
  }
  if (config.dinasName) {
    console.log(`Dinas: ${config.dinasName}`);
  }
  if (config.port) {
    console.log(`Port: ${config.port}`);
  }
  
  console.log(separator + '\n');
}

/**
 * Log bot ready
 */
function logBotReady() {
  console.log(formatLog('INFO', 'BOT READY! Waiting for messages...'));
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  debug,
  info,
  warn,
  error,
  skip,
  logIncomingMessage,
  logOutgoingReply,
  logBotStartup,
  logBotReady
};
