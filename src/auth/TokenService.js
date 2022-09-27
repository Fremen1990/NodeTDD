// const jwt = require('jsonwebtoken');
const { randomString } = require('../shared/generator');
const Token = require('./Token');

const createToken = async (user) => {
  const token = randomString(32);
  await Token.create({
    token: token,
    userId: user.id,
  });
  // return jwt.sign({ id: user.id }, 'this-is-our-secret', { expiresIn: '2d' });
  return token;
};

const verify = async (token) => {
  const tokenInDB = await Token.findOne({ where: { token: token } });
  const userId = tokenInDB.userId;
  // return jwt.verify(token, 'this-is-our-secret');
  return { id: userId };
};

const deleteToken = async (token) => {
  await Token.destroy({ where: { token: token } });
};

module.exports = { createToken, verify, deleteToken };
