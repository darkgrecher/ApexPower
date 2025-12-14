import { Injectable } from '@nestjs/common';
import { DoorUnlockGateway } from './door-unlock.gateway';

@Injectable()
export class DoorUnlockService {
  constructor(private readonly doorUnlockGateway: DoorUnlockGateway) {}

  async unlockDoor(orgId: string, adminName: string, unitName: string) {
    console.log(`Door unlock requested by ${adminName} for organization ${orgId}, unit: ${unitName}`);
    
    // Broadcast the unlock command via WebSocket to specific unit
    const result = this.doorUnlockGateway.broadcastUnlockDoor(orgId, adminName, unitName);
    
    return {
      success: true,
      message: `Door unlock command sent to unit ${unitName}`,
      adminName,
      orgId,
      unitName,
      timestamp: new Date().toISOString(),
    };
  }
}
