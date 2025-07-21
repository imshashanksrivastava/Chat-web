const messages = [
  { text: 'Hey there! Welcome to our chat app.', type: 'received' },
  { text: 'Hi! Excited to try it out.', type: 'sent' },
  { text: 'You can share messages and media in real-time!', type: 'received' },
];

const chatBox = document.getElementById('chat-box');

let index = 0;

function showNextMessage() {
  chatBox.innerHTML = '';
  const msg = messages[index];
  const div = document.createElement('div');
  div.classList.add('message', msg.type);
  div.textContent = msg.text;
  chatBox.appendChild(div);

  index = (index + 1) % messages.length;
}

showNextMessage();
setInterval(showNextMessage, 4000);
