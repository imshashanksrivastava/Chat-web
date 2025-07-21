const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
  sender: {
    type: String,
    required: true,
    trim: true,
  },
  receiver: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: false, // Make optional for file messages
  },
  type: {
    type: String,
    enum: ['text', 'file'],
    default: 'text',
  },
  fileUrl: String,
  fileName: String,
  fileType: String,
  readBy: {
    type: [String], // array of usernames or user IDs
    default: [],
  },
  sentByUsername: {
    type: String,
    required: true,
    trim: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Chat', ChatSchema); 