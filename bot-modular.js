/**
 * WA-BOT DINAS SOSIAL - MODULAR VERSION
 * Main Entry Point
 * 
 * Bot WhatsApp untuk layanan Dinas Sosial dengan:
 * - AI-powered Q&A (Groq + LLaMA)
 * - Multi-step registration flow
 * - FAQ system
 * - Hybrid mode (manual + auto reply)
 * - Rate limiting & spam protection
 * - SQLite database untuk persistence
 * 
 * STRUCTURE:
 * - src/config/        => Configuration & constants
 * - src/middleware/    => Filters (old message, rate limit, dll)
 * - src/handlers/      => Message handlers (registration, admin, dll)
 * - src/services/      => External services (AI, storage, dll)
 * - src/database/      => Database operations
 * - src/utils/         => Utilities (logger, helpers)
 * 
 * CARA START:
 * 1. Install dependencies: npm install
 * 2. Set .env file dengan GROQ_API_KEY
 * 3. Edit ADMIN_NUMBERS di src/config/constants.js
 * 4. Run: npm start
 * 5. Scan QR code di terminal atau http://localhost:3000/qr
 * 
 * TODO BEFORE PRODUCTION:
 * [ ] Set ADMIN_NUMBERS di src/config/constants.js
 * [ ] Set PERSONAL_CONTACTS untuk blacklist (jika ada)
 * [ ] Update contact info di config/knowledge.txt
 * [ ] Update programs di config/programs.json
 * [ ] Update FAQ di config/faq.json
 * [ ] Test semua fitur dengan nomor dummy
 */

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const express = require('express');

// Import modules
const config = require('./src/config');
const middleware = require('./src/middleware');
const db = require('./src/database/db');
const logger = require('./src/utils/logger');

// Import bot.js lama untuk ambil helper functions
// TODO: Ini akan dipindah ke modules nanti
const path = require('path');
const fs = require('fs');
const Groq = require('groq-sdk');

// Initialize Groq AI
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Bot configuration
const BOT_NAME = process.env.BOT_NAME || 'Bot Dinas Sosial';
const DINAS_NAME = process.env.DINAS_NAME || 'Dinas Sosial';
const PORT = process.env.PORT || 3000;

// Global state
let qrCodeData = null;
let botReady = false;
let botStatus = 'initializing';

// Registration state (in-memory, consider moving to DB later)
const registrationState = new Map();

// ============================================================================
// EXPRESS SERVER (Health check & QR code display)
// ============================================================================

const app = express();

app.get('/ping', (req, res) => {
  res.json({
    status: 'alive',
    botReady: botReady,
    botStatus: botStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get('/qr', (req, res) => {
  if (!qrCodeData) {
    res.send(`
      <html>
        <head>
          <title>WhatsApp Bot - QR Code</title>
          <meta http-equiv="refresh" content="5">
        </head>
        <body style="text-align: center; padding: 50px; font-family: Arial;">
          <h1>Menunggu QR Code...</h1>
          <p>Status: ${botStatus}</p>
          <p>Halaman akan refresh otomatis setiap 5 detik</p>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head><title>Scan QR Code</title></head>
        <body style="text-align: center; padding: 50px; font-family: Arial;">
          <h1>Scan QR Code untuk Login WhatsApp</h1>
          <img src="${qrCodeData}" style="width: 400px; height: 400px; border: 5px solid #667eea; border-radius: 10px;" />
          <p>Gunakan HP WhatsApp yang akan dijadikan bot</p>
          <p><strong>QR code expired dalam 20 detik</strong></p>
        </body>
      </html>
    `);
  }
});

app.get('/', (req, res) => {
  res.json({
    name: 'WhatsApp Bot Dinas Sosial - Modular Version',
    version: '2.0.0',
    status: botStatus,
    botReady: botReady,
    uptime: Math.floor(process.uptime()),
    endpoints: {
      ping: '/ping',
      qr: '/qr',
    },
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  logger.info(`Health check server running on port ${PORT}`);
  logger.info(`QR Code URL: http://localhost:${PORT}/qr`);
  logger.info(`Health check: http://localhost:${PORT}/ping`);
});

// ============================================================================
// WHATSAPP CLIENT SETUP
// ============================================================================

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});

// ============================================================================
// HELPER FUNCTIONS (TODO: Move to services/)
// ============================================================================

function loadJSON(filename) {
  try {
    const filePath = path.join(__dirname, 'config', filename);
    if (!fs.existsSync(filePath)) {
      return filename === 'faq.json' ? {} : [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logger.error(`Error loading ${filename}`, error);
    return filename === 'faq.json' ? {} : [];
  }
}

function loadKnowledgeBase() {
  try {
    const filePath = path.join(__dirname, 'config', 'knowledge.txt');
    if (!fs.existsSync(filePath)) {
      return `Anda adalah asisten ${DINAS_NAME}. Bantu warga dengan informasi tentang program bantuan sosial.`;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return `Anda adalah asisten ${DINAS_NAME}.`;
  }
}

function findFAQAnswer(question) {
  const faq = loadJSON('faq.json');
  const lowerQuestion = question.toLowerCase();

  for (const [key, value] of Object.entries(faq)) {
    const keywords = key.toLowerCase().split(',').map((k) => k.trim());
    if (keywords.some((keyword) => lowerQuestion.includes(keyword))) {
      return value;
    }
  }
  return null;
}

async function askAI(question, context = '') {
  try {
    const knowledgeBase = loadKnowledgeBase();
    const programs = loadJSON('programs.json');

    const systemPrompt = `${knowledgeBase}

DATA PROGRAM BANTUAN:
${JSON.stringify(programs, null, 2)}

${context}

PENTING - GAYA BICARA:
- Bicara seperti staf customer service yang ramah, bukan robot
- Gunakan bahasa sehari-hari (tapi tetap sopan)
- Boleh pakai kata "kamu", "kok", "nih", "ya", "deh" untuk lebih natural
- Jangan terlalu formal atau kaku
- Jawaban langsung to the point, ga usah bertele-tele
- Akhiri dengan menawarkan bantuan lebih lanjut

Jawab dengan ramah dan informatif. Gunakan Bahasa Indonesia.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question },
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    logger.error('Error asking AI', error);
    throw error;
  }
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { greeting: 'Selamat pagi', emoji: '' };
  else if (hour >= 11 && hour < 15) return { greeting: 'Selamat siang', emoji: '' };
  else if (hour >= 15 && hour < 18) return { greeting: 'Selamat sore', emoji: '' };
  else return { greeting: 'Selamat malam', emoji: '' };
}

function getMainMenu() {
  const { greeting } = getTimeBasedGreeting();
  return `${greeting}!\n\nSaya asisten dari ${DINAS_NAME}. Ada yang bisa saya bantu?\n\nKalau mau, bisa pilih:\n- Info program bantuan sosial\n- Daftar bantuan\n- Tanya-tanya (FAQ)\n- Kontak kami\n\nAtau langsung chat aja, saya siap bantu!`;
}

function getServicesInfo() {
  const programs = loadJSON('programs.json');
  const { greeting } = getTimeBasedGreeting();
  let message = `${greeting}! Ini daftar program bantuan yang ada:\n\n`;

  if (programs.length === 0) {
    message += 'Maaf, saat ini belum ada program yang tersedia.\n\n';
  } else {
    programs.forEach((program, index) => {
      message += `${index + 1}. ${program.name}\n   ${program.description}\n\n`;
    });
  }

  message += 'Mau tahu lebih detail? Tinggal kirim angka programnya aja!\nAtau ketik "menu" kalau mau balik ke awal.';
  return message;
}

function getProgramDetail(programIndex) {
  const programs = loadJSON('programs.json');
  const program = programs[programIndex];

  if (!program) {
    return 'Program yang kamu maksud ga ketemu nih. Coba lihat daftar program dulu ya, ketik angka "2".';
  }

  let message = `Ini info tentang ${program.name}:\n\n`;
  message += `${program.description}\n\n`;
  message += `Syarat yang perlu disiapkan:\n`;
  program.requirements.forEach((req, i) => {
    message += `  ${i + 1}. ${req}\n`;
  });
  message += `\nCara daftarnya:\n${program.howToApply}\n\n`;
  message += `Kalau mau daftar sekarang, tinggal ketik:\ndaftar ${program.name}`;

  return message;
}

function getFAQ() {
  const faq = loadJSON('faq.json');
  const { greeting } = getTimeBasedGreeting();
  let message = `${greeting}! Ini beberapa pertanyaan yang sering ditanya:\n\n`;

  if (Object.keys(faq).length === 0) {
    message += 'Belum ada FAQ nih. Tapi ga papa, langsung tanya aja ke saya!\n\n';
  } else {
    let index = 1;
    for (const [question, answer] of Object.entries(faq)) {
      message += `${index}. ${question.split(',')[0]}\n${answer}\n\n`;
      index++;
      if (index > 5) break; // Limit 5 FAQ
    }
  }

  message += 'Ada pertanyaan lain? Langsung chat aja atau ketik "menu" ya!';
  return message;
}

function startRegistration(sender, programName) {
  registrationState.set(sender, {
    step: 'name',
    program: programName,
    data: {},
  });

  return `Oke siap, saya bantu daftarin kamu untuk ${programName} ya!\n\nBoleh kasih tau nama lengkap kamu? (sesuai KTP)`;
}

function handleRegistrationStep(sender, messageText) {
  const state = registrationState.get(sender);

  switch (state.step) {
    case 'name':
      state.data.name = messageText;
      state.step = 'nik';
      return `Oke ${messageText}, sekarang NIK-nya berapa?`;

    case 'nik':
      state.data.nik = messageText;
      state.step = 'address';
      return `Noted! Sekarang alamat lengkap kamu dimana? (RT/RW juga ya)`;

    case 'address':
      state.data.address = messageText;
      state.step = 'phone';
      return `Oke deh, terakhir... Nomor HP yang bisa dihubungi berapa?`;

    case 'phone':
      state.data.phone = messageText;
      state.step = 'confirm';

      const confirmMessage =
        `Oke, saya cek dulu datanya ya:\n\n` +
        `Nama: ${state.data.name}\n` +
        `NIK: ${state.data.nik}\n` +
        `Alamat: ${state.data.address}\n` +
        `HP: ${state.data.phone}\n\n` +
        `Udah bener semua? Kalau udah, ketik "ya" buat submit.\n` +
        `Kalau ada yang salah, ketik "batal" aja.`;

      return confirmMessage;

    case 'confirm':
      if (messageText.toLowerCase() === 'ya') {
        const regId = db.saveRegistration({
          program: state.program,
          ...state.data,
          phone: sender,
        });

        registrationState.delete(sender);

        return (
          `Pendaftaran kamu udah masuk kok!\n\n` +
          `Terima kasih ${state.data.name}, data kamu udah kami terima dan bakal segera diproses.\n\n` +
          `ID Registrasi: ${regId}\n\n` +
          `Nanti staff kami bakal hubungi kamu di ${state.data.phone} untuk verifikasi lebih lanjut.\n\n` +
          `Ada yang mau ditanyain lagi ga? Atau ketik "menu" aja kalau mau balik.`
        );
      } else if (messageText.toLowerCase() === 'batal') {
        registrationState.delete(sender);
        return 'Oke, pendaftarannya dibatalin ya. Ga papa kok! Kalau mau daftar lagi, tinggal hubungi aja.';
      } else {
        return 'Maaf, saya kurang paham. Ketik "ya" kalau datanya udah bener, atau "batal" kalau mau dibatalin.';
      }
  }
}

// ============================================================================
// WHATSAPP EVENT HANDLERS
// ============================================================================

client.on('qr', async (qr) => {
  logger.info('QR Code generated, scan to login');
  qrcode.generate(qr, { small: true });
  botStatus = 'waiting_for_qr_scan';
  
  try {
    qrCodeData = await QRCode.toDataURL(qr);
    logger.info(`QR Code ready at: http://localhost:${PORT}/qr`);
  } catch (error) {
    logger.error('Error generating QR code', error);
  }
});

client.on('authenticated', () => {
  logger.info('Authentication successful');
  botStatus = 'authenticated';
  qrCodeData = null;
});

client.on('auth_failure', (msg) => {
  logger.error('Authentication failed', msg);
  botStatus = 'auth_failed';
  qrCodeData = null;
});

client.on('ready', () => {
  logger.logBotReady();
  logger.info(`Bot Name: ${BOT_NAME}`);
  logger.info(`Dinas: ${DINAS_NAME}`);
  botReady = true;
  botStatus = 'ready';
  qrCodeData = null;
});

client.on('message', async (message) => {
  try {
    // Basic filters
    if (message.fromMe) return;
    if (message.from.includes('@g.us')) return;

    const sender = message.from;
    const text = message.body.trim();
    const lowerText = text.toLowerCase();
    
    // Get chat object
    const chat = await message.getChat();
    const workingHours = config.isWorkingHours();
    
    // Log incoming message
    logger.logIncomingMessage(message, chat, { workingHours });

    // ========================================================================
    // MIDDLEWARE FILTERS
    // ========================================================================
    
    // 1. Old message filter
    if (!middleware.oldMessageFilter(message)) return;
    
    // 2. Manual reply detection
    if (!await middleware.manualReplyFilter(message, chat)) return;
    
    // 3. Blacklist filter
    if (!middleware.blacklistFilter(message, chat)) return;
    
    // 4. Context detector (personal vs bot chat)
    if (!middleware.contextDetectorFilter(message, chat)) return;
    
    // 5. Opt-in filter
    if (!await middleware.optInFilter(message, chat, db)) return;
    
    // 6. Rate limiter
    if (!await middleware.rateLimitFilter(message, chat, db)) return;

    // ========================================================================
    // MESSAGE PROCESSING
    // ========================================================================
    
    let reply = '';

    // Handle ongoing registration
    if (registrationState.has(sender)) {
      reply = handleRegistrationStep(sender, text);
      await message.reply(reply);
      logger.logOutgoingReply(chat.name || sender, reply);
      return;
    }

    // Admin command: Data registrations
    if (lowerText === 'admin' || lowerText === 'data') {
      const registrations = db.getRecentRegistrations(5);
      const count = db.getRegistrationCount();
      
      if (count === 0) {
        reply = 'Belum ada data pendaftaran nih.';
      } else {
        reply = `Ini data pendaftaran terbaru (total: ${count} orang):\n\n`;
        registrations.forEach((reg, i) => {
          reply += `${i + 1}. ${reg.name || 'N/A'} - ${reg.program}\n`;
          reply += `   NIK: ${reg.nik || 'N/A'}\n`;
          reply += `   ${new Date(reg.created_at).toLocaleString('id-ID')}\n\n`;
        });
        
        if (count > 5) {
          reply += `(Ini cuma 5 data terakhir, totalnya ada ${count} orang)`;
        }
      }
      await message.reply(reply);
      logger.logOutgoingReply(chat.name || sender, reply);
      return;
    }

    // Admin commands (for ADMIN_NUMBERS only)
    if (config.ADMIN_NUMBERS.includes(sender)) {
      if (lowerText === 'bot status') {
        const uptime = Math.floor(process.uptime() / 3600);
        const stats = db.getActivationStats();
        reply = 
          `BOT STATUS\n\n` +
          `Status: Running\n` +
          `Uptime: ${uptime} hours\n` +
          `Activated users: ${stats.total}\n` +
          `Working hours: ${workingHours ? 'YES' : 'NO'}\n` +
          `Bot ready: ${botReady}\n` +
          `Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`;
        await message.reply(reply);
        logger.logOutgoingReply(chat.name || sender, reply);
        return;
      }
    }

    // Working hours check
    if (!workingHours) {
      const isInfoQuery = lowerText.includes('jam') || 
                           lowerText.includes('operasional') ||
                           lowerText.includes('kontak') ||
                           lowerText === 'menu' ||
                           lowerText === '4';
      
      if (!isInfoQuery) {
        reply = config.MESSAGES.OUTSIDE_WORKING_HOURS(getTimeBasedGreeting().greeting);
        await message.reply(reply);
        logger.logOutgoingReply(chat.name || sender, reply);
        return;
      }
    }

    // Main menu commands
    if (lowerText === 'halo' || lowerText === 'hi' || lowerText === 'menu' || lowerText === 'mulai') {
      reply = getMainMenu();
    } else if (lowerText === '1' || lowerText.includes('info layanan')) {
      reply = getServicesInfo();
    } else if (lowerText === '2' || lowerText.includes('daftar bantuan')) {
      reply = getServicesInfo();
    } else if (lowerText === '3' || lowerText.includes('faq')) {
      reply = getFAQ();
    } else if (lowerText === '4' || lowerText.includes('kontak')) {
      const { greeting } = getTimeBasedGreeting();
      reply =
        `${greeting}! Kalau mau hubungi kami, ini kontaknya:\n\n` +
        `Telepon: (0561) 123456\n` +
        `WhatsApp: 0812-3456-7890\n` +
        `Email: dinsos@example.com\n` +
        `Alamat: Jl. Contoh No.1\n\n` +
        `Kantor buka:\n` +
        `Senin - Jumat: 08.00 - 16.00\n` +
        `(Sabtu-Minggu libur ya)\n\n` +
        `Atau langsung chat di sini juga bisa kok!`;
    } else if (/^[1-9]$/.test(text)) {
      const programs = loadJSON('programs.json');
      const index = parseInt(text) - 1;
      reply = getProgramDetail(index);
    } else if (lowerText.startsWith('daftar ')) {
      const programName = text.substring(7).trim();
      reply = startRegistration(sender, programName);
    } else {
      // Check FAQ first
      const faqAnswer = findFAQAnswer(text);

      if (faqAnswer) {
        reply = `${faqAnswer}${config.MESSAGES.FAQ_RESPONSE_SUFFIX}`;
      } else {
        // Ask AI
        try {
          await message.reply(config.MESSAGES.PROCESSING);
          reply = await askAI(text);
          reply += config.MESSAGES.AI_RESPONSE_SUFFIX;
        } catch (error) {
          logger.error('AI error', error);
          reply = config.MESSAGES.AI_ERROR_FALLBACK;
        }
      }
    }

    await message.reply(reply);
    logger.logOutgoingReply(chat.name || sender, reply);

  } catch (error) {
    logger.error('Error handling message', error);
  }
});

client.on('disconnected', (reason) => {
  logger.error('Bot disconnected', reason);
  botReady = false;
  botStatus = 'disconnected';
  qrCodeData = null;
});

// ============================================================================
// STARTUP
// ============================================================================

// Initialize database
try {
  db.initDatabase();
  logger.info('Database ready');
} catch (error) {
  logger.error('Database initialization failed', error);
  process.exit(1);
}

// Log startup
logger.logBotStartup({
  botName: BOT_NAME,
  dinasName: DINAS_NAME,
  port: PORT
});

// Initialize WhatsApp client
logger.info('Initializing WhatsApp client...');
client.initialize();

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down bot...');
  db.closeDatabase();
  client.destroy();
  process.exit(0);
});
