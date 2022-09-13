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

module.exports = { save };
