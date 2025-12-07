require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const QRCode = require("qrcode");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");
const express = require("express");

// Initialize Express for health check and QR display
const app = express();
const PORT = process.env.PORT || 3000;

// Global variables untuk tracking status
let qrCodeData = null;
let botReady = false;
let botStatus = "initializing";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const BOT_NAME = process.env.BOT_NAME || "Bot Dinas Sosial";
const DINAS_NAME = process.env.DINAS_NAME || "Dinas Sosial";

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// ============================================================================
// EXPRESS ENDPOINTS - UNTUK RENDER.COM HEALTH CHECK & QR CODE DISPLAY
// ============================================================================

// Health check endpoint (untuk anti-sleep)
app.get("/ping", (req, res) => {
  res.json({
    status: "alive",
    botReady: botReady,
    botStatus: botStatus,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// QR code display endpoint (untuk scan WhatsApp)
app.get("/qr", (req, res) => {
  if (!qrCodeData) {
    res.send(`
      <html>
        <head>
          <title>WhatsApp Bot - QR Code</title>
          <meta http-equiv="refresh" content="5">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 10px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #667eea; }
            .status { 
              padding: 10px; 
              background: #fef3c7; 
              border-radius: 5px; 
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>⏳ Menunggu QR Code...</h1>
            <div class="status">
              <p><strong>Status:</strong> ${botStatus}</p>
              <p>Halaman akan refresh otomatis setiap 5 detik</p>
            </div>
            <p>Jika QR tidak muncul setelah 1 menit, cek logs di Render dashboard</p>
          </div>
        </body>
      </html>
    `);
  } else {
    res.send(`
      <html>
        <head>
          <title>WhatsApp Bot - Scan QR Code</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              background: white;
              color: #333;
              padding: 40px;
              border-radius: 10px;
              max-width: 600px;
              margin: 0 auto;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #667eea; margin-bottom: 10px; }
            img { 
              border: 5px solid #667eea; 
              border-radius: 10px; 
              margin: 20px 0;
            }
            .instructions {
              text-align: left;
              background: #f3f4f6;
              padding: 20px;
              border-radius: 5px;
              margin-top: 20px;
            }
            .instructions ol {
              margin: 10px 0;
              padding-left: 20px;
            }
            .warning {
              background: #fef3c7;
              padding: 10px;
              border-radius: 5px;
              margin-top: 20px;
              border-left: 4px solid #f59e0b;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📱 Scan QR Code untuk Login WhatsApp</h1>
            <p>Gunakan HP WhatsApp yang akan dijadikan bot</p>
            <img src="${qrCodeData}" style="width: 400px; height: 400px;" />
            
            <div class="instructions">
              <h3>Cara Scan:</h3>
              <ol>
                <li>Buka WhatsApp di HP kamu</li>
                <li>Klik menu (⋮) → <strong>Linked Devices</strong></li>
                <li>Klik <strong>Link a Device</strong></li>
                <li>Scan QR code di atas</li>
              </ol>
            </div>

            <div class="warning">
              <strong>⚠️ Penting:</strong> QR code akan expired dalam 20 detik. Jika expired, refresh halaman ini.
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Status bot endpoint (root)
app.get("/", (req, res) => {
  res.json({
    name: "WhatsApp Bot Dinas Sosial",
    version: "1.0.0",
    status: botStatus,
    botReady: botReady,
    uptime: Math.floor(process.uptime()),
    endpoints: {
      ping: "/ping",
      qr: "/qr",
      status: "/",
    },
    timestamp: new Date().toISOString(),
  });
});

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
  console.log(`📱 QR Code URL: http://localhost:${PORT}/qr`);
  console.log(`💓 Health check: http://localhost:${PORT}/ping`);
});

// ============================================================================
// WHATSAPP BOT - EXISTING CODE
// ============================================================================

function loadJSON(filename) {
  try {
    const filePath = path.join(__dirname, "config", filename);
    if (!fs.existsSync(filePath)) {
      return filename === "faq.json" ? {} : [];
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error loading ${filename}:`, error);
    return filename === "faq.json" ? {} : [];
  }
}

function saveRegistration(data) {
  try {
    const filePath = path.join(__dirname, "data", "registrations.json");
    let registrations = [];

    if (fs.existsSync(filePath)) {
      const fileData = fs.readFileSync(filePath, "utf8");
      registrations = JSON.parse(fileData);
    }

    registrations.push({
      ...data,
      timestamp: new Date().toISOString(),
      id: `REG-${Date.now()}`,
    });

    fs.writeFileSync(filePath, JSON.stringify(registrations, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving registration:", error);
    return false;
  }
}

function loadKnowledgeBase() {
  try {
    const filePath = path.join(__dirname, "config", "knowledge.txt");
    if (!fs.existsSync(filePath)) {
      return `Anda adalah asisten ${DINAS_NAME}. Bantu warga dengan informasi tentang program bantuan sosial.`;
    }
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    return `Anda adalah asisten ${DINAS_NAME}.`;
  }
}

function findFAQAnswer(question) {
  const faq = loadJSON("faq.json");
  const lowerQuestion = question.toLowerCase();

  for (const [key, value] of Object.entries(faq)) {
    const keywords = key
      .toLowerCase()
      .split(",")
      .map((k) => k.trim());
    if (keywords.some((keyword) => lowerQuestion.includes(keyword))) {
      return value;
    }
  }
  return null;
}

async function askAI(question, context = "") {
  try {
    const knowledgeBase = loadKnowledgeBase();
    const programs = loadJSON("programs.json");

    const systemPrompt = `${knowledgeBase}

DATA PROGRAM BANTUAN:
${JSON.stringify(programs, null, 2)}

${context}

PENTING - GAYA BICARA:
- Bicara seperti staf customer service yang ramah, bukan robot
- Gunakan bahasa sehari-hari (tapi tetap sopan)
- Boleh pakai kata "kamu", "kok", "nih", "ya", "deh" untuk lebih natural
- Jangan terlalu formal atau kaku
- Emoji boleh dipakai secukupnya
- Jawaban langsung to the point, ga usah bertele-tele
- Akhiri dengan menawarkan bantuan lebih lanjut

Contoh gaya bicara yang BENAR:
"Oke, jadi untuk daftar PKH itu syaratnya kamu harus terdaftar di DTKS dulu ya. Terus kalau di keluarga ada ibu hamil, anak kecil, atau lansia, bisa banget ikutan program ini."

Contoh gaya bicara yang SALAH (terlalu formal):
"Terima kasih atas pertanyaan Anda. Untuk Program Keluarga Harapan (PKH), persyaratan yang harus dipenuhi adalah sebagai berikut:..."

Jawab dengan ramah dan informatif. Gunakan Bahasa Indonesia. Jika ditanya tentang program bantuan, sebutkan nama program, syarat, dan cara daftarnya.`;

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error asking AI:", error);
    return "Maaf, saya sedang mengalami gangguan. Silakan coba lagi nanti atau hubungi staff kami.";
  }
}

function getTimeBasedGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 11) {
    return { greeting: "Selamat pagi", emoji: "🌅" };
  } else if (hour >= 11 && hour < 15) {
    return { greeting: "Selamat siang", emoji: "☀️" };
  } else if (hour >= 15 && hour < 18) {
    return { greeting: "Selamat sore", emoji: "🌇" };
  } else {
    return { greeting: "Selamat malam", emoji: "🌙" };
  }
}

function getMainMenu() {
  const { greeting, emoji } = getTimeBasedGreeting();

  return `${greeting}! ${emoji}

Saya asisten dari ${DINAS_NAME}. Ada yang bisa saya bantu?

Kalau mau, bisa pilih:
• Info program bantuan sosial
• Daftar bantuan
• Tanya-tanya (FAQ)
• Kontak kami

Atau langsung chat aja, saya siap bantu! 😊`;
}

function getServicesInfo() {
  const programs = loadJSON("programs.json");
  const { greeting } = getTimeBasedGreeting();

  let message = `${greeting}! Ini daftar program bantuan yang ada:\n\n`;

  if (programs.length === 0) {
    message +=
      "Maaf, saat ini belum ada program yang tersedia. Coba tanya ke staff kami ya!\n\n";
  } else {
    programs.forEach((program, index) => {
      message += `${index + 1}. *${program.name}*\n   ${
        program.description
      }\n\n`;
    });
  }

  message += "Mau tahu lebih detail? Tinggal kirim angka programnya aja!\n";
  message += "Atau ketik *menu* kalau mau balik ke awal.";
  return message;
}

function getProgramDetail(programIndex) {
  const programs = loadJSON("programs.json");
  const program = programs[programIndex];

  if (!program) {
    return "Waduh, program yang kamu maksud ga ketemu nih. Coba lihat daftar program dulu ya, ketik angka *2*.";
  }

  let message = `Oke, ini info tentang *${program.name}*:\n\n`;
  message += `${program.description}\n\n`;
  message += `*Syarat yang perlu disiapkan:*\n`;
  program.requirements.forEach((req, i) => {
    message += `  ${i + 1}. ${req}\n`;
  });
  message += `\n*Cara daftarnya:*\n${program.howToApply}\n\n`;
  message += `Kalau mau daftar sekarang, tinggal ketik:\n*daftar ${program.name}*`;

  return message;
}

function getFAQ() {
  const faq = loadJSON("faq.json");
  const { greeting } = getTimeBasedGreeting();

  let message = `${greeting}! Ini beberapa pertanyaan yang sering ditanya:\n\n`;

  if (Object.keys(faq).length === 0) {
    message +=
      "Belum ada FAQ nih. Tapi ga papa, langsung tanya aja ke saya! 😊\n\n";
  } else {
    let index = 1;
    for (const [question, answer] of Object.entries(faq)) {
      message += `*${index}. ${question.split(",")[0]}*\n${answer}\n\n`;
      index++;
    }
  }

  message += "Ada pertanyaan lain? Langsung chat aja atau ketik *menu* ya!";
  return message;
}

function isGreeting(text) {
  // Daftar sapaan yang dikenali bot
  // Tambahkan kata-kata sapaan lain sesuai kebutuhan
  const greetings = [
    'halo', 'hai', 'hi', 'hello', 'hey',
    'pagi', 'siang', 'sore', 'malam',
    'selamat pagi', 'selamat siang', 'selamat sore', 'selamat malam',
    'assalamualaikum', 'assalamualaykum', 'waalaikumsalam', 'walaikumsalam',
    'permisi', 'gan', 'min', 'admin', 'bang', 'kak',
    'hola', 'hy', 'p', 'hay'
  ];
  
  const lowerText = text.toLowerCase().trim();
  
  // Cek apakah text persis salah satu greeting
  if (greetings.includes(lowerText)) {
    return true;
  }
  
  // Cek apakah text dimulai dengan greeting (untuk yang ada tambahan seperti "halo kak")
  return greetings.some(greeting => lowerText.startsWith(greeting + ' ') || lowerText.startsWith(greeting));
}

const registrationState = new Map();

function startRegistration(sender, programName) {
  registrationState.set(sender, {
    step: "name",
    program: programName,
    data: {},
  });

  return `Oke siap, saya bantu daftarin kamu untuk *${programName}* ya! 😊\n\nBoleh kasih tau nama lengkap kamu? (sesuai KTP)`;
}

function handleRegistrationStep(sender, message) {
  const state = registrationState.get(sender);

  switch (state.step) {
    case "name":
      state.data.name = message;
      state.step = "nik";
      return `Oke ${message}, sekarang NIK-nya berapa?`;

    case "nik":
      state.data.nik = message;
      state.step = "address";
      return `Noted! Sekarang alamat lengkap kamu dimana? (RT/RW juga ya)`;

    case "address":
      state.data.address = message;
      state.step = "phone";
      return `Oke deh, terakhir... Nomor HP yang bisa dihubungi berapa?`;

    case "phone":
      state.data.phone = message;
      state.step = "confirm";

      const confirmMessage =
        `Oke, saya cek dulu datanya ya:\n\n` +
        `📝 Nama: ${state.data.name}\n` +
        `📝 NIK: ${state.data.nik}\n` +
        `📝 Alamat: ${state.data.address}\n` +
        `📝 HP: ${state.data.phone}\n\n` +
        `Udah bener semua? Kalau udah, ketik *ya* buat submit.\n` +
        `Kalau ada yang salah, ketik *batal* aja.`;

      return confirmMessage;

    case "confirm":
      if (message.toLowerCase() === "ya") {
        const saved = saveRegistration({
          program: state.program,
          ...state.data,
          phone: sender,
        });

        registrationState.delete(sender);

        if (saved) {
          return (
            `Yeay! ✅ Pendaftaran kamu udah masuk kok!\n\n` +
            `Terima kasih ya ${state.data.name}, data kamu udah kami terima dan bakal segera diproses.\n\n` +
            `Nanti staff kami bakal hubungi kamu di ${state.data.phone} untuk verifikasi lebih lanjut.\n\n` +
            `Ada yang mau ditanyain lagi ga? Atau ketik *menu* aja kalau mau balik.`
          );
        } else {
          return "Waduh maaf, ada kendala nih di sistem. Coba lagi nanti ya, atau hubungi staff kami langsung.";
        }
      } else if (message.toLowerCase() === "batal") {
        registrationState.delete(sender);
        return "Oke, pendaftarannya dibatalin ya. Ga papa kok! Kalau mau daftar lagi, tinggal hubungi aja. 😊";
      } else {
        return "Maaf, saya kurang paham. Ketik *ya* kalau datanya udah bener, atau *batal* kalau mau dibatalin.";
      }
  }
}

// EVENT HANDLERS
client.on("qr", async (qr) => {
  console.log("🔄 Scan QR code dibawah ini:");
  qrcode.generate(qr, { small: true });
  
  // Update status dan simpan QR untuk endpoint /qr
  botStatus = "waiting_for_qr_scan";
  try {
    qrCodeData = await QRCode.toDataURL(qr);
    console.log(`📱 QR Code ready! Open: http://localhost:${PORT}/qr`);
    if (process.env.RENDER) {
      console.log(`📱 Or visit: https://${process.env.RENDER_EXTERNAL_HOSTNAME}/qr`);
    }
  } catch (error) {
    console.error("❌ Error generating QR code:", error);
  }
});

client.on("authenticated", () => {
  console.log("🔐 Authentication successful!");
  botStatus = "authenticated";
  qrCodeData = null; // Clear QR setelah berhasil login
});

client.on("auth_failure", (msg) => {
  console.error("❌ Authentication failed:", msg);
  botStatus = "auth_failed";
  qrCodeData = null;
});

client.on("ready", () => {
  console.log("✅ Bot siap digunakan!");
  console.log(`📱 Bot Name: ${BOT_NAME}`);
  console.log(`🏢 Dinas: ${DINAS_NAME}`);
  botReady = true;
  botStatus = "ready";
  qrCodeData = null; // Clear QR setelah bot ready
});

client.on("message", async (message) => {
  if (message.fromMe) return;
  if (message.from.includes("@g.us")) return;

  const sender = message.from;
  const text = message.body.trim();
  const lowerText = text.toLowerCase();

  console.log(`📩 Pesan dari ${sender}: ${text}`);

  let reply = "";

  if (registrationState.has(sender)) {
    reply = handleRegistrationStep(sender, text);
    await message.reply(reply);
    return;
  }

  if (lowerText === "admin" || lowerText === "data") {
    try {
      const filePath = path.join(__dirname, "data", "registrations.json");
      if (fs.existsSync(filePath)) {
        const data = fs.readFileSync(filePath, "utf8");
        const registrations = JSON.parse(data);

        if (registrations.length === 0) {
          reply = "Belum ada data pendaftaran nih.";
        } else {
          reply = `Oke, ini data pendaftaran terbaru (total: ${registrations.length} orang):\n\n`;
          registrations.slice(-5).forEach((reg, i) => {
            reply += `${i + 1}. ${reg.name || reg.data?.name || "N/A"} - ${
              reg.program
            }\n`;
            reply += `   NIK: ${reg.nik || reg.data?.nik || "N/A"}\n`;
            reply += `   ${new Date(reg.timestamp).toLocaleString(
              "id-ID"
            )}\n\n`;
          });

          if (registrations.length > 5) {
            reply += `(Ini cuma 5 data terakhir, totalnya ada ${registrations.length} orang)`;
          }
        }
      } else {
        reply = "Belum ada data pendaftaran nih.";
      }
      await message.reply(reply);
      return;
    } catch (error) {
      reply = "Error membaca data pendaftaran.";
      await message.reply(reply);
      return;
    }
  }

  if (
    lowerText === "halo" ||
    lowerText === "hi" ||
    lowerText === "menu" ||
    lowerText === "mulai" ||
    isGreeting(text)
  ) {
    reply = getMainMenu();
  } else if (lowerText === "1" || lowerText.includes("info layanan")) {
    reply = getServicesInfo();
  } else if (lowerText === "2" || lowerText.includes("daftar bantuan")) {
    reply = getServicesInfo();
  } else if (lowerText === "3" || lowerText.includes("faq")) {
    reply = getFAQ();
  } else if (lowerText === "4" || lowerText.includes("kontak")) {
    const { greeting } = getTimeBasedGreeting();
    reply =
      `${greeting}! Kalau mau hubungi kami, ini kontaknya:\n\n` +
      `📞 Telepon: (0561) 123456\n` +
      `💬 WhatsApp: 0812-3456-7890\n` +
      `📧 Email: dinsos@example.com\n` +
      `📍 Alamat: Jl. Contoh No.1\n\n` +
      `Kantor buka:\n` +
      `Senin - Jumat: 08.00 - 16.00\n` +
      `(Sabtu-Minggu libur ya)\n\n` +
      `Atau langsung chat di sini juga bisa kok! 😊`;
  } else if (/^[1-9]$/.test(text)) {
    const programs = loadJSON("programs.json");
    const index = parseInt(text) - 1;
    reply = getProgramDetail(index);
  } else if (lowerText.startsWith("daftar ")) {
    const programName = text.substring(7).trim();
    reply = startRegistration(sender, programName);
  } else {
    const faqAnswer = findFAQAnswer(text);

    if (faqAnswer) {
      reply = `${faqAnswer}\n\nSemoga membantu ya! Ada yang mau ditanya lagi?`;
    } else {
      await message.reply("Sebentar ya...");
      reply = await askAI(text);
      reply +=
        "\n\nSemoga jawaban saya membantu! Kalau masih bingung atau mau tanya lagi, langsung chat aja. 😊";
    }
  }

  await message.reply(reply);
});

client.on("disconnected", (reason) => {
  console.log("❌ Bot terputus:", reason);
  botReady = false;
  botStatus = "disconnected";
  qrCodeData = null;
});

console.log("🚀 Memulai bot...");
client.initialize();
