const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');
const SMTPServer = require('smtp-server').SMTPServer;
const en = require('../locales/en/translation.json');
const pl = require('../locales/pl/translation.json');

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

  await server.listen(8587, 'localhost');

  await sequelize.sync();
});

beforeEach(async () => {
  simulateSmtpFailure = false;
  return await User.destroy({ truncate: true });
});

afterAll(async () => {
  await server.close();
});

const validUser = {
  username: 'user1',
  email: 'user@email.com',
  password: 'Password2022!',
};

const postUser = (user = validUser, options = { language: 'en' }) => {
  const agent = request(app).post('/api/1.0/users');
  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  return agent.send(user);
};

describe('User Registration', () => {
  it('retuens 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe(en.user_create_success);
  });

  it('saves user to database', async () => {
    await postUser();
    const usersList = await User.findAll();
    expect(usersList.length).toBe(1);
  });

  it('saves username and email to database', async () => {
    await postUser();
    const usersList = await User.findAll();
    const savedUser = await usersList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user@email.com');
  });

  it('hashes the password in database', async () => {
    await postUser();
    const usersList = await User.findAll();
    const savedUser = await usersList[0];
    expect(savedUser.password).not.toBe('password1234');
  });

  it('returns 400 when username is null', async () => {
    const response = await postUser({ username: null, email: 'user@email.com', password: 'password1234' });
    expect(response.status).toBe(400);
  });

  it('returns validation Errrors field in response body when validation error occurs', async () => {
    const response = await postUser({ username: null, email: 'user@email.com', password: 'password1234' });
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  // it('returns Username cannot be null when username is null', async () => {
  //   const response = await postUser({ username: null, email: 'user@email.com', password: 'password1234' });
  //   const body = response.body;
  //   expect(body.validationErrors.username).toBe('Username cannot be null');
  // });
  //
  // it('returns E-mail cannot be null when email is null', async () => {
  //   const response = await postUser({ username: 'testuser', email: null, password: 'password1234' });
  //   const body = response.body;
  //   expect(body.validationErrors.email).toBe('Email cannot be null');
  // });
  //
  // it('returns Password cannot be null when password is null', async () => {
  //   const response = await postUser({ username: 'user', email: 'user@user.com', password: null });
  //   const body = response.body;
  //   //validationErrors:{username: "message...", email:"...."}  - messages tested before separately
  //   expect(body.validationErrors.password).toBe('Password cannot be null');
  // });

  // it.each([
  //   ['username', 'Username cannot be null'],
  //   ['email', 'Email cannot be null'],
  //   ['password', 'Password cannot be null'],
  // ])('when %s is null %s is received', async (field, expectedMessage) => {
  //   const user = {
  //     username: 'user1',
  //     email: 'email@email.com',
  //     password: 'pwd123',
  //   };
  //   user[field] = null;
  //   const response = await postUser(user);
  //   const body = response.body;
  //   expect(body.validationErrors[field]).toBe(expectedMessage);
  // });

  it('returns errors for both email and username null', async () => {
    const response = await postUser({ username: null, email: null, password: 'Password2021!' });
    const body = response.body;
    //validationErrors:{username: "message...", email:"...."}  - messages tested before separately
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  // it('returns size validation error when username is less than 4 characters', async () => {
  //   const user = {
  //     username: 'usr',
  //     email: 'email@email.com',
  //     password: 'pwd123',
  //   };
  //   const response = await postUser(user);
  //   const body = response.body;
  //   expect(body.validationErrors.username).toBe('Must have min 4 and max 32 characters');
  // });

  it.each`
    field         | value                | expectedMessage
    ${'username'} | ${null}              | ${en.username_null}
    ${'username'} | ${'usr'}             | ${en.username_size}
    ${'username'} | ${'a'.repeat(33)}    | ${en.username_size}
    ${'email'}    | ${null}              | ${en.email_null}
    ${'email'}    | ${'mail.com'}        | ${en.email_invalid}
    ${'email'}    | ${'user.mail.com'}   | ${en.email_invalid}
    ${'email'}    | ${'user@mail'}       | ${en.email_invalid}
    ${'password'} | ${null}              | ${en.password_null}
    ${'password'} | ${'P4ssw'}           | ${en.password_size}
    ${'password'} | ${'alllowercase'}    | ${en.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}    | ${en.password_pattern}
    ${'password'} | ${'1234567890'}      | ${en.password_pattern}
    ${'password'} | ${'lowerUPPER'}      | ${en.password_pattern}
    ${'password'} | ${'lower2542number'} | ${en.password_pattern}
    ${'password'} | ${'UPPER535NUMBER'}  | ${en.password_pattern}
  `('returns $expectedMessage when $field is $value', async ({ field, value, expectedMessage }) => {
    const user = {
      username: 'user1',
      email: 'email@email.com',
      password: 'pwd123',
    };
    user[field] = value;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it(`returns ${en.email_in_use} in use when same email is already in use`, async () => {
    await User.create({ ...validUser });
    const repsonse = await postUser();
    expect(repsonse.body.validationErrors.email).toBe(en.email_in_use);
  });

  it('returns errors for both username is null and email is in use', async () => {
    await User.create({ ...validUser });
    const response = await postUser({
      username: null,
      email: validUser.email,
      password: 'P4242sword',
    });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(['username', 'email']);
  });

  it('creates user in inactive mode', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates user in inactive mode even the request body contains inactive false', async () => {
    const newUser = { ...validUser, inactive: false };
    await postUser(newUser);
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.inactive).toBe(true);
  });

  it('creates an activation token for user', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(savedUser.activationToken).toBeTruthy();
  });

  it('sends an Account activation email with activationToken', async () => {
    await postUser();
    const users = await User.findAll();
    const savedUser = users[0];
    expect(lastMail).toContain('user@email.com');
    expect(lastMail).toContain(savedUser.activationToken);
  });

  it('returns 502 Bad Gateway when sending email fails', async () => {
    // const mockSendAccountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.status).toBe(502);
    // mockSendAccountActivation.mockRestore();
  });

  it('returns Email failure message when sending email fails', async () => {
    // const mockSendAccountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true;
    const response = await postUser();
    expect(response.body.message).toBe(en.email_failure);
    // mockSendAccountActivation.mockRestore();
  });

  it('does not save user to database if activation email fails', async () => {
    // const mockSendAccountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true;
    await postUser();
    const users = await User.findAll();
    expect(users.length).toBe(0);
    // mockSendAccountActivation.mockRestore();
  });

  it('returns Validation Failure message in error response body when validation fails', async () => {
    const response = await postUser({ username: null, email: null, password: 'Password2021!' });
    expect(response.body.message).toBe(en.validation_failure);
  });
});

describe('Internationalization', () => {
  it.each`
    field         | value                | expectedMessage
    ${'username'} | ${null}              | ${pl.username_null}
    ${'username'} | ${'usr'}             | ${pl.username_size}
    ${'username'} | ${'a'.repeat(33)}    | ${pl.username_size}
    ${'email'}    | ${null}              | ${pl.email_null}
    ${'email'}    | ${'mail.com'}        | ${pl.email_invalid}
    ${'email'}    | ${'user.mail.com'}   | ${pl.email_invalid}
    ${'email'}    | ${'user@mail'}       | ${pl.email_invalid}
    ${'password'} | ${null}              | ${pl.password_null}
    ${'password'} | ${'P4ssw'}           | ${pl.password_size}
    ${'password'} | ${'alllowercase'}    | ${pl.password_pattern}
    ${'password'} | ${'ALLUPPERCASE'}    | ${pl.password_pattern}
    ${'password'} | ${'1234567890'}      | ${pl.password_pattern}
    ${'password'} | ${'lowerUPPER'}      | ${pl.password_pattern}
    ${'password'} | ${'lower2542number'} | ${pl.password_pattern}
    ${'password'} | ${'UPPER535NUMBER'}  | ${pl.password_pattern}
  `(
    'returns $expectedMessage when $field is $value when language is Polish',
    async ({ field, value, expectedMessage }) => {
      const user = {
        username: 'user1',
        email: 'email@email.com',
        password: 'pwd123',
      };
      user[field] = value;
      const response = await postUser(user, { language: 'pl' });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    }
  );

  it(`returns ${pl.email_in_use} in use when same email is already in use when language is Polish`, async () => {
    await User.create({ ...validUser });
    const repsonse = await postUser({ ...validUser }, { language: 'pl' });
    expect(repsonse.body.validationErrors.email).toBe(pl.email_in_use);
  });

  it(`returns success message of ${pl.user_create_success} when signup request is valid and language Polish`, async () => {
    const response = await postUser({ ...validUser }, { language: 'pl' });
    expect(response.body.message).toBe(pl.user_create_success);
  });

  it(`returns ${pl.email_failure} message when sending email fails when language Polish`, async () => {
    // const mockSendAccountActivation = jest
    //   .spyOn(EmailService, 'sendAccountActivation')
    //   .mockRejectedValue({ message: 'Failed to deliver email' });
    simulateSmtpFailure = true;
    const response = await postUser({ ...validUser }, { language: 'pl' });
    expect(response.body.message).toBe(pl.email_failure);
    // mockSendAccountActivation.mockRestore();
  });

  it(`returns ${pl.validation_failure} message in error response body when validation fails in Polish`, async () => {
    const response = await postUser({ username: null, email: null, password: 'Password2021!' }, { language: 'pl' });
    expect(response.body.message).toBe(pl.validation_failure);
  });
});

describe('Account activation', () => {
  it('activates the account when correct token is sent', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;
    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].inactive).toBe(false);
  });

  it('removes the token from user table after successful activation', async () => {
    await postUser();
    let users = await User.findAll();
    const token = users[0].activationToken;
    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    users = await User.findAll();
    expect(users[0].activationToken).toBeFalsy();
  });

  it('does not activate the account when token is wrong', async () => {
    await postUser();
    const token = 'this-token-is-not-exist-fake-one';
    await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const users = await User.findAll();
    expect(users[0].inactive).toBe(true);
  });

  it('returns bad request when token is wrong', async () => {
    await postUser();
    const token = 'this-token-is-not-exist-fake-one';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    expect(response.status).toBe(400);
  });

  it.each`
    language | tokenStatus  | message
    ${'pl'}  | ${'wrong'}   | ${pl.account_activation_failure}
    ${'en'}  | ${'wrong'}   | ${en.account_activation_failure}
    ${'pl'}  | ${'correct'} | ${pl.account_activation_success}
    ${'en'}  | ${'correct'} | ${en.account_activation_success}
  `(
    'return $message when token is $tokenStatus and language is $language sent and langiage is $langiage',
    async ({ language, tokenStatus, message }) => {
      await postUser();
      let token = 'this-token-is-not-exist-fake-one';
      if (tokenStatus === 'correct') {
        let users = await User.findAll();
        token = users[0].activationToken;
      }
      const response = await request(app)
        .post('/api/1.0/users/token/' + token)
        .set('Accept-Language', language)
        .send();
      expect(response.body.message).toBe(message);
    }
  );
});

describe('Error Model', () => {
  it('returns path, timestamp, message and validationErrors in response', async () => {
    const response = await postUser({ ...validUser, username: null });
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message', 'validationErrors']);
  });

  it('returns path, timestamp and message in response when request fails other than validation error', async () => {
    const token = 'this-token-is-not-exist-fake-one';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(Object.keys(body)).toEqual(['path', 'timestamp', 'message']);
  });

  it('returns path in error body', async () => {
    const token = 'this-token-is-not-exist-fake-one';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.path).toEqual('/api/1.0/users/token/' + token);
  });

  it('returns timestamp in milliseconds 5 seconds value in error body', async () => {
    const nowInMillis = new Date().getTime();
    const fiveSecondsLater = nowInMillis + 5 * 1000;
    const token = 'this-token-is-not-exist-fake-one';
    const response = await request(app)
      .post('/api/1.0/users/token/' + token)
      .send();
    const body = response.body;
    expect(body.timestamp).toBeGreaterThan(nowInMillis);
    expect(body.timestamp).toBeLessThan(fiveSecondsLater);
  });
});
