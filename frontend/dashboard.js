// Show logged-in username
const username = localStorage.getItem('username');
const userDisplay = document.getElementById('user-display');
const userList = document.getElementById('user-list');

// Ensure username is shown in the welcome message
if (userDisplay && username) {
  userDisplay.textContent = username;
}

// Fetch all users except current user
async function fetchUsers() {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/users', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }

    const users = await res.json();

    // Fetch unread counts
    const unreadRes = await fetch(`/api/users/chats/unread-count?username=${username}`);
    const unreadCounts = await unreadRes.json();
    const unreadMap = {};
    unreadCounts.forEach(u => unreadMap[u._id] = u.count);
    let totalUnread = 0;
    unreadCounts.forEach(u => { totalUnread += u.count; });

    // Fetch last message time for each user
    const userLastContact = {};
    await Promise.all(users.map(async (user) => {
      if (user.username !== username) {
        const chatRes = await fetch(`/api/users/chats?user1=${encodeURIComponent(username)}&user2=${encodeURIComponent(user.username)}`);
        const chats = await chatRes.json();
        if (Array.isArray(chats) && chats.length > 0) {
          const last = chats[chats.length - 1];
          userLastContact[user.username] = new Date(last.timestamp).getTime();
        } else {
          userLastContact[user.username] = null;
        }
      }
    }));

    // Separate users into unread and read
    const unreadUsers = [];
    const readUsers = [];
    users.forEach(user => {
      if (user.username === username) return;
      if (unreadMap[user.username]) {
        unreadUsers.push(user);
      } else {
        readUsers.push(user);
      }
    });
    // Sort each group by last contacted, then alphabetically
    function sortGroup(arr) {
      arr.sort((a, b) => {
        const aTime = userLastContact[a.username];
        const bTime = userLastContact[b.username];
        if (aTime && bTime) return bTime - aTime;
        if (aTime) return -1;
        if (bTime) return 1;
        return a.username.localeCompare(b.username);
      });
    }
    sortGroup(unreadUsers);
    sortGroup(readUsers);
    const sortedUsers = [...unreadUsers, ...readUsers];

    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Dashboard - Chat App`;
    } else {
      document.title = 'Dashboard - Chat App';
    }

    userList.innerHTML = '';

    sortedUsers.forEach((user, index) => {
      if (user.username !== username) {
        const li = document.createElement('li');

        // Avatar (first letter of username)
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.username[0].toUpperCase();

        // Username span
        const nameSpan = document.createElement('span');
        nameSpan.className = 'user-name';
        nameSpan.textContent = user.username;

        li.appendChild(avatar);
        li.appendChild(nameSpan);

        // Unread badge
        if (unreadMap[user.username]) {
          const badge = document.createElement('span');
          badge.className = 'unread-badge';
          badge.textContent = unreadMap[user.username];
          li.appendChild(badge);
        }

        // Add animation class (optional)
        li.style.opacity = 0;
        li.style.transition = `opacity 0.4s ease ${index * 50}ms`;
        setTimeout(() => {
          li.style.opacity = 1;
        }, 10);

        li.addEventListener('click', () => {
          window.location.href = `index.html?user=${encodeURIComponent(user.username)}`;
        });

        userList.appendChild(li);
      }
    });
  } catch (err) {
    console.error(err);
    alert('Could not load users. Try again later.');
  }
}

fetchUsers();

// Logout function
function logout() {
  fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
    .then(() => {
      localStorage.clear();
      alert('You have been logged out.');
      window.location.href = 'login.html';
    })
    .catch(() => {
      alert('Logout failed. Try again.');
    });
}
