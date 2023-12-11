require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { categoryCodeAndType } = require("./model/categoryCodeAndType.js");
const Database = require("./db");

bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});
const db = new Database();
async function sendWelcomeMessageText(msg) {
  await bot.sendMessage(
    msg.chat.id,
    `Welcome ${msg.from.first_name} to ExpenseTracker!
      Steps to add expense: 
      1. Enter the spent amount. 
      2. The bot will prompt you with a message to choose the category of the expense. 
      3. Choose and category. 
      4. Done. 
      5. Use the following commands to get the analysis of your expense: 
        /detail - to get the category-wise analaysis of your expenses.`
  );
}
bot.onText(/\/start/, (msg) => {
  db.CheckIfUserExists(msg.from.id).then((res) => {
    if (res.length == 0) {
      db.AddUser(msg).then((res) => {
        sendWelcomeMessageText(msg);
      });
    } else {
      sendWelcomeMessageText(msg);
    }
  });
});

bot.on("polling_error", (msg) => {
  console.log(msg);
});
