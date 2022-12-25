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
} = require("../controller/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, getIssuedBooks);
router.get("/all", protect, getAllBooks);
router.get("/requested", protect, requestedBooks);
router.patch("/request/:id", protect, requestBook);
router.patch("/cancel/:id", protect, cancelRequest);
router.get("/book/:id", protect, bookDetails);
router.get("/related", protect, relatedBooks);
router.patch("/unsubscribe/:id", protect, Unsbscribe);
router.post("/forgotlink", forgotLink);
router.post("/forgotpass", forgotPass);
router.patch("/addwish/:id", protect, addToWish);
router.get("/wishlist", protect, wishList);
router.patch("/remove/:id", protect, removefromWish);
router.post("/contact", protect, contact);
router.post("/subscribe", protect, subscribe);

module.exports = router;
