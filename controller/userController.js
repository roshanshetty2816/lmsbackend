const Auth = require("../model/authModel");
const Book = require("../model/libraryModel");
const Token = require("../model/tokenModel");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

const getIssuedBooks = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  // find all books with id same as user_id
  const books = await Book.find({ "users.id": user._id });
  res.status(200);
  res.json(books);
});

// get all books from the inventory with only required data
const getAllBooks = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const page = req.query.page === undefined ? 1 : req.query.page;
  const limit = 5;
  const skip = page * limit - limit;
  const allGenres = ["action", "drama", "sci - fi", "romance", "comedy"];
  const reqGenre =
    req.query.genre === undefined ? allGenres : req.query.genre.split(",");
  const search = req.query.search === undefined ? "" : req.query.search;
  const searchBy =
    req.query.searchBy === "title"
      ? { title: { $regex: search, $options: "i" } }
      : { author: { $regex: search, $options: "i" } };
  const sort = req.query.sort === "asc" ? 1 : -1;
  let sortBy;
  if (req.query.sortBy === undefined) {
    sortBy = { title: sort };
  } else if (req.query.sortBy === "author") {
    sortBy = { author: sort };
  } else if (req.query.sortBy === "title") {
    sortBy = { title: sort };
  }
  const books = await Book.find(searchBy)
    .where("genre")
    .in(reqGenre)
    .sort(sortBy)
    .skip(skip)
    .limit(limit)
    .select("-createdAt -updatedAt -__v");
  const documents = await Book.find(searchBy)
    .where("genre")
    .in(reqGenre)
    .sort(sortBy)
    .count();
  const total = documents / limit;
  res.status(200);
  res.json({ books, total });
});

const requestBook = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  if (user.blocked === true) {
    res.status(400);
    throw new Error("You have been blocked, contact Librarian");
  }
  if (!req.params.id) {
    res.status(400);
    throw new Error("Select a Book to request");
  }
  const book = await Book.findById(req.params.id);
  if (!book) {
    res.status(400);
    throw new Error("Book do not Exist");
  }
  if (book.requestedUsers.includes(user.id)) {
    res.status(400);
    throw new Error("Book already requested by you");
  }
  if (book.users.filter((u) => u.id === user.id).length !== 0) {
    res.status(400);
    throw new Error("You have already issued a copy of this book");
  }
  try {
    const requestedBook = await Book.findOneAndUpdate(
      { _id: req.params.id },
      { $push: { requestedUsers: user.id } },
      { new: true }
    );
    res.status(200).json(requestedBook);
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
});

// to allow users to cancel book they requested
const cancelRequest = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  if (!req.params.id) {
    res.status(400);
    throw new Error("Select a Book to request");
  }
  const book = await Book.findById(req.params.id);
  if (!book) {
    res.status(400);
    throw new Error("Book do not Exist");
  }
  if (book.requestedUsers.includes(req.user.id)) {
    const updatedBook = await Book.findOneAndUpdate(
      { _id: req.params.id },
      { $pull: { requestedUsers: user.id } },
      { new: true }
    );
    res.status(200);
    res.json(updatedBook);
  } else {
    res.status(400);
    throw new Error("Book not requested by Given User");
  }
});

const requestedBooks = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  // find all books with id same as user_id
  try {
    const books = await Book.find({ requestedUsers: user._id });
    res.status(200);
    res.json(books);
  } catch (error) {
    res.status(400);
    throw new Error("Enter valid ID");
  }
});

const bookDetails = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  //check if book id is missing
  if (!req.params.id) {
    res.status(400);
    throw new Error("Book ID Missing");
  }
  try {
    const book = await Book.findById(req.params.id).select(
      "-createdAt -updatedAt -user -requestedUser -requested -status -__v"
    );
    res.status(200);
    res.json(book);
  } catch (error) {
    res.status(400);
    throw new Error("No Book found with given ID");
  }
});

const relatedBooks = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const { genre } = req.query;
  const reQgenre = genre.split(",");
  if (!genre) {
    res.status(400);
    throw new Error("Enter genre");
  }
  try {
    const books = await Book.find({ genre: { $in: reQgenre } });
    res.status(200);
    res.json(books);
  } catch (error) {
    res.status(400);
    res.json(error);
  }
});

const Unsbscribe = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const { id } = req.params;
  if (!id) {
    res.status(400);
    throw new Error("ID required for Unsubscribing");
  }
  try {
    const unsubscribe = await Auth.findByIdAndUpdate(
      { _id: id },
      { subscriber: false },
      { new: true }
    );
    res.status(200);
    res.json(unsubscribe);
  } catch (error) {
    res.status(400);
    throw new Error("Enter valid ID");
  }
});

const forgotLink = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await Auth.findOne({ email });
  // check if user exists in the database
  // and that user is not an admin
  if (user && user.admin === false) {
    const valid = await Token.findOne({ email });
    //this allows only one token for one kind of action for one user
    if (valid && valid.action === "resetpass") {
      res.status(400);
      throw new Error(
        "Email for Reset Password already sent. For new email try after 1 Hour."
      );
    }
    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({
      email: email,
      token: token,
      action: "resetpass",
    });
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
        to: email,
        subject: "Reset Password",
        text: "Hi, click on the link below to reset your password.",
        html: `<a href="http://localhost:3000/forgotpass/${token}">Reset Password</a>`,
      };
      transporter.sendMail(mailOptions, async (error, info) => {
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
  } else {
    res.status(400);
    throw new Error("User does Not Exists");
  }
});

const forgotPass = asyncHandler(async (req, res) => {
  const { email, pass, token } = req.body;
  const tokendata = await Token.findOne({ token });
  if (tokendata) {
    if (tokendata.action === "resetpass" && tokendata.email === email) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(pass, salt);
      await Auth.findOneAndUpdate(
        { email: email },
        {
          password: hashedPassword,
        },
        { new: true }
      );
      res.status(200);
      res.json({ msg: "Password updated Successfully" });
    } else {
      res.status(400);
      throw new Error("Invalid Action");
    }
  } else {
    res.status(400);
    throw new Error("Invalid Token");
  }
});

const addToWish = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const { id } = req.params;
  if (!id) {
    res.status(400);
    throw new Error("Enter a Book ID");
  }
  if (user.wishlist.includes(id)) {
    res.status(400);
    throw new Error("Book already exists in your Wishlist");
  }
  const book = await Book.findById(id);
  if (id && book) {
    try {
      const updatewish = await Auth.findByIdAndUpdate(
        { _id: req.user.id },
        { $addToSet: { wishlist: id } },
        { new: true, select: "wishlist -_id" }
      );
      const newBook = await Book.findById(id).select(
        "-__v -createdAt -updatedAt"
      );
      res.status(200);
      res.json(newBook);
    } catch (error) {
      res.status(500);
      res.json(error);
    }
  } else {
    res.status(400);
    throw new Error("Invalid Details");
  }
});

// get all the books from the wishlist
const wishList = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id).select("wishlist admin");
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const list = user.wishlist;
  if (list.length === 0) {
    res.status(200);
    res.json(list);
  } else {
    const books = [];
    for (var id of list) {
      const book = await Book.findById(id).select(
        "-createdAt -updatedAt -__v -users -stock"
      );
      if (book) {
        books.push(book);
      } else {
        res.status(400);
        throw new Error("Invalid data ID wishlist");
      }
    }
    res.status(200);
    res.json(books);
  }
});

const removefromWish = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id).select("wishlist -_id admin");
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const { id } = req.params;
  if (!id) {
    res.status(400);
    throw new Error("Enter a ID");
  }
  if (!user.wishlist.includes(id)) {
    res.status(400);
    throw new Error("Book not in your wishlist");
  }
  try {
    const updateWish = await Auth.findByIdAndUpdate(
      { _id: req.user.id },
      {
        $pull: {
          wishlist: id,
        },
      },
      { new: true, select: "wishlist -_id" }
    );
    res.status(200);
    res.json(updateWish.wishlist);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

const contact = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const { name, mail, subject, message } = req.body;
  try {
    var transporter = nodemailer.createTransport({
      service: process.env.SERVICE,
      auth: {
        user: process.env.USER,
        pass: process.env.PASS,
      },
    });
    var mailOptions = {
      from: mail,
      to: process.env.USER,
      subject: subject,
      text: message + "sent by" + name,
    };
    transporter.sendMail(mailOptions, async (error, info) => {
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

const subscribe = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  try {
    const subscribed = await Auth.findByIdAndUpdate(
      { _id: user._id },
      { subscriber: true },
      { new: true }
    );
    res.status(200).json(subscribed);
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
});

module.exports = {
  getIssuedBooks,
  getAllBooks,
  requestBook,
  cancelRequest,
  requestedBooks,
  bookDetails,
  relatedBooks,
  Unsbscribe,
  forgotLink,
  forgotPass,
  addToWish,
  wishList,
  removefromWish,
  contact,
  subscribe,
};
