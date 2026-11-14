import { Controller, Get, Header } from '@nestjs/common';
import { CareService } from '../care/care.service';

/** Public discovery uses the same publication/freshness rules as the directory. */
@Controller('home')
export class DiscoveryController {
  constructor(private readonly care: CareService) {}

  @Get('discovery')
  @Header('Cache-Control', 'no-store')
  async discovery() {
    const [hospitals, doctors] = await Promise.allSettled([
      this.care.list({ kind: 'hospital', city: 'Jaipur', limit: 3 }),
      this.care.list({ kind: 'doctor', city: 'Jaipur', limit: 3 }),
    ]);
    const section = (result: typeof hospitals) =>
      result.status === 'fulfilled'
        ? { status: 'available' as const, items: result.value.items }
        : { status: 'unavailable' as const, items: [] };
    return {
      coverage: 'Jaipur',
      hospitals: section(hospitals),
      doctors: section(doctors),
      availability: 'contact-provider',
    };
  }
}
