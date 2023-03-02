const Book = require("../model/libraryModel");
const { GridFsStorage } = require("multer-gridfs-storage");
const multer = require("multer");

const storage = new GridFsStorage({
  url: process.env.MONGO_URI,
  file: async (req, file) => {
    async function checkBookExist() {
      const book = await Book.findById(req.body.id);
      if (!book) {
        req.msg = "Enter a valid Book ID";
        throw new Error("Enter a valid Book ID");
      }
    }
    try {
      await checkBookExist();
    } catch (error) {
      req.msg = "Enter a valid Book ID";
      throw new Error("Enter a valid Book ID");
    }
    return new Promise((resolve, reject) => {
      const filename = req.body.id;
      const fileInfo = {
        filename: filename,
        bucketName: "books",
      };
      resolve(fileInfo);
    });
  },
});
const upload = multer({
  storage,
});

module.exports = {
  upload,
};
