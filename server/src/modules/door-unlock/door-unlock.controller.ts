import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { DoorUnlockService } from './door-unlock.service';

@Controller('door-unlock')
export class DoorUnlockController {
  constructor(private readonly doorUnlockService: DoorUnlockService) {}

  @Post('unlock')
  @HttpCode(HttpStatus.OK)
  async unlockDoor(
    @Body() body: { orgId: string; adminName: string; unitName: string },
  ) {
    return this.doorUnlockService.unlockDoor(body.orgId, body.adminName, body.unitName);
  }
}
