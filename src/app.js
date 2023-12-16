require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Database = require("./db.js");
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
    reply_keyboard_remove: true,
  },
};

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
    3. Click on the category.`
  );
}
async function sendToastMessage(msg) {
  const params = {
    chat_id: msg.chat.id,
    text: "Expense added successfully!",
    parse_mode: "HTML",
  };
  curAmount = 0;
  await bot.sendMessage(msg.chat.id, `Expense added! ✅`);
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
    let formattedString = ``;
    for (let i = 0; i < res.length; i++) {
      formattedString += `${res[i]["_id"]} : ${res[i]["total"]}\n`;
    }
    bot.sendMessage(msg.chat.id, formattedString);
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
  if (categories.includes(msg.text.toLowerCase()) && curAmount > 0) {
    switch (msg.text) {
      case "Investment":
        db.AddOrUpdateExpense(msg.from.id, "1", "Investment", curAmount).then(
          () => {
            sendToastMessage(msg);
          }
        );
        break;
      case "Rent":
        db.AddOrUpdateExpense(msg.from.id, "2", "Rent", curAmount).then(() => {
          sendToastMessage(msg);
        });
        break;
      case "Entertainment":
        db.AddOrUpdateExpense(
          msg.from.id,
          "3",
          "Entertainment",
          curAmount
        ).then(() => {
          sendToastMessage(msg);
        });
        break;
      case "Food":
        db.AddOrUpdateExpense(msg.from.id, "4", "Food", curAmount).then(() => {
          sendToastMessage(msg);
        });
        break;
      case "Miscellaneous":
        db.AddOrUpdateExpense(
          msg.from.id,
          "5",
          "Miscellaneous",
          curAmount
        ).then(() => {
          sendToastMessage(msg);
        });
        break;
    }
  } else if (categories.includes(msg.text.toLowerCase()) && curAmount == 0) {
    bot.sendMessage(msg.chat.id, `No amount recorded for this category ❌`);
    bot.sendMessage(msg.chat.id, "Please enter the amount and try again! 🫡");
  }
});
bot.on("polling_error", (msg) => {
  console.log(msg);
});
