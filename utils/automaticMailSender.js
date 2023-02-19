const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Auth = require("../model/authModel");
const Book = require("../model/libraryModel");

const notifyBookDefaulties = async () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      try {
        // to get all the books that are due
        const books = await Book.find({
          "users.dueDate": { $lt: new Date().toISOString() },
        });
        // filter users that have books due
        books.forEach(
          (book) =>
            (book.users = book.users.filter(
              (user) => user.dueDate < new Date().toISOString()
            ))
        );
        let emails = "";
        let users = [];
        // filter the users for their emails
        books.map((book) => book.users.map((user) => users.push(user.id)));
        // checking if there is any user with due books
        if (users.length !== 0) {
          // finding the emails of all the users that have due books
          for (let user of users) {
            try {
              const defaulty = await Auth.findById(user);
              emails += defaulty.email + ",";
            } catch (error) {
              console.log(error);
            }
          }
          // processing the list of emails
          const emailList = emails.slice(0, -1).toString();
          // sending emails to all the users with due books
          try {
            var transporter = nodemailer.createTransport({
              service: process.env.SERVICE,
              auth: {
                user: process.env.USER,
                pass: process.env.PASS,
              },
            });
            var mailOptions = {
              from: process.env.USER,
              to: emailList,
              subject: "Return Book",
              html: `<!DOCTYPE html><html lang="en"><body>This is to remind you that you have a book due from the library.</body></html>`,
            };
            transporter.sendMail(mailOptions, function (error, info) {
              if (error) {
                console.log(error);
              } else {
                console.log("Email Sent Successfull");
              }
            });
          } catch (error) {
            console.log(error);
          }
        } else {
          // pass
          console.log("No Users have Books Due");
        }
      } catch (error) {
        console.log(error);
      }
    })
    .catch((err) => {
      console.log(err);
    });
};

module.exports = {
  notifyBookDefaulties,
};
