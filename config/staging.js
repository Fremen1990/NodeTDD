module.exports = {
  database: {
    database: 'hoaxify',
    // username: 'my-db-user',
    username: 'postgres',
    // password: 'db-pwd',
    password: 'postgres',
    // dialect: 'sqlite',
    dialect: 'postgres',
    // storage: './staging.sqlite',
    // host: 'localhost', // postgres purpose
    host: '127.0.0.1', // postgres purpose
    logging: false,
  },
  mail: {
    host: 'localhost',
    port: Math.floor(Math.random() * 2000) + 10000,
    tls: {
      rejectUnauthorized: false,
    },
  },
  uploadDir: 'uploads-staging',
  profileDir: 'profile',
};
