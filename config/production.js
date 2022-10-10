module.exports = {
  database: {
    database: 'hoaxify',
    username: 'my-db-user',
    password: 'db-pwd',
    dialect: 'sqlite',
    storage: './prod-db.sqlite',
    logging: false,
  },
  mail: {
    host: 'smtp.ethereal.email',
    port: 587,
    // service:"gmail",
    auth: {
      user: 'raul47@ethereal.email',
      // user: 'freeeemen1990@gmail.com',
      pass: 'EAzsQ2hJgGVckWyZfK',
    },
  },
  uploadDir: 'uploads-production',
  profileDir: 'profile',
};
