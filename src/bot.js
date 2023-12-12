require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { categoryCodeAndType } = require("./model/categoryCodeAndType.js");
const Database = require("./db");
let curAmount = 0;
const categories = [
  "investment",
  "rent",
  "entertainment",
  "food",
  "miscellaneous",
];

const options = {
  reply_markup: {
    keyboard: [
      ["Investment", "Rent"],
      ["Entertainment", "Food"],
      ["Miscellaneous"],
    ],
    resize_keyboard: true,
    one_time_keyboard: true,
  },
};

// const keyboardMarkupJson = JSON.stringify(keyboardMarkup);

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
bot.onText(/\/detail/, (msg) => {
  db.GetExpensesByCategory(msg.from.id).then((res) => {
    // [
    //   { _id: "Entertainment", total: 900 },
    //   { _id: "Miscellaneous", total: 1870 },
    //   { _id: "Food", total: 454 },
    //   { _id: "Investment", total: 100 },
    // ];
    
    bot.sendMessage(msg.chat.id, JSON.stringify(res));
  });
});

bot.onText(/^\d+$/, (msg) => {
  curAmount = parseFloat(msg.text);
  bot.sendMessage(
    msg.chat.id,
    `Please choose a category of the expense -`,
    options
  );
});
bot.on("text", (msg) => {
  if (categories.includes(msg.text.toLowerCase())) {
    switch (msg.text) {
      case "Investment":
        db.AddOrUpdateExpense(msg.from.id, "1", "Investment", curAmount);
        break;
      case "Rent":
        db.AddOrUpdateExpense(msg.from.id, "2", "Rent", curAmount);
        break;
      case "Entertainment":
        db.AddOrUpdateExpense(msg.from.id, "3", "Entertainment", curAmount);
        break;
      case "Food":
        db.AddOrUpdateExpense(msg.from.id, "4", "Food", curAmount);
        break;
      case "Miscellaneous":
        db.AddOrUpdateExpense(msg.from.id, "5", "Miscellaneous", curAmount);
        break;
    }
  }
});

bot.on("polling_error", (msg) => {
  console.log(msg);
});
