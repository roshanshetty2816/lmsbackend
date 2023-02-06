const Joi = require("joi");

const contactSchema = Joi.object()
  .keys({
    name: Joi.string().min(2).max(25).required(),
    mail: Joi.string().email().required(),
    subject: Joi.string().min(1).max(100).required(),
    message: Joi.string().max(1000).required(),
  })
  .unknown(false);

const forgotLinkSchema = Joi.object()
  .keys({
    email: Joi.string().email().required(),
  })
  .unknown(false);

const pattern =
  /^.*(?=.{8,})((?=.*[!@#$%^&*()\-_=+{};:,<.>]){1})(?=.*\d)((?=.*[a-z]){1})((?=.*[A-Z]){1}).*$/;

const forgotPassSchema = Joi.object()
  .keys({
    email: Joi.string().email().required(),
    pass: Joi.string().regex(RegExp(pattern)).required(),
    pass2: Joi.any()
      .equal(Joi.ref("pass"))
      .required()
      .label("Confirm password")
      .options({ messages: { "any.only": "{{#label}} does not match" } }),
    token: Joi.string().required(),
  })
  .unknown(false);

const addReviewSchema = Joi.object()
  .keys({
    rating: Joi.number().min(0).max(5).required(),
    bookID: Joi.string().required(),
    userName: Joi.string().min(2).max(25).required(),
    comment: Joi.string().min(1).max(1000).required(),
  })
  .unknown(false);

const deleteCommentSchema = Joi.object()
  .keys({
    bookID: Joi.string().required(),
  })
  .unknown(false);

const modifyCommentSchema = Joi.object().keys({
  comment: Joi.string().min(1).max(1000).required(),
  bookID: Joi.string().required(),
});

module.exports = {
  contactSchema,
  forgotLinkSchema,
  forgotPassSchema,
  addReviewSchema,
  deleteCommentSchema,
  modifyCommentSchema,
};
