const bcrypt = require('bcrypt');
const User = require('./User');
const crypto = require('crypto');
const EmailService = require('../email/EmailService');
const sequalize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');

const generateToken = (length) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

const save = async (body) => {
  const { username, email, password } = body;
  const hashedPwd = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hashedPwd,
    activationToken: generateToken(16),
  };
  const transaction = await sequalize.transaction();
  await User.create(user, { transaction });
  try {
    await EmailService.sendAccountActivation(email, user.activationToken);
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw new EmailException();
  }
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email }, raw: true });
};

const activate = async (token) => {
  const user = await User.findOne({ where: { activationToken: token } });

  if (!user) {
    throw new InvalidTokenException();
  }

  user.inactive = false;
  user.activationToken = null;
  await user.save();
};

const getUsers = async (page, size) => {
  const usersWithCount = await User.findAndCountAll({
    where: { inactive: false },
    attributes: ['id', 'username', 'email'],
    limit: size,
    offset: page * size,
  });
  return {
    content: usersWithCount.rows,
    page,
    size,
    totalPages: Math.ceil(usersWithCount.count / size),
  };
};

const getUser = async (id) => {
  const user = await User.findOne({ where: { id: id, inactive: false }, attributes: ['id', 'username', 'email'] });
  if (!user) {
    throw new UserNotFoundException();
  }
  return user;
};

module.exports = { save, findByEmail, activate, getUsers, getUser };
