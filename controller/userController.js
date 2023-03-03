const Auth = require("../model/authModel");
const Book = require("../model/libraryModel");
const Token = require("../model/tokenModel");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");
const Comment = require("../model/CommentModel");
var mongoose = require("mongoose");
const {
  contactSchema,
  forgotLinkSchema,
  forgotPassSchema,
  addReviewSchema,
  deleteCommentSchema,
  modifyCommentSchema,
} = require("../validation/userValidation");

// to get books issued by a particular user
const getIssuedBooks = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  // find all books with id same as user_id
  try {
    const books = await Book.find({ "users.id": user._id });
    res.status(200).json(books);
  } catch (error) {
    res.status(500);
    throw new Error(error);
  }
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
    req.query.genre === "" ? allGenres : req.query.genre.split(",");
  const search = req.query.search === undefined ? "" : req.query.search;
  let matchQuery = { $match: {} };
  const searchBy =
    req.query.searchBy === "title"
      ? (matchQuery["$match"] = { title: { $regex: search, $options: "i" } })
      : (matchQuery["$match"] = { author: { $regex: search, $options: "i" } });
  matchQuery["$match"]["genre"] = { $in: reqGenre };
  const sort = req.query.sort === "asc" ? 1 : -1;
  let sortBy;
  if (req.query.sortBy === undefined) {
    sortBy = { title: sort };
  } else if (req.query.sortBy === "author") {
    sortBy = { author: sort };
  } else if (req.query.sortBy === "title") {
    sortBy = { title: sort };
  }
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

// to request a book by user
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
  if (new Date(user.subscriptionEndDate) < new Date(new Date().toISOString())) {
    res.status(400);
    throw new Error("You do not have a valid plan to request new book.");
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

// to get complete details about a book
const bookDetails = asyncHandler(async (req, res, next) => {
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

// to get related books which has same genre as the book being viewed in book details
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
    const page = req.query.page === undefined ? 1 : req.query.page;
    const limit = 5;
    const skip = page * limit - limit;
    const query = [
      {
        $match: {
          genre: { $in: reQgenre },
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
  } catch (error) {
    res.status(400);
    res.json(error);
  }
});

// to unsubscibe from the newsletter
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
      { new: true, select: "-password -__v -createdAt -updatedAt" }
    );
    res.status(200).json(unsubscribe);
  } catch (error) {
    res.status(400);
    throw new Error("Enter valid ID");
  }
});

// to get a reset password link
const forgotLink = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await forgotLinkSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  const user = await Auth.findOne({ email: result.email });
  // check if user exists in the database
  // and that user is not an admin
  if (user && user.admin === false) {
    const valid = await Token.findOne({ email: result.email });
    //this allows only one token for one kind of action for one user
    if (valid && valid.action === "resetpass") {
      res.status(400);
      throw new Error(
        "Email for Reset Password already sent. For new email try after 1 Hour."
      );
    }
    const token = crypto.randomBytes(32).toString("hex");
    await Token.create({
      email: result.email,
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
        to: result.email,
        subject: "Reset Password",
        text: "Hi, click on the link below to reset your password.",
        html: `<a href="https://librarymngsys.netlify.app/forgotpass/${token}">Reset Password</a>`,
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
  let result;
  try {
    result = await forgotPassSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  const tokendata = await Token.findOne({ token: result.token });
  if (tokendata) {
    if (tokendata.action === "resetpass" && tokendata.email === result.email) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(result.pass, salt);
      await Auth.findOneAndUpdate(
        { email: result.email },
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

// to add a book to wishlist
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

// to remove a books from wishlist
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

// to cantact the admin/library
const contact = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  let result;
  try {
    result = await contactSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
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
      from: result.mail,
      to: process.env.USER,
      subject: result.subject,
      text: result.message + "sent by" + result.name,
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

// to subscribe to newsletter
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

// to add a review for a previously issued book
const addReview = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await addReviewSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  if (user.name !== result.userName) {
    res.status(400);
    throw new Error("Invalid Name");
  }
  if (!user.readBooks.includes(result.bookID)) {
    res.status(400);
    throw new Error("You never issued this book");
  }
  const updateRating = await Book.findByIdAndUpdate(
    { _id: result.bookID },
    [
      {
        $set: {
          rating: {
            $divide: [{ $sum: ["$rating", Number(result.rating)] }, 2],
          },
          numOfRatings: { $sum: ["$numOfRatings", 1] },
        },
      },
    ],
    { new: true }
  );
  const addComment = await Comment.create({
    userID: req.user.id,
    userName: result.userName,
    bookID: result.bookID,
    comment: result.comment,
  });
  res.status(200).json({ addComment, updateRating });
});

// to delete a comment done by user
const deleteComment = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await deleteCommentSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    res.status(400);
    throw new Error("Comment does not Exist");
  }
  if (comment.userID.valueOf() !== user.id) {
    res.status(400);
    throw new Error("Comment not written by you");
  }
  if (comment.bookID.valueOf() !== result.bookID) {
    res.status(400);
    throw new Error("Comment does not belong to the given book");
  }
  try {
    await comment.remove();
    res.status(200).json(comment._id);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

// to all comments related to that book
const getComments = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  try {
    const comments = await Comment.find({ bookID: id });
    res.status(200).json(comments);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

// to edit a comment made by user for a book
const modifyComment = asyncHandler(async (req, res) => {
  let result;
  try {
    result = await modifyCommentSchema.validateAsync(req.body);
  } catch (error) {
    res.status(400);
    throw new Error(error);
  }
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const updatedComment = await Comment.findOneAndUpdate(
    {
      bookID: mongoose.Types.ObjectId(result.bookID),
      userID: user._id,
      _id: req.params.id,
    },
    { comment: result.comment },
    { new: true }
  );
  res.status(200).json(updatedComment);
});

let bucket;
mongoose.connection.on("connected", () => {
  var client = mongoose.connections[0].client;
  var db = mongoose.connections[0].db;
  bucket = new mongoose.mongo.GridFSBucket(db, {
    bucketName: "books",
  });
});

const getEbook = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
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
  addReview,
  deleteComment,
  getComments,
  modifyComment,
  getEbook,
};
