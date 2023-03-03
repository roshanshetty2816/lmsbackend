const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const Auth = require("../model/authModel");

const automaticSubscriptionReminder = async () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(async () => {
      try {
        const users = await Auth.find({
          subscriptionEndDate: { $lt: new Date().toISOString() },
        }).select("email");
        let userEmailList = "";
        users.map((user) => (userEmailList += user.email + ","));
        const emailList = userEmailList.slice(0, -1).toString();
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
            html: `<!DOCTYPE html><html lang="en"><body>This is to remind you that you have no active plans in our library.</body></html>`,
          };
          transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
              console.log(error);
            } else {
              console.log("Email Sent Successfully");
            }
          });
        } catch (error) {
          console.log(error);
        }
      } catch (error) {
        throw new Error(error);
      }
    })
    .catch((error) => console.log(error));
};

module.exports = {
  automaticSubscriptionReminder,
};
