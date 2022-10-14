const express = require('express');
const router = express.Router();
const AuthenticationException = require('../auth/AuthenticationException');
const ValidationException = require('../error/ValidationException');
const ForbiddenException = require('../error/ForbiddenException');
const HoaxService = require('./HoaxService');
const { check, validationResult } = require('express-validator');
const pagination = require('../middleware/pagination');

router.post(
  '/api/1.0/hoaxes',
  check('content').isLength({ min: 10, max: 5000 }).withMessage('hoax_content_size'),
  async (req, res, next) => {
    if (!req.authenticatedUser) {
      return next(new AuthenticationException('unauthorized_hoax_submit'));
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return next(new ValidationException(errors.array()));
    }
    if (req.authenticatedUser) {
      await HoaxService.save(req.body, req.authenticatedUser);
      return res.send({ message: req.t('hoax_submit_success') });
    }
  }
);

router.get(['/api/1.0/hoaxes', '/api/1.0/users/:userId/hoaxes'], pagination, async (req, res, next) => {
  const { page, size } = req.pagination;
  try {
    const hoaxes = await HoaxService.getHoaxes(page, size, req.params.userId);
    res.send(hoaxes);
  } catch (err) {
    next(err);
  }
});

router.delete('/api/1.0/hoaxes/:hoaxId', (req, res) => {
  throw new ForbiddenException('unauthorized_hoax_delete');
});

module.exports = router;
