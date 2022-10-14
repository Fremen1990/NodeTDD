'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constrains = await queryInterface.getForeignKeysForTables(['fileAttachments']);

      for (let i = 0; i < constrains.fileAttachment.length; i++) {
        // clearing all constraints
        const constraintName = constrains.fileAttachment[i];
        if (constraintName.includes('hoaxId')) {
          await queryInterface.removeConstraint('fileAttachments', constraintName, { transaction });
        }
      }
      await queryInterface.addConstraint('fileAttachments', {
        // adding new fresh constraint
        fields: ['hoaxId'],
        type: 'foreign key',
        references: {
          table: 'hoaxes',
          filed: 'id',
        },
        onDelete: 'cascade',
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const constrains = await queryInterface.getForeignKeysForTables(['fileAttachments']);

      for (let i = 0; i < constrains.fileAttachment.length; i++) {
        // clearing all constraints
        const constraintName = constrains.fileAttachment[i];
        if (constraintName.includes('hoaxId')) {
          await queryInterface.removeConstraint('fileAttachments', constraintName, { transaction });
        }
      }
      await queryInterface.addConstraint('fileAttachments', {
        // adding new fresh constraint
        fields: ['hoaxId'],
        type: 'foreign key',
        references: {
          table: 'hoaxes',
          filed: 'id',
        },
        transaction,
      });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
    }
  },
};
