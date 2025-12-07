# 🧪 Testing Checklist - Hybrid Mode Bot

## Pre-Flight Checks

- [ ] Dependencies installed (`npm install` completed)
- [ ] `.env` file exists with `GROQ_API_KEY`
- [ ] `ADMIN_NUMBERS` configured in bot.js (line ~438)
- [ ] `PERSONAL_CONTACTS` configured if needed (line ~443)
- [ ] Backup exists: `bot.js.backup`

---

## 🧪 Test Scenarios

### Test 1: Old Message Filter ⏰

**Goal:** Verify bot ignores messages older than 12 hours

**Steps:**
1. Stop bot if running
2. Send a test message to the bot number
3. Wait (or just note the time)
4. Start bot: `npm start`
5. Check logs

**Expected Result:**
- Recent messages (< 12 hours): ✅ Processed
- Old messages (> 12 hours): ⏭️ Skipped with log: `⏭️ SKIP: Old message (Xh old)`

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 2: Manual Reply Detection ✋

**Goal:** Verify bot doesn't reply if you already answered manually

**Steps:**
1. Bot is running
2. Send message from test number: "Test manual reply"
3. Reply manually from your WhatsApp before bot replies
4. Observe bot behavior

**Expected Result:**
- Bot detects your manual reply
- Bot skips with log: `✋ SKIP: Manual reply detected`
- No duplicate reply sent

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 3: Working Hours Detection 🕐

**Goal:** Verify bot sends auto-reply outside working hours

**Test 3A: Outside Working Hours (General Query)**
**Steps:**
1. Set time to outside 08:00-16:00 Mon-Fri (or wait until evening/weekend)
2. Send: "Halo, info bantuan"

**Expected Result:**
- Bot sends auto-reply about working hours
- Log shows: `🌙 Auto-reply sent (outside working hours)`

**Status:** [ ] Pass [ ] Fail

**Test 3B: Outside Working Hours (Info Query)**
**Steps:**
1. Still outside working hours
2. Send: "kontak" or "jam kerja" or "menu"

**Expected Result:**
- Bot processes normally (full response)
- Log shows: `ℹ️ Processing info query outside working hours`

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 4: Smart Context Detection 🧠

**Goal:** Verify bot distinguishes personal vs bot conversations

**Test 4A: Personal Chat (Should Skip)**
**Steps:**
1. From a saved contact (friend/family)
2. Send: "eh gimana kabarnya?" (no bot keywords)

**Expected Result:**
- Bot ignores message
- Log shows: `👤 SKIP: Personal chat without bot keywords`

**Status:** [ ] Pass [ ] Fail

**Test 4B: Bot Keywords Detected**
**Steps:**
1. From same contact
2. Send: "info program PKH"

**Expected Result:**
- Bot processes (has bot keyword "program" and "PKH")
- Bot replies with program info

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 5: Opt-In System 🎯

**Goal:** New users must use trigger keywords

**Test 5A: New User Without Trigger**
**Steps:**
1. From brand new contact (never chatted before)
2. Send: "123" or "test" (no trigger keyword)

**Expected Result:**
- Bot ignores
- Log shows: `🚫 SKIP: New user without trigger keyword`

**Status:** [ ] Pass [ ] Fail

**Test 5B: New User With Trigger**
**Steps:**
1. From same new contact
2. Send: "halo" or "menu"

**Expected Result:**
- Bot activates user
- Log shows: `✅ User activated`
- Bot replies with menu

**Status:** [ ] Pass [ ] Fail

**Test 5C: Activated User (Subsequent Messages)**
**Steps:**
1. From same contact (now activated)
2. Send: "123" (no trigger, but user already activated)

**Expected Result:**
- Bot processes message normally
- No "new user" skip

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 6: Rate Limiting 🚫

**Goal:** Verify anti-spam works (max 20 messages/hour)

**Steps:**
1. From test number
2. Send 21 messages rapidly (can use script or manual)
3. Observe bot behavior

**Expected Result:**
- First 20 messages: ✅ Processed normally
- 21st message: ⚠️ Rate limit warning sent
- Log shows: `🚫 RATE LIMIT: User reached limit`
- Further messages: Ignored (warning sent only once)

**Status:** [ ] Pass [ ] Fail

**Rate Limit Reset Test:**
- Wait 1 hour
- Send another message
- Should work again (counter reset)

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 7: Admin Commands 👨‍💼

**Prerequisites:** Your number must be in `ADMIN_NUMBERS`

**Test 7A: bot status**
**Steps:**
1. From your admin number
2. Send: "bot status"

**Expected Result:**
```
🤖 BOT STATUS

✅ Status: Running
⏰ Uptime: X hours
👥 Activated users: X
🕐 Working hours: YES/NO
📊 Bot ready: true
💾 Memory: X MB
```

**Status:** [ ] Pass [ ] Fail

**Test 7B: bot stats**
**Steps:**
1. Send: "bot stats"

**Expected Result:**
```
📊 BOT STATISTICS

Active sessions: X
Rate limited users: X

Top users:
[list of users]
```

**Status:** [ ] Pass [ ] Fail

**Test 7C: bot blacklist**
**Steps:**
1. Send: "bot blacklist 628123456789@c.us"

**Expected Result:**
- Confirmation message: `✅ Number added to blacklist`
- That number will be ignored by bot from now on

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 8: Personal Contacts Blacklist 🚷

**Goal:** Numbers in blacklist are never replied to

**Steps:**
1. Add a test number to `PERSONAL_CONTACTS` in bot.js
2. Restart bot
3. Send message from that number: "halo menu info"

**Expected Result:**
- Bot completely ignores message
- Log shows: `👤 SKIP: Personal contact in blacklist`

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 9: Enhanced Logging 📊

**Goal:** Verify detailed logs are working

**Steps:**
1. Send any message to bot
2. Check console output

**Expected Result:**
Detailed log format:
```
======================================================================
📩 INCOMING MESSAGE
From: [Name] ([Number])
Text: [Message]
Time: [Timestamp]
Age: X minutes
Is Contact: Yes/No
Working Hours: Yes ✅ / No 🌙
======================================================================

[Processing logs...]

📤 Reply sent to [Name]: [Reply preview]...
```

**Status:** [ ] Pass [ ] Fail

**Notes:**
```
_________________________________________________
```

---

### Test 10: AI Error Handling 🤖

**Goal:** Graceful fallback when AI fails

**Steps:**
1. Temporarily set wrong `GROQ_API_KEY` in `.env`
2. Restart bot
3. Send: "apa itu pkh?"

**Expected Result:**
- Bot sends: "Sebentar ya, saya cari jawabannya... ⏳"
- Then error handling kicks in
- Bot sends graceful error message with alternatives
- Log shows: `❌ AI Error: [error details]`

**Status:** [ ] Pass [ ] Fail

**Restore:**
- [ ] Fix `GROQ_API_KEY` back to correct value
- [ ] Restart bot

**Notes:**
```
_________________________________________________
```

---

## 📊 Test Summary

| Test | Status | Critical? | Notes |
|------|--------|-----------|-------|
| Old Message Filter | [ ] Pass [ ] Fail | ✅ Yes | |
| Manual Reply Detection | [ ] Pass [ ] Fail | ✅ Yes | |
| Working Hours | [ ] Pass [ ] Fail | ⚠️ Medium | |
| Context Detection | [ ] Pass [ ] Fail | ⚠️ Medium | |
| Opt-In System | [ ] Pass [ ] Fail | ⚠️ Medium | |
| Rate Limiting | [ ] Pass [ ] Fail | ⚠️ Medium | |
| Admin Commands | [ ] Pass [ ] Fail | ℹ️ Low | |
| Blacklist | [ ] Pass [ ] Fail | ⚠️ Medium | |
| Logging | [ ] Pass [ ] Fail | ℹ️ Low | |
| AI Error Handling | [ ] Pass [ ] Fail | ⚠️ Medium | |

---

## ✅ Go-Live Checklist

Before using in production:

- [ ] All critical tests passed
- [ ] Admin number configured correctly
- [ ] Personal contacts blacklist populated
- [ ] GROQ_API_KEY is valid and working
- [ ] Tested with real user scenarios
- [ ] Logs are readable and informative
- [ ] Bot responds within acceptable time
- [ ] No memory leaks observed (check after running 1+ hour)
- [ ] Backup file exists: `bot.js.backup`
- [ ] Documentation reviewed: `HYBRID_MODE_GUIDE.md`

---

## 🐛 Bug Reporting Template

If you find issues during testing:

**Bug:** [Short description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Logs:**
```
[Paste relevant logs here]
```

**Environment:**
- Node version: [run: node --version]
- npm version: [run: npm --version]
- OS: Windows/Linux/Mac

---

## 📝 Notes & Observations

Use this space for any additional observations during testing:

```









```

---

**Tester:** ________________  
**Date:** ________________  
**Version:** 2.0.0 - Hybrid Mode  
**Overall Status:** [ ] Ready for Production [ ] Needs Fixes
