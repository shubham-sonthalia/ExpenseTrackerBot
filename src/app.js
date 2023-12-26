require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const Calendar = require("telegram-inline-calendar");
const Database = require("./db.js");
const Table = require("ascii-table");
const pdfMake = require("pdfmake");

function convertAsciiTableToPdfMake(asciiTableData) {
  const pdfMakeTableData = [];

  for (const row of asciiTableData) {
    const pdfMakeRow = [];
    for (const cell of row) {
      pdfMakeRow.push({ text: String(cell), border: [1, 1, 1, 1] });
    }
    pdfMakeTableData.push(pdfMakeRow);
  }

  return pdfMakeTableData;
}

async function CreatePDFStructureAndSavePDF() {
  if (expenseObj.length > 0) {
    const asciiTableData = new Table(`ExpenseTrackerBot`);
    asciiTableData.setHeading("Amount", "Cateogry", "Description", "AddedOn");
    for (let i = 0; i < expenseObj[0].expenses.length; i++) {
      let expense = expenseObj[0].expenses[i];
      asciiTableData.addRow(
        expense.amount,
        expense.category.name,
        expense.description,
        `${new Date(expense.createdOn).getDate()}/${new Date(
          expense.createdOn
        ).getMonth()}/${new Date(expense.createdOn).getFullYear()}`
      );
    }
    const docDefinition = {
      content: [
        {
          table: {
            body: convertAsciiTableToPdfMake(asciiTableData),
          },
        },
      ],
    };
    const pdfDoc = pdfMake.createPdf(docDefinition);
    await pdfDoc.getBuffer((buffer) => {
      fs.writeFileSync("output.pdf", buffer);
      console.log("PDF created successfully.");
    });
  }
}
let curExpenseObject = {
  curAmount: 0,
  curCategory: "",
  curDescription: "",
};
let categories = [];
let waitingForUserDescription = false;
let fromDate = "";
let toDate = "";
let messageIdToDelete = "";
let expenseObj = [];
const confirmationMessage = ["Yes", "No"];
const Instructions = `Instructions - 

Use /add command to add a new expense category based on your preference. For example, 
/add Trip -> This will create a new category called 'Trip'. 

You can create multiple categories in one go like this - 
/add Trip Movies

Our default categories are - 
1. Investment
2. Rent
3. Entertainment
4. Food

You can use command /setdefault if you wish to use these categories. 
You can use /flush command to flush all existing categories and add categories of your choices.

You can use /detail command to get details of your expenses.
The system will prompt you to select start and end date and return the expenses added in that date range.`;
let options = {
  reply_markup: {
    keyboard: [],
    resize_keyboard: true,
    one_time_keyboard: true,
    reply_keyboard_remove: true,
  },
};
const optionForDetails = {
  reply_markup: {
    keyboard: [["Choose a day", "Choose a month"], ["Total Expenses"]],
    resize_keyboard: true,
    one_time_keyboard: true,
    reply_keyboard_remove: true,
  },
};

bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
  polling: true,
});
const calendar = new Calendar(bot, {
  date_format: "YYYY-MM-DD",
  language: "en",
  stop_date: "now",
});
const db = new Database();

async function sendWelcomeMessageText(msg) {
  await bot.sendMessage(
    msg.chat.id,
    `Hey ${msg.from.first_name}, welcome to ExpenseTracker - a fast and seamless way to track and analyze your expenses. 
    ${Instructions}`
  );
}
function PrepareInlineKeyboard(res) {
  let inLineKeyboard = [];
  let tempInlineKeyboard = [];
  for (let i = 0; i < res.length; i++) {
    tempInlineKeyboard.push({ text: res[i], callback_data: res[i] });
    if (tempInlineKeyboard.length % 2 == 0 || i == res.length - 1) {
      inLineKeyboard.push(tempInlineKeyboard);
      tempInlineKeyboard = [];
    }
  }
  const inlineKeyboard = {
    inline_keyboard: inLineKeyboard,
    remove_keyboard: true,
    resize_keyboard: true,
    one_time_keyboard: true,
  };
  return inlineKeyboard;
}

async function sendToastMessage(msg) {
  let toastMessage = `Expense added for amount ${curExpenseObject.curAmount} under ${curExpenseObject.curCategory}`;
  if (curExpenseObject.curDescription !== "") {
    toastMessage += ` with description: ${curExpenseObject.curDescription}`;
  }
  await bot.sendMessage(msg.chat.id, toastMessage);
  curExpenseObject.curAmont = 0;
  curExpenseObject.curCategory = "";
  curExpenseObject.curDescription = "";
}
async function GetTotalExpenses(chatId, startTime, endTime) {
  db.GetDescriptiveExpensesWithinDateRange(chatId, startTime, endTime).then(
    (res) => {
      let formattedString = ``;
      if (res == null || res.length == 0 || res[0].expenses.length == 0) {
        bot.sendMessage(
          chatId,
          "No expenses added in the requested timeframe!"
        );
      } else {
        expenseObj = res;
        const table = new Table(`${fromDate} to ${toDate}`);
        table.setHeading("Amount", "Cateogry", "Description");
        for (let i = 0; i < res[0].expenses.length; i++) {
          let expense = res[0].expenses[i];
          table.addRow(
            expense.amount,
            expense.category.name,
            expense.description
          );
        }
        bot
          .sendMessage(chatId, "```\n" + table + "\n```", {
            parse_mode: "Markdown",
          })
          .then(() => {
            // const inlineKeyboard = {
            //   inline_keyboard: [
            //     [{ text: "Yes", callback_data: "yes_userTroubleWithDetail" }],
            //     [{ text: "No", callback_data: "no_userTroubleWithDetail" }],
            //   ],
            //   remove_keyboard: true,
            //   resize_keyboard: true,
            //   one_time_keyboard: true,
            // };
            // bot.sendMessage(
            //   chatId,
            //   "Having trouble viewing the above message? Click on 'Yes' if you want to download a PDF of this detail.",
            //   { reply_markup: inlineKeyboard }
            // );
          });
      }
      fromDate = "";
      toDate = "";
    }
  );
}
async function GetExpensesByCategory(chatId, startTime, endTime) {
  db.GetExpensesWithinDateRange(chatId, startTime, endTime).then((res) => {
    let formattedString = ``;
    if (res.length == 0) {
      bot.sendMessage(chatId, "No expenses added in the requested timeframe!");
    } else {
      const table = new Table(`${fromDate} to ${toDate}`);
      table.setHeading("S.no", "Cateogry", "Amount");
      for (let i = 0; i < res.length; i++) {
        table.addRow(i + 1, res[i]["_id"], res[i]["total"]);
      }
      bot.sendMessage(chatId, "```\n" + table + "\n```", {
        parse_mode: "Markdown",
      });
    }
    fromDate = "";
    toDate = "";
  });
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
bot.onText(/\/flush/, (msg) => {
  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: "Yes", callback_data: "Yes" }],
      [{ text: "No", callback_data: "No" }],
    ],
    remove_keyboard: true,
    resize_keyboard: true,
    one_time_keyboard: true,
  };
  bot.sendMessage(
    msg.chat.id,
    "Are you sure you want to delete all the categories?",
    { reply_markup: inlineKeyboard }
  );
});
bot.onText(/\/detail/, (msg) => {
  bot
    .sendMessage(msg.chat.id, `Please choose a start date.`)
    .then((sentMessage) => {
      calendar.startNavCalendar(msg);
      messageIdToDelete = sentMessage.message_id;
    });
});
bot.onText(/\/instructions/, (msg) => {
  bot.sendMessage(msg.chat.id, Instructions);
});
bot.onText(/\/setdefault/, (msg) => {
  db.SetDefaultCategoriesForUser(msg).then(() => {
    bot.sendMessage(msg.chat.id, "Default Categories saved!");
  });
});
bot.onText(/\/stop/, (msg) => {
  const inlineKeyboard = {
    inline_keyboard: [
      [{ text: "Yes", callback_data: "yes_deleteUser" }],
      [{ text: "No", callback_data: "no_deleteUser" }],
    ],
    remove_keyboard: true,
    resize_keyboard: true,
    one_time_keyboard: true,
  };
  bot.sendMessage(
    msg.chat.id,
    "Are you sure you want to leave ExpenseTracker and reset all data? ",
    { reply_markup: inlineKeyboard }
  );
});
bot.onText(/^\d+$/, (msg) => {
  curExpenseObject.curAmount = parseFloat(msg.text);
  db.GetUserCategories(msg).then((res) => {
    categories = res;
    if (categories.length > 0) {
      const inlineboard = PrepareInlineKeyboard(res);
      bot.sendMessage(msg.chat.id, "Choose a category for the expense - ", {
        reply_markup: inlineboard,
      });
    } else {
      bot.sendMessage(
        msg.chat.id,
        `No categories added yet. Pls use "/add <category name>" command to add a new category and try adding expense again.`
      );
    }
  });
});
bot.on("callback_query", (query) => {
  if (query.message.message_id == calendar.chats.get(query.message.chat.id)) {
    res = calendar.clickButtonCalendar(query);
    if (res !== -1) {
      bot.deleteMessage(query.message.chat.id, messageIdToDelete);
      if (fromDate === "") {
        fromDate = res;
        bot
          .sendMessage(query.message.chat.id, `Please choose an end date.`)
          .then((sentMessage) => {
            calendar.startNavCalendar(query.message);
            messageIdToDelete = sentMessage.message_id;
          });
      } else if (toDate === "") {
        let fromDateTime = fromDate + " " + "00:00:00";
        toDate = res;
        let toDateTime = toDate + " " + "23:59:59";
        GetTotalExpenses(query.message.chat.id, fromDateTime, toDateTime);
      }
    }
  } else if (categories.includes(query.data)) {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    if (curExpenseObject.curAmount != 0) {
      curExpenseObject.curCategory = query.data;
      const inlineKeyboard = {
        inline_keyboard: [
          [{ text: "Yes", callback_data: "yes_description" }],
          [{ text: "No", callback_data: "no_description" }],
        ],
        remove_keyboard: true,
        resize_keyboard: true,
        one_time_keyboard: true,
      };
      bot.sendMessage(
        query.message.chat.id,
        `Do you want to add any description to this expense?`,
        { reply_markup: inlineKeyboard }
      );
    }
  } else if (confirmationMessage.includes(query.data)) {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    if (query.data == "Yes") {
      db.FlushAllCategoriesForUser(query.message.chat.id).then((res) => {
        bot.sendMessage(
          query.message.chat.id,
          `All categories are removed successfully ✅`
        );
      });
    }
  } else if (query.data == "yes_deleteUser") {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    bot.sendMessage(
      query.message.chat.id,
      "User Deleted. If you want to resume again, use /start command"
    );
  } else if (query.data == "no_description") {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    db.AddOrUpdateExpense(
      query.message.chat.id,
      "",
      curExpenseObject.curCategory,
      curExpenseObject.curAmount
    ).then(() => {
      sendToastMessage(query.message);
    });
  } else if (query.data == "yes_description") {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    waitingForUserDescription = true;
    bot.sendMessage(
      query.message.chat.id,
      "Enter the description for the expense"
    );
  } else if (query.data == "yes_userTroubleWithDetail") {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
    CreatePDFStructureAndSavePDF().then(() => {
      // const documentPath = "output.pdf";
      // bot
      //   .sendDocument(query.message.chat.id, documentPath, {
      //     caption: "Expense Recrods",
      //   })
      //   .then((sentMessage) => {
      //     console.log(
      //       "Document sent successfully:",
      //       sentMessage.document.file_name
      //     );
      //   })
      //   .catch((error) => {
      //     console.error("Error sending document:", error.message);
      //   });
      // bot.sendDocument;
    });
    // create a PDF to send the details
  } else if (query.data == "no_userTroubleWithDetail") {
    bot.deleteMessage(query.message.chat.id, query.message.message_id);
  }
});
bot.on("text", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  // Check if the message starts with a specific command
  if (text.startsWith("/add")) {
    // Extract the text after the command
    let listOfCategories = text.split(" ").slice(1);
    if (listOfCategories.length > 0) {
      listOfCategories = [...new Set(listOfCategories)];
      db.GetUserCategories(msg).then((res) => {
        res = res.map((element) => element.toLowerCase());
        listOfCategories = listOfCategories.filter((category) => {
          const temp = !res.includes(category.toLowerCase());
          return temp;
        });
        if (listOfCategories.length > 0) {
          db.AddCategoryForUser(msg, listOfCategories).then((res) => {
            bot.sendMessage(
              msg.chat.id,
              `New categories added successfully ✅`
            );
          });
        } else {
          bot.sendMessage(msg.chat.id, `Given categories are already present.`);
        }
      });
    } else {
      bot.sendMessage(
        msg.chat.id,
        `Invalid input. Please use /add <category name1> <category name2> format to add new categories. `
      );
    }
  }
  if (
    waitingForUserDescription == true &&
    curExpenseObject.curAmount != 0 &&
    curExpenseObject.curCategory != ""
  ) {
    curExpenseObject.curDescription = text;
    waitingForUserDescription = false;
    db.AddOrUpdateExpense(
      chatId,
      text,
      curExpenseObject.curCategory,
      curExpenseObject.curAmount
    ).then(() => {
      sendToastMessage(msg);
    });
  }
});
bot.on("polling_error", (msg) => {
  console.log(msg);
});
