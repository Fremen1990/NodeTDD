const bcrypt = require('bcrypt');
const User = require('./User');

const save = async (body) => {
  const hashedPwd = await bcrypt.hash(body.password, 10);
  const user = {
    ...body,
    password: hashedPwd,
  };
  await User.create(user);
};

const findByEmail = async (email) => {
  return await User.findOne({ where: { email: email } });
};

module.exports = { save, findByEmail };
