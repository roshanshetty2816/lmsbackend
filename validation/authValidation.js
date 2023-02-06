const Joi = require("joi");

const pattern =
  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

const loginSchema = Joi.object()
  .keys({
    email: Joi.string().email().required(),
    password: Joi.string().regex(RegExp(pattern)).required(),
    admin: Joi.boolean().required(),
  })
  .unknown(false);

const registerSchema = Joi.object()
  .keys({
    name: Joi.string().min(2).max(25).required(),
    email: Joi.string().email().required(),
    password: Joi.string().regex(RegExp(pattern)).required(),
    password2: Joi.any()
      .equal(Joi.ref("password"))
      .required()
      .label("Confirm password")
      .options({ messages: { "any.only": "{{#label}} does not match" } }),
  })
  .unknown(false);

const editProfileSchema = Joi.object()
  .keys({
    name: Joi.string().min(2).required(),
    mail: Joi.string().email().required(),
  })
  .unknown(false);

module.exports = {
  loginSchema,
  registerSchema,
  editProfileSchema,
};
