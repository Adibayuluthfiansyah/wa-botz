/**
 * CONSTANTS CONFIGURATION
 * 
 * File ini berisi semua konstanta yang digunakan di aplikasi.
 * Edit file ini untuk mengubah konfigurasi bot tanpa perlu ubah logic code.
 * 
 * PENTING: Setelah edit file ini, restart bot untuk apply perubahan.
 */

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================

/**
 * Maksimal umur pesan yang akan diproses (dalam detik)
 * Pesan lebih tua dari ini akan diabaikan saat bot restart
 * Default: 12 jam (43200 detik)
 * 
 * Contoh nilai lain:
 * - 6 jam: 6 * 60 * 60 = 21600
 * - 24 jam: 24 * 60 * 60 = 86400
 * - 1 jam: 1 * 60 * 60 = 3600
 */
const MESSAGE_MAX_AGE = 12 * 60 * 60; // 12 jam

/**
 * Maksimal jumlah pesan per user dalam 1 periode waktu (anti-spam)
 * User yang melebihi limit ini akan diblokir sementara
 * Default: 20 pesan per jam
 */
const RATE_LIMIT_MAX = 20;

/**
 * Window waktu untuk rate limiting (dalam milidetik)
 * Default: 1 jam (3600000 ms)
 * Setelah waktu ini, counter rate limit akan direset
 */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 jam

// ============================================================================
// ADMIN CONFIGURATION
// ============================================================================

/**
 * Daftar nomor WhatsApp admin yang punya akses penuh ke bot
 * Admin bisa:
 * - Reply manual tanpa interferensi bot
 * - Jalankan admin commands (bot status, bot stats, dll)
 * - Bypass semua filter bot
 * 
 * FORMAT: '628xxxxxxxxxx@c.us'
 * Contoh: Nomor 0812-3456-7890 => '6281234567890@c.us'
 * 
 * CARA MENDAPATKAN FORMAT NOMOR:
 * 1. Nomor WhatsApp: 0812-3456-7890
 * 2. Ganti 0 dengan 62: 62812-3456-7890
 * 3. Hilangkan tanda strip: 6281234567890
 * 4. Tambahkan @c.us: 6281234567890@c.us
 * 
 * TODO: GANTI DENGAN NOMOR ADMIN YANG SEBENARNYA
 */
const ADMIN_NUMBERS = [
  // '6281234567890@c.us', // Uncomment dan ganti dengan nomor admin
];

/**
 * Daftar nomor personal yang TIDAK BOLEH dijawab bot
 * Gunakan ini untuk kontak pribadi (teman, keluarga) yang tidak boleh
 * menerima auto-reply dari bot
 * 
 * FORMAT: Sama dengan ADMIN_NUMBERS
 * 
 * Contoh penggunaan:
 * - Nomor keluarga yang sering chat personal
 * - Nomor teman yang tidak boleh dapat reply bot
 * - Nomor kantor lain yang tidak relevan
 */
const PERSONAL_CONTACTS = [
  // '6281234567890@c.us', // Contoh: Teman A
  // '6281234567891@c.us', // Contoh: Keluarga B
];

// ============================================================================
// KEYWORDS CONFIGURATION
// ============================================================================

/**
 * Keyword untuk deteksi konteks bot (apakah pesan untuk bot atau personal chat)
 * Bot akan lebih cenderung reply jika pesan mengandung salah satu keyword ini
 * 
 * CARA KERJA:
 * - Jika pesan dari contact pribadi Anda DAN tidak ada keyword ini => BOT SKIP
 * - Jika pesan dari public/unknown user => BOT PROSES
 * - Jika pesan mengandung keyword ini => BOT PROSES
 * 
 * CUSTOMIZE:
 * Tambahkan keyword sesuai dengan program/layanan dinas Anda
 * Contoh: 'stunting', 'gepeng', 'pmks', dll
 */
const BOT_KEYWORDS = [
  // Keyword program bantuan
  'bantuan', 'daftar', 'program', 'pkh', 'bpnt', 'pip', 'blt',
  
  // Keyword organisasi
  'dinas', 'sosial', 'dinsos',
  
  // Keyword informasi
  'menu', 'info', 'syarat', 'cara', 'informasi',
  
  // Keyword pendaftaran
  'registrasi', 'pendaftaran', 'daftar', 'dftar',
  
  // Keyword data
  'dtks', 'data', 'verifikasi',
  
  // Keyword target penerima
  'lansia', 'disabilitas', 'anak', 'ibu', 'balita',
  
  // Keyword umum
  'faq', 'kontak', 'jam', 'operasional', 'alamat', 'telepon',
  
  // TODO: Tambahkan keyword khusus dinas Anda di sini
  // Contoh: 'stunting', 'gepeng', 'pmks', 'atensi', dll
];

/**
 * Keyword trigger untuk aktivasi user baru (opt-in system)
 * User baru HARUS mengirim salah satu keyword ini untuk direspon bot
 * 
 * CARA KERJA:
 * - User baru kirim "apa kabar?" => BOT TIDAK REPLY (no trigger keyword)
 * - User baru kirim "halo" => BOT REPLY (ada trigger keyword)
 * - Setelah aktivasi pertama, user bisa kirim pesan apa saja
 * 
 * CUSTOMIZE:
 * Tambahkan greeting/sapaan yang umum digunakan di daerah Anda
 */
const TRIGGER_KEYWORDS = [
  // Greeting umum
  'halo', 'hai', 'hi', 'hello', 'hey',
  
  // Waktu-based greeting
  'pagi', 'siang', 'sore', 'malam',
  'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
  
  // Greeting islami
  'assalamualaikum', 'assalamualaykum', 'waalaikumsalam',
  
  // Action words
  'menu', 'mulai', 'start', 'info', 'bantuan', 'daftar',
  
  // Formal greeting
  'permisi', 'maaf', 'mau tanya',
  
  // Casual greeting
  'gan', 'min', 'admin', 'bang', 'kak', 'bro',
  
  // TODO: Tambahkan greeting khas daerah Anda
  // Contoh: 'sugeng enjing' (Jawa), 'sampurasun' (Sunda), dll
];

// ============================================================================
// JAM KERJA CONFIGURATION
// ============================================================================

/**
 * Konfigurasi jam kerja kantor
 * Digunakan untuk menentukan apakah bot harus kirim full response
 * atau hanya auto-reply singkat
 * 
 * Default: Senin-Jumat, 08:00-16:00
 * 
 * CARA CUSTOMIZE:
 * Edit function isWorkingHours() di src/config/workingHours.js
 */
const WORKING_HOURS = {
  start: 8,    // Jam mulai (08:00)
  end: 16,     // Jam selesai (16:00)
  days: [1, 2, 3, 4, 5]  // Hari kerja (1=Senin, 5=Jumat, 0=Minggu, 6=Sabtu)
};

// ============================================================================
// RESPONSE MESSAGES
// ============================================================================

/**
 * Template pesan untuk berbagai skenario
 * Edit sesuai dengan tone/style komunikasi dinas Anda
 */
const MESSAGES = {
  // Pesan rate limit (spam protection)
  RATE_LIMIT_WARNING: 
    "Anda sudah mencapai batas maksimal pesan per jam (20 pesan).\n\n" +
    "Untuk bantuan lebih lanjut, silakan hubungi langsung:\n" +
    "WhatsApp: 0812-3456-7890\n" +
    "Telepon: (0561) 123456\n\n" +
    "Terima kasih atas pengertiannya.",
  
  // Pesan di luar jam kerja
  OUTSIDE_WORKING_HOURS: (greeting) => 
    `${greeting}\n\n` +
    `Maaf, saat ini di luar jam kerja kantor.\n\n` +
    `Jam Operasional:\n` +
    `Senin - Jumat: 08.00 - 16.00 WIB\n` +
    `Sabtu - Minggu: TUTUP\n\n` +
    `Silakan hubungi kami kembali di jam kerja atau untuk bantuan darurat, hubungi:\n` +
    `WhatsApp: 0812-3456-7890\n\n` +
    `Ketik "menu" untuk melihat informasi yang tersedia.`,
  
  // Pesan saat AI error
  AI_ERROR_FALLBACK:
    "Maaf, saya sedang mengalami kendala teknis saat memproses pertanyaan Anda.\n\n" +
    "Silakan:\n" +
    "1. Coba lagi beberapa saat\n" +
    "2. Ketik \"menu\" untuk melihat info yang tersedia\n" +
    "3. Hubungi staff kami:\n" +
    "   WhatsApp: 0812-3456-7890\n" +
    "   Telepon: (0561) 123456\n\n" +
    "Terima kasih atas pengertiannya.",
  
  // Pesan loading saat bot sedang proses
  PROCESSING: "Sebentar ya, saya cari jawabannya...",
  
  // Suffix untuk jawaban AI
  AI_RESPONSE_SUFFIX: "\n\nSemoga jawaban saya membantu! Kalau masih bingung atau mau tanya lagi, langsung chat aja.",
  
  // Suffix untuk jawaban FAQ
  FAQ_RESPONSE_SUFFIX: "\n\nSemoga membantu ya! Ada yang mau ditanya lagi?"
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Timing
  MESSAGE_MAX_AGE,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW,
  
  // Admin & Personal
  ADMIN_NUMBERS,
  PERSONAL_CONTACTS,
  
  // Keywords
  BOT_KEYWORDS,
  TRIGGER_KEYWORDS,
  
  // Working hours
  WORKING_HOURS,
  
  // Messages
  MESSAGES
};
