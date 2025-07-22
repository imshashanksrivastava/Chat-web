# Chat Web Application

A modern, full-stack real-time chat application with user authentication, media sharing, and a responsive UI. Built with Node.js, Express, MongoDB, Socket.io, and vanilla JavaScript.

## Features

- Real-time private messaging
- User registration and login (JWT-based authentication)
- Media/file sharing in chat
- User profile with avatar, status, and bio
- Dashboard with unread message counts
- Chat notes (private notes per chat)
- Responsive, modern UI (vanilla JS, CSS, Bootstrap)
- Secure password hashing

## Folder Structure

```
Chat web/
├── backend/
│   ├── models/         # Mongoose models (User, Chat, Note)
│   ├── routes/         # Express API routes (auth, users)
│   ├── uploads/        # Uploaded files (avatars, media)
│   ├── server.js       # Main backend server (Express + Socket.io)
│   ├── package.json    # Backend dependencies
├── frontend/
│   ├── index.html      # Main chat UI
│   ├── dashboard.html  # User dashboard
│   ├── login.html      # Login page
│   ├── register.html   # Registration page
│   ├── home.html       # Landing page
│   ├── *.js, *.css     # Frontend scripts and styles
├── package.json        # (root) Project-level dependencies
```

## Technologies Used

- **Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, Multer, JWT, bcryptjs
- **Frontend:** HTML5, CSS3, JavaScript (ES6+), Bootstrap

## Getting Started

### Prerequisites
- Node.js (v16+ recommended)
- MongoDB (local or Atlas)

### Backend Setup
1. Navigate to the backend folder:
   ```sh
   cd "Chat web/backend"
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file in `backend/` with:
   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```
4. Start the backend server:
   ```sh
   node server.js
   ```

### Frontend Setup
No build step required. The backend serves the frontend static files. Simply open `home.html` in your browser, or access via `http://localhost:5000/` after starting the backend.

## Usage
- Register a new account or log in.
- Access the dashboard to see users and unread messages.
- Start a private chat, send messages, and share files.
- Edit your profile and chat notes.

## API Endpoints (Summary)
- `POST /api/auth/register` — Register new user
- `POST /api/auth/login` — Login
- `POST /api/auth/logout` — Logout
- `GET /api/users` — List users (auth required)
- `GET /api/users/chats` — Get chat history between two users
- `POST /api/users/chats/mark-read` — Mark messages as read
- `GET /api/users/chats/unread-count` — Get unread message counts
- `POST /api/upload` — Upload media/file

## Models (Summary)
- **User:** username, email, password (hashed), status, bio, avatar
- **Chat:** sender, receiver, message, type (text/file), fileUrl, readBy, timestamp
- **Note:** writer, chatWith, note

## License
MIT 