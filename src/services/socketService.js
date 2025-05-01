import { Server } from 'socket.io';

export default class SocketService {
  constructor(server) {
    this.io = new Server(server, { cors: { origin: '*' } });
    this.setupListeners();
  }

  setupListeners() {
    this.io.of('/chat').on('connection', socket => {
      console.log(`User connected: ${socket.id}`);

      socket.on('joinGroup', groupId => {
        socket.join(`group_${groupId}`);
      });

      socket.on('leaveGroup', groupId => {
        socket.leave(`group_${groupId}`);
      });
    });
  }
}
