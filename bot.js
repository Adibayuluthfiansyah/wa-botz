require("dotenv").config();
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const Groq = require("groq-sdk");
const fs = require("fs");
const path = require("path");

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

function getMainMenu() {
  return `Selamat datang di *${BOT_NAME}* 👋

Silakan pilih menu:

1️⃣ Info Layanan
2️⃣ Daftar Bantuan Sosial
3️⃣ FAQ (Pertanyaan Umum)
4️⃣ Kontak Staff

Atau langsung tanyakan sesuatu, saya akan bantu jawab! 😊

Ketik *menu* kapan saja untuk kembali ke sini.`;
}

function getServicesInfo() {
  const programs = loadJSON("programs.json");
  let message = `📋 *LAYANAN ${DINAS_NAME}*\n\n`;

  if (programs.length === 0) {
    message += "Belum ada data program bantuan.\n\n";
  } else {
    programs.forEach((program, index) => {
      message += `*${index + 1}. ${program.name}*\n`;
      message += `${program.description}\n\n`;
    });
  }

  message +=
    "Ketik nomor program untuk info lebih detail,\natau ketik *menu* untuk kembali.";
  return message;
}

function getProgramDetail(programIndex) {
  const programs = loadJSON("programs.json");
  const program = programs[programIndex];

  if (!program) {
    return "Program tidak ditemukan. Ketik *2* untuk melihat daftar program.";
  }

  let message = `📌 *${program.name}*\n\n`;
  message += `${program.description}\n\n`;
  message += `*Syarat:*\n`;
  program.requirements.forEach((req, i) => {
    message += `${i + 1}. ${req}\n`;
  });
  message += `\n*Cara Daftar:*\n${program.howToApply}\n\n`;
  message += `Ketik *daftar ${program.name}* untuk memulai pendaftaran.`;

  return message;
}

function getFAQ() {
  const faq = loadJSON("faq.json");
  let message = `❓ *PERTANYAAN UMUM (FAQ)*\n\n`;

  if (Object.keys(faq).length === 0) {
    message += "Belum ada FAQ. Anda bisa langsung bertanya pada saya!\n\n";
  } else {
    let index = 1;
    for (const [question, answer] of Object.entries(faq)) {
      message += `*${index}. ${question.split(",")[0]}*\n${answer}\n\n`;
      index++;
    }
  }

  message += "Ketik *menu* untuk kembali ke menu utama.";
  return message;
}

const registrationState = new Map();

function startRegistration(sender, programName) {
  registrationState.set(sender, {
    step: "name",
    program: programName,
    data: {},
  });

  return `Baik, saya akan bantu Anda mendaftar untuk *${programName}*.\n\nSilakan isi data berikut:\n\n*1. Nama Lengkap:*`;
}

function handleRegistrationStep(sender, message) {
  const state = registrationState.get(sender);

  switch (state.step) {
    case "name":
      state.data.name = message;
      state.step = "nik";
      return "*2. NIK (Nomor Induk Kependudukan):*";

    case "nik":
      state.data.nik = message;
      state.step = "address";
      return "*3. Alamat Lengkap:*";

    case "address":
      state.data.address = message;
      state.step = "phone";
      return "*4. Nomor HP yang bisa dihubungi:*";

    case "phone":
      state.data.phone = message;
      state.step = "confirm";

      const confirmMessage =
        `\n✅ *KONFIRMASI DATA*\n\n` +
        `Program: ${state.program}\n` +
        `Nama: ${state.data.name}\n` +
        `NIK: ${state.data.nik}\n` +
        `Alamat: ${state.data.address}\n` +
        `HP: ${state.data.phone}\n\n` +
        `Apakah data sudah benar?\nKetik *ya* untuk submit atau *batal* untuk membatalkan.`;

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
            `✅ *PENDAFTARAN BERHASIL!*\n\n` +
            `Terima kasih ${state.data.name}.\n` +
            `Data Anda telah kami terima dan akan segera diproses.\n\n` +
            `Staff kami akan menghubungi Anda melalui nomor ${state.data.phone} untuk verifikasi lebih lanjut.\n\n` +
            `Ketik *menu* untuk kembali.`
          );
        } else {
          return "Maaf, terjadi kesalahan. Silakan coba lagi nanti.";
        }
      } else if (message.toLowerCase() === "batal") {
        registrationState.delete(sender);
        return "Pendaftaran dibatalkan. Ketik *menu* untuk kembali.";
      } else {
        return "Mohon ketik *ya* untuk konfirmasi atau *batal* untuk membatalkan.";
      }
  }
}

// EVENT HANDLERS
client.on("qr", (qr) => {
  console.log("🔄 Scan QR code dibawah ini:");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ Bot siap digunakan!");
  console.log(`📱 Bot Name: ${BOT_NAME}`);
  console.log(`🏢 Dinas: ${DINAS_NAME}`);
});

client.on("message", async (message) => {
  const sender = message.from;
  const text = message.body.trim();
  const lowerText = text.toLowerCase();

  console.log(`📩 Pesan dari ${sender}: ${text}`);

  if (message.from.includes("@g.us")) return;

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
          reply = "📊 Belum ada data pendaftaran.";
        } else {
          reply = `📊 *DATA PENDAFTARAN* (${registrations.length} pendaftar)\n\n`;
          registrations.slice(-5).forEach((reg, i) => {
            reply += `${i + 1}. ${reg.data.name} - ${reg.program}\n`;
            reply += `   NIK: ${reg.data.nik}\n`;
            reply += `   ${new Date(reg.timestamp).toLocaleString(
              "id-ID"
            )}\n\n`;
          });

          if (registrations.length > 5) {
            reply += `\n(Menampilkan 5 data terakhir dari ${registrations.length} total)`;
          }
        }
      } else {
        reply = "📊 Belum ada data pendaftaran.";
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
    lowerText === "mulai"
  ) {
    reply = getMainMenu();
  } else if (lowerText === "1" || lowerText.includes("info layanan")) {
    reply = getServicesInfo();
  } else if (lowerText === "2" || lowerText.includes("daftar bantuan")) {
    reply = getServicesInfo();
  } else if (lowerText === "3" || lowerText.includes("faq")) {
    reply = getFAQ();
  } else if (lowerText === "4" || lowerText.includes("kontak")) {
    reply =
      `📞 *KONTAK ${DINAS_NAME}*\n\n` +
      `Kantor: (0561) 123456\n` +
      `WhatsApp: 0812-3456-7890\n` +
      `Email: dinsos@example.com\n` +
      `Alamat: Jl. Contoh No.1\n\n` +
      `Jam Operasional:\n` +
      `Senin - Jumat: 08.00 - 16.00\n\n` +
      `Ketik *menu* untuk kembali.`;
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
      reply = `${faqAnswer}\n\n_Jawaban dari FAQ. Ketik *menu* untuk opsi lain._`;
    } else {
      await message.reply("_Tunggu sebentar, saya cari jawabannya..._");
      reply = await askAI(text);
      reply += "\n\n_Dijawab oleh AI. Ketik *menu* untuk opsi lain._";
    }
  }

  await message.reply(reply);
});

client.on("disconnected", (reason) => {
  console.log("❌ Bot terputus:", reason);
});

console.log("🚀 Memulai bot...");
client.initialize();
