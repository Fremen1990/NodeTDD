module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pwd',
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'raul47@ethereal.email',
      pass: 'EAzsQ2hJgGVckWyZfK',
    },
  },
};
