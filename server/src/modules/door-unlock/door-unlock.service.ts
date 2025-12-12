import { Injectable } from '@nestjs/common';
import { DoorUnlockGateway } from './door-unlock.gateway';

@Injectable()
export class DoorUnlockService {
  constructor(private readonly doorUnlockGateway: DoorUnlockGateway) {}

  async unlockDoor(orgId: string, adminName: string) {
    console.log(`Door unlock requested by ${adminName} for organization ${orgId}`);
    
    // Broadcast the unlock command via WebSocket
    const result = this.doorUnlockGateway.broadcastUnlockDoor(orgId, adminName);
    
    return {
      success: true,
      message: `Door unlock command sent successfully`,
      adminName,
      orgId,
      timestamp: new Date().toISOString(),
    };
  }
}
