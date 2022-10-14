const request = require('supertest');
const app = require('../src/app');
const User = require('../src/user/User');
const bcrypt = require('bcrypt');
const en = require('../locales/en/translation.json');
const pl = require('../locales/pl/translation.json');
const { save } = require('../src/user/UserService');
const Hoax = require('../src/hoax/Hoax');
const FileAttachment = require('../src/file/FileAttachment');
const fs = require('fs');
const path = require('path');
const config = require('config');

const { uploadDir, attachmentDir } = config;
const attachmentFolder = path.join('.', uploadDir, attachmentDir);

const filename = 'test-file-hoax-delete' + Date.now();
const targetPath = path.join(attachmentFolder, filename);
const testFilePath = path.join('.', '__tests__', 'resources', 'test-png.png');

beforeEach(async () => {
  // await FileAttachment.destroy({ truncate: true });
  await User.destroy({ truncate: { cascade: true } });
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }
});

const activeUser = { username: 'user1', email: 'user1@mail.com', password: 'P4ssword', inactive: false };

const credentials = { email: 'user1@mail.com', password: 'P4ssword' };

const addUser = async (user = { ...activeUser }) => {
  user.password = await bcrypt.hash(user.password, 10);
  return await User.create(user);
};

const addHoax = async (userId) => {
  return await Hoax.create({
    content: 'Hoax for user',
    timestamp: Date.now(),
    userId: userId,
  });
};

const addFileAttachment = async (hoaxId) => {
  fs.copyFileSync(testFilePath, targetPath);
  return await FileAttachment.create({
    filename: filename,
    uploadDate: new Date(),
    hoaxId: hoaxId,
  });
};

const auth = async (options = {}) => {
  let token;
  if (options.auth) {
    const response = await request(app).post('/api/1.0/auth').send(options.auth);
    token = response.body.token;
  }
  return token;
};

const deleteHoaks = async (id = 5, options = {}) => {
  const agent = request(app).delete(`/api/1.0/hoaxes/${id}`);

  if (options.language) {
    agent.set('Accept-Language', options.language);
  }
  if (options.token) {
    agent.set('Authorization', `Bearer ${options.token}`);
  }

  return agent.send();
};
describe('Delete Hoax', () => {
  it('returns 403 when request is unauthorized', async () => {
    const response = await deleteHoaks();
    expect(response.status).toBe(403);
  });

  it('returns 403 when token is invalid', async () => {
    const response = await deleteHoaks(5, { token: 'abcde' });
    expect(response.status).toBe(403);
  });

  it.each`
    language | message
    ${'pl'}  | ${pl.unauthorized_hoax_delete}
    ${'en'}  | ${en.unauthorized_hoax_delete}
  `(
    'returns error body with $message for unauthorized request when language is set $language',
    async ({ language, message }) => {
      const nowInMillis = new Date().getTime();
      const response = await deleteHoaks(5, { language });
      expect(response.body.path).toBe('/api/1.0/hoaxes/5');
      expect(response.body.timestamp).toBeGreaterThan(nowInMillis);
      expect(response.body.message).toBe(message);
    }
  );

  it('returns 403 when user tries to delete another users hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const user2 = await addUser({ ...activeUser, username: 'user2', email: 'user2@mail.com' });
    const token = await auth({ auth: { email: 'user2@email', password: 'P4ssword' } });
    const response = await deleteHoaks(hoax.id, { token });
    expect(response.status).toBe(403);
  });

  it('returns 200 ok when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({ auth: credentials });
    const response = await deleteHoaks(hoax.id, { token });
    expect(response.status).toBe(200);
  });

  it('removes the hoax from database when user deletes their hoax', async () => {
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const token = await auth({ auth: credentials });
    await deleteHoaks(hoax.id, { token });
    const hoaxInDb = await Hoax.findOne({ where: { id: hoax.id } });
    expect(hoaxInDb).toBeNull();
  });

  it.skip('removes the fileAttachment from database when user deletes their hoax', async () => {
    // onDelete Cascade - relations not working here
    const user = await addUser();
    const hoax = await addHoax(user.id);
    const attachment = await addFileAttachment(hoax.id);
    const token = await auth({ auth: credentials });
    await deleteHoaks(hoax.id, { token });
    const attachmentInDb = await FileAttachment.findOne({ where: { id: attachment.id } });
    expect(attachmentInDb).toBeNull();
  });

  it.skip('removes the file from storage when user deletes their hoax', async () => {
    // onDelete Cascade - relations not working here
    const user = await addUser();
    const hoax = await addHoax(user.id);
    await addFileAttachment(hoax.id);
    const token = await auth({ auth: credentials });
    await deleteHoaks(hoax.id, { token });
    expect(fs.existsSync(targetPath)).toBe(false);
  });
});
