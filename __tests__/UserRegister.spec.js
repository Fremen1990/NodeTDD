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

describe('User Registration', () => {
  const postValidUser = () => {
    return request(app).post('/api/1.0/users').send({
      username: 'user1',
      email: 'user@email.com',
      password: 'password1234',
    });
  };

  it('retuens 200 OK when signup request is valid', async () => {
    const response = await postValidUser();
    expect(response.status).toBe(200);
  });

  it('returns success message when signup request is valid', async () => {
    const response = await postValidUser();
    expect(response.body.message).toBe('User created');
  });

  it('saves user to database', async () => {
    await postValidUser();
    const usersList = await User.findAll();
    expect(usersList.length).toBe(1);
  });

  it('saves username and email to database', async () => {
    await postValidUser();
    const usersList = await User.findAll();
    const savedUser = await usersList[0];
    expect(savedUser.username).toBe('user1');
    expect(savedUser.email).toBe('user@email.com');
  });

  it('hashes the password in database', async () => {
    await postValidUser();
    const usersList = await User.findAll();
    const savedUser = await usersList[0];
    expect(savedUser.password).not.toBe('password1234');
  });
});
