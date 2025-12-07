/**
 * WORKING HOURS CONFIGURATION
 * 
 * Module ini berisi logic untuk menentukan apakah saat ini
 * dalam jam kerja atau tidak.
 * 
 * CARA CUSTOMIZE:
 * Edit function isWorkingHours() sesuai dengan jadwal kantor Anda.
 */

const { WORKING_HOURS } = require('./constants');

/**
 * Check apakah waktu saat ini dalam jam kerja kantor
 * 
 * @returns {boolean} true jika dalam jam kerja, false jika tidak
 * 
 * CARA KERJA:
 * 1. Ambil waktu sekarang (jam dan hari)
 * 2. Check apakah hari ini termasuk hari kerja
 * 3. Check apakah jam sekarang dalam range jam kerja
 * 
 * DEFAULT SCHEDULE:
 * - Hari: Senin - Jumat (1-5)
 * - Jam: 08:00 - 16:00
 * 
 * CUSTOMIZE EXAMPLES:
 * 
 * Example 1: Jam kerja 07:00-17:00
 * return (day >= 1 && day <= 5) && (hour >= 7 && hour < 17);
 * 
 * Example 2: Termasuk Sabtu pagi (07:00-12:00)
 * if (day === 6) {
 *   return hour >= 7 && hour < 12;
 * }
 * return (day >= 1 && day <= 5) && (hour >= 8 && hour < 16);
 * 
 * Example 3: Shift malam (19:00-03:00)
 * if (hour >= 19 || hour < 3) {
 *   return day >= 1 && day <= 5;
 * }
 * return false;
 */
function isWorkingHours() {
  const now = new Date();
  const hour = now.getHours();  // 0-23
  const day = now.getDay();     // 0=Minggu, 1=Senin, ..., 6=Sabtu
  
  // Check hari kerja (Senin-Jumat)
  const isWorkingDay = WORKING_HOURS.days.includes(day);
  
  // Check jam kerja (08:00-16:00)
  const isWorkingTime = hour >= WORKING_HOURS.start && hour < WORKING_HOURS.end;
  
  return isWorkingDay && isWorkingTime;
}

/**
 * Get status jam kerja dalam format readable
 * Digunakan untuk logging dan debugging
 * 
 * @returns {string} Status jam kerja (contoh: "Senin, 14:30 (JAM KERJA)")
 */
function getWorkingHoursStatus() {
  const now = new Date();
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const dayName = dayNames[now.getDay()];
  const time = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const status = isWorkingHours() ? 'JAM KERJA' : 'LUAR JAM KERJA';
  
  return `${dayName}, ${time} (${status})`;
}

/**
 * Get informasi detail jam kerja (untuk ditampilkan ke user)
 * 
 * @returns {string} Info jam kerja dalam format user-friendly
 */
function getWorkingHoursInfo() {
  return (
    "Jam Operasional:\n" +
    "Senin - Jumat: 08.00 - 16.00 WIB\n" +
    "Sabtu - Minggu: TUTUP\n\n" +
    "Catatan: Layanan WhatsApp bot tersedia 24/7"
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  isWorkingHours,
  getWorkingHoursStatus,
  getWorkingHoursInfo
};
