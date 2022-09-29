const request = require('supertest');
const app = require('../src/app');
const pl = require('../locales/pl/translation.json');
const en = require('../locales/en/translation.json');

const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const bcrypt = require('bcrypt');

const SMTPServer = require('smtp-server').SMTPServer;
const config = require('config');

let lastMail, server;
let simulateSmtpFailure = false;

beforeAll(async () => {
  server = new SMTPServer({
    authOptional: true,
    onData(stream, session, callback) {
      let mailBody;
      stream.on('data', (data) => {
        mailBody += data.toString();
      });
      stream.on('end', () => {
        if (simulateSmtpFailure) {
          const error = new Error('Invalid mailbox');
          error.responseCode = 553;
          return callback(error);
        }
        lastMail = mailBody;
        callback();
      });
    },
  });

  await server.listen(config.mail.port, 'localhost');

  await sequelize.sync();

  jest.setTimeout(20000);
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  await User.destroy({ truncate: { cascade: true } });
});

afterAll(async () => {
  await server.close();
  jest.setTimeout(5000);
});

const activeUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const addUser = async (user = { ...activeUser }) => {
  user.password = await bcrypt.hash(user.password, 10);
  return await User.create(user);
};

const postPasswordReset = (email = 'user1@mail.com', options = {}) => {
  const agent = request(app).post('/api/1.0/user/password').send({ email: 'user1@mail.com' });
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send({ email: email });
};

const putPasswordUpdate = (body = {}, options = {}) => {
  const agent = request(app).put('/api/1.0/user/password');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(body);
};

describe('Password Reset Request', () => {
  it('returns 404 when a password request is sent from unknown e-mail', async () => {
    const response = await postPasswordReset();
    expect(response.status).toBe(404);
  });

  it.each`
    language | message
    ${'pl'}  | ${pl.email_not_inuse}
    ${'en'}  | ${en.email_not_inuse}
  `(
    'returns error body with $message for unknown email for password reset request when language is set $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await postPasswordReset('user1@mail.com', { language: language });
      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it.each`
    language | message
    ${'pl'}  | ${pl.email_invalid}
    ${'en'}  | ${en.email_invalid}
  `(
    'returns 400 with validation error response with $message when request does not have valid email and language is set $language',
    async ({ language, message }) => {
      const response = await postPasswordReset(null, { language: language });
      expect(response.body.validationErrors.email).toBe(message);
      expect(response.status).toBe(400);
    }
  );

  it('returns 200 ok when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(200);
  });

  it.each`
    language | message
    ${'pl'}  | ${pl.password_reset_request_success}
    ${'en'}  | ${en.password_reset_request_success}
  `(
    'returns success response body with $message for known email for password reset request when language is set $language',
    async ({ language, message }) => {
      const user = await addUser();
      const response = await postPasswordReset(user.email, { language: language });
      expect(response.body.message).toBe(message);
    }
  );

  it('creates passwordResetToken when a password reset request is sent for known e-mail', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    expect(userInDB.passwordResetToken).toBeTruthy();
  });

  it('sends a password reset email with passwordResetToken', async () => {
    const user = await addUser();
    await postPasswordReset(user.email);
    const userInDB = await User.findOne({ where: { email: user.email } });
    const passwordResetToken = userInDB.passwordResetToken;
    expect(lastMail).toContain('user1@mail.com');
    expect(lastMail).toContain(passwordResetToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email);
    expect(response.status).toBe(502);
  });

  it.each`
    language | message
    ${'pl'}  | ${pl.email_failure}
    ${'en'}  | ${en.email_failure}
  `('returns $message when language is set $language after email failure', async ({ language, message }) => {
    simulateSmtpFailure = true;
    const user = await addUser();
    const response = await postPasswordReset(user.email, { language: language });
    expect(response.body.message).toBe(message);
  });
});

describe('Password Update', () => {
  it('returns 403 when password update request does not have the valid password token', async () => {
    const response = await putPasswordUpdate({ password: 'P4ssword', passwordResetToken: 'abcd' });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'pl'}  | ${pl.unauthorized_password_reset}
    ${'en'}  | ${en.unauthorized_password_reset}
  `(
    'returns error body with $message when language is set to $language after trying to update with invalid token',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await putPasswordUpdate(
        { password: 'P4ssword', passwordResetToken: 'abcd' },
        { language: language }
      );
      expect(response.body.path).toBe('/api/1.0/user/password');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 when password update request with invalid password patter and the reset token is invalid', async () => {
    const response = await putPasswordUpdate({ password: 'password-not-valid', passwordResetToken: 'abcd' });
    expect(response.status).toBe(403);
  });

  it('returns 400 bad request when trying to update with invalid password and reset token is valid', async () => {
    const user = await addUser();
    user.passwordResetToken = 'test-token';
    await user.save();
    const response = await putPasswordUpdate({ password: 'not-valid', passwordResetToken: 'test-token' });
    expect(response.status).toBe(400);
  });

  it.each`
    language | value                | message
    ${'en'}  | ${null}              | ${en.password_null}
    ${'en'}  | ${'P4ssw'}           | ${en.password_size}
    ${'en'}  | ${'alllowercase'}    | ${en.password_pattern}
    ${'en'}  | ${'ALLUPPERCASE'}    | ${en.password_pattern}
    ${'en'}  | ${'1234567890'}      | ${en.password_pattern}
    ${'en'}  | ${'lowerUPPER'}      | ${en.password_pattern}
    ${'en'}  | ${'lower2542number'} | ${en.password_pattern}
    ${'en'}  | ${'UPPER535NUMBER'}  | ${en.password_pattern}
    ${'pl'}  | ${null}              | ${pl.password_null}
    ${'pl'}  | ${'P4ssw'}           | ${pl.password_size}
    ${'pl'}  | ${'alllowercase'}    | ${pl.password_pattern}
    ${'pl'}  | ${'ALLUPPERCASE'}    | ${pl.password_pattern}
    ${'pl'}  | ${'1234567890'}      | ${pl.password_pattern}
    ${'pl'}  | ${'lowerUPPER'}      | ${pl.password_pattern}
    ${'pl'}  | ${'lower2542number'} | ${pl.password_pattern}
    ${'pl'}  | ${'UPPER535NUMBER'}  | ${pl.password_pattern}
  `(
    'returns password validation error message $message when language is set to $language and value is set to $value',
    async ({ language, value, message }) => {
      const user = await addUser();
      user.passwordResetToken = 'test-token';
      await user.save();
      const response = await putPasswordUpdate(
        { password: value, passwordResetToken: 'test-token' },
        { language: language }
      );
      expect(response.body.validationErrors.password).toBe(message);
    }
  );
});
