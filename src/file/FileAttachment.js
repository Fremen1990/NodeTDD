const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const Hoax = require('../hoax/Hoax');

const Model = Sequelize.Model;

class FileAttachment extends Model {}

FileAttachment.init(
  {
    filename: {
      type: Sequelize.STRING,
    },
    uploadDate: {
      type: Sequelize.DATE,
    },
    fileType: {
      type: Sequelize.STRING,
    },
  },
  {
    sequelize,
    modelName: 'fileAttachment',
    timestamps: false,
  }
);

module.exports = FileAttachment;
