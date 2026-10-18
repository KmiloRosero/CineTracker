const { useTempDatabase, createUser } = require('./helpers.js');
const authService  = require('../services/authService.js');
const titleService = require('../services/titleService.js');
const listService  = require('../services/listService.js');
const recordService = require('../services/recordService.js');

let env;
beforeAll(() => { env = useTempDatabase(); });
afterAll(() => env.cleanup());

describe('register and login', () => {
  it('registers, normalizes the email and never returns the password hash', async () => {
    const user = await authService.register('  Camilo  ', '  Camilo@Example.COM ', 'secret123');
    expect(user.name).toBe('Camilo');
    expect(user.email).toBe('camilo@example.com');
    expect(user).not.toHaveProperty('password_hash');
  });

  it('rejects invalid input with clear messages', async () => {
    await expect(authService.register('', 'a@b.co', 'secret123')).rejects.toThrow('El nombre es obligatorio.');
    await expect(authService.register('A', 'not-an-email', 'secret123')).rejects.toThrow('correo electrónico válido');
    await expect(authService.register('A', 'a@b.co', '123')).rejects.toThrow('al menos 6');
  });

  it('rejects a duplicate email regardless of case', async () => {
    await expect(authService.register('Other', 'CAMILO@example.com', 'secret123'))
      .rejects.toThrow('Ya existe una cuenta');
  });

  it('logs in with the right password only, with the same message for unknown emails', async () => {
    const user = await authService.login('camilo@example.com', 'secret123');
    expect(user.email).toBe('camilo@example.com');
    await expect(authService.login('camilo@example.com', 'wrong')).rejects.toThrow('Correo o contraseña incorrectos.');
    await expect(authService.login('nobody@example.com', 'secret123')).rejects.toThrow('Correo o contraseña incorrectos.');
  });
});

describe('profile', () => {
  it('updates the name and avatar, and removes the avatar with null', async () => {
    const user = await createUser('Before');
    const avatar = 'data:image/png;base64,iVBORw0KGgo=';
    const updated = authService.updateProfile(user.id, { name: 'After', avatarUrl: avatar });
    expect(updated).toMatchObject({ name: 'After', avatar_url: avatar });
    expect(authService.updateProfile(user.id, { avatarUrl: null }).avatar_url).toBeNull();
  });

  it('rejects avatars that are not image data URLs', async () => {
    const user = await createUser();
    expect(() => authService.updateProfile(user.id, { avatarUrl: 'https://evil.example/x.png' }))
      .toThrow('PNG, JPEG o WebP');
    expect(() => authService.updateProfile(user.id, { avatarUrl: 'data:text/html;base64,PHNjcmlwdD4=' }))
      .toThrow('PNG, JPEG o WebP');
  });

  it('changes the password only with the current one', async () => {
    const user = await createUser();
    await expect(authService.changePassword(user.id, 'wrong', 'newsecret1')).rejects.toThrow('La contraseña actual no es correcta.');
    await expect(authService.changePassword(user.id, 'secret123', '123')).rejects.toThrow('al menos 6');
    await expect(authService.changePassword(user.id, 'secret123', 'secret123')).rejects.toThrow('distinta');
    await authService.changePassword(user.id, 'secret123', 'newsecret1');
    await expect(authService.login(user.email, 'newsecret1')).resolves.toMatchObject({ id: user.id });
  });
});

describe('account deletion', () => {
  it('requires the password and removes the user with all their data', async () => {
    const user  = await createUser();
    const other = await createUser();
    const title = titleService.addTitle(user.id, { title: 'Mine', type: 'movie' });
    recordService.addRecord(user.id, { title_id: title.id });
    const list = listService.createList(user.id, 'Weekend');
    listService.addTitleToList(user.id, list.id, title.id);
    titleService.addTitle(other.id, { title: 'Theirs', type: 'movie' });

    await expect(authService.deleteAccount(user.id, 'wrong')).rejects.toThrow('La contraseña actual no es correcta.');
    await authService.deleteAccount(user.id, 'secret123');

    const count = (table) => env.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id = ?`).get(user.id).n;
    expect(count('titles')).toBe(0);
    expect(count('records')).toBe(0);
    expect(count('lists')).toBe(0);
    expect(env.db.prepare('SELECT COUNT(*) AS n FROM list_titles WHERE list_id = ?').get(list.id).n).toBe(0);
    expect(titleService.getAllTitles(other.id)).toHaveLength(1);
    expect(() => authService.getCurrentUser(user.id)).toThrow('No se encontró el usuario.');
  });
});
