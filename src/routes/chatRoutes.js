import express from 'express';
import axios from 'axios';
const router = express.Router();

// In-memory store (replace with DB in prod)
let chatGroups = [];

// Store for device tokens
const deviceTokens = {
  // groupId: [{ userId: 'id', token: 'token', username: 'username' }]
};

// Get all groups
router.get('/groups', (req, res) => {
  res.json(chatGroups);
});

// Create a new group
router.post('/groups', (req, res) => {
  const { name } = req.body;
  const newGroup = {
    id: chatGroups.length + 1,
    name,
    messages: []
  };
  chatGroups.unshift(newGroup);
  // Broadcast new group via socket
  const io = req.app.get('io');
  io.of('/chat').emit('groupList', chatGroups);
  res.status(201).json(newGroup);
});

// Get messages for a group
router.get('/groups/:id/messages', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const group = chatGroups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  res.json(group.messages);
});

// Register device for push notifications
router.post('/groups/:id/register-device', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { token, userId, username } = req.body;
  
  if (!token || !userId) {
    return res.status(400).json({ error: 'Missing token or userId' });
  }
  
  // Check if group exists
  const group = chatGroups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  
  // Initialize device tokens array for this group if it doesn't exist
  if (!deviceTokens[groupId]) {
    deviceTokens[groupId] = [];
  }
  
  // Remove existing entry for this user if exists
  const filteredTokens = deviceTokens[groupId].filter(
    entry => entry.userId !== userId
  );
  
  // Add new token
  deviceTokens[groupId] = [
    ...filteredTokens,
    { userId, token, username }
  ];
  
  console.log(`Device registered for group ${groupId}:`, deviceTokens[groupId]);
  
  res.status(200).json({ success: true });
});

// Post a new message to a group
router.post('/groups/:id/messages', async (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { text, user, timestamp, id } = req.body;
  const group = chatGroups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const message = { id: id || Date.now(), text, user, timestamp };
  group.messages.push(message);

  // Emit message via socket
  const io = req.app.get('io');
  io.of('/chat').to(`group_${groupId}`).emit('newMessage', message);

  // Send push notifications to all registered devices
  try {
    await sendPushNotifications(groupId, message, group.name, user);
  } catch (error) {
    console.error('Error sending push notifications:', error);
    // Continue processing - don't fail the request if notifications fail
  }

  res.status(201).json(message);
});

// Function to send push notifications via Expo
async function sendPushNotifications(groupId, message, groupName, senderUsername) {
  // Skip if no registered devices for this group
  if (!deviceTokens[groupId] || deviceTokens[groupId].length === 0) {
    return;
  }
  
  try {
    // Create notification messages
    const notifications = deviceTokens[groupId]
      // Don't send notification to message sender
      .filter(device => device.username !== senderUsername) 
      .map(device => ({
        to: device.token,
        sound: 'default',
        title: `${senderUsername} in ${groupName}`,
        body: message.text,
        data: {
          groupId,
          groupName,
          messageId: message.id
        },
      }));
    
    if (notifications.length === 0) return;
    
    console.log(`Preparing to send ${notifications.length} push notifications for group ${groupId}`);
    
    // Send to Expo push notification service
    await axios.post('https://exp.host/--/api/v2/push/send', 
      notifications, 
      {
        headers: {
          'Accept': 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        }
      }
    );
    
    console.log(`Successfully sent ${notifications.length} push notifications for group ${groupId}`);
  } catch (error) {
    console.error('Error sending push notifications:', error);
    throw error;
  }
}

// Unregister device token (optional, but good practice)
router.delete('/groups/:id/register-device', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  
  // Check if group exists in device tokens
  if (!deviceTokens[groupId]) {
    return res.status(404).json({ error: 'No devices registered for this group' });
  }
  
  // Remove token for this user
  deviceTokens[groupId] = deviceTokens[groupId].filter(
    entry => entry.userId !== userId
  );
  
  console.log(`Device unregistered for group ${groupId} and user ${userId}`);
  
  res.status(200).json({ success: true });
});

export default router;