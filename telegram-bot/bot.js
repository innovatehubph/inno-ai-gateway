import { Telegraf, Markup } from 'telegraf';
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from the bot's directory
dotenv.config({ path: path.join(__dirname, '.env') });

// Paths
const COLLAB_PATH = process.env.COLLAB_PATH || '/srv/apps/openclaw-ai-gateway/collab';
const LOG_PATH = path.join(COLLAB_PATH, 'LOG.md');
const STATUS_PATH = path.join(COLLAB_PATH, 'STATUS.md');
const TODO_PATH = path.join(COLLAB_PATH, 'TODO.md');
const NEXT_PATH = path.join(COLLAB_PATH, 'NEXT.md');
const ISSUES_PATH = path.join(COLLAB_PATH, 'ISSUES.md');
const INSTRUCTIONS_PATH = path.join(COLLAB_PATH, 'INSTRUCTIONS.md');

// Bot setup
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

// Express app for webhook
const app = express();
app.use(express.json());

// Helper functions
async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (e) {
    return 'File not found';
  }
}

async function writeInstruction(text) {
  const timestamp = new Date().toISOString();
  const content = `# Instruction from Telegram\n\n**Time:** ${timestamp}\n**Message:** ${text}\n\n---\n\n`;
  await fs.writeFile(INSTRUCTIONS_PATH, content);
  return true;
}

// Keyboard markup
const mainMenu = Markup.keyboard([
  ['📊 Status', '📋 Todo List'],
  ['▶️ Next Action', '🐛 Issues'],
  ['📒 Recent Log', '🔄 Refresh'],
  ['✏️ Send Instruction']
]).resize();

// Bot commands
bot.command('start', (ctx) => {
  ctx.reply(
    '🤖 *InnoAI Gateway - Project Management Bot*\n\n' +
    'Welcome! I\'ll help you manage the InnoAI Gateway project.\n\n' +
    'Use the menu below or type /help for commands.',
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

bot.command('help', (ctx) => {
  ctx.reply(
    '📖 *Available Commands:*\n\n' +
    '/status - Current project status\n' +
    '/todo - Task list\n' +
    '/next - What\'s being worked on\n' +
    '/issues - Known bugs\n' +
    '/log - Recent activity log\n' +
    '/instruction <text> - Send instruction to AI\n' +
    '/help - Show this help\n\n' +
    '*Quick Actions:*\n' +
    'A - Fix DirectPay billing\n' +
    'B - Add pricing management\n' +
    'C - Add usage limits\n' +
    'D - Add webhook support\n' +
    'E - Full code review',
    { parse_mode: 'Markdown' }
  );
});

bot.command('status', async (ctx) => {
  const status = await readFile(STATUS_PATH);
  ctx.reply(`📊 *Current Status*\n\n${status.substring(0, 3000)}`, {
    parse_mode: 'Markdown'
  });
});

bot.command('todo', async (ctx) => {
  const todo = await readFile(TODO_PATH);
  ctx.reply(`📋 *Todo List*\n\n${todo.substring(0, 3000)}`, {
    parse_mode: 'Markdown'
  });
});

bot.command('next', async (ctx) => {
  const next = await readFile(NEXT_PATH);
  ctx.reply(`▶️ *Next Action*\n\n${next}`, {
    parse_mode: 'Markdown'
  });
});

bot.command('issues', async (ctx) => {
  const issues = await readFile(ISSUES_PATH);
  ctx.reply(`🐛 *Known Issues*\n\n${issues.substring(0, 3000)}`, {
    parse_mode: 'Markdown'
  });
});

bot.command('log', async (ctx) => {
  const log = await readFile(LOG_PATH);
  const recentLog = log.split('\n').slice(-30).join('\n');
  ctx.reply(`📒 *Recent Activity*\n\n${recentLog}`, {
    parse_mode: 'Markdown'
  });
});

bot.command('instruction', async (ctx) => {
  const text = ctx.message.text.replace('/instruction', '').trim();
  if (!text) {
    return ctx.reply('❌ Please provide an instruction.\nExample: /instruction Fix the DirectPay billing error');
  }
  
  await writeInstruction(text);
  ctx.reply(
    `✅ *Instruction Sent!*\n\n${text}\n\n` +
    `The AI assistant will see this on next check.`,
    { parse_mode: 'Markdown' }
  );
});

// Handle quick action letters
bot.hears(['A', 'a'], async (ctx) => {
  await writeInstruction('Fix DirectPay billing - encryption errors');
  await notifyInstructionReceived('A');
  ctx.reply(
    '✅ *Instruction Sent: Fix DirectPay Billing*\n\n' +
    '🔴 Priority: CRITICAL\n' +
    '⏱️  ETA: 5-15 minutes\n\n' +
    '📱 *What happens next:*\n' +
    '1. AI assistant receives the instruction\n' +
    '2. Analysis begins immediately\n' +
    '3. You\'ll get progress updates here\n' +
    '4. Final result posted when complete\n\n' +
    '⚠️ *Note:* The AI assistant checks instructions every few seconds. ' +
    'Response time depends on when they check the terminal.',
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

bot.hears(['B', 'b'], async (ctx) => {
  await writeInstruction('Add pricing management system');
  await notifyInstructionReceived('B');
  ctx.reply(
    '✅ *Instruction Sent: Add Pricing Management*\n\n' +
    '🟡 Priority: HIGH\n' +
    '⏱️  ETA: 20-40 minutes\n\n' +
    '📱 The AI assistant will start working on this shortly.',
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

bot.hears(['C', 'c'], async (ctx) => {
  await writeInstruction('Add usage limits and quota system');
  await notifyInstructionReceived('C');
  ctx.reply(
    '✅ *Instruction Sent: Add Usage Limits*\n\n' +
    '🟡 Priority: HIGH\n' +
    '⏱️  ETA: 20-40 minutes\n\n' +
    '📱 The AI assistant will start working on this shortly.',
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

bot.hears(['D', 'd'], async (ctx) => {
  await writeInstruction('Add webhook support for async notifications');
  await notifyInstructionReceived('D');
  ctx.reply(
    '✅ *Instruction Sent: Add Webhook Support*\n\n' +
    '🟡 Priority: HIGH\n' +
    '⏱️  ETA: 30-60 minutes\n\n' +
    '📱 The AI assistant will start working on this shortly.',
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

bot.hears(['E', 'e'], async (ctx) => {
  await writeInstruction('Full codebase review - find all bugs and issues');
  await notifyInstructionReceived('E');
  ctx.reply(
    '✅ *Instruction Sent: Full Code Review*\n\n' +
    '🟢 Priority: MEDIUM\n' +
    '⏱️  ETA: 30-60 minutes\n\n' +
    '📱 The AI assistant will start working on this shortly.',
    { parse_mode: 'Markdown', ...mainMenu }
  );
});

// Menu button handlers
bot.hears('📊 Status', async (ctx) => {
  const status = await readFile(STATUS_PATH);
  ctx.reply(`📊 *Current Status*\n\n${status.substring(0, 3000)}`, {
    parse_mode: 'Markdown'
  });
});

bot.hears('📋 Todo List', async (ctx) => {
  const todo = await readFile(TODO_PATH);
  ctx.reply(`📋 *Todo List*\n\n${todo.substring(0, 3000)}`, {
    parse_mode: 'Markdown'
  });
});

bot.hears('▶️ Next Action', async (ctx) => {
  const next = await readFile(NEXT_PATH);
  ctx.reply(`▶️ *Next Action*\n\n${next}`, {
    parse_mode: 'Markdown'
  });
});

bot.hears('🐛 Issues', async (ctx) => {
  const issues = await readFile(ISSUES_PATH);
  ctx.reply(`🐛 *Known Issues*\n\n${issues.substring(0, 3000)}`, {
    parse_mode: 'Markdown'
  });
});

bot.hears('📒 Recent Log', async (ctx) => {
  const log = await readFile(LOG_PATH);
  const recentLog = log.split('\n').slice(-30).join('\n');
  ctx.reply(`📒 *Recent Activity*\n\n${recentLog}`, {
    parse_mode: 'Markdown'
  });
});

bot.hears('🔄 Refresh', (ctx) => {
  ctx.reply('🔄 Refreshed! Use the menu to check status.', mainMenu);
});

bot.hears('✏️ Send Instruction', (ctx) => {
  ctx.reply(
    '✏️ *Send Instruction*\n\n' +
    'Type your instruction with /instruction command:\n' +
    'Example: `/instruction Check the API authentication`',
    { parse_mode: 'Markdown' }
  );
});

// Handle text messages
bot.on('text', async (ctx) => {
  const text = ctx.message.text;
  
  // Check if it's a command-like message without /
  if (text.toLowerCase().includes('fix') || 
      text.toLowerCase().includes('check') ||
      text.toLowerCase().includes('add') ||
      text.toLowerCase().includes('review')) {
    await writeInstruction(text);
    ctx.reply(
      `✅ *Instruction Recorded!*\n\n"${text}"\n\n` +
      `The AI assistant will process this.`,
      { parse_mode: 'Markdown' }
    );
  } else {
    ctx.reply(
      '🤔 I received your message. Use the menu buttons or type /help for commands.',
      mainMenu
    );
  }
});

// Error handler
bot.catch((err, ctx) => {
  console.error('Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again.');
});

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (e) {
    console.error('Webhook error:', e);
    res.sendStatus(500);
  }
});

// Status endpoint
app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    bot: 'InnoAI Gateway Telegram Bot',
    timestamp: new Date().toISOString()
  });
});

// Function to send notification to admin
export async function notifyAdmin(message) {
  if (ADMIN_CHAT_ID) {
    try {
      await bot.telegram.sendMessage(ADMIN_CHAT_ID, message, { parse_mode: 'Markdown' });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  }
}

// Function to notify that instruction was received
async function notifyInstructionReceived(action) {
  const actionDescriptions = {
    'A': 'Fix DirectPay billing',
    'B': 'Add pricing management',
    'C': 'Add usage limits',
    'D': 'Add webhook support',
    'E': 'Full code review'
  };
  
  const desc = actionDescriptions[action] || action;
  
  if (ADMIN_CHAT_ID) {
    try {
      await bot.telegram.sendMessage(
        ADMIN_CHAT_ID,
        `✅ *Instruction Received!*\n\nTask: ${desc}\n\n` +
        `I'm working on this now. You'll receive updates on my progress.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('Failed to send confirmation:', e);
    }
  }
}

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🤖 Telegram Bot Server running on port ${PORT}`);
  console.log(`📁 Collab path: ${COLLAB_PATH}`);
  
  // Start bot
  if (process.env.TELEGRAM_BOT_TOKEN) {
    bot.launch();
    console.log('✅ Bot started!');
    
    if (ADMIN_CHAT_ID) {
      notifyAdmin('🤖 *InnoAI Gateway Bot* is now online!\n\nUse /help to see available commands.');
    }
  } else {
    console.log('⚠️ No TELEGRAM_BOT_TOKEN set. Bot not started.');
  }
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
