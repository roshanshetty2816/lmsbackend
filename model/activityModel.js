const mongoose = require("mongoose");

const activitySchema = mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    action: {
      type: mongoose.Schema.Types.String,
      required: true,
      enum:{
        values:['issue','return']
      }
    },
    book: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.model("ActivityModel", activitySchema);
