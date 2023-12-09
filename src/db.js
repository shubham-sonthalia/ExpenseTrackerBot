const { MongoClient } = require("mongodb");
require(dotenv).config();

function Database() {
  const client = new MongoClient(process.env.URI);
  const database = client.db(process.env.DATABASE);
  const collection = database.collection(process.env.COLLECTION);

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
      await ConnectDatabase();
      const filter = { userId: id };
      const udpateQuery = { $push: expenseObject };
      const result = collection.udpateOne(filter, updateQuery);
      console.log(`Added expense with userId ${id}`);
    } catch (error) {
      console.log(
        `Error in adding expense for userId ${id} and expense object ${expenseObject}`,
        error
      );
    } finally {
      await DisconnectDatabase();
    }
  }
  async function _updateTotalExpense(id, num) {
    try {
      await ConnectDatabase();
      const filter = { userId: id };
      const updateQuery = { $set: (totalExpense += num) };
      const result = collection.udpateOne(filter, updateQuery);
      console.log(`Updated totalExpense for userId ${id}`);
    } catch (error) {
      console.log(
        `Error in adding expense value to totalExpense for user with id ${id}`,
        error
      );
    } finally {
      await DisconnectDatabase();
    }
  }
  async function _updateExpenseObject(id, categoryCode, amount) {
    try {
      await ConnectDatabase();
      const filter = {
        $and: [{ userId: id }, { "expenses.category.code": categoryCode }],
      };
      const updateQuery = {
        $inc: { "expenses.$.amount": amount },
      };
      const result = collection.udpateOne(filter, updateQuery);
      console.log(`Updated expense object for userId ${id} and category`);
    } catch (error) {
      console.log(
        `Error in adding expense value to totalExpense for user with id ${id}`,
        error
      );
    } finally {
      await DisconnectDatabase();
    }
  }
  this.AddUser = async function (msg) {
    try {
      _connectDatabase();
      var result = await collection.insertOne({
        userId: msg.from.id,
        firstName: msg.from.first_name,
        totalExpenses: 0.0,
        expenses: [],
      });
      console.log(`Success: AddUser for userId ${id}`);
      return result;
    } catch (error) {
      console.log("error in adding user", error);
    } finally {
      _disconnectDatabase();
    }
  };
  this.GetUserExpenseDocument = async function (id) {
    try {
      await ConnectDatabase();
      let filter = { userId: id };
      let document = await collection.find(filter).toArray();
      return document;
    } catch (error) {
      console.log(`Error in getting UserExpense document for id ${id}`, error);
    } finally {
      await ConnectDatabase();
    }
  };
  this.RemoveUserExpenseDocument = async function (id) {
    try {
      await ConnectDatabase();
      const filter = { userId: id };
      const result = collection.deleteOne(filter);
      console.log(`Deleted userExpense with userId ${id}`);
    } catch (error) {
      console.log(`Error in deleting userExpense with userId ${id}`, error);
    } finally {
      await DisconnectDatabase();
    }
  };
  this.AddOrUpdateExpense = async function (
    id,
    code,
    name,
    amount,
    updateRequired = false
  ) {
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
          code: code,
          name: name,
        },
        amount: amount,
        createdOn: new Date(),
      };
      addOrUpdateExpenseObject = await _addExpenseObjectInArray(
        id,
        expenseObject
      );
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
  };
  this.GetExpensesByCategory = async function (id) {
    try {
      _connectDatabase();
      const pipeline = [
        { $match: { userId: id } },
        {
          $group: {
            _id: "$expenses.category.code",
            total: { $sum: "$expenses.amount" },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ];
      const aggregateResult = await collection.aggregate(pipeline).toArray();
      console.log("Success: GetExpensesByCategory");
      return aggregateResult;
    } catch (error) {
      console.log(
        `error in getting expenses by category for user with id ${id}`,
        error
      );
    } finally {
      _disconnectDatabase();
    }
  };
}

module.exports = Database;
