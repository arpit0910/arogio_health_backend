import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes with Argon2id and verifies only the correct password', async () => {
    const hash = await service.hash('SecurePassword1');
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('SecurePassword1');
    await expect(service.verify(hash, 'SecurePassword1')).resolves.toBe(true);
    await expect(service.verify(hash, 'WrongPassword1')).resolves.toBe(false);
  });

  it('performs a dummy verification for a missing credential', async () => {
    await expect(service.verify(undefined, 'AnythingAtAll1')).resolves.toBe(false);
  });
});
