import { HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const database = { ping: jest.fn() } as unknown as DatabaseService;
  const service = new HealthService(database);

  beforeEach(() => jest.clearAllMocks());

  it('reports liveness without touching the database', () => {
    expect(service.liveness().status).toBe('ok');
    expect(database.ping).not.toHaveBeenCalled();
  });

  it('reports readiness when the database responds', async () => {
    jest.mocked(database.ping).mockResolvedValueOnce(undefined);
    await expect(service.readiness()).resolves.toMatchObject({
      status: 'ready',
      checks: { database: 'up' },
    });
  });

  it('returns a safe readiness error when the database fails', async () => {
    jest.mocked(database.ping).mockRejectedValueOnce(new Error('secret database detail'));
    await expect(service.readiness()).rejects.toEqual(
      expect.objectContaining({
        code: 'SERVICE_NOT_READY',
        status: HttpStatus.SERVICE_UNAVAILABLE,
      }),
    );
  });
});
