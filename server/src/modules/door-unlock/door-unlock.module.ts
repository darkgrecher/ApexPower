import { Module } from '@nestjs/common';
import { DoorUnlockGateway } from './door-unlock.gateway';
import { DoorUnlockController } from './door-unlock.controller';
import { DoorUnlockService } from './door-unlock.service';

@Module({
  controllers: [DoorUnlockController],
  providers: [DoorUnlockGateway, DoorUnlockService],
  exports: [DoorUnlockGateway, DoorUnlockService],
})
export class DoorUnlockModule {}
