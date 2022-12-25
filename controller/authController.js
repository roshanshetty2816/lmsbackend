const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Auth = require("../model/authModel");

const login = asyncHandler(async (req, res) => {
  const { email, password, admin } = req.body;
  const user = await Auth.findOne({ email });
  if (
    user &&
    (await bcrypt.compare(password, user.password)) &&
    admin === user.admin
  ) {
    res.json({
      name: user.name,
      email: user.email,
      admin: user.admin,
      issued: user.issued,
      _id: user.id,
      token: generateToken(user.id),
    });
  } else {
    res.status(400);
    throw new Error("Invalid Credentials");
  }
});
const register = asyncHandler(async (req, res) => {
  const { name, email, password, admin, subscriber } = req.body;
  if (!email && !name && !password && !admin && !subscriber) {
    res.status(400);
    throw new Error("Enter All Details to Register");
  }
  const userExist = await Auth.findOne({ email });
  // check if the user already exits in the database
  if (userExist) {
    res.status(400);
    throw new Error("User Already Exists");
  }
  try {
    // salt for level of encryption done on the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = await Auth.create({
      name,
      email,
      admin,
      password: hashedPassword,
      subscriber,
    });
    res.status(200);
    res.json({
      name: user.name,
      email: user.email,
      admin: user.admin,
      issued: user.issued,
      _id: user.id,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400);
    throw new Error("Invalid Data");
  }
});

// generates a token from the id as a object
// which expires in 30 days
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

module.exports = {
  login,
  register,
};
