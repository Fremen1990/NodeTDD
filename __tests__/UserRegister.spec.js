const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const validUser = {
  username: 'user1',
  email: 'user@email.com',
  password: 'Password2022!',
};

const postUser = (user = validUser) => {
  return request(app).post('/api/1.0/users').send(user);
};

describe('User Registration', () => {
  it('retuens 200 OK when signup request is valid', async () => {
    const response = await postUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postUser();
    expect(response.body.message).toBe('User created');
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
    ${'username'} | ${null}              | ${'Username cannot be null'}
    ${'username'} | ${'usr'}             | ${'Must have min 4 and max 32 characters'}
    ${'username'} | ${'a'.repeat(33)}    | ${'Must have min 4 and max 32 characters'}
    ${'email'}    | ${null}              | ${'Email cannot be null'}
    ${'email'}    | ${'mail.com'}        | ${'Email is not valid'}
    ${'email'}    | ${'user.mail.com'}   | ${'Email is not valid'}
    ${'email'}    | ${'user@mail'}       | ${'Email is not valid'}
    ${'password'} | ${null}              | ${'Password cannot be null'}
    ${'password'} | ${'P4ssw'}           | ${'Password must be at least 6 characters'}
    ${'password'} | ${'alllowercase'}    | ${'Password must must have at least one uppercase, one lowercase and one number'}
    ${'password'} | ${'ALLUPPERCASE'}    | ${'Password must must have at least one uppercase, one lowercase and one number'}
    ${'password'} | ${'1234567890'}      | ${'Password must must have at least one uppercase, one lowercase and one number'}
    ${'password'} | ${'lowerUPPER'}      | ${'Password must must have at least one uppercase, one lowercase and one number'}
    ${'password'} | ${'lower2542number'} | ${'Password must must have at least one uppercase, one lowercase and one number'}
    ${'password'} | ${'UPPER535NUMBER'}  | ${'Password must must have at least one uppercase, one lowercase and one number'}
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

  it('returns E-mail in use when same email is already in use', async () => {
    await User.create({ ...validUser });
    const repsonse = await postUser();
    expect(repsonse.body.validationErrors.email).toBe('E-mail in use');
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
});
