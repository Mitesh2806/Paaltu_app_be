// Backend/src/routes/chat.js
import express from 'express';
import Message from '../models/messageSchema.js';
import protectRoute from '../middleware/auth.middleware.js';

const router = express.Router();

// Get all conversations for the current user
router.get('/conversations', protectRoute, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find all unique users the current user has messaged or received messages from
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: userId },
            { recipient: userId }
          ]
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ["$sender", userId] },
              "$recipient",
              "$sender"
            ]
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$recipient", userId] },
                  { $eq: ["$read", false] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      {
        $unwind: '$userInfo'
      },
      {
        $project: {
          userId: '$_id',
          username: '$userInfo.username',
          lastMessage: '$lastMessage.content',
          timestamp: '$lastMessage.timestamp',
          unreadCount: 1
        }
      }
    ]);
    
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get message history with a specific user
router.get('/messages/:userId', protectRoute, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const otherUserId = req.params.userId;
    
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: otherUserId },
        { sender: otherUserId, recipient: currentUserId }
      ]
    })
    .sort({ timestamp: 1 })
    .limit(50);
    
    // Mark all messages from the other user as read
    await Message.updateMany(
      { sender: otherUserId, recipient: currentUserId, read: false },
      { $set: { read: true } }
    );
    
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;