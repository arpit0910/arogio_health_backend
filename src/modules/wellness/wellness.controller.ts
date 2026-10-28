import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import type { RequestUser } from '../../common/auth/request-user';
import { WellnessService } from './wellness.service';
@ApiTags('wellness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wellness')
export class WellnessController {
  constructor(private readonly service: WellnessService) {}
  @Put('medicines/:id') medicine(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.saveMedicine(u.userId, id, body);
  }
  @Delete('medicines/:id') removeMedicine(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.deleteMedicine(u.userId, id);
  }
  @Get() get(@CurrentUser() u: RequestUser) {
    return this.service.snapshot(u.userId);
  }
  @Put('water/plan') plan(@CurrentUser() u: RequestUser, @Body() body: unknown) {
    return this.service.savePlan(u.userId, body);
  }
  @Put('water/logs/:id') log(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.saveLog(u.userId, id, body);
  }
  @Delete('water/logs/:id') removeLog(@CurrentUser() u: RequestUser, @Param('id') id: string) {
    return this.service.deleteLog(u.userId, id);
  }
  @Put('water/tasks/:id') task(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.saveTask(u.userId, id, body);
  }
  @Delete('water/data') clearWater(@CurrentUser() u: RequestUser) {
    return this.service.clear(u.userId, 'water');
  }
  @Put('cycle/settings') cycle(@CurrentUser() u: RequestUser, @Body() body: unknown) {
    return this.service.saveCycleSettings(u.userId, body);
  }
  @Put('cycle/periods/:id') period(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.service.savePeriod(u.userId, id, body);
  }
  @Delete('cycle/periods/:id') removePeriod(
    @CurrentUser() u: RequestUser,
    @Param('id') id: string,
  ) {
    return this.service.deletePeriod(u.userId, id);
  }
  @Put('cycle/entries/:day') entry(
    @CurrentUser() u: RequestUser,
    @Param('day') day: string,
    @Body() body: unknown,
  ) {
    return this.service.saveEntry(u.userId, day, body);
  }
  @Delete('cycle/entries/:day') removeEntry(
    @CurrentUser() u: RequestUser,
    @Param('day') day: string,
  ) {
    return this.service.deleteEntry(u.userId, day);
  }
  @Delete('cycle/data') clearCycle(@CurrentUser() u: RequestUser) {
    return this.service.clear(u.userId, 'cycle');
  }
}
