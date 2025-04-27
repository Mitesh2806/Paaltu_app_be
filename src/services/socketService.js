// Backend/src/services/socketService.js
import { WebSocketServer } from 'ws';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/messageSchema.js';

class SocketService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map(); // Map to store userId -> WebSocket
    
    // Connect to Redis (using Valkey from Aiven)
    this.publisher = new Redis({
      host: process.env.REDIS_HOST || 'your-valkey-redis-host.aiven.io',
      port: process.env.REDIS_PORT || 12345,
      password: process.env.REDIS_PASSWORD || 'your-redis-password',
      tls: true // Usually required for Aiven Redis connections
    });
    
    this.subscriber = this.publisher.duplicate();
    
    // Subscribe to the chat channel
    this.subscriber.subscribe('chat');
    
    // Handle incoming messages from Redis
    this.subscriber.on('message', (channel, message) => {
      if (channel === 'chat') {
        const parsedMessage = JSON.parse(message);
        this.sendMessageToClient(parsedMessage);
      }
    });
    
    this.setupWebSocketServer();
  }
  
  setupWebSocketServer() {
    this.wss.on('connection', (ws, req) => {
      let userId = null;
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          // Handle authentication
          if (message.type === 'auth') {
            try {
              const token = message.token;
              if (!token) {
                ws.send(JSON.stringify({ type: 'auth', success: false, error: 'No token provided' }));
                return;
              }
              
              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              const user = await User.findById(decoded.userId).select("-password");
              
              if (!user) {
                ws.send(JSON.stringify({ type: 'auth', success: false, error: 'User not found' }));
                return;
              }
              
              userId = user._id.toString();
              this.clients.set(userId, ws);
              ws.send(JSON.stringify({ type: 'auth', success: true }));
              
              // Send any unread messages to the user
              await this.sendUnreadMessages(userId);
              return;
            } catch (error) {
              console.error('Authentication error:', error);
              ws.send(JSON.stringify({ type: 'auth', success: false, error: 'Invalid token' }));
              return;
            }
          }
          
          // Handle chat messages
          if (message.type === 'chat' && userId) {
            // Save message to database
            const newMessage = new Message({
              sender: userId,
              recipient: message.recipient,
              content: message.content
            });
            
            await newMessage.save();
            
            // Publish the message to Redis
            this.publisher.publish('chat', JSON.stringify({
              _id: newMessage._id.toString(),
              sender: userId,
              recipient: message.recipient,
              content: message.content,
              timestamp: newMessage.timestamp
            }));
          }
        } catch (error) {
          console.error('Error processing message:', error);
          ws.send(JSON.stringify({ type: 'error', message: 'Error processing message' }));
        }
      });
      
      ws.on('close', () => {
        if (userId) {
          this.clients.delete(userId);
        }
      });
    });
  }
  
  async sendUnreadMessages(userId) {
    try {
      const unreadMessages = await Message.find({
        recipient: userId,
        read: false
      }).sort({ timestamp: 1 });
      
      const ws = this.clients.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unread_messages',
          messages: unreadMessages
        }));
        
        // Mark messages as read
        await Message.updateMany(
          { recipient: userId, read: false },
          { $set: { read: true } }
        );
      }
    } catch (error) {
      console.error('Error sending unread messages:', error);
    }
  }
  
  sendMessageToClient(message) {
    const recipientWs = this.clients.get(message.recipient);
    if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
      recipientWs.send(JSON.stringify({
        type: 'chat',
        message
      }));
      
      // Mark the message as read
      Message.findByIdAndUpdate(message._id, { read: true }).catch(err => {
        console.error('Error marking message as read:', err);
      });
    }
  }
}

export default SocketService;