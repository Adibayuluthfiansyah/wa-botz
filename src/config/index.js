/**
 * CONFIG INDEX
 * 
 * Central export untuk semua configuration modules.
 * Import dari file ini untuk akses semua config.
 * 
 * Usage:
 * const { ADMIN_NUMBERS, isWorkingHours } = require('./config');
 */

const constants = require('./constants');
const workingHours = require('./workingHours');

module.exports = {
  // Export semua constants
  ...constants,
  
  // Export working hours functions
  ...workingHours
};
