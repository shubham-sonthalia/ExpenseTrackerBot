require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { categoryCodeAndType } = require("./model/categoryCodeAndType.js");
const { db } = require("./db");

bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    "Hello! I am your Telegram Bot. Type /help to see available commands."
  );
});

bot.on("polling_error", (msg) => {
  console.log(msg);
});
