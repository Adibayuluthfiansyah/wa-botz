/**
 * DATABASE SERVICE (SQLite)
 * 
 * Module ini handle semua database operations menggunakan SQLite.
 * SQLite dipilih karena:
 * - Simple: File-based database, no external service needed
 * - Fast: Cukup untuk aplikasi bot scale kecil-menengah
 * - Portable: File database bisa di-backup dan dipindah dengan mudah
 * - Zero-config: Tidak perlu setup server database
 * 
 * DATABASE TABLES:
 * 1. activated_users - Track user yang sudah aktivasi bot
 * 2. rate_limits - Track rate limit per user
 * 3. registrations - Data pendaftaran program bantuan
 * 
 * DATABASE LOCATION:
 * data/bot.db
 * 
 * BACKUP:
 * Cukup copy file bot.db untuk backup semua data
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Database file path
const DB_PATH = path.join(__dirname, '../../data/bot.db');

// Database instance (singleton)
let db = null;

/**
 * Initialize database connection dan create tables jika belum ada
 * 
 * @returns {Database} SQLite database instance
 */
function initDatabase() {
  try {
    // Pastikan folder data ada
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Create atau open database
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables jika belum ada
    createTables();
    
    logger.info('Database initialized', { path: DB_PATH });
    
    return db;
    
  } catch (error) {
    logger.error('Failed to initialize database', error);
    throw error;
  }
}

/**
 * Create database tables
 * Dijalankan saat initialize, akan skip jika table sudah ada
 */
function createTables() {
  // Table: activated_users
  // Menyimpan data user yang sudah activated (opt-in)
  db.exec(`
    CREATE TABLE IF NOT EXISTS activated_users (
      phone TEXT PRIMARY KEY,
      activated INTEGER DEFAULT 1,
      activated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Table: rate_limits
  // Menyimpan counter rate limit per user
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      phone TEXT PRIMARY KEY,
      count INTEGER DEFAULT 0,
      reset_time INTEGER NOT NULL
    )
  `);
  
  // Table: registrations
  // Menyimpan data pendaftaran program bantuan
  // NOTE: Ini mirip dengan data/registrations.json tapi di database
  db.exec(`
    CREATE TABLE IF NOT EXISTS registrations (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      name TEXT,
      nik TEXT,
      address TEXT,
      program TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pending'
    )
  `);
  
  // Index untuk performa query
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_rate_limits_reset ON rate_limits(reset_time);
    CREATE INDEX IF NOT EXISTS idx_registrations_phone ON registrations(phone);
    CREATE INDEX IF NOT EXISTS idx_registrations_status ON registrations(status);
  `);
  
  logger.info('Database tables created/verified');
}

/**
 * Get database instance
 * Singleton pattern untuk ensure hanya 1 connection
 * 
 * @returns {Database} SQLite database instance
 */
function getDatabase() {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Close database connection
 * Dipanggil saat bot shutdown
 */
function closeDatabase() {
  if (db) {
    db.close();
    logger.info('Database connection closed');
    db = null;
  }
}

// ============================================================================
// ACTIVATED USERS OPERATIONS
// ============================================================================

/**
 * Get activated user by phone number
 * 
 * @param {string} phone - Phone number
 * @returns {Object|null} User object atau null jika tidak ada
 */
function getActivatedUser(phone) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM activated_users WHERE phone = ?');
  return stmt.get(phone);
}

/**
 * Activate user (insert atau update)
 * 
 * @param {string} phone - Phone number
 * @returns {boolean} true jika berhasil
 */
function activateUser(phone) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO activated_users (phone, activated, activated_at, last_message_at)
    VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(phone) DO UPDATE SET
      activated = 1,
      last_message_at = CURRENT_TIMESTAMP
  `);
  stmt.run(phone);
  return true;
}

/**
 * Update last message timestamp untuk user
 * 
 * @param {string} phone - Phone number
 */
function updateLastMessage(phone) {
  const db = getDatabase();
  const stmt = db.prepare(`
    UPDATE activated_users 
    SET last_message_at = CURRENT_TIMESTAMP 
    WHERE phone = ?
  `);
  stmt.run(phone);
}

/**
 * Get activation statistics
 * 
 * @returns {Object} { total, today, thisWeek }
 */
function getActivationStats() {
  const db = getDatabase();
  
  const total = db.prepare('SELECT COUNT(*) as count FROM activated_users WHERE activated = 1').get().count;
  
  const today = db.prepare(`
    SELECT COUNT(*) as count FROM activated_users 
    WHERE activated = 1 
    AND DATE(activated_at) = DATE('now')
  `).get().count;
  
  const thisWeek = db.prepare(`
    SELECT COUNT(*) as count FROM activated_users 
    WHERE activated = 1 
    AND activated_at >= DATE('now', '-7 days')
  `).get().count;
  
  return { total, today, thisWeek };
}

// ============================================================================
// RATE LIMIT OPERATIONS
// ============================================================================

/**
 * Get rate limit data for user
 * 
 * @param {string} phone - Phone number
 * @returns {Object|null} Rate limit object atau null
 */
function getRateLimit(phone) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM rate_limits WHERE phone = ?');
  return stmt.get(phone);
}

/**
 * Save rate limit data
 * 
 * @param {Object} data - { phone, count, reset_time }
 * @returns {boolean} true jika berhasil
 */
function saveRateLimit(data) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO rate_limits (phone, count, reset_time)
    VALUES (?, ?, ?)
    ON CONFLICT(phone) DO UPDATE SET
      count = excluded.count,
      reset_time = excluded.reset_time
  `);
  stmt.run(data.phone, data.count, data.reset_time);
  return true;
}

/**
 * Increment rate limit counter
 * 
 * @param {string} phone - Phone number
 * @returns {number} New count value
 */
function incrementRateLimit(phone) {
  const db = getDatabase();
  
  // Get current data
  let current = getRateLimit(phone);
  const now = Date.now();
  
  // Jika tidak ada atau sudah expired, reset
  if (!current || now > current.reset_time) {
    current = {
      phone,
      count: 1,
      reset_time: now + (60 * 60 * 1000) // 1 hour
    };
  } else {
    current.count += 1;
  }
  
  saveRateLimit(current);
  return current.count;
}

/**
 * Delete rate limit data (reset)
 * 
 * @param {string} phone - Phone number
 */
function deleteRateLimit(phone) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM rate_limits WHERE phone = ?');
  stmt.run(phone);
}

/**
 * Get all rate limits (untuk admin)
 * 
 * @returns {Array} Array of rate limit objects
 */
function getAllRateLimits() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM rate_limits ORDER BY count DESC LIMIT 10');
  return stmt.all();
}

/**
 * Clean expired rate limits (untuk periodic cleanup)
 */
function cleanExpiredRateLimits() {
  const db = getDatabase();
  const now = Date.now();
  const stmt = db.prepare('DELETE FROM rate_limits WHERE reset_time < ?');
  const result = stmt.run(now);
  logger.info(`Cleaned ${result.changes} expired rate limits`);
}

// ============================================================================
// REGISTRATION OPERATIONS
// ============================================================================

/**
 * Save registration data
 * 
 * @param {Object} data - Registration data
 * @returns {string} Registration ID
 */
function saveRegistration(data) {
  const db = getDatabase();
  const id = data.id || `REG-${Date.now()}`;
  
  const stmt = db.prepare(`
    INSERT INTO registrations (id, phone, name, nik, address, program, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    id,
    data.phone,
    data.name || null,
    data.nik || null,
    data.address || null,
    data.program || null,
    data.status || 'pending'
  );
  
  return id;
}

/**
 * Get registration by ID
 * 
 * @param {string} id - Registration ID
 * @returns {Object|null} Registration object
 */
function getRegistration(id) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM registrations WHERE id = ?');
  return stmt.get(id);
}

/**
 * Get all registrations for a phone number
 * 
 * @param {string} phone - Phone number
 * @returns {Array} Array of registration objects
 */
function getRegistrationsByPhone(phone) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM registrations WHERE phone = ? ORDER BY created_at DESC');
  return stmt.all(phone);
}

/**
 * Get recent registrations (untuk admin)
 * 
 * @param {number} limit - Max results
 * @returns {Array} Array of registration objects
 */
function getRecentRegistrations(limit = 5) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM registrations ORDER BY created_at DESC LIMIT ?');
  return stmt.all(limit);
}

/**
 * Get registration count
 * 
 * @returns {number} Total registrations
 */
function getRegistrationCount() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT COUNT(*) as count FROM registrations');
  return stmt.get().count;
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Database management
  initDatabase,
  getDatabase,
  closeDatabase,
  
  // Activated users
  getActivatedUser,
  activateUser,
  updateLastMessage,
  getActivationStats,
  
  // Rate limits
  getRateLimit,
  saveRateLimit,
  incrementRateLimit,
  deleteRateLimit,
  getAllRateLimits,
  cleanExpiredRateLimits,
  
  // Registrations
  saveRegistration,
  getRegistration,
  getRegistrationsByPhone,
  getRecentRegistrations,
  getRegistrationCount
};
