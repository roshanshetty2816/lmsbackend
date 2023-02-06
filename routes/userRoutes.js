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
} = require("../controller/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// get user's issued books
router.get("/", protect, getIssuedBooks);

// get all books from the inventory
router.get("/all", protect, getAllBooks);

// get all books requested by users
router.get("/requested", protect, requestedBooks);

// request a particular book
router.patch("/request/:id", protect, requestBook);

// cancel request for a particular book
router.patch("/cancel/:id", protect, cancelRequest);

// get details of a particular book
router.get("/book/:id", protect, bookDetails);

// get all books related to particular genre
router.get("/related", protect, relatedBooks);

// unsubscirbe from news-letter
router.patch("/unsubscribe/:id", protect, Unsbscribe);

// get link for reseting password
router.post("/forgotlink", forgotLink);

// reset password
router.post("/forgotpass", forgotPass);

// add a particular books to user's wishlist
router.patch("/addwish/:id", protect, addToWish);

// get all books from user's wishlist
router.get("/wishlist", protect, wishList);

// remove a particular book from usr's wishlist
router.patch("/remove/:id", protect, removefromWish);

// send contact mail to admin
router.post("/contact", protect, contact);

// subscribe to news-letter
router.post("/subscribe", protect, subscribe);

// write review on a particular book
router.post("/add-review", protect, addReview);

// delete a comment from a particular book
router.delete("/delete-comment/:id", protect, deleteComment);

// get comments of a particular book
router.get("/comments/:id", protect, getComments);

// modify user's comment on a particular book
router.patch("/update-comment/:id", protect, modifyComment);

module.exports = router;
