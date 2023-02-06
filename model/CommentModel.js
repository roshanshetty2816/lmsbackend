const mongoose = require("mongoose");

const commentSchema = mongoose.Schema(
  {
    userID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
    userName: {
      type: mongoose.Schema.Types.String,
      required: true,
      ref: "User",
    },
    bookID: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Books",
    },
    comment: {
      type: mongoose.Schema.Types.String,
      required: true,
    },
  },
  {
    timeStamps: true,
  }
);

module.exports = mongoose.model("CommentModel", commentSchema);
