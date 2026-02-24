const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

const COLLAB_PATH = '/srv/apps/openclaw-ai-gateway/collab';
const INSTRUCTIONS_PATH = path.join(COLLAB_PATH, 'INSTRUCTIONS.md');
const LOG_PATH = path.join(COLLAB_PATH, 'LOG.md');
const ALERT_PATH = path.join(COLLAB_PATH, '.telegram-alert');
const TELEGRAM_CHAT_FILE = path.join(COLLAB_PATH, '.telegram-chat-id');

// Store chat ID for replies
function saveChatId(chatId) {
  fs.writeFileSync(TELEGRAM_CHAT_FILE, chatId.toString());
}

function getChatId() {
  try {
    return fs.readFileSync(TELEGRAM_CHAT_FILE, 'utf-8').trim();
  } catch (e) {
    return null;
  }
}

// Webhook endpoint for Telegram
app.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    if (update.message) {
      const { message_id, from, chat, text, date } = update.message;
      
      // Save chat ID for future replies
      saveChatId(chat.id);
      
      const timestamp = new Date(date * 1000).toISOString();
      const username = from.username || from.first_name || 'User';
      
      console.log(`\n🚨 TELEGRAM MESSAGE RECEIVED 🚨`);
      console.log(`From: @${username}`);
      console.log(`Message: ${text}`);
      console.log(`Time: ${timestamp}\n`);
      
      // Write to instructions file
      const instructionContent = `# TELEGRAM REQUEST

**Status:** NEW - AWAITING AI RESPONSE
**Time:** ${timestamp}
**From:** @${username} (ID: ${from.id})
**Chat ID:** ${chat.id}
**Message:** ${text}
**Message ID:** ${message_id}

---

**ACTION REQUIRED:**
AI Assistant - Please respond to this request immediately.

`;

      fs.writeFileSync(INSTRUCTIONS_PATH, instructionContent);
      
      // Create alert file for immediate notification
      const alertContent = JSON.stringify({
        type: 'telegram',
        timestamp: timestamp,
        username: username,
        message: text,
        chatId: chat.id,
        messageId: message_id,
        status: 'pending'
      }, null, 2);
      
      fs.writeFileSync(ALERT_PATH, alertContent);
      
      // Log it
      const logEntry = `\n### ${timestamp} - 📱 TELEGRAM REQUEST\n` +
        `- **From:** @${username}\n` +
        `- **Message:** ${text}\n` +
        `- **Status:** ⏳ PENDING AI RESPONSE\n` +
        `- **Alert File:** ${ALERT_PATH}\n`;
      
      fs.appendFileSync(LOG_PATH, logEntry);
      
      // Try to notify terminal with wall command
      try {
        const wallMessage = `\n╔════════════════════════════════════════════════╗\n` +
          `║  📱 NEW TELEGRAM MESSAGE FROM @${username.padEnd(28)}║\n` +
          `╠════════════════════════════════════════════════╣\n` +
          `║  ${text.substring(0, 44).padEnd(44)}║\n` +
          `╚════════════════════════════════════════════════╝\n`;
        
        exec(`echo "${wallMessage}" | wall`, (err) => {
          if (err) console.log('Wall notification failed (expected in container)');
        });
      } catch (e) {
        // Silent fail
      }
      
      // Send acknowledgment to Telegram
      res.json({
        method: 'sendMessage',
        chat_id: chat.id,
        text: `✅ *Received!*\n\nMessage: "${text}"\n\n⏳ The AI assistant has been notified and will respond shortly.\n\n💡 *Tip:* You can also chat directly in the terminal for faster responses!`,
        parse_mode: 'Markdown'
      });
      
      console.log('✅ Telegram request processed and saved\n');
      return;
    }
    
    res.sendStatus(200);
  } catch (e) {
    console.error('Webhook error:', e);
    res.sendStatus(500);
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    service: 'Telegram Webhook Bridge',
    timestamp: new Date().toISOString()
  });
});

// Get pending instruction
app.get('/pending', (req, res) => {
  try {
    if (fs.existsSync(ALERT_PATH)) {
      const alert = JSON.parse(fs.readFileSync(ALERT_PATH, 'utf-8'));
      if (alert.status === 'pending') {
        return res.json({
          hasPending: true,
          instruction: alert
        });
      }
    }
    res.json({ hasPending: false });
  } catch (e) {
    res.json({ hasPending: false, error: e.message });
  }
});

// Mark as completed
app.post('/complete', (req, res) => {
  try {
    if (fs.existsSync(ALERT_PATH)) {
      fs.unlinkSync(ALERT_PATH);
    }
    res.json({ success: true });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

const PORT = process.env.WEBHOOK_PORT || 3002;
app.listen(PORT, () => {
  console.log(`🌉 Telegram Webhook Bridge running on port ${PORT}`);
  console.log(`📁 Saving instructions to: ${INSTRUCTIONS_PATH}`);
  console.log(`🔔 Alert file: ${ALERT_PATH}`);
  console.log('⏳ Waiting for Telegram messages...\n');
});
