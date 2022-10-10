const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');
const logger = require('../shared/logger');

const sendAccountActivation = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Account activation',
    html: `
    <div>
    <b>Please click below link to activate your account</b>
    </div>
    <div>
    Token is ${token}
<a href="http://localhost:8080/#/login?token=${token}">Activate</a>
</div>`,
  });

  // if (process.env.NODE_ENV === 'development') {
  //   logger.info('url: ' + nodemailer.getTestMessageUrl(info));
  // }
  logger.info('url: ' + nodemailer.getTestMessageUrl(info)); // using SMTP in production
};

const sendPasswordReset = async (email, token) => {
  const info = await transporter.sendMail({
    from: 'My App <info@my-app.com>',
    to: email,
    subject: 'Password Reset',
    html: `
    <div>
    <b>Please click below link to reser your password</b>
    </div>
    <div>
    Token is ${token}
<a href="http://localhost:8080/#/password-reset?reset=${token}">Reset</a>
</div>`,
  });

  // if (process.env.NODE_ENV === 'development') {
  //   logger.info('url: ' + nodemailer.getTestMessageUrl(info));
  // }
  logger.info('url: ' + nodemailer.getTestMessageUrl(info)); // using SMTP in production
};

module.exports = { sendAccountActivation, sendPasswordReset };
