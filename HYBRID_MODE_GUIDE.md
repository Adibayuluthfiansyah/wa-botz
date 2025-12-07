# 🤖 Hybrid Mode Guide - WhatsApp Bot Dinas Sosial

## 📋 Overview

Bot ini sekarang berjalan dalam **HYBRID MODE** - bot dan manusia bisa menjawab chat bersamaan tanpa konflik!

### ✨ New Features

1. ✅ **Old Message Filter** - Ignore pesan lama (>12 jam)
2. ✅ **Manual Reply Detection** - Skip pesan yang sudah Anda jawab
3. ✅ **Working Hours Auto-Reply** - Smart response di luar jam kerja
4. ✅ **Smart Context Detection** - Bedakan chat personal vs bot
5. ✅ **Opt-In System** - User harus trigger dengan keyword
6. ✅ **Rate Limiting** - Anti-spam (max 20 pesan/jam per user)
7. ✅ **Enhanced Logging** - Detail log untuk monitoring
8. ✅ **Admin Commands** - Kontrol bot via chat
9. ✅ **Better Error Handling** - Graceful AI fallback

---

## 🚀 Quick Start

### 1. Install Dependencies (Jika Belum)

```bash
npm install
```

### 2. Setup Environment Variables

Pastikan file `.env` ada dengan isi:

```env
GROQ_API_KEY=your_groq_api_key_here
BOT_NAME=Bot Dinas Sosial
DINAS_NAME=Dinas Sosial Kota Pontianak
PORT=3000
```

### 3. Configure Admin Number (PENTING!)

Edit file `bot.js` line ~30:

```javascript
const ADMIN_NUMBERS = [
  '628xxxxxxxxxx@c.us', // Ganti dengan nomor WhatsApp Anda
];
```

**Cara mendapatkan format nomor:**
- Nomor Anda: 0812-3456-7890
- Format bot: `62812xxxxxxxx@c.us` (ganti 0 dengan 62, hilangkan tanda -)

### 4. Add Personal Contacts Blacklist (Optional)

Jika ada kontak pribadi yang TIDAK BOLEH dijawab bot:

```javascript
const PERSONAL_CONTACTS = [
  '62812xxxxxxx@c.us', // Teman A
  '62813xxxxxxx@c.us', // Keluarga B
];
```

### 5. Start Bot

```bash
npm start
```

### 6. Scan QR Code

- QR code muncul di terminal, ATAU
- Buka browser: `http://localhost:3000/qr`
- Scan dengan WhatsApp di HP (Menu → Linked Devices)

---

## 📖 How It Works

### Filter Pipeline (Urutan Proses)

Setiap pesan yang masuk akan melalui filter ini secara berurutan:

```
Message Received
    ↓
[1] Skip if from bot itself? → YES → ❌ SKIP
    ↓ NO
[2] Skip if from group? → YES → ❌ SKIP
    ↓ NO
[3] Older than 12 hours? → YES → ❌ SKIP (LOG: "Old message")
    ↓ NO
[4] Already manually replied? → YES → ❌ SKIP (LOG: "Manual reply detected")
    ↓ NO
[5] In personal blacklist? → YES → ❌ SKIP (LOG: "Personal contact")
    ↓ NO
[6] Personal chat without bot keywords? → YES → ❌ SKIP (LOG: "Personal chat")
    ↓ NO
[7] New user without trigger keyword? → YES → ❌ SKIP (LOG: "New user")
    ↓ NO (User activated!)
[8] Rate limit exceeded? → YES → ❌ SKIP + Warning message
    ↓ NO
[9] Admin command? → YES → ✅ Execute admin command
    ↓ NO
[10] Outside working hours? → YES → ✅ Send auto-reply (unless info query)
    ↓ NO (or info query)
[11] Process message normally → ✅ Bot replies
```

---

## 🔧 Configuration

### Tweak Settings

Edit di `bot.js` bagian "HYBRID MODE CONFIGURATION":

```javascript
// Berapa lama pesan dianggap "old"
const MESSAGE_MAX_AGE = 12 * 60 * 60; // 12 jam (dalam detik)

// Rate limiting
const RATE_LIMIT_MAX = 20; // Max 20 pesan per jam per user
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 jam

// Jam kerja (di function isWorkingHours)
// Senin-Jumat (day 1-5), Jam 8-16
return (day >= 1 && day <= 5) && (hour >= 8 && hour < 16);
```

### Keywords Configuration

**Bot Keywords** (untuk deteksi context):
```javascript
const BOT_KEYWORDS = [
  'bantuan', 'daftar', 'program', 'pkh', 'bpnt', 'pip', 'blt',
  'dinas', 'sosial', 'menu', 'info', 'syarat', 'cara',
  // Tambah keyword lain sesuai kebutuhan
];
```

**Trigger Keywords** (untuk opt-in new users):
```javascript
const TRIGGER_KEYWORDS = [
  'halo', 'hai', 'hi', 'menu', 'mulai', 'info', 
  'bantuan', 'daftar', 'assalamualaikum',
  // Tambah keyword lain
];
```

---

## 👨‍💼 Admin Commands

Jika nomor Anda sudah di-set sebagai ADMIN, Anda bisa pakai commands ini:

### `bot status`
Cek status bot, uptime, dan statistik.

**Response:**
```
🤖 BOT STATUS

✅ Status: Running
⏰ Uptime: 5 hours
👥 Activated users: 23
🕐 Working hours: YES ✅
📊 Bot ready: true
💾 Memory: 145 MB
```

### `bot stats`
Lihat statistik penggunaan bot.

**Response:**
```
📊 BOT STATISTICS

Active sessions: 23
Rate limited users: 2

Top users:
628123456789@c.us: 15
628987654321@c.us: 12
```

### `bot blacklist 628xxxxxxxxxx@c.us`
Tambah nomor ke blacklist (bot tidak akan reply).

**Response:**
```
✅ Number added to blacklist: 628xxxxxxxxxx@c.us
```

---

## 📊 Monitoring & Logs

### Log Format

Bot sekarang punya enhanced logging:

```
======================================================================
📩 INCOMING MESSAGE
From: Ibu Siti (628123456789@c.us)
Text: Halo, saya mau tanya tentang PKH
Time: 07/12/2024, 14:30:15
Age: 2 minutes
Is Contact: No
Working Hours: Yes ✅
======================================================================

✅ User activated: Ibu Siti (628123456789@c.us)
📊 Rate limit: 1/20 for Ibu Siti
📤 Reply sent to Ibu Siti: Selamat siang! ☀️ Saya asisten dari Dinas Sosial...
```

### Common Log Messages

| Log | Meaning |
|-----|---------|
| `⏭️ SKIP: Old message` | Pesan lebih tua dari 12 jam |
| `✋ SKIP: Manual reply detected` | Anda sudah jawab manual |
| `👤 SKIP: Personal contact in blacklist` | Nomor di blacklist |
| `👤 SKIP: Personal chat without bot keywords` | Chat personal tanpa keyword bot |
| `🚫 SKIP: New user without trigger keyword` | User baru tanpa trigger |
| `🚫 RATE LIMIT: User reached limit` | User spam (>20 pesan/jam) |
| `🌙 Auto-reply sent (outside working hours)` | Bot kirim auto-reply jam non-kerja |
| `✅ User activated` | User baru di-activate |
| `📤 Reply sent` | Bot berhasil reply |

---

## 🐛 Troubleshooting

### Bot Reply ke Pesan Lama saat Restart

**Problem:** Bot proses message history saat di-restart.

**Solution:** ✅ Sudah fixed! Bot sekarang ignore pesan >12 jam.

**Verify:**
- Check log: Harus ada `⏭️ SKIP: Old message` untuk pesan lama
- Adjust `MESSAGE_MAX_AGE` jika perlu lebih pendek/panjang

---

### Bot Reply ke Chat Personal

**Problem:** Bot reply ke teman/keluarga Anda.

**Solution 1:** Add ke blacklist

```javascript
const PERSONAL_CONTACTS = [
  '62812xxxxxxx@c.us', // Tambah nomor teman
];
```

**Solution 2:** Smart detection akan otomatis skip jika:
- Contact adalah saved contact Anda
- Tidak ada bot keywords dalam pesan
- Tidak ada trigger keywords

**Verify:**
- Check log: Harus ada `👤 SKIP: Personal chat`

---

### Bot Tidak Reply ke User Baru

**Problem:** User komplain bot tidak respond.

**Possible Cause:** User tidak pakai trigger keyword.

**Solution:** User harus mulai dengan keyword seperti:
- "Halo"
- "Menu"
- "Info"
- "Bantuan"
- "Daftar"

**Verify:**
- Check log: Ada `🚫 SKIP: New user without trigger keyword`
- Tell user untuk ketik salah satu trigger keyword

---

### Bot Tidak Reply di Malam Hari

**Problem:** User dapat auto-reply "di luar jam kerja".

**Expected Behavior:** ✅ Ini adalah fitur! Bot aktif 24/7 tapi:
- Jam kerja (Senin-Jumat 08:00-16:00): Full response
- Luar jam kerja: Auto-reply singkat + arahkan ke jam kerja

**Exception:** Query tentang info (jam, kontak, menu) tetap dijawab penuh.

**Adjust:** Edit function `isWorkingHours()` jika mau ubah jadwal.

---

### Rate Limit Warning

**Problem:** User dapat "Anda sudah mencapai batas maksimal pesan per jam".

**Cause:** User kirim >20 pesan dalam 1 jam (anti-spam).

**Solution:**
- Ini protection normal
- User bisa hubungi langsung via telepon/WA staff
- Limit reset setelah 1 jam

**Adjust:** Ubah `RATE_LIMIT_MAX` jika perlu lebih tinggi/rendah.

---

## 📝 Testing Checklist

### Before Going Live

- [ ] Install dependencies (`npm install`)
- [ ] Set GROQ_API_KEY di `.env`
- [ ] Set ADMIN_NUMBERS dengan nomor Anda
- [ ] Add PERSONAL_CONTACTS jika perlu
- [ ] Test bot reply to new user with "halo"
- [ ] Test bot ignore old messages (restart bot)
- [ ] Test manual reply (Anda jawab, bot skip)
- [ ] Test outside working hours (set waktu atau tunggu malam)
- [ ] Test rate limiting (kirim >20 pesan)
- [ ] Test admin commands (`bot status`, `bot stats`)

### Testing Scenarios

1. **New User Conversation:**
   ```
   User: halo
   Bot: [Menu utama]
   User: info PKH
   Bot: [Info PKH]
   ```

2. **Personal Chat (Should Skip):**
   ```
   Friend: eh udah makan?
   Bot: [No reply - logged as personal chat]
   ```

3. **Manual Reply Scenario:**
   ```
   User: tanya custom question
   You (manual): [Your answer]
   Bot: [No reply - detected manual reply]
   ```

4. **Outside Working Hours:**
   ```
   User (at 20:00): info bantuan
   Bot: [Auto-reply tentang jam kerja]
   
   User (at 20:00): kontak
   Bot: [Full contact info - exception for info query]
   ```

5. **Rate Limit:**
   ```
   User: [sends 21 messages in 1 hour]
   Bot: [After 20th: Rate limit warning]
   ```

---

## 🔄 Rollback (Jika Ada Masalah)

Jika ada masalah dengan versi baru:

```bash
# Stop bot (Ctrl+C)

# Restore backup
copy bot.js.backup bot.js

# Restart bot
npm start
```

File backup otomatis dibuat sebelum update: `bot.js.backup`

---

## 🎯 Best Practices

### For Personal Number Usage

1. ✅ **Set ADMIN_NUMBERS** - Penting untuk bypass filters
2. ✅ **Add close friends/family to PERSONAL_CONTACTS** - Prevent awkward bot replies
3. ✅ **Monitor logs regularly** - Check apakah ada false positive/negative
4. ✅ **Adjust MESSAGE_MAX_AGE** - 12 jam default, sesuaikan dengan pattern Anda
5. ✅ **Test thoroughly before production** - Gunakan nomor dummy dulu

### For Production Deployment

1. ✅ **Use dedicated number** - Jangan campur dengan nomor pribadi
2. ✅ **Set appropriate rate limits** - Sesuai dengan kapasitas server
3. ✅ **Monitor memory usage** - `activatedUsers` dan `userRateLimits` grow over time
4. ✅ **Regular restart** - Clear memory Maps (atau implement persistence)
5. ✅ **Backup registrations.json** - Data penting user

---

## 🆘 Support

### Issues?

1. Check logs di console
2. Verify configuration (ADMIN_NUMBERS, etc)
3. Test dengan nomor dummy
4. Restart bot (`Ctrl+C` → `npm start`)
5. Rollback jika perlu (`copy bot.js.backup bot.js`)

### Questions?

- Check this guide thoroughly
- Review code comments in `bot.js`
- Test incrementally (one feature at a time)

---

## 📄 Changelog

### v2.0.0 - Hybrid Mode Release

**Added:**
- Old message filter (12 hours)
- Manual reply detection
- Working hours auto-reply
- Smart context detection
- Opt-in system for new users
- Rate limiting (20 msg/hour)
- Enhanced logging
- Admin commands
- Better AI error handling

**Changed:**
- Message handler now has multi-stage filtering
- Improved console logging format
- Better error messages for users

**Fixed:**
- Bot no longer replies to old messages on restart
- Bot respects manual replies from admin
- Bot doesn't interfere with personal chats

---

**Last Updated:** December 7, 2024  
**Version:** 2.0.0 - Hybrid Mode
