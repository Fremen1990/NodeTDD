const bcrypt = require('bcrypt');
const User = require('./User');
const EmailService = require('../email/EmailService');
const sequalize = require('../config/database');
const EmailException = require('../email/EmailException');
const InvalidTokenException = require('./InvalidTokenException');
// const UserNotFoundException = require('./UserNotFoundException');
const NotFoundException = require('../error/NotFoundException');
const { Sequelize } = require('sequelize');
const { randomString } = require('../shared/generator');
const TokenService = require('../auth/TokenService');
const FileService = require('../file/FileService');

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
  // return await User.findOne({ where: { email: email }, raw: true });
  return await User.findOne({ where: { email: email } });
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
    attributes: ['id', 'username', 'email', 'image'],
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
  const user = await User.findOne({
    where: { id: id, inactive: false },
    attributes: ['id', 'username', 'email', 'image'],
  });
  if (!user) {
    throw new NotFoundException('user_not_found');
  }
  return user;
};

const updateUser = async (id, updatedBody) => {
  const user = await User.findOne({ where: { id: id } });
  user.username = updatedBody.username;
  if (user.image) {
    await FileService.deleteProfileImage(user.image);
  }
  user.image = await FileService.saveProfileImage(updatedBody.image);
  await user.save();
  return {
    id: id,
    username: user.username,
    email: user.email,
    image: user.image,
  };
};

const deleteUser = async (id) => {
  await User.destroy({ where: { id: id } });
};

const passwordResetRequest = async (email) => {
  const user = await findByEmail(email);
  if (!user) {
    throw new NotFoundException('email_not_inuse');
  }
  user.passwordResetToken = randomString(16);
  await user.save();
  try {
    await EmailService.sendPasswordReset(email, user.passwordResetToken);
  } catch (err) {
    throw new EmailException();
  }
};

const updatePassword = async (updateRequest) => {
  const user = await findByPasswordResetToken(updateRequest.passwordResetToken);
  const hash = await bcrypt.hash(updateRequest.password, 10);
  user.password = hash;
  user.passwordResetToken = null;
  user.inactive = false;
  user.activationToken = null;
  await user.save();
  await TokenService.clearTokens(user.id);
};

const findByPasswordResetToken = async (token) => {
  return await User.findOne({ where: { passwordResetToken: token } });
};

module.exports = {
  save,
  findByEmail,
  activate,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  passwordResetRequest,
  updatePassword,
  findByPasswordResetToken,
};
