const Auth = require("../model/authModel");
const asyncHandler = require("express-async-handler");

// this middleware is to authorize admin
const adminAuth = asyncHandler(async (req, res, next) => {
  const exist = await Auth.findById(req.user.id);
  // to check if user exists by that id in the databse
  // and that user is a admin (got by token)
  if (!exist && exist.admin !== true) {
    res.status(401);
    throw new Error("Not Authorized");
  }
  next();
});

module.exports = {
  adminAuth,
};
