/**
 * MIDDLEWARE INDEX
 * 
 * Central export untuk semua middleware filters.
 * Import dari file ini untuk akses semua middleware.
 * 
 * MIDDLEWARE ORDER (dijalankan secara berurutan):
 * 1. oldMessageFilter - Skip pesan lama
 * 2. manualReplyFilter - Skip jika sudah dijawab manual
 * 3. blacklistFilter - Skip jika ada di blacklist
 * 4. contextDetectorFilter - Skip jika chat personal tanpa bot keywords
 * 5. optInFilter - Skip jika user baru tanpa trigger keywords
 * 6. rateLimitFilter - Skip jika melebihi rate limit
 * 
 * Usage:
 * const middleware = require('./middleware');
 * if (!middleware.oldMessageFilter(message)) return;
 */

const oldMessageFilter = require('./oldMessageFilter');
const manualReplyFilter = require('./manualReplyFilter');
const blacklistFilter = require('./blacklistFilter');
const contextDetector = require('./contextDetector');
const optInFilter = require('./optInFilter');
const rateLimiter = require('./rateLimiter');

module.exports = {
  // Old message filter
  ...oldMessageFilter,
  
  // Manual reply filter
  ...manualReplyFilter,
  
  // Blacklist filter
  ...blacklistFilter,
  
  // Context detector
  ...contextDetector,
  
  // Opt-in filter
  ...optInFilter,
  
  // Rate limiter
  ...rateLimiter
};
