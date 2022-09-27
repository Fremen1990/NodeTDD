const UserService = require('../user/UserService');
const bcrypt = require('bcrypt');

const basicAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    // Basic ....
    const encoded = authorization.substring(6);
    const decoded = Buffer.from(encoded, 'base64').toString('ascii');
    const decodedSplit = decoded.split(':');
    const [email, password] = decodedSplit;
    const user = await UserService.findByEmail(email);

    if (user && !user.inactive) {
      const match = await bcrypt.compare(password, user.password);
      if (match) {
        req.authenticatedUser = user;
      }
    }
  }
  next();
};

module.exports = basicAuthentication;
