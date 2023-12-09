const TelegramBot = require("node-telegram-bot-api");
const { categoryCodeAndType } = require("./model/categoryCodeAndType");
const {db} = require("./db");
require("dotenv").config();

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

bot.on("message", function (msg) {
  const chatId = msg.chat.id;
  const messageText = msg.text;

  if (messageText === "/start") {
    bot.sendMessage(chatId, "Welcome to my bot!");
  }
  console.log(msg.from.id);
  console.log(typeof msg.from.id);
});
