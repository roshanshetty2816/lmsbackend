const asyncHandler = require("express-async-handler");
const Book = require("../model/libraryModel");
const Auth = require("../model/authModel");
const mongoose = require("mongoose");
const Activity = require("../model/activityModel");
const Comment = require("../model/CommentModel");
const nodemailer = require("nodemailer");
const {
  newsLetterSchema,
  addBookSchema,
} = require("../validation/adminValidation");

let bucket;
mongoose.connection.on("connected", () => {
  var client = mongoose.connections[0].client;
  var db = mongoose.connections[0].db;
  bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "books",
  });
});

//gets all books from the database isrrespective of the user
const getAllBooks = asyncHandler(async (req, res) => {
  // get all books from the database
  const page = req.query.page === undefined ? 1 : req.query.page;
  const limit = 5;
  const skip = page * limit - limit;
  const search = req.query.search === undefined ? "" : req.query.search;
  let matchQuery = { $match: { title: { $regex: search, $options: "i" } } };
  const sort = req.query.sort === "asc" ? 1 : -1;
  let sortBy = { title: sort };
  const query = [
    matchQuery,
    {
      $sort: sortBy,
    },
    {
      $facet: {
        result: [
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
          {
            $project: {
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
        count: [
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $project: {
        result: 1,
        count: {
          $arrayElemAt: ["$count", 0],
        },
      },
    },
  ];
  const result = await Book.aggregate(query);
  res.status(200).json(result[0]);
});

// adds a book to the database
const addBook = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await addBookSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  // create and add a book to the database
  const book = await Book.create({
    title: result.title,
    author: result.author,
    genre: result.genre,
    stock: result.total,
    rating: result.rating,
    numOfRatings: result.numOfRatings,
  });
  res.status(200).json(book);
});

// add e-book for a particular book
const uploadEbook = asyncHandler(async (req, res) => {
  const book = await Book.findByIdAndUpdate(
    { _id: req.body.id },
    { $set: { ebook: req.file.id } },
    { new: true }
  );
  res.json({ message: "E-Book Upload Successfull" });
});

// issue a book to a particular user by id
const issueBook = asyncHandler(async (req, res) => {
  if (req.body.userId === undefined) {
    res.status(400);
    throw new Error("Enter a User ID");
  }
  try {
    const user = await Auth.findById(req.body.userId);
    // to check if user exist in database passed in the body of req
    if (!user) {
      res.status(400);
      throw new Error("User does not Exist");
    }
    // check if user is blocked
    if (user.blocked === true) {
      res.status(400);
      throw new Error("User has been blocked");
    }
    if (user.issued.length >= 2) {
      res.status(400);
      throw new Error("User already has 2 Issued Books");
    }
    if (user.issued.includes(req.params.id)) {
      res.status(400);
      throw new Error("You have already issued a copy of this book");
    }
  } catch (error) {
    res.status(500);
    throw new Error("Enter valid User ID");
  }
  try {
    const book = await Book.findById(req.params.id);
    // find if the book exist in the database by the id mentioned in params
    if (!book) {
      res.status(401);
      throw new Error("Book Not In Inventory");
    }
    //to check if book is in stock
    if (book.stock === 0) {
      res.status(400);
      throw new Error("Book not in Stock");
    }
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
  try {
    const date = new Date();
    date.setDate(date.getDate() + 15);
    // updating the user by user_id and availability status to false
    const updatedbook = await Book.findOneAndUpdate(
      { _id: req.params.id },
      {
        $push: { users: { id: req.body.userId, dueDate: date.toISOString() } },
        $pull: { requestedUsers: req.body.userId },
        $inc: { stock: -1 },
      },
      { new: true, select: "-__v -createdAt -updatedAt" }
    );
    await Auth.findByIdAndUpdate(
      { _id: req.body.userId },
      {
        $push: { issued: req.params.id },
        $addToSet: { readBooks: req.params.id },
      },
      { new: true }
    );
    await Activity.create({
      user: req.body.userId,
      action: "issue",
      book: req.params.id,
    });
    res.status(200).json(updatedbook);
  } catch (error) {
    res.status(500);
    throw new Error("Try Again");
  }
});

// user returns book to the library
const returnBook = asyncHandler(async (req, res) => {
  try {
    // find if the book exist in the database by the id mentioned in params
    const book = await Book.findById(req.params.id);
    if (!book) {
      res.status(401);
      throw new Error("Book Not In Inventory");
    }
    if (!book.users.some((user) => user.id === req.body.userId)) {
      res.status(400);
      throw new Error("Given User was not issued this book");
    }
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
  try {
    const user = await Auth.findById(req.body.userId);
    if (user === null) {
      res.status(400);
      throw new Error("Book not requested by given User");
    }
  } catch (error) {
    res.status(400);
    throw new Error("Invalid Data");
  }
  try {
    const updatedbook = await Book.findOneAndUpdate(
      { _id: req.params.id },
      {
        $pull: { users: { id: req.body.userId } },
        $inc: { stock: 1 },
      },
      { new: true }
    );
    await Auth.findByIdAndUpdate(
      { _id: req.body.userId },
      { $pull: { issued: req.params.id } },
      { new: true, select: "-__v -createdAt -updatedAt" }
    );
    await Activity.create({
      user: req.body.userId,
      action: "return",
      book: req.params.id,
    });
    res.status(200).json(updatedbook);
  } catch (error) {
    res.status(400);
    throw new Error("Internal Server Error");
  }
});

// to delete a book from library
const deleteBook = asyncHandler(async (req, res) => {
  const book = await Book.findById(req.params.id);
  // find if the book exist in the database by the id mentioned in params
  if (!book) {
    res.status(401);
    throw new Error("Could not find Book");
  }
  // check if the book is issued to some user
  if (book.users.length !== 0) {
    res.status(400);
    throw new Error("Cannot delete until all books are returned");
  }
  //extract the ebook id before deleting the book
  const id = book.ebook;
  // delete book from the inventory
  await book.remove();
  await Comment.deleteMany({ bookID: book._id });
  bucket.delete(new mongoose.Types.ObjectId(id));
  res.status(200).json({ id: req.params.id });
});

// to delete User from the library
const deleteUser = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.params.id);
  // check if user exists in database
  if (!user) {
    res.status(401);
    throw new Error("Invalid Credentials");
  }
  // check if user has returned all issued books
  if (user.issued.length === 0) {
    await user.remove();
    res.status(200).json({ id: user._id });
  } else {
    res.status(400);
    throw new Error("User has Issued books and not returned it");
  }
});

// check for books that has been requested by all users
const requestedBooks = asyncHandler(async (req, res) => {
  // check for books that has been requested
  const page = req.query.page === undefined ? 1 : req.query.page;
  const limit = 5;
  const skip = page * limit - limit;
  const query = [
    {
      $match: {
        requestedUsers: { $exists: true, $ne: [] },
      },
    },
    {
      $facet: {
        result: [
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
          {
            $project: {
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
        count: [
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $project: {
        result: 1,
        count: {
          $arrayElemAt: ["$count", 0],
        },
      },
    },
  ];
  const result = await Book.aggregate(query);
  res.status(200).json(result[0]);
});

// cancel a book request made by user
const cancelRequest = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.body.id);
  if (!user) {
    res.status(400);
    throw new Error("User does not Exists");
  }
  const { id } = req.params;
  const book = await Book.findById(id);
  if (!book) {
    res.status(400);
    throw new Error("Book does not Exist");
  }
  if (!book.requestedUsers.includes(user.id)) {
    res.status(400);
    throw new Error("Book not requested by given User");
  }
  // resets the request status and requestedUser
  const cancelledRequest = await Book.findByIdAndUpdate(
    { _id: id },
    { $pull: { requestedUsers: user.id } },
    { new: true }
  );
  res.status(200).json({ id: user.id });
});

// get all issued books to users
const issuedBooks = asyncHandler(async (req, res) => {
  // here this function is not checking if requested book exists in the database
  if (req.query.bookID) {
    try {
      const books = await Book.findOne({
        _id: req.query.bookID,
        users: { $ne: [] },
      });
      if (books === null) {
        res.status(400);
        throw new Error("No Un-Issueable Book found");
      }
      res.status(200).json(books);
    } catch (error) {
      res.status(500);
      throw new Error(error);
    }
  } else {
    res.status(400);
    throw new Error("Enter a Book ID");
  }
});

// to unissue a book that has been issued to any user
const unIssued = asyncHandler(async (req, res) => {
  // here this function is not checking if requested book exists in the database
  if (req.query.bookID) {
    try {
      const books = await Book.findOne({
        _id: req.query.bookID,
        stock: { $gt: 0 },
      });
      if (books === null) {
        res.status(400);
        throw new Error("No Issueable Book found");
      }
      res.status(200).json(books);
    } catch (error) {
      res.status(500);
      throw new Error(error);
    }
  } else {
    res.status(400);
    throw new Error("Enter a Book ID");
  }
});

// to get list of all users
const allUsers = asyncHandler(async (req, res) => {
  const page = req.query.page === undefined ? 1 : req.query.page;
  const limit = 5;
  const skip = page * limit - limit;
  const query = [
    {
      $match: {
        admin: false,
      },
    },
    {
      $facet: {
        result: [
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
          {
            $project: {
              password: 0,
              subscriber: 0,
              admin: 0,
              wishlist: 0,
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
        count: [
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $project: {
        result: 1,
        count: {
          $arrayElemAt: ["$count", 0],
        },
      },
    },
  ];
  const result = await Auth.aggregate(query);
  res.status(200).json(result[0]);
});

// to get list of all subscribers of the library
const subscribers = asyncHandler(async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : req.query.page;
    const limit = 10;
    const skip = page * limit - limit;
    const query = [
      {
        $match: {
          subscriber: true,
        },
      },
      {
        $facet: {
          result: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                admin: 0,
                subscriber: 0,
                readBooks: 0,
                wishlist: 0,
                password: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
      {
        $project: {
          result: 1,
          count: {
            $arrayElemAt: ["$count", 0],
          },
        },
      },
    ];
    const result = await Auth.aggregate(query);
    res.status(200).json(result[0]);
  } catch (error) {
    res.status(400);
    res.json(error);
  }
});

// to publish news to all/subsribers
const newsLetter = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await newsLetterSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  const receivers =
    result.audience === "all" ? { admin: false } : { subscriber: true };
  const users = await Auth.find(receivers).select("email -_id");
  let emails = "";
  for (var d of users) {
    emails += d.email + ",";
  }
  const emailList = emails.slice(0, -1).toString();
  if (emailList === "") {
    res.status(400);
    throw new Error("No receivers");
  }
  try {
    var transporter = nodemailer.createTransport({
      service: process.env.SERVICE,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });
    var mailOptions = {
      from: process.env.USER,
      to: emailList,
      subject: result.subject,
      text: result.body,
      html: '<a href="https://librarymngsys.netlify.app/account">Unsbscribe</a>',
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.status(400).json({ msg: error });
      } else {
        res.status(200).json({ msg: "E-Mail Successfully sent" });
      }
    });
  } catch (error) {
    res.status(500).json({ msg: error });
  }
});

// to get all books that has been due by all users
const dueBooks = asyncHandler(async (req, res) => {
  const page = req.query.page === undefined ? 1 : req.query.page;
  const limit = 5;
  const skip = page * limit - limit;
  const query = [
    {
      $match: {
        "users.dueDate": { $lt: new Date().toISOString() },
      },
    },
    {
      $facet: {
        result: [
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
          {
            $project: {
              createdAt: 0,
              updatedAt: 0,
              __v: 0,
            },
          },
        ],
        count: [
          {
            $count: "count",
          },
        ],
      },
    },
    {
      $project: {
        result: 1,
        count: {
          $arrayElemAt: ["$count", 0],
        },
      },
    },
  ];
  const result = await Book.aggregate(query);
  const books = result[0].result;
  books.forEach(
    (book) =>
      (book.users = book.users.filter(
        (user) => user.dueDate < new Date().toISOString()
      ))
  );
  result[0].result = books;
  res.status(200).json(result[0]);
});

// to update the stock of a book already present in library
const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let { stock, action } = req.body;
  const update = await Book.findById(id);
  if (!update) {
    res.status(400);
    throw new Error("Book does not exist");
  }
  const verify = action !== "add" || action !== "subtract";
  if (!verify) {
    res.status(400);
    throw new Error("Invalid Action");
  }
  if (update.stock - update.users.length < 0 && action === "subtract") {
    res.status(400);
    throw new Error("Cannot Reduce stock until all books are in Circulation");
  }
  if (action === "subtract") {
    stock *= -1;
  }
  try {
    const updated = await Book.findByIdAndUpdate(
      { _id: id },
      { $inc: { stock: stock } },
      { new: true }
    );
    res.status(200).json(updated);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

// to get all the activity logs of the library
const getActivityLogs = asyncHandler(async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : req.query.page;
    const limit = 10;
    const skip = page * limit - limit;
    const query = [
      {
        $facet: {
          result: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                __v: 0,
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
      {
        $project: {
          result: 1,
          count: {
            $arrayElemAt: ["$count", 0],
          },
        },
      },
    ];
    const result = await Activity.aggregate(query);
    res.status(200).json(result[0]);
  } catch (error) {
    res.status(500).json(error);
  }
});

// to block user from the library (ie.issue and request)
const blockUser = asyncHandler(async (req, res) => {
  try {
    const blocked = await Auth.findByIdAndUpdate(
      { _id: req.params.id },
      { $set: { blocked: true } },
      { new: true, select: "name email blocked" }
    );
    res.status(200).json(blocked);
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
});

// to unblock user from the library
const unBlockUser = asyncHandler(async (req, res) => {
  try {
    const unblocked = await Auth.findByIdAndUpdate(
      { _id: req.params.id },
      { $set: { blocked: false } },
      { new: true, select: "name email blocked" }
    );
    res.status(200).json(unblocked);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

// to notify users that have due books
const notifyBookDefaulties = asyncHandler(async (req, res) => {
  const { users, bookID, title } = req.body;
  let emails = "";
  if (users.length !== 0) {
    for (let user of users) {
      try {
        const defaulty = await Auth.findById(user);
        emails += defaulty.email + ",";
      } catch (error) {
        res.status(400);
        throw new Error(error);
      }
    }
    const emailList = emails.slice(0, -1).toString();
    try {
      var transporter = nodemailer.createTransport({
        service: process.env.SERVICE,
        auth: {
          user: process.env.USER,
          pass: process.env.PASS,
        },
      });
      var mailOptions = {
        from: process.env.USER,
        to: emailList,
        subject: "Return Book",
        html: `<!DOCTYPE html><html lang="en"><body>This is to remind you that the book titled ${title} and ID ${bookID} issued by you is due.</body></html>`,
      };
      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          res.status(400).json({ msg: error });
        } else {
          res.status(200).json({ msg: "E-Mail Successfully sent" });
        }
      });
    } catch (error) {
      res.status(500).json({ msg: error });
    }
  } else {
    // pass
  }
});

// to get a list of all users that have blocked
const blockedUsers = asyncHandler(async (req, res) => {
  try {
    const page = req.query.page === undefined ? 1 : req.query.page;
    const limit = 10;
    const skip = page * limit - limit;
    const query = [
      {
        $match: {
          blocked: true,
        },
      },
      {
        $facet: {
          result: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
            {
              $project: {
                admin: 0,
                subscriber: 0,
                readBooks: 0,
                wishlist: 0,
                password: 0,
                createdAt: 0,
                updatedAt: 0,
                __v: 0,
              },
            },
          ],
          count: [
            {
              $count: "count",
            },
          ],
        },
      },
      {
        $project: {
          result: 1,
          count: {
            $arrayElemAt: ["$count", 0],
          },
        },
      },
    ];
    const result = await Auth.aggregate(query);
    res.status(200).json(result[0]);
  } catch (error) {
    res.status(400);
    res.json(error);
  }
});

const getEbook = asyncHandler(async (req, res) => {
  try {
    const file = bucket
      .find({
        filename: req.params.id,
      })
      .toArray((err, files) => {
        if (!files || files.length === 0) {
          return res.status(404).json({
            err: "no files exist",
          });
        }
        bucket.openDownloadStreamByName(req.params.id).pipe(res);
      });
  } catch (error) {
    res.status(400).json(error);
  }
});

const updateSubscriptionPlan = asyncHandler(async (req, res) => {
  const validMonths = [1, 3, 6, 12];
  if (!validMonths.includes(Number(req.body.months))) {
    res.status(400);
    throw new Error("Invalid Plan selected");
  }
  try {
    var date = new Date();
    date.setDate(date.getDate() + req.body.months * 30);
    const updatedPlan = await Auth.findByIdAndUpdate(
      { _id: req.params.id },
      { $set: { subscriptionEndDate: date.toISOString() } },
      { new: true }
    );
    res.status(200).json(updatedPlan);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
});

module.exports = {
  getAllBooks,
  addBook,
  uploadEbook,
  issueBook,
  returnBook,
  deleteBook,
  deleteUser,
  requestedBooks,
  cancelRequest,
  issuedBooks,
  unIssued,
  allUsers,
  subscribers,
  newsLetter,
  dueBooks,
  updateStock,
  getActivityLogs,
  blockUser,
  unBlockUser,
  notifyBookDefaulties,
  blockedUsers,
  getEbook,
  updateSubscriptionPlan,
};
