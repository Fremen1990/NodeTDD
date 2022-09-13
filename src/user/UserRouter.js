expres = require('express');
const router = expres.Router();
const UserService = require('./UserService');

router.post('/api/1.0/users', async (req, res) => {
  await UserService.save(req.body);
  return res.send({ message: 'User created' });
});

module.exports = router;
