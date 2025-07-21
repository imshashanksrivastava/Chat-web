require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const app = express();

const PORT = process.env.PORT || 5000;

// Serve homepage at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/home.html'));
});

// Serve static frontend files (css, js, html other than '/')
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors());
app.use(express.json());
const usersRoute = require('./routes/users');
const Chat = require('./models/Chat');

// Set up multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  console.log('Upload endpoint hit');
  console.log('File info:', req.file);
  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // Return the file path or URL for frontend to use
  res.json({
    filename: req.file.filename,
    url: `/uploads/${req.file.filename}`
  });
});

app.use('/api/users', usersRoute);


const server = http.createServer(app);

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected!'))
  .catch((err) => console.error('MongoDB connection error:', err));

const onlineUsers = new Set();

io.on('connection', (socket) => {
  console.log('New WS Connection...');
  let username;

  // Handle user joining a private room
  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`User joined room: ${room}`);
  });

  // Handle incoming chat message
  socket.on('chatMessage', async (message) => {
    // Support old frontend structure: { username, text, room }
    if (message.type === 'file' && message.username && message.room) {
      // File message
      const users = message.room.split('_');
      let sender = message.username;
      let receiver = users.find(u => u !== sender) || sender;
      try {
        const chatDoc = new Chat({
          sender,
          receiver,
          type: 'file',
          fileUrl: message.fileData, // URL to file
          fileName: message.fileName,
          fileType: message.fileType,
          sentByUsername: sender,
          timestamp: new Date(),
        });
        await chatDoc.save();
      } catch (err) {
        console.error('Error saving file chat message:', err);
      }
    } else if (message.text && message.username && message.room) {
      // Text message
      const users = message.room.split('_');
      let sender = message.username;
      let receiver = users.find(u => u !== sender) || sender;
      try {
        const chatDoc = new Chat({
          sender,
          receiver,
          message: message.text,
          type: 'text',
          sentByUsername: sender,
          timestamp: new Date(),
        });
        await chatDoc.save();
      } catch (err) {
        console.error('Error saving chat message:', err);
      }
    }
    io.to(message.room).emit('chatMessage', message);
  });

  // Track online user (from dashboard)
  socket.on('userOnline', (name) => {
    username = name;
    onlineUsers.add(username);
    io.emit('updateOnlineUsers', Array.from(onlineUsers));
  });

  socket.on('disconnect', () => {
    if (username) {
      onlineUsers.delete(username);
      io.emit('updateOnlineUsers', Array.from(onlineUsers));
    }
  });
});



server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
