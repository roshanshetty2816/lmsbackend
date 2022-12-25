const mongoose = require("mongoose");

const authSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    admin: {
      type: Boolean,
      required: true,
    },
    subscriber: {
      type: Boolean,
      required: true,
      default: false,
    },
    issued: {
      type: [String],
      validate: [
        arrayLimit,
        "Cannot issue more than 2 books for a single user.",
      ],
      default: [],
    },
    wishlist: {
      type: [String],
      default: [],
    },
    blocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

function arrayLimit(val) {
  return val.length < 2 && val.length >= 0;
}

module.exports = mongoose.model("AuthModel", authSchema);
