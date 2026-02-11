const socket = io();

const joinPanel = document.getElementById('joinPanel');
const chatPanel = document.getElementById('chatPanel');
const joinForm = document.getElementById('joinForm');
const privateForm = document.getElementById('privateForm');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const roomTitle = document.getElementById('roomTitle');
const userWelcome = document.getElementById('userWelcome');
const statusEl = document.getElementById('status');
const recordButton = document.getElementById('recordButton');
const voiceNotes = document.getElementById('voiceNotes');
const usersList = document.getElementById('users');
const privateTarget = document.getElementById('privateTarget');
const privateText = document.getElementById('privateText');
const privateMessages = document.getElementById('privateMessages');

let selfId = null;
let currentUser = null;
let mediaRecorder = null;
let chunks = [];
let recordingStart = 0;

const setStatus = (text) => {
  statusEl.textContent = text;
};

const formatTime = (ts) => new Date(ts).toLocaleTimeString();

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const room = roomInput.value.trim();

  if (!username || !room) {
    setStatus('Completa nombre y sala.');
    return;
  }

  socket.emit('join-room', { username, room });
});

socket.on('connect', () => {
  selfId = socket.id;
});

socket.on('joined-room', ({ room, username }) => {
  currentUser = username;
  joinPanel.classList.add('hidden');
  chatPanel.classList.remove('hidden');
  roomTitle.textContent = `Sala: ${room}`;
  userWelcome.textContent = `Conectado como ${username}`;
  setStatus('Listo para enviar notas de voz.');
});

socket.on('room-users', (users) => {
  usersList.innerHTML = '';

  privateTarget.innerHTML = '<option value="">Selecciona destinatario</option>';

  users.forEach((user) => {
    const li = document.createElement('li');
    li.textContent = `${user.username}${user.socketId === selfId ? ' (tú)' : ''}`;
    usersList.appendChild(li);

    if (user.socketId !== selfId) {
      const option = document.createElement('option');
      option.value = user.socketId;
      option.textContent = user.username;
      privateTarget.appendChild(option);
    }
  });
});

const pushVoiceNote = ({ sender, sentAt, audioBase64, mimeType, duration }) => {
  const item = document.createElement('li');
  const meta = document.createElement('div');
  meta.className = 'small';
  meta.textContent = `${sender} · ${formatTime(sentAt)} · ${Math.round((duration || 0) / 1000)}s`;

  const audio = document.createElement('audio');
  audio.controls = true;
  audio.src = `data:${mimeType};base64,${audioBase64}`;

  item.appendChild(meta);
  item.appendChild(audio);
  voiceNotes.prepend(item);
};

socket.on('voice-note', (payload) => {
  pushVoiceNote(payload);
});

privateForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const toSocketId = privateTarget.value;
  const text = privateText.value.trim();

  if (!toSocketId || !text) {
    setStatus('Selecciona un usuario y escribe un mensaje.');
    return;
  }

  socket.emit('private-message', { toSocketId, text });
  privateText.value = '';
});

socket.on('private-message', ({ from, text, sentAt }) => {
  const item = document.createElement('li');
  item.innerHTML = `<div class="small">${from} · ${formatTime(sentAt)}</div><div>${text}</div>`;
  privateMessages.prepend(item);
});

socket.on('error-message', (msg) => {
  setStatus(msg);
});

socket.on('disconnect', () => {
  setStatus('Desconectado del servidor.');
});

const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      resolve(result.split(',')[1]);
    };
    reader.readAsDataURL(blob);
  });
};

const toggleRecording = async () => {
  if (!currentUser) {
    setStatus('Primero debes entrar a una sala.');
    return;
  }

  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    chunks = [];
    recordingStart = Date.now();

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' });
      const audioBase64 = await blobToBase64(blob);

      socket.emit('voice-note', {
        mimeType: blob.type || 'audio/webm',
        duration: Date.now() - recordingStart,
        audioBase64,
      });

      stream.getTracks().forEach((track) => track.stop());
      recordButton.classList.remove('recording');
      recordButton.textContent = '🎙️ Grabar nota';
      setStatus('Nota de voz enviada.');
    };

    mediaRecorder.start();
    recordButton.classList.add('recording');
    recordButton.textContent = '⏹️ Detener';
    setStatus('Grabando nota de voz...');
  } catch (error) {
    setStatus('No se pudo acceder al micrófono.');
  }
};

recordButton.addEventListener('click', toggleRecording);
