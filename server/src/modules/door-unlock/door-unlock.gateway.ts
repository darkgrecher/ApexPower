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

  private connectedClients: Map<string, { orgId: string; clientType: string; unitName?: string }> = new Map();

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
    @MessageBody() data: { orgId?: string; clientType: 'admin' | 'tablet'; unitName?: string },
  ) {
    console.log(`📝 Client ${client.id} registered as ${data.clientType}${data.unitName ? ` with unit: ${data.unitName}` : ''}`);
    this.connectedClients.set(client.id, {
      orgId: data.orgId || 'all',
      clientType: data.clientType,
      unitName: data.unitName,
    });
    
    // Join a general tablets room for broadcasting
    if (data.clientType === 'tablet') {
      client.join('all-tablets');
      console.log(`🏢 Tablet joined room: all-tablets`);
      
      // Also join a unit-specific room if unitName is provided
      if (data.unitName) {
        client.join(`unit-${data.unitName}`);
        console.log(`🔌 Tablet joined unit room: unit-${data.unitName}`);
      }
    }
    
    return { success: true, message: 'Registered successfully' };
  }

  // Method to update tablet's unit name (when fingerprint unit is connected)
  @SubscribeMessage('update-unit')
  handleUpdateUnit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { unitName: string },
  ) {
    console.log(`📥 Received update-unit request from ${client.id} for unit: ${data.unitName}`);
    
    const clientData = this.connectedClients.get(client.id);
    if (clientData) {
      // Leave old unit room if exists
      if (clientData.unitName) {
        client.leave(`unit-${clientData.unitName}`);
        console.log(`🔌 Tablet ${client.id} left unit room: unit-${clientData.unitName}`);
      }
      
      // Update client data with new unit name
      clientData.unitName = data.unitName;
      this.connectedClients.set(client.id, clientData);
      
      // Join new unit room
      client.join(`unit-${data.unitName}`);
      console.log(`🔌 Tablet ${client.id} joined unit room: unit-${data.unitName}`);
      
      // Log all rooms this client is in
      console.log(`📋 Client ${client.id} is now in rooms:`, Array.from(client.rooms));
    } else {
      console.warn(`⚠️ Client ${client.id} not found in connectedClients map`);
    }
    
    return { success: true, message: `Unit updated to ${data.unitName}` };
  }

  // Method to broadcast unlock command to specific unit
  broadcastUnlockDoor(orgId: string, adminName: string, unitName: string) {
    console.log(`🚪 Broadcasting unlock door command by admin: ${adminName} to unit: ${unitName}`);
    
    const room = `unit-${unitName}`;
    
    // Log all connected clients and their units
    console.log(`📋 Connected clients:`);
    this.connectedClients.forEach((data, clientId) => {
      console.log(`  - ${clientId}: type=${data.clientType}, unit=${data.unitName || 'none'}`);
    });
    
    // Safely check room occupancy
    try {
      if (this.server && this.server.sockets && this.server.sockets.adapter) {
        const socketsInRoom = this.server.sockets.adapter.rooms.get(room);
        console.log(`📡 Number of tablets in room ${room}:`, socketsInRoom?.size || 0);
        
        if (socketsInRoom && socketsInRoom.size > 0) {
          console.log(`📡 Socket IDs in room ${room}:`, Array.from(socketsInRoom));
        } else {
          console.log(`⚠️ No tablets connected with unit ${unitName}`);
          // List all rooms for debugging
          console.log(`📋 All rooms:`, Array.from(this.server.sockets.adapter.rooms.keys()));
        }
      }
    } catch (err) {
      console.log(`⚠️ Could not check room occupancy:`, err.message);
    }
    
    this.server.to(room).emit('unlock-door', {
      command: 'UNLOCK_DOOR',
      adminName: adminName,
      orgId: orgId,
      unitName: unitName,
      timestamp: new Date().toISOString(),
    });
    
    console.log(`✅ Unlock command broadcasted to room: ${room}`);
    
    return { success: true, message: `Unlock command broadcasted to unit ${unitName}` };
  }

  @SubscribeMessage('unlock-door-request')
  handleUnlockDoorRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orgId: string; adminName: string; unitName: string },
  ) {
    console.log(`Unlock door request from admin: ${data.adminName} for org: ${data.orgId}, unit: ${data.unitName}`);
    return this.broadcastUnlockDoor(data.orgId, data.adminName, data.unitName);
  }
}
