import express from 'express';
const router = express.Router();

// In-memory store (replace with DB in prod)
let chatGroups = [];

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

// Post a new message to a group
router.post('/groups/:id/messages', (req, res) => {
  const groupId = parseInt(req.params.id, 10);
  const { text, user, timestamp } = req.body;
  const group = chatGroups.find(g => g.id === groupId);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const message = { id: Date.now(), text, user, timestamp };
  group.messages.push(message);

  // Emit message via socket
  const io = req.app.get('io');
  io.of('/chat').to(`group_${groupId}`).emit('newMessage', message);

  res.status(201).json(message);
});

export default router;
