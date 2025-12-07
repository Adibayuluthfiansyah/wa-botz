# ⚡ Quick Start Guide

## 🚀 First Time Setup (5 Minutes)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Set Your Admin Number

Edit `bot.js` line ~30:

```javascript
const ADMIN_NUMBERS = [
  '628xxxxxxxxxx@c.us', // YOUR NUMBER HERE
];
```

**Format:** 
- Your number: `0812-3456-7890`
- Bot format: `62812xxxxxxxx@c.us` (replace 0 with 62, remove dashes)

### Step 3: Configure .env

Make sure `.env` exists with:
```env
GROQ_API_KEY=your_groq_api_key
BOT_NAME=Bot Dinas Sosial
DINAS_NAME=Dinas Sosial Kota Pontianak
PORT=3000
```

### Step 4: Start Bot
```bash
npm start
```

### Step 5: Scan QR Code
- QR shows in terminal, OR
- Open browser: http://localhost:3000/qr
- Scan with WhatsApp (Menu → Linked Devices)

---

## ✅ What's New in Hybrid Mode

| Feature | What It Does |
|---------|--------------|
| **Old Message Filter** | Ignores messages older than 12 hours (no more spam on restart!) |
| **Manual Reply Detection** | Bot skips if you already replied manually |
| **Working Hours** | Auto-reply outside Mon-Fri 08:00-16:00 |
| **Context Detection** | Knows difference between personal chat vs bot queries |
| **Opt-In System** | New users must say "halo", "menu", etc first |
| **Rate Limiting** | Max 20 messages/hour per user (anti-spam) |
| **Admin Commands** | `bot status`, `bot stats`, `bot blacklist` |

---

## 🎯 Key Behaviors

### ✅ Bot WILL Reply To:
- New users who say "halo", "menu", "info", "bantuan", etc
- Users with bot keywords: "pkh", "bpnt", "daftar", "bantuan sosial"
- Messages less than 12 hours old
- Messages within rate limit (20/hour)

### ❌ Bot WILL NOT Reply To:
- Messages older than 12 hours
- Messages you already replied to manually
- Personal contacts in blacklist
- Personal chats without bot keywords
- New users without trigger words
- Rate limited users (>20 msgs/hour)

### 🌙 Outside Working Hours (Mon-Fri 08:00-16:00):
- Bot sends short auto-reply
- **Exception:** Info queries (menu, kontak, jam) still get full reply

---

## 👨‍💼 Admin Commands

Type these in your WhatsApp chat with the bot:

| Command | Result |
|---------|--------|
| `bot status` | Shows uptime, active users, memory usage |
| `bot stats` | Shows usage statistics |
| `bot blacklist 628xxx@c.us` | Adds number to blacklist |

---

## 🐛 Common Issues

### Bot replies to old messages
**Check:** `MESSAGE_MAX_AGE` is set to 12 hours  
**Verify:** See `⏭️ SKIP: Old message` in logs

### Bot replies to personal chats
**Solution:** Add to `PERSONAL_CONTACTS` array in bot.js

### Bot doesn't reply to anyone
**Check:** Is `GROQ_API_KEY` set in `.env`?  
**Check:** Are messages older than 12 hours?

### User complains "bot not responding"
**Ask user to:** Type "halo" or "menu" first (trigger keyword)

---

## 📊 Reading Logs

```
📩 INCOMING MESSAGE          ← New message received
⏭️ SKIP: Old message         ← Ignored (>12h old)
✋ SKIP: Manual reply         ← You already answered
👤 SKIP: Personal contact    ← In blacklist
🚫 SKIP: New user            ← No trigger keyword
🌙 Auto-reply sent           ← Outside working hours
✅ User activated            ← New user accepted
📤 Reply sent                ← Bot replied successfully
```

---

## 🔧 Quick Tweaks

### Change old message threshold (default: 12 hours)
```javascript
const MESSAGE_MAX_AGE = 6 * 60 * 60; // 6 hours
```

### Change rate limit (default: 20/hour)
```javascript
const RATE_LIMIT_MAX = 30; // 30 messages per hour
```

### Change working hours (default: Mon-Fri 08:00-16:00)
```javascript
function isWorkingHours() {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay();
  return (day >= 1 && day <= 5) && (hour >= 7 && hour < 17); // 07:00-17:00
}
```

### Add to blacklist
```javascript
const PERSONAL_CONTACTS = [
  '62812xxxxxxx@c.us', // Friend name
  '62813xxxxxxx@c.us', // Family name
];
```

---

## 🆘 Emergency Rollback

If something breaks:

```bash
# Stop bot (Ctrl+C)
copy bot.js.backup bot.js
npm start
```

---

## 📚 Full Documentation

See `HYBRID_MODE_GUIDE.md` for comprehensive documentation.

---

**Need Help?** Check the logs first! They're very detailed now.
