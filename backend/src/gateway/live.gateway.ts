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
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  },
})
export class LiveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(LiveGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.join(room);
    this.server.to(room).emit('user-joined', { userId: client.id });
    this.logger.log(`Client ${client.id} joined room: ${room}`);
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    client.leave(room);
    this.server.to(room).emit('user-left', { userId: client.id });
  }

  @SubscribeMessage('message')
  handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { room: string; data: unknown },
  ) {
    this.server.to(payload.room).emit('message', {
      userId: client.id,
      data: payload.data,
    });
  }
}
