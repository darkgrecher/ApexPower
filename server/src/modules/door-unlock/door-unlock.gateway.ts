import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/door-unlock',
})
export class DoorUnlockGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, { orgId: string; clientType: string }> = new Map();

  handleConnection(client: Socket) {
    console.log(`✅ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('register')
  handleRegister(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orgId?: string; clientType: 'admin' | 'tablet' },
  ) {
    console.log(`📝 Client ${client.id} registered as ${data.clientType}`);
    this.connectedClients.set(client.id, {
      orgId: data.orgId || 'all',
      clientType: data.clientType,
    });
    
    // Join a general tablets room for broadcasting
    if (data.clientType === 'tablet') {
      client.join('all-tablets');
      console.log(`🏢 Tablet joined room: all-tablets`);
    }
    
    return { success: true, message: 'Registered successfully' };
  }

  // Method to broadcast unlock command to all tablets
  broadcastUnlockDoor(orgId: string, adminName: string) {
    console.log(`🚪 Broadcasting unlock door command by admin: ${adminName}`);
    
    const room = 'all-tablets';
    
    // Safely check room occupancy
    try {
      if (this.server && this.server.sockets && this.server.sockets.adapter) {
        const socketsInRoom = this.server.sockets.adapter.rooms.get(room);
        console.log(`📡 Number of tablets in room:`, socketsInRoom?.size || 0);
      }
    } catch (err) {
      console.log(`⚠️ Could not check room occupancy:`, err.message);
    }
    
    this.server.to(room).emit('unlock-door', {
      command: 'UNLOCK_DOOR',
      adminName: adminName,
      orgId: orgId,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`✅ Unlock command broadcasted to all tablets`);
    
    return { success: true, message: 'Unlock command broadcasted to all tablets' };
  }

  @SubscribeMessage('unlock-door-request')
  handleUnlockDoorRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orgId: string; adminName: string },
  ) {
    console.log(`Unlock door request from admin: ${data.adminName} for org: ${data.orgId}`);
    return this.broadcastUnlockDoor(data.orgId, data.adminName);
  }
}
