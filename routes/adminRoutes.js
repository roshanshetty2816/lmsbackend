const express = require("express");
const {
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
} = require("../controller/adminController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// fetch all books from the inventory
router.get("/", protect, getAllBooks);

// add a book to the inventory
router.post("/", protect, addBook);

// issue a book from inventory to a user
router.patch("/issue/:id", protect, issueBook);

// withdraw issue of a book from a user
router.patch("/return/:id", protect, returnBook);

// delete a book from the inventory
router.delete("/:id", protect, deleteBook);

// delete account of a user
router.delete("/user/:id", protect, deleteUser);

// to get all requested books
router.get("/requested", protect, requestedBooks);

// cancel a particular request
router.patch("/cancel/:id", protect, cancelRequest);

// to get all issued books
router.get("/issued", protect, issuedBooks);

// to get all unissued books
router.get("/unissued", protect, unIssued);

// to get all users
router.get("/users", protect, allUsers);

// to get subscribers
router.get("/subscribers", protect, subscribers);

// newsletter
router.post("/news", protect, newsLetter);

// due books
router.get("/duebooks", protect, dueBooks);

// update Stock
router.patch("/update/:id", protect, updateStock);

// get Activity Logs
router.get("/logs", protect, getActivityLogs);

// block User
router.patch("/block/:id", protect, blockUser);

// unblock User
router.patch("/unblock/:id", protect, unBlockUser);

module.exports = router;
