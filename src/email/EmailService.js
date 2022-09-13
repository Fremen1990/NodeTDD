const nodemailer = require('nodemailer');
const transporter = require('../config/emailTransporter');

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

  if (process.env.NODE_ENV === 'dev') {
    console.log('url: ' + nodemailer.getTestMessageUrl(info));
  }
};
module.exports = { sendAccountActivation };
