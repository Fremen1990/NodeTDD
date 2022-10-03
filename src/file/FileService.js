const fs = require('fs');
const path = require('path');
const config = require('config');
const { randomString } = require('../shared/generator');

const { uploadDir, profileDir } = config;
const profileFolder = path.join('.', uploadDir, profileDir);

const createFolders = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }

  if (!fs.existsSync(profileFolder)) {
    fs.mkdirSync(profileFolder);
  }
};

const saveProfileImage = async (base64File) => {
  const filename = randomString(32);
  const filePath = path.join(profileFolder, filename);
  // fs.writeFileSync(filePath, base64File, { encoding: 'base64' });  // synchro
  // return new Promise((resolve, reject) => {
  //   fs.writeFile(filePath, base64File, 'base64', (error) => {
  //     if (!error) {
  //       resolve(filename);
  //     } else {
  //       reject(error);
  //     }
  //   });
  // });

  await fs.promises.writeFile(filePath, parseInt(base64File).toString(), 'base64');
  return filename;
};

module.exports = { createFolders, saveProfileImage };
