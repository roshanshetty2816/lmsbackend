const jwt = require("jsonwebtoken");
const Auth = require("../model/authModel");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {
  const { authorization } = req.headers;

  if (authorization && authorization.startsWith("Bearer")) {
    try {
      const token = authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // req.user = await Auth.findById(decoded.id).select("_id");
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Token Error");
    }
  } else {
    res.status(400);
    throw new Error("No Token");
  }
});

module.exports = { protect };
