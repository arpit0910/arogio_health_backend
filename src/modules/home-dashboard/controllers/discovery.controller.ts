import { Controller, Get, Header } from '@nestjs/common';
import { CareDirectoryService } from '../../care-directory/services/care-directory.service';

/** Public discovery uses the same publication/freshness rules as the directory. */
@Controller('home')
export class DiscoveryController {
  constructor(private readonly care: CareDirectoryService) {}

  @Get('discovery')
  @Header('Cache-Control', 'no-store')
  async discovery() {
    const [hospitals, doctors] = await Promise.allSettled([
      this.care.list({ kind: 'hospital', limit: 3 }),
      this.care.list({ kind: 'doctor', limit: 3 }),
    ]);
    const section = (result: typeof hospitals) =>
      result.status === 'fulfilled'
        ? { status: 'available' as const, items: result.value.items }
        : { status: 'unavailable' as const, items: [] };
    return {
      coverage: 'available-locations',
      hospitals: section(hospitals),
      doctors: section(doctors),
      availability: 'contact-provider',
    };
  }
}
