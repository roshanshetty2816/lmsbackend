const express = require("express");
const {
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
} = require("../controller/adminController");
const { protect } = require("../middleware/authMiddleware");
const { adminAuth } = require("../middleware/adminAuthMiddleware");
const { upload } = require("../utils/bookUploader");
const router = express.Router();

// fetch all books from the inventory
router.get("/", protect, adminAuth, getAllBooks);

// add a book to the inventory
router.post("/", protect, adminAuth, addBook);

// upload ebook for a particular book
router.post("/ebook", protect, adminAuth, upload.single("file"), uploadEbook);

// issue a book from inventory to a user
router.patch("/issue/:id", protect, adminAuth, issueBook);

// withdraw issue of a book from a user
router.patch("/return/:id", protect, adminAuth, returnBook);

// delete a book from the inventory
router.delete("/:id", protect, adminAuth, deleteBook);

// delete account of a user
router.delete("/user/:id", protect, adminAuth, deleteUser);

// to get all requested books
router.get("/requested", protect, adminAuth, requestedBooks);

// cancel a particular request
router.patch("/cancel/:id", protect, adminAuth, cancelRequest);

// to get all issued books
router.get("/issued", protect, adminAuth, issuedBooks);

// to get all unissued books
router.get("/unissued", protect, adminAuth, unIssued);

// to get all users
router.get("/users", protect, adminAuth, allUsers);

// to get subscribers
router.get("/subscribers", protect, adminAuth, subscribers);

// newsletter
router.post("/news", protect, adminAuth, newsLetter);

// due books
router.get("/duebooks", protect, adminAuth, dueBooks);

// update Stock
router.patch("/update/:id", protect, adminAuth, updateStock);

// get Activity Logs
router.get("/logs", protect, adminAuth, getActivityLogs);

// block User
router.patch("/block/:id", protect, adminAuth, blockUser);

// unblock User
router.patch("/unblock/:id", protect, adminAuth, unBlockUser);

// to notify book defaulties
router.post("/notify", protect, adminAuth, notifyBookDefaulties);

// get list of blocked users
router.get("/blocked", protect, adminAuth, blockedUsers);

// get E-Book
router.get("/ebook/:id", protect, adminAuth, getEbook);

// update subscription plan for a particular plan
router.put("/update-plan/:id", protect, adminAuth, updateSubscriptionPlan);

module.exports = router;
