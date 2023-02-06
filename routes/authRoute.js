const express = require("express");
const { login, register, editDetails } = require("../controller/authController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// to login admin/user
router.post("/login", login);

// to register user
router.post("/register", register);

// to edit details of users
router.post("/edit-details", protect, editDetails);

module.exports = router;