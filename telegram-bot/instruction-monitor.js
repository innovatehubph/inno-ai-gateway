const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Path to instructions file
const INSTRUCTIONS_PATH = '/srv/apps/openclaw-ai-gateway/collab/INSTRUCTIONS.md';
const LOG_PATH = '/srv/apps/openclaw-ai-gateway/collab/LOG.md';

let lastContent = '';
let lastCheck = Date.now();

console.log('👁️  Instruction Monitor Started');
console.log('📁 Watching:', INSTRUCTIONS_PATH);
console.log('⏱️  Checking every 5 seconds...\n');

function checkForNewInstructions() {
  try {
    if (fs.existsSync(INSTRUCTIONS_PATH)) {
      const currentContent = fs.readFileSync(INSTRUCTIONS_PATH, 'utf-8');
      
      // Check if content changed and contains a new instruction
      if (currentContent !== lastContent && currentContent.includes('Instruction from Telegram')) {
        // Extract the instruction
        const lines = currentContent.split('\n');
        const timeLine = lines.find(l => l.includes('Time:'));
        const messageLine = lines.find(l => l.includes('Message:'));
        
        if (messageLine) {
          const message = messageLine.replace('**Message:**', '').trim();
          const time = timeLine ? timeLine.replace('**Time:**', '').trim() : new Date().toISOString();
          
          // Log the detection
          const logEntry = `\n### ${time} - NEW INSTRUCTION DETECTED\n- 📱 Source: Telegram Bot\n- 📝 Message: ${message}\n- 👁️  Status: AWAITING AI RESPONSE\n`;
          
          fs.appendFileSync(LOG_PATH, logEntry);
          
          console.log('\n' + '='.repeat(60));
          console.log('🚨 NEW INSTRUCTION FROM TELEGRAM!');
          console.log('='.repeat(60));
          console.log(`🕐 Time: ${time}`);
          console.log(`💬 Message: ${message}`);
          console.log('='.repeat(60));
          console.log('\n👉 Tell the AI assistant: "Check for new Telegram instructions"\n');
          
          // Try to notify via wall command (if terminal is available)
          try {
            exec(`wall "🚨 NEW TELEGRAM INSTRUCTION: ${message.substring(0, 50)}..."`, (err) => {
              // Ignore errors, this is just a bonus notification
            });
          } catch (e) {
            // Silent fail
          }
        }
        
        lastContent = currentContent;
      }
    }
  } catch (e) {
    console.error('Error checking instructions:', e.message);
  }
}

// Check every 5 seconds
setInterval(checkForNewInstructions, 5000);

// Initial check
checkForNewInstructions();

console.log('✅ Monitor is running. Waiting for instructions...\n');
