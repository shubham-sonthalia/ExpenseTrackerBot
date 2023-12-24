{expenses: {
              $filter: {
                input: "$expenses",
                as: "expense",
                cond: {
                  $and: [
{
              $gte: [
                { $dateFromString: { dateString: "$$expense.createdOn" } },
                { $dateFromString: { dateString: '2023-12-16T00:00:00.000Z' } }
              ]
            },
            {
              $lt: [
                { $dateFromString: { dateString: "$$expense.createdOn" } },
                { $dateFromString: { dateString: '2023-12-20T00:00:00.000Z' } }
              ]
            }
            ]
                },
              },
            },
          }