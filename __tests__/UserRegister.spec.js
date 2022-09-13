const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const sequelize = require('../src/config/database');

//TODO 9. Saving User to Database 10:30

describe('User Registration', () => {
  it('retuens 200 OK when signup request is valid', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user1',
        email: 'user@email.com',
        password: 'password1234',
      })
      .expect(200, done);
  });

  it('returns success message when signup request is valid', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user1',
        email: 'user@email.com',
        password: 'password1234',
      })
      .then((response) => {
        expect(response.body.message).toBe('User created');
        done();
      });
  });

  it('saves user to database', (done) => {
    request(app)
      .post('/api/1.0/users')
      .send({
        username: 'user1',
        email: 'user@email.com',
        password: 'password1234',
      })
      .then(() => {
        // query user table
        User.findAll().then((userList) => {
          expect(userList.length).toBe(1);
        });
        done();
      });
  });
});
