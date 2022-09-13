const app = require('./src/app');
const sequelize = require('./src/config/database');
app.listen(3000, () => console.log('server is running'));
