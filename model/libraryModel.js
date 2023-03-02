const mongoose = require("mongoose");

const LibrarySchema = mongoose.Schema(
  {
    // denotes the user whom the book is issued
    users: {
      type: [
        {
          id: String,
          dueDate: String,
          _id: false,
        },
      ],
      required: false,
      default: [],
      ref: "User",
    },
    //denotes the title of the book
    title: {
      type: String,
      required: true,
    },
    // denotes the author of the book
    author: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      required: true,
    },
    // denotes the user who requested the book
    requestedUsers: {
      type: [String],
      required: true,
      default: [],
    },
    genre: {
      type: [String],
      required: true,
    },
    stock: {
      type: mongoose.Schema.Types.Number,
      required: true,
      min: 0,
    },
    numOfRatings: {
      type: mongoose.Schema.Types.Number,
      min: 0,
      required: true,
    },
    ebook: {
      type: mongoose.Schema.Types.String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("LibraryModel", LibrarySchema);
