const { MongoClient } = require("mongodb");
require("dotenv").config();

function Database() {
  const client = new MongoClient(process.env.URI);
  const database = client.db(process.env.DATABASE);
  const collection = database.collection(process.env.COLLECTION);
  function convertToGMT(date) {
    const offset = date.getTimezoneOffset();
    const gmtDate = new Date(date.getTime() + offset * 60 * 1000);
    return gmtDate;
  }
  async function _connectDatabase() {
    try {
      await client.connect();
    } catch (error) {
      console.log("Error in connecting to DB", error);
    }
  }
  async function _disconnectDatabase() {
    try {
      await client.close();
      console.log("Disconnected from MongoDB");
    } catch (error) {
      console.log("Error in disconnecting DB", error);
    }
  }
  async function _addExpenseObject(id, expenseObject) {
    try {
      const filter = { userId: id };
      const updateQuery = {
        $push: {
          expenses: expenseObject,
        },
      };
      const result = await collection.updateOne(filter, updateQuery);
      console.log(`Added expense with userId ${id}`);
      return result;
    } catch (error) {
      console.log(
        `Error in adding expense for userId ${id} and expense object ${expenseObject}`,
        error
      );
    }
  }
  async function _updateTotalExpense(id, num) {
    try {
      const filter = { userId: id };
      const updateQuery = {
        $inc: {
          ["totalExpenses"]: num,
        },
      };
      const result = await collection.updateOne(filter, updateQuery);
      console.log(`Updated totalExpense for userId ${id}`);
      return result;
    } catch (error) {
      console.log(
        `Error in adding expense value to totalExpense for user with id ${id}`,
        error
      );
    }
  }
  async function _updateExpenseObject(id, categoryCode, amount) {
    try {
      const filter = {
        $and: [{ userId: id }, { "expenses.category.code": categoryCode }],
      };
      const updateQuery = {
        $inc: { "expenses.$.amount": amount },
      };
      const result = await collection.udpateOne(filter, updateQuery);
      console.log(`Updated expense object for userId ${id} and category`);
      return result;
    } catch (error) {
      console.log(
        `Error in adding expense value to totalExpense for user with id ${id}`,
        error
      );
    }
  }
  this.AddUser = async function (msg) {
    try {
      await _connectDatabase();
      var result = await collection.insertOne({
        userId: msg.from.id,
        firstName: msg.from.first_name,
        totalExpenses: 0.0,
        expenses: [],
        categories: [],
      });
      console.log(`Success: AddUser for userId ${msg.from.id}`);
      return result;
    } catch (error) {
      console.log("error in adding user", error);
    }
  };
  this.CheckIfUserExists = async function (id) {
    try {
      await _connectDatabase();
      let filter = { userId: id };
      let document = await collection.find(filter).toArray();
      return document;
    } catch (error) {
      console.log(`Error in getting UserExpense document for id ${id}`, error);
    }
  };
  this.RemoveUser = async function (id) {
    try {
      await _connectDatabase();
      const filter = { userId: id };
      const result = await collection.deleteOne(filter);
      console.log(`Deleted userExpense with userId ${id}`);
    } catch (error) {
      console.log(`Error in deleting userExpense with userId ${id}`, error);
    }
  };
  this.AddOrUpdateExpense = async function (
    id,
    description,
    name,
    amount,
    updateRequired = false
  ) {
    try {
      await _connectDatabase();
      let updateHappened = false;
      let addOrUpdateExpenseObject = {};
      let updateTotalExpenseRes = {};
      if (updateRequired) {
        let document = await this.GetUserExpenseDocument(id);
        if (
          document != null &&
          document.expenses != null &&
          document.expenses.length > 0
        ) {
          for (let i = 0; i < expenses.length; i++) {
            if (
              document.expenses[i].category.code == expenseObject.category.code
            ) {
              updateHappened = true;
            }
          }
        }
      }
      if (!updateHappened) {
        let expenseObject = {
          category: {
            name: name,
          },
          description: description,
          amount: amount,
          createdOn: convertToGMT(new Date()),
        };
        addOrUpdateExpenseObject = await _addExpenseObject(id, expenseObject);
      } else {
        addOrUpdateExpenseObject = await _updateExpenseObject(
          id,
          expenseObject.category.code,
          amount
        );
      }
      updateTotalExpenseRes = await _updateTotalExpense(id, amount);
      if (
        addOrUpdateExpenseObject.modifiedCount > 0 &&
        updateTotalExpenseRes.modifiedCount > 0
      ) {
        return true;
      }
      return false;
    } catch (error) {
      console.log("error in adding expense object", error);
    }
  };
  this.GetExpensesByCategory = async function (id) {
    try {
      await _connectDatabase();
      const pipeline = [
        { $match: { userId: id } },
        { $unwind: "$expenses" },
        {
          $group: {
            _id: "$expenses.category.name",
            total: { $sum: "$expenses.amount" },
          },
        },
      ];
      const aggregateResult = await collection.aggregate(pipeline).toArray();
      console.log("Success: GetExpensesByCategory");
      return aggregateResult;
    } catch (error) {
      console.log(
        `error in getting expenses by category for user with id ${id}`,
        error
      );
    }
  };
  this.GetExpensesWithinDateRange = async function (id, startTime, endTime) {
    try {
      await _connectDatabase();
      startTime = new Date(startTime);
      endTime = new Date(endTime);
      const pipeline = [
        {
          $match: {
            userId: id,
          },
        },
        {
          $project: {
            expenses: {
              $filter: {
                input: "$expenses",
                as: "expense",
                cond: {
                  $and: [
                    {
                      $gte: ["$$expense.createdOn", convertToGMT(startTime)],
                    },
                    {
                      $lt: ["$$expense.createdOn", convertToGMT(endTime)],
                    },
                  ],
                },
              },
            },
          },
        },
        { $unwind: "$expenses" },
        {
          $group: {
            _id: "$expenses.category.name",
            total: { $sum: "$expenses.amount" },
          },
        },
      ];
      const aggregateResult = await collection.aggregate(pipeline).toArray();
      console.log(aggregateResult);
      console.log("Success: GetExpensesByCategory");
      return aggregateResult;
    } catch (error) {
      console.log(
        `error in getting expenses by category for user with id ${id}`,
        error
      );
    }
  };
  this.GetDescriptiveExpensesWithinDateRange = async function (
    id,
    startTime,
    endTime
  ) {
    try {
      await _connectDatabase();
      startTime = new Date(startTime);
      endTime = new Date(endTime);
      const pipeline = [
        {
          $match: {
            userId: id,
          },
        },
        {
          $project: {
            expenses: {
              $filter: {
                input: "$expenses",
                as: "expense",
                cond: {
                  $and: [
                    {
                      $gte: ["$$expense.createdOn", convertToGMT(startTime)],
                    },
                    {
                      $lt: ["$$expense.createdOn", convertToGMT(endTime)],
                    },
                  ],
                },
              },
            },
          },
        }
      ];
      const aggregateResult = await collection.aggregate(pipeline).toArray();
      console.log(aggregateResult);
      console.log("Success: GetExpensesByCategory");
      return aggregateResult;
    } catch (error) {
      console.log(
        `error in getting expenses by category for user with id ${id}`,
        error
      );
    }
  };
  this.SetDefaultCategoriesForUser = async function (msg) {
    try {
      await _connectDatabase();
      var result = await collection.updateOne(
        { userId: msg.from.id }, // Specify the filter for the document
        {
          $set: {
            categories: [
              "Investment",
              "Rent",
              "Entertainment",
              "Food",
              "Education",
            ],
          },
        }
      );
      console.log(`Success: SetDefaultCategoriesForUser ${msg.from.id}`);
      return result;
    } catch (error) {
      console.log("error in setting default categories for user", error);
    }
  };
  this.GetUserCategories = async function (msg) {
    try {
      await _connectDatabase();
      const matchQuery = { userId: msg.from.id };
      const projection = { categories: 1 };
      var result = await collection.find(matchQuery, projection).toArray();
      console.log(`Success: GetUserCategories ${msg.from.id}`);
      return result[0].categories;
    } catch (error) {
      console.log("error in getting user categories", error);
    }
  };
  this.AddCategoryForUser = async function (msg, categories) {
    try {
      await _connectDatabase();
      const matchQuery = { userId: msg.from.id };
      const updateQuery = {
        $push: {
          categories: {
            $each: categories,
          },
        },
      };
      let res = await collection.updateOne(matchQuery, updateQuery);
      console.log(`Success: AddCategoryForUser ${msg.from.id}`);
      return res;
    } catch (error) {
      console.log("error in adding user categories", error);
    }
  };
  this.FlushAllCategoriesForUser = async function (userId) {
    try {
      await _connectDatabase();
      const matchQuery = { userId: userId };
      const updateQuery = { $set: { categories: [] } };
      var res = await collection.updateOne(matchQuery, updateQuery);
      console.log(`Success: FlushAllCategoriesForUser ${msg.from.id}`);
      return res;
    } catch (error) {
      console.log("error in flushing user categories", error);
    }
  };
}
module.exports = Database;
