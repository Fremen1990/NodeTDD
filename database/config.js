const profiles = require('../config');

const dbConfigs = {};

Object.keys(profiles).forEach((profile) => {
  dbConfigs[profile] = { ...profiles[profile].database };
});

console.log(dbConfigs);

module.exports = dbConfigs;

// module.exports = {
//   development: {
//     username: 'my-db-user',
//     password: 'db-pwd',
//     database: 'hoaxify',
//     host: 'localhost',
//     dialect: 'sqlite',
//     storage: './database.sqlite',
//   },
//   staging: {
//     username: 'my-db-user',
//     password: 'db-pwd',
//     database: 'hoaxify',
//     host: 'localhost',
//     dialect: 'sqlite',
//     storage: './staging.sqlite',
//   },
// };
