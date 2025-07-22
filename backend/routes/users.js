const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Chat = require('../models/Chat');
const multer = require('multer');
const path = require('path');
// Removed: const { Note } = require('../models/User');

// Middleware to verify JWT token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// Multer setup for avatar uploads
const avatarStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-avatar-' + file.originalname);
  }
});
const avatarUpload = multer({ storage: avatarStorage });

// GET /api/users - return all users except logged-in user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select('username -_id');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats?user1=alice&user2=bob - get all chats between two users
router.get('/chats', async (req, res) => {
  const { user1, user2 } = req.query;
  if (!user1 || !user2) {
    return res.status(400).json({ message: 'Both user1 and user2 are required' });
  }
  try {
    const chats = await Chat.find({
      $or: [
        { sender: user1, receiver: user2 },
        { sender: user2, receiver: user1 }
      ]
    }).sort({ timestamp: 1 });
    res.json(chats);
  } catch (err) {
    console.error('Error fetching chats:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.post('/chats/mark-read', async (req, res) => {
  const { user1, user2, username } = req.body;
  try {
    await Chat.updateMany(
      {
        $or: [
          { sender: user1, receiver: user2 },
          { sender: user2, receiver: user1 }
        ],
        readBy: { $ne: username }
      },
      { $push: { readBy: username } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count per sender
router.get('/chats/unread-count', async (req, res) => {
  const { username } = req.query;
  try {
    const unreadCounts = await Chat.aggregate([
      { $match: { receiver: username, readBy: { $ne: username } } },
      { $group: { _id: "$sender", count: { $sum: 1 } } }
    ]);
    res.json(unreadCounts);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:username/profile - get user profile
router.get('/:username/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/:username/profile - update user profile (email, status, bio)
router.put('/:username/profile', authMiddleware, async (req, res) => {
  if (req.user.username !== req.params.username) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { email, status, bio } = req.body;
  try {
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { email, status, bio },
      { new: true, runValidators: true }
    ).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/:username/avatar - upload avatar
router.post('/:username/avatar', authMiddleware, avatarUpload.single('avatar'), async (req, res) => {
  if (req.user.username !== req.params.username) {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  const avatarUrl = `/uploads/${req.file.filename}`;
  try {
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');
    res.json({ avatar: avatarUrl, user });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
