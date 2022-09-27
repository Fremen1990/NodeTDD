const TokenService = require('../auth/TokenService');

const tokenAuthentication = async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (authorization) {
    // jsonwebtoken Bearer token ....
    const token = authorization.substring(7);

    try {
      req.authenticatedUser = await TokenService.verify(token);
    } catch (err) {}
  }
  next();
};

module.exports = tokenAuthentication;
