import { DiscoveryController } from './discovery.controller';
import type { CareDirectoryService } from '../../care-directory/services/care-directory.service';

describe('Public Home discovery', () => {
  it('keeps available sections when another directory read fails', async () => {
    const list = jest
      .fn()
      .mockRejectedValueOnce(new Error('database detail'))
      .mockResolvedValueOnce({ items: [{ id: 'doctor' }] });
    const result = await new DiscoveryController({ list } as unknown as CareDirectoryService).discovery();
    expect(result.hospitals).toEqual({ status: 'unavailable', items: [] });
    expect(result.doctors).toEqual({ status: 'available', items: [{ id: 'doctor' }] });
    expect(result.availability).toBe('contact-provider');
    expect(JSON.stringify(result)).not.toContain('database detail');
  });

  it('uses public reviewed queries and distinguishes an empty directory from failure', async () => {
    const list = jest.fn().mockResolvedValue({ items: [] });
    const result = await new DiscoveryController({ list } as unknown as CareDirectoryService).discovery();
    expect(list).toHaveBeenNthCalledWith(1, { kind: 'hospital', city: 'Jaipur', limit: 3 });
    expect(list).toHaveBeenNthCalledWith(2, { kind: 'doctor', city: 'Jaipur', limit: 3 });
    expect(result.hospitals).toEqual({ status: 'available', items: [] });
  });
});
