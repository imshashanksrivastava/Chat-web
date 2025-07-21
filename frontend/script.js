const socket = io();
const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');
const username = localStorage.getItem('username');
const userList = document.getElementById('user-list');
const chatAvatar = document.getElementById('chatAvatar');
const chatTitle = document.getElementById('chatTitle');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileInfo = document.getElementById('profileInfo');
const profileEmail = document.getElementById('profileEmail');
const profileStatus = document.getElementById('profileStatus');
const profileBio = document.getElementById('profileBio');
const editProfileBtn = document.getElementById('editProfileBtn');
const avatarInput = document.getElementById('avatarInput');
const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
const sidebarMyAvatar = document.getElementById('sidebarMyAvatar');
const sidebarSearch = document.getElementById('sidebarSearch');
const chatHeaderName = document.getElementById('chatHeaderName');
const chatHeaderStatus = document.getElementById('chatHeaderStatus');
const notesPanel = document.getElementById('notesPanel');
const notesTextarea = document.getElementById('notesTextarea');
const saveNotesBtn = document.getElementById('saveNotesBtn');
const notesSavedMsg = document.getElementById('notesSavedMsg');

// Redirect if not logged in
if (!username) {
  window.location.href = 'login.html';
}

// Get chat partner from URL query parameter
const urlParams = new URLSearchParams(window.location.search);
const chatPartner = urlParams.get('user');

if (!chatPartner) {
  alert('No chat user specified. Redirecting to dashboard.');
  window.location.href = 'dashboard.html';
}

// Show chat partner in header
document.querySelector('header').innerHTML = `
  <span>Chat with ${chatPartner}</span>
  <button class="logout-button" onclick="logout()">Logout</button>
`;

// Create a unique room name based on usernames sorted alphabetically
const roomName = [username, chatPartner].sort().join('_');

// Modal viewer function for showing image/video fullscreen
function openMediaModal(type, src) {
  const modalOverlay = document.createElement('div');
  modalOverlay.style.position = 'fixed';
  modalOverlay.style.top = 0;
  modalOverlay.style.left = 0;
  modalOverlay.style.width = '100vw';
  modalOverlay.style.height = '100vh';
  modalOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
  modalOverlay.style.display = 'flex';
  modalOverlay.style.justifyContent = 'center';
  modalOverlay.style.alignItems = 'center';
  modalOverlay.style.zIndex = 10000;
  modalOverlay.style.cursor = 'pointer';

  let media;

  if (type === 'image') {
    media = document.createElement('img');
    media.src = src;
    media.style.maxWidth = '90vw';
    media.style.maxHeight = '90vh';
    media.style.borderRadius = '10px';
    media.style.boxShadow = '0 0 20px white';
  } else if (type === 'video') {
    media = document.createElement('video');
    media.src = src;
    media.controls = true;
    media.autoplay = true;
    media.style.maxWidth = '90vw';
    media.style.maxHeight = '90vh';
    media.style.borderRadius = '10px';
    media.style.boxShadow = '0 0 20px white';
  }

  modalOverlay.appendChild(media);

  modalOverlay.onclick = () => {
    document.body.removeChild(modalOverlay);
  };

  document.body.appendChild(modalOverlay);
}


// Join the private room
socket.emit('joinRoom', roomName);

// Fetch and display previous chats
fetch(`/api/users/chats?user1=${encodeURIComponent(username)}&user2=${encodeURIComponent(chatPartner)}`)
  .then(res => res.json())
  .then(chats => {
    if (Array.isArray(chats)) {
      chats.forEach(chat => {
        let msg;
        if (chat.type === 'file') {
          msg = {
            username: chat.sender,
            type: 'file',
            fileData: chat.fileUrl, // URL from DB
            fileName: chat.fileName,
            fileType: chat.fileType
          };
        } else {
          msg = {
            username: chat.sender,
            text: chat.message,
            type: 'text'
          };
        }
        addMessage(msg, chat.sender === username ? 'self' : 'other');
      });
    }
  })
  .catch(err => {
    console.error('Failed to load previous chats:', err);
  });

// Mark messages as read when chat is opened
fetch('/api/users/chats/mark-read', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user1: username, user2: chatPartner, username }),
});

// Request notification permission on page load
if ('Notification' in window && Notification.permission !== 'granted') {
  Notification.requestPermission();
}

// Get current time as hh:mm am/pm
function getCurrentTime() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
}

// Send message
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === '') return;

  const message = { username, text, room: roomName };
  addMessage(message, 'self');

  socket.emit('chatMessage', message);
  input.value = '';
  input.focus();
});

// Receive message
socket.on('chatMessage', (message) => {
  if (message.username !== username && message.room === roomName) {
    addMessage(message, 'other');
    // Mark as read after receiving a message from the other user
    fetch('/api/users/chats/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user1: username, user2: chatPartner, username }),
    });
    // Only show notification if tab is not focused and not already in this chat
    if (document.hidden && Notification.permission === 'granted') {
      new Notification('New message from ' + message.username, {
        body: message.text || message.fileName || 'You have a new message!',
      });
    }
  }
});

// Add message to UI
function addMessage(message, sender) {
  const div = document.createElement('div');
  div.classList.add('message', sender);

  // Remove avatar/initials for Telegram-like look

  const userSpan = document.createElement('strong');
  userSpan.textContent = message.username;
  userSpan.style.display = 'block';
  div.appendChild(userSpan);

  if (message.type === 'file') {
    if (message.fileType && message.fileType.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = message.fileData;
      img.style.maxWidth = '250px';
      img.style.borderRadius = '12px';
      img.style.cursor = 'pointer';
      img.onclick = () => openMediaModal('image', message.fileData);
      div.appendChild(img);
    } else if (message.fileType && message.fileType.startsWith('video/')) {
      const video = document.createElement('video');
      video.controls = true;
      video.src = message.fileData;
      video.style.maxWidth = '250px';
      video.style.borderRadius = '12px';
      video.style.cursor = 'pointer';
      video.onclick = () => openMediaModal('video', message.fileData);
      div.appendChild(video);
    } else if (message.fileType && message.fileType.startsWith('audio/')) {
      const audio = document.createElement('audio');
      audio.controls = true;
      audio.src = message.fileData;
      div.appendChild(audio);
    } else {
      const link = document.createElement('a');
      link.href = message.fileData;
      link.download = message.fileName;
      link.textContent = `Download ${message.fileName}`;
      link.style.color = sender === 'self' ? 'white' : '#333';
      link.target = '_blank';
      div.appendChild(link);
    }
  } else {
    const textSpan = document.createElement('span');
    textSpan.textContent = message.text;
    div.appendChild(textSpan);
  }

  const timeSpan = document.createElement('span');
  timeSpan.classList.add('timestamp');
  timeSpan.textContent = getCurrentTime();
  div.appendChild(timeSpan);
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
}


// Logout
function logout() {
  fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
    .then((res) => res.json())
    .then((data) => {
      alert('You have been logged out.');
      localStorage.clear();
      window.location.href = 'login.html';
    })
    .catch((err) => {
      console.error('Logout failed:', err);
      alert('Logout failed. Try again.');
    });
}
const fileInput = document.getElementById('fileInput');
const filePickerButton = document.getElementById('filePickerButton');

filePickerButton.addEventListener('click', () => {
  fileInput.click(); // Open file picker dialog
});

fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
    .then(res => res.json())
    .then(data => {
      if (data && data.url) {
        const message = {
          username,
          room: roomName,
          type: 'file',
          fileData: data.url, // Use the URL returned by backend
          fileName: file.name,
          fileType: file.type
        };
        addMessage(message, 'self');
        socket.emit('chatMessage', message);
      } else {
        alert('File upload failed.');
      }
    })
    .catch(() => {
      alert('File upload failed.');
    });

  fileInput.value = '';
});

// Mock online users for demo (replace with real online user tracking)
let onlineUsers = new Set([username]); // Add yourself as online

// Store last message and time for each user (for demo, update in real app)
let lastMessages = {};

// Fetch all users except current user and render in sidebar with last message, time, and online status
async function fetchUsersAndSidebar() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    const users = await res.json();
    // Fetch unread counts
    const unreadRes = await fetch(`/api/users/chats/unread-count?username=${username}`);
    const unreadCounts = await unreadRes.json();
    const unreadMap = {};
    unreadCounts.forEach(u => unreadMap[u._id] = u.count);
    // Fetch last messages for each user
    await Promise.all(users.map(async (user) => {
      if (user.username !== username) {
        const chatRes = await fetch(`/api/users/chats?user1=${encodeURIComponent(username)}&user2=${encodeURIComponent(user.username)}`);
        const chats = await chatRes.json();
        if (Array.isArray(chats) && chats.length > 0) {
          const last = chats[chats.length - 1];
          lastMessages[user.username] = {
            text: last.type === 'file' ? (last.fileName || 'File') : last.message,
            time: new Date(last.timestamp)
          };
        } else {
          lastMessages[user.username] = { text: '', time: null };
        }
      }
    }));
    // Render user list
    userList.innerHTML = '';
    users.forEach((user) => {
      if (user.username !== username) {
        const li = document.createElement('li');
        li.className = (user.username === chatPartner) ? 'active' : '';
        // Avatar
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.username[0].toUpperCase();
        // Online dot
        if (onlineUsers.has(user.username)) {
          avatar.classList.add('online');
        }
        // Info
        const info = document.createElement('div');
        info.className = 'user-info';
        // Name row
        const nameRow = document.createElement('div');
        nameRow.className = 'user-name-row';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user.username;
        nameRow.appendChild(nameSpan);
        // Last message time
        const lastMsg = lastMessages[user.username];
        if (lastMsg && lastMsg.time) {
          const timeSpan = document.createElement('span');
          timeSpan.className = 'user-last-time';
          timeSpan.textContent = lastMsg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          nameRow.appendChild(timeSpan);
        }
        info.appendChild(nameRow);
        // Last message preview
        const lastMsgSpan = document.createElement('span');
        lastMsgSpan.className = 'user-last-message';
        lastMsgSpan.textContent = lastMsg && lastMsg.text ? lastMsg.text : '';
        info.appendChild(lastMsgSpan);
        li.appendChild(avatar);
        li.appendChild(info);
        // Unread badge
        if (unreadMap[user.username]) {
          const badge = document.createElement('span');
          badge.className = 'unread-badge';
          badge.textContent = unreadMap[user.username];
          li.appendChild(badge);
        }
        li.addEventListener('click', () => {
          if (user.username !== chatPartner) {
            window.location.href = `index.html?user=${encodeURIComponent(user.username)}`;
          }
        });
        userList.appendChild(li);
      }
    });
  } catch (err) {
    console.error(err);
    alert('Could not load users. Try again later.');
  }
}
fetchUsersAndSidebar();

// Sidebar search/filter
sidebarSearch.addEventListener('input', () => {
  const filter = sidebarSearch.value.toLowerCase();
  Array.from(userList.children).forEach(li => {
    const name = li.querySelector('.user-name').textContent.toLowerCase();
    li.style.display = name.includes(filter) ? '' : 'none';
  });
});

// Dummy user data for demonstration (replace with real data from backend)
const userData = {
  [username]: {
    email: username + '@example.com',
    status: 'Online',
    bio: 'This is your bio. Click edit to change it.',
    avatar: null // Will hold data URL
  },
  // Add more users as needed
};

// Fetch and display real user info from backend
async function fetchAndSetProfile(usernameToFetch) {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${usernameToFetch}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch profile');
    const user = await res.json();
    // Store in userData for local use
    userData[usernameToFetch] = {
      email: user.email,
      status: user.status || '',
      bio: user.bio || '',
      avatar: user.avatar || null
    };
  } catch (err) {
    // fallback to default profile if error (404, etc.)
    userData[usernameToFetch] = {
      email: usernameToFetch + '@example.com',
      status: 'Offline',
      bio: '',
      avatar: null
    };
  }
}

// Update setChatHeaderAndProfile to fetch real data
async function setChatHeaderAndProfile() {
  await fetchAndSetProfile(chatPartner);
  const data = userData[chatPartner];
  if (data.avatar) {
    profileAvatar.style.backgroundImage = `url('${data.avatar}')`;
    profileAvatar.textContent = '';
    chatAvatar.style.backgroundImage = `url('${data.avatar}')`;
    chatAvatar.textContent = '';
  } else {
    profileAvatar.style.backgroundImage = '';
    profileAvatar.textContent = chatPartner[0].toUpperCase();
    chatAvatar.style.backgroundImage = '';
    chatAvatar.textContent = chatPartner[0].toUpperCase();
  }
  chatHeaderName.textContent = chatPartner;
  chatHeaderStatus.textContent = onlineUsers.has(chatPartner) ? 'Online' : 'Offline';
  profileName.textContent = chatPartner;
  profileInfo.textContent = `This is ${chatPartner}'s profile.`;
  profileEmail.textContent = 'Email: ' + data.email;
  profileStatus.textContent = 'Status: ' + data.status;
  profileBio.textContent = 'Bio: ' + data.bio;
  if (chatPartner === username) {
    editProfileBtn.style.display = '';
    uploadAvatarBtn.style.display = '';
  } else {
    editProfileBtn.style.display = 'none';
    uploadAvatarBtn.style.display = 'none';
  }
}
setChatHeaderAndProfile();

// Edit profile logic (for own profile, persistent)
editProfileBtn.addEventListener('click', async () => {
  if (chatPartner !== username) return;
  const data = userData[username];
  const newEmail = prompt('Edit email:', data.email);
  const newStatus = prompt('Edit status:', data.status);
  const newBio = prompt('Edit bio:', data.bio);
  if (newEmail !== null && newStatus !== null && newBio !== null) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/users/${username}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email: newEmail, status: newStatus, bio: newBio })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      const user = await res.json();
      userData[username] = {
        email: user.email,
        status: user.status,
        bio: user.bio,
        avatar: user.avatar || null
      };
      await setChatHeaderAndProfile();
      alert('Profile updated!');
    } catch (err) {
      alert('Failed to update profile.');
    }
  }
});

// Upload avatar logic (for own profile, persistent)
uploadAvatarBtn.addEventListener('click', () => {
  if (chatPartner !== username) return;
  avatarInput.click();
});
avatarInput.addEventListener('change', async () => {
  if (chatPartner !== username) return;
  const file = avatarInput.files[0];
  if (!file) return;
  const formData = new FormData();
  formData.append('avatar', file);
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/${username}/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    if (!res.ok) throw new Error('Failed to upload avatar');
    const result = await res.json();
    userData[username].avatar = result.avatar;
    await setChatHeaderAndProfile();
    alert('Profile picture updated!');
  } catch (err) {
    alert('Failed to upload avatar.');
  }
});

// Load note for current chat
async function loadChatNote() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/users/notes/${chatPartner}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Failed to fetch note');
    const data = await res.json();
    notesTextarea.value = data.note || '';
  } catch (err) {
    notesTextarea.value = '';
  }
}

// Save note for current chat
saveNotesBtn.addEventListener('click', async () => {
  try {
    const token = localStorage.getItem('token');
    const note = notesTextarea.value;
    const res = await fetch(`/api/users/notes/${chatPartner}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ note })
    });
    if (!res.ok) throw new Error('Failed to save note');
    notesSavedMsg.style.display = '';
    setTimeout(() => { notesSavedMsg.style.display = 'none'; }, 1500);
  } catch (err) {
    notesSavedMsg.style.display = 'none';
    alert('Failed to save note.');
  }
});

// Load note when chat loads or chatPartner changes
if (notesPanel && notesTextarea) {
  loadChatNote();
}

// Set sidebar avatar to initial and show full username next to it
sidebarMyAvatar.textContent = username[0].toUpperCase();
document.getElementById('sidebarMyName').textContent = username;
sidebarMyAvatar.style.background = 'linear-gradient(135deg, #4f8cff 60%, #6ee7b7 100%)';
sidebarMyAvatar.style.fontSize = '1.15rem';
sidebarMyAvatar.style.fontWeight = '700';
sidebarMyAvatar.style.letterSpacing = '0.5px';
sidebarMyAvatar.style.color = '#fff';
sidebarMyAvatar.style.boxShadow = '0 2px 8px rgba(79,140,255,0.10)';
