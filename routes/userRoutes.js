const express = require("express");
const {
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
  wishList,
  addToWish,
  removefromWish,
  contact,
  subscribe,
  addReview,
  deleteComment,
  getComments,
  modifyComment,
  getEbook,
} = require("../controller/userController");
const { protect } = require("../middleware/authMiddleware");
const { userAuth } = require("../middleware/userAuthMiddleware");

const router = express.Router();

// get user's issued books
router.get("/", protect, userAuth, getIssuedBooks);

// get all books from the inventory
router.get("/all", protect, userAuth, getAllBooks);

// get all books requested by users
router.get("/requested", protect, userAuth, requestedBooks);

// request a particular book
router.patch("/request/:id", protect, userAuth, requestBook);

// cancel request for a particular book
router.patch("/cancel/:id", protect, userAuth, cancelRequest);

// get details of a particular book
router.get("/book/:id", protect, userAuth, bookDetails);

// get all books related to particular genre
router.get("/related", protect, userAuth, relatedBooks);

// unsubscirbe from news-letter
router.patch("/unsubscribe/:id", protect, userAuth, Unsbscribe);

// get link for reseting password
router.post("/forgotlink", forgotLink);

// reset password
router.post("/forgotpass", forgotPass);

// add a particular books to user's wishlist
router.patch("/addwish/:id", protect, userAuth, addToWish);

// get all books from user's wishlist
router.get("/wishlist", protect, userAuth, wishList);

// remove a particular book from usr's wishlist
router.patch("/remove/:id", protect, userAuth, removefromWish);

// send contact mail to admin
router.post("/contact", protect, userAuth, contact);

// subscribe to news-letter
router.post("/subscribe", protect, userAuth, subscribe);

// write review on a particular book
router.post("/add-review", protect, userAuth, addReview);

// delete a comment from a particular book
router.delete("/delete-comment/:id", protect, userAuth, deleteComment);

// get comments of a particular book
router.get("/comments/:id", protect, userAuth, getComments);

// modify user's comment on a particular book
router.patch("/update-comment/:id", protect, userAuth, modifyComment);

// get E-Book
router.get("/ebook/:id", protect, userAuth, getEbook);

module.exports = router;
