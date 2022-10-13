const express = require('express');
const router = express.Router();
const FileService = require('./FileService');
const multer = require('multer');
const upload = multer();

router.post('/api/1.0/hoaxes/attachments', upload.single('file'), async (req, res) => {
  // console.log(req.file);
  await FileService.saveAttachment(req.file);
  res.send();
});

module.exports = router;
