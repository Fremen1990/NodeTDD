const Hoax = require('./Hoax');
const { Sequelize } = require('sequelize');
const User = require('../user/User');
const NotFoundException = require('../error/NotFoundException');
const FileService = require('../file/FileService');
const FileAttachment = require('../file/FileAttachment');

const save = async (body, user) => {
  const hoax = {
    content: body.content,
    timestamp: Date.now(),
    userId: user.id,
  };
  const { id } = await Hoax.create(hoax);
  if (body.fileAttachment) {
    await FileService.associateFileToHoax(body.fileAttachment, id);
  }
};

const getHoaxes = async (page, size, userId) => {
  let where = {};
  if (userId) {
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('user_not_found');
    }
    where = { id: userId };
  }
  const hoaxesWithCount = await Hoax.findAndCountAll({
    attributes: ['id', 'content', 'timestamp'],
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'image'],
        where,
      },
      // {
      //   model: FileAttachment,
      //   as: 'fileAttachment',
      //   attributes: ['filename', 'fileType'],
      // },
    ],
    order: [['id', 'DESC']],
    limit: size,
    offset: page * size,
  });

  const newContent = hoaxesWithCount.rows.map((hoaxSequelize) => {
    const hoaxAsJSON = hoaxSequelize.get({ plain: true });
    if (hoaxAsJSON.fileAttachment === null) {
      delete hoaxAsJSON.fileAttachment;
    }
    return hoaxAsJSON;
  });

  // const newContent = [];
  // for (let hoaxSequelize of hoaxesWithCount.rows) {
  //   const hoaxAsJSON = hoaxSequelize.get({ plain: true });
  //   if (hoaxAsJSON.fileAttachment === null) {
  //     delete hoaxAsJSON.fileAttachment;
  //   }
  //   newContent.push(hoaxAsJSON);
  // }

  return {
    content: newContent,
    page,
    size,
    totalPages: Math.ceil(hoaxesWithCount.count / size),
  };
};

module.exports = { save, getHoaxes };
