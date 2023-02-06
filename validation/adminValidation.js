const Joi = require("joi");

const addBookSchema = Joi.object()
  .keys({
    author: Joi.string().min(1).max(25).required(),
    title: Joi.string().min(1).max(100).required(),
    genre: Joi.array()
      .items(Joi.string())
      .min(1, "Atleast one genre must be selected")
      .required(),
    total: Joi.number().min(1).required(),
    rating: Joi.number().min(0).max(5).required(),
    numOfRatings: Joi.number().min(0).required(),
  })
  .unknown(false);

const newsLetterSchema = Joi.object()
  .keys({
    audience: Joi.string().required(),
    subject: Joi.string().max(200).required(),
    body: Joi.string().max(2000).required(),
  })
  .unknown(false);

module.exports = {
  addBookSchema,
  newsLetterSchema,
};
