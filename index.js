const app = require('./src/app');
const sequelize = require('./src/config/database');
const TokenService = require('./src/auth/TokenService');
const logger = require('./src/shared/logger');
const FileService = require('./src/file/FileService');

sequelize.sync();

TokenService.scheduleCleanup();
FileService.removeUnusedAttachments();

// logger.error('error');
// logger.warn('warn');
// logger.info('info');
// logger.verbose('verbose');
// logger.debug('debug');
// logger.silly('silly');

app.listen(process.env.PORT || 3000, () =>
  logger.info('server is running. Version: ' + process.env.npm_package_version)
);
