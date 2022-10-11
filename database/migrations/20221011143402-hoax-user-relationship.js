'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hoaxes', 'userId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'cascade',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.deleteColumn('hoaxes', 'userId');
  },
};
