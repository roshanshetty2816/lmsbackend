const asyncHandler = require("express-async-handler");
const Book = require("../model/libraryModel");
const Auth = require("../model/authModel");
const Activity = require("../model/activityModel");
const nodemailer = require("nodemailer");

//gets all books from the database isrrespective of the user
const getAllBooks = asyncHandler(async (req, res) => {
  const exist = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!exist && exist.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  // get all books from the database
  const search = req.query.search === undefined ? "" : req.query.search;
  const sort = req.query.sort === "asc" ? 1 : -1;
  const page = req.query.page === undefined ? 1 : req.query.page;
  const limit = 5
  const skip = page*limit-limit
  const books = await Book.find({ title: { $regex: search, $options: "i" } }).skip(skip).limit(limit).sort({title:sort}).select("-__v -createdAt -updatedAt");
  const total=await Book.find({ title: { $regex: search, $options: "i" } }).sort({title:sort})
  res.json({books,total});
});

// adds a book to the database
const addBook = asyncHandler(async (req, res) => {
  // getting author and title of the book by destructuring req
  const { author, title, genre, total,rating } = req.body;
  // check if both are not null
  if (!title || !author || !genre || !total||!rating) {
    res.status(400);
    throw new Error("Enter all details of the Book");
  }
  const exist = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!exist && exist.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  // create and add a book to the database
  const book = await Book.create({
    title,
    author,
    genre: genre,
    stock: total,
    rating:rating,
  });
  res.status(200);
  res.json(book);
});

// issue a book to a particular user by id
const issueBook = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  if (req.body.userId === undefined) {
    res.status(400);
    throw new Error("Enter a User ID");
  }
  try {
    const user = await Auth.findById(req.body.userId);
    // to check if user exist in database passed in the body of req
    if (!user) {
      res.json(400);
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
    throw new Error("Enter valid Book ID");
  }
  try {
    const date = new Date();
    date.setDate(date.getDate() - 1);
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
      { $push: { issued: req.params.id } },
      { new: true }
    );
    await Activity.create({
      user: req.body.userId,
      action: "issue",
      book: req.params.id,
    });
    res.status(200);
    res.json(updatedbook);
  } catch (error) {
    res.status(500);
    throw new Error("Try Again");
  }
});

// user returns book to the library
const returnBook = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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
    res.status(200);
    res.json(updatedbook);
  } catch (error) {
    res.status(400);
    throw new Error("Internal Server Error");
  }
});

const deleteBook = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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
  // delete book from the inventory
  await book.remove();
  res.status(200);
  res.json({ id: req.params.id });
});

const deleteUser = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  const user = await Auth.findById(req.params.id);
  // check if user exists in database
  if (!user) {
    res.status(401);
    throw new Error("Invalid Credentials");
  }
  // check if user has returned all issued books
  if (user.issued.length === 0) {
    await user.remove();
    res.status(200);
    res.json({ id: user._id });
  } else {
    res.status(400);
    throw new Error("User has Issued books and not returned it");
  }
});

// check for books that has been requested by any users
const requestedBooks = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  // check for books that has been requested
  const books = await Book.find({ requestedUsers: { $exists: true, $ne: [] } });
  res.status(200);
  res.json(books);
});

const cancelRequest = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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
  res.status(200);
  res.json(cancelledRequest);
});

const issuedBooks = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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

const unIssued = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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

const allUsers = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  // check for books that are not available
  const users = await Auth.find({ admin: false }).select(
    "email name issued blocked"
  );
  res.status(200);
  res.json(users);
});

const subscribers = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  try {
    const subscribers = await Auth.find({ subscriber: true });
    res.status(200);
    res.json(subscribers);
  } catch (error) {
    res.status(400);
    res.json(error);
  }
});

const newsLetter = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  const { subject, body, audience } = req.body;
  const receivers =
    audience === "all" ? { admin: false } : { subscriber: true };
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
      subject: subject,
      text: body,
      html: '<a href="http://localhost:3000/user/unsubscribe">Unsbscribe</a>',
    };
    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        res.status(400);
        res.json({ msg: error });
      } else {
        res.status(200);
        res.json({ msg: "E-Mail Successfully sent" });
      }
    });
  } catch (error) {
    res.status(500);
    res.json({ msg: error });
  }
});

const dueBooks = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  const books = await Book.find({
    "users.dueDate": { $lt: new Date().toISOString() },
  });
  res.status(200);
  res.json(books);
});

const updateStock = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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
    res.status(200);
    res.json(updated);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

const getActivityLogs = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  try {
    const logs = await Activity.find();
    res.status(200).json(logs);
  } catch (error) {
    res.status(500).json(error);
  }
});

const blockUser = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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

const unBlockUser = asyncHandler(async (req, res) => {
  const admin = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!admin && admin.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
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

module.exports = {
  getAllBooks,
  addBook,
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
};
