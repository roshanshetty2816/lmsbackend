const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const axios = require("axios");
const Auth = require("../model/authModel");
const { loginSchema, registerSchema } = require("../validation/authValidation");

// to login a user
const login = asyncHandler(async (req, res) => {
  if (req.body.accessToken) {
    // for google login
    axios
      .get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${req.body.accessToken}`,
        },
      })
      .then(async (response) => {
        const email = response.data.email;
        // to check if user already exist in the database
        const existingUser = await Auth.findOne({ email });
        if (!existingUser) {
          return res.status(404).json({ message: "User don't exist!" });
        }
        res.status(200).json({
          name: existingUser.name,
          email: existingUser.email,
          admin: existingUser.admin,
          issued: existingUser.issued,
          subscriber: existingUser.subscriber,
          _id: existingUser.id,
          readBooks: existingUser.readBooks,
          wishlist: existingUser.wishlist,
          token: generateToken(existingUser.id),
        });
      })
      .catch((err) => {
        res.status(400).json({ message: "Invalid access token!" });
      });
  } else {
    // for normal login
    try {
      const result = await loginSchema.validateAsync(req.body);
      const user = await Auth.findOne({ email: result.email });
      if (
        user &&
        (await bcrypt.compare(result.password, user.password)) &&
        result.admin === user.admin
      ) {
        res.status(200).json({
          name: user.name,
          email: user.email,
          admin: user.admin,
          issued: user.issued,
          subscriber: user.subscriber,
          _id: user.id,
          readBooks: user.readBooks,
          wishlist: user.wishlist,
          token: generateToken(user.id),
        });
      } else {
        res.status(400);
        throw new Error("Invalid Credentials");
      }
    } catch (error) {
      if (error.isJoi) {
        res.status(422);
        throw new Error(error);
      } else {
        res.status(500);
        throw new Error(error);
      }
    }
  }
});

// to register a user
const register = asyncHandler(async (req, res) => {
  if (req.body.accessToken) {
    axios
      .get("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: {
          Authorization: `Bearer ${req.body.accessToken}`,
        },
      })
      .then(async (response) => {
        const name =
          capitalize(response.data.given_name) +
          " " +
          capitalize(response.data.family_name);
        const email = response.data.email;
        // to check if user already exist in the database
        const existingUser = await Auth.findOne({ email });
        if (existingUser) {
          return res.status(400).json({ message: "User already exist!" });
        }
        const user = await Auth.create({
          name: name,
          email: email,
        });
        res.status(200).json({
          name: user.name,
          email: user.email,
          admin: user.admin,
          issued: user.issued,
          subscriber: user.subscriber,
          _id: user.id,
          readBooks: user.readBooks,
          wishlist: user.wishlist,
          token: generateToken(user._id),
        });
      })
      .catch((err) => {
        res.status(400).json({ message: "Invalid access token!" });
      });
  } else {
    try {
      const result = await registerSchema.validateAsync(req.body);
      const userExist = await Auth.findOne({ email: result.email });
      // check if the user already exits in the database
      if (userExist) {
        res.status(400);
        throw new Error("User Already Exists");
      }
      try {
        // salt for level of encryption done on the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(result.password, salt);
        const user = await Auth.create({
          name: result.name,
          email: result.email,
          password: hashedPassword,
        });
        res.status(200).json({
          name: user.name,
          email: user.email,
          admin: user.admin,
          issued: user.issued,
          subscriber: user.subscriber,
          _id: user.id,
          readBooks: user.readBooks,
          wishlist: user.wishlist,
          token: generateToken(user._id),
        });
      } catch (error) {
        res.status(400);
        throw new Error("Invalid Data");
      }
    } catch (error) {
      if (error.isJoi) {
        res.status(422);
        throw new Error(error);
      } else {
        res.status(500);
        throw new Error("Enter input fields correctly");
      }
    }
  }
});

// generates a token from the id as a object
// which expires in 30 days
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "10d" });
};

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// to edit details of users
const editDetails = asyncHandler(async (req, res) => {
  const user = await Auth.findById(req.user.id);
  // check if user exists in the database
  // and that user is not an admin
  if (!user && user.admin !== false) {
    res.status(400);
    throw new Error("User does Not Exists");
  }
  const { name, mail } = req.body;
  if (!name || !mail) {
    res.status(400);
    throw new Error("Data Missing");
  }
  try {
    let updateDetails = await Auth.findByIdAndUpdate(
      { _id: user._id },
      { name: name, email: mail },
      { new: true, select: "-__v -createdAt -updatedAt -password" }
    );
    const token = req.headers.authorization.split(" ")[1];
    updateDetails = { ...updateDetails._doc, token };
    res.status(200).json(updateDetails);
  } catch (error) {
    res.status(500);
    throw new Error("Internal Server Error");
  }
});

module.exports = {
  login,
  register,
  editDetails,
};
