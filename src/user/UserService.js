const bcrypt = require('bcrypt');
const User = require('./User');
const EmailService = require('../email/EmailService');
const sequalize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
const UserNotFoundException = require('./UserNotFoundException');
const { Sequelize } = require('sequelize');
const { randomString } = require('../shared/generator');

const save = async (body) => {
  const { username, email, password } = body;
  const hashedPwd = await bcrypt.hash(password, 10);
  const user = {
    username,
    email,
    password: hashedPwd,
    activationToken: randomString(16),
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

const getUsers = async (page, size, authenticatedUser) => {
  const usersWithCount = await User.findAndCountAll({
    where: {
      inactive: false,
      id: {
        [Sequelize.Op.not]: authenticatedUser ? authenticatedUser.id : 0, // not inactive users
      },
    },
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

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id: id } });
  user.username = updatedBody.username;
  await user.save();
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
};

module.exports = { save, findByEmail, activate, getUsers, getUser, updateUser, deleteUser };
