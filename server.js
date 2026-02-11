const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Map();

app.use(express.static(path.join(__dirname, 'public')));

const getRoomUsers = (roomName) => {
  return [...users.values()]
    .filter((user) => user.room === roomName)
    .map((user) => ({
      socketId: user.socketId,
      username: user.username,
      room: user.room,
    }));
};

io.on('connection', (socket) => {
  socket.on('join-room', ({ username, room }) => {
    if (!username || !room) {
      socket.emit('error-message', 'Nombre y sala son obligatorios.');
      return;
    }

    const safeUsername = String(username).trim().slice(0, 30);
    const safeRoom = String(room).trim().slice(0, 30);

    if (!safeUsername || !safeRoom) {
      socket.emit('error-message', 'Nombre y sala son obligatorios.');
      return;
    }

    socket.join(safeRoom);
    users.set(socket.id, {
      socketId: socket.id,
      username: safeUsername,
      room: safeRoom,
    });

    io.to(safeRoom).emit('room-users', getRoomUsers(safeRoom));
    socket.emit('joined-room', { room: safeRoom, username: safeUsername });
  });

  socket.on('voice-note', ({ audioBase64, mimeType, duration }) => {
    const sender = users.get(socket.id);
    if (!sender || !audioBase64 || !mimeType) {
      return;
    }

    io.to(sender.room).emit('voice-note', {
      sender: sender.username,
      senderId: sender.socketId,
      mimeType,
      duration,
      audioBase64,
      sentAt: Date.now(),
    });
  });

  socket.on('private-message', ({ toSocketId, text }) => {
    const sender = users.get(socket.id);
    if (!sender || !toSocketId || !text) {
      return;
    }

    const sanitizedText = String(text).trim().slice(0, 500);
    const receiver = users.get(toSocketId);

    if (!sanitizedText || !receiver || receiver.room !== sender.room) {
      socket.emit('error-message', 'No se pudo enviar el privado.');
      return;
    }

    io.to(toSocketId).emit('private-message', {
      fromSocketId: sender.socketId,
      from: sender.username,
      text: sanitizedText,
      sentAt: Date.now(),
    });

    socket.emit('private-message', {
      fromSocketId: sender.socketId,
      from: `Yo → ${receiver.username}`,
      text: sanitizedText,
      sentAt: Date.now(),
    });
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) {
      return;
    }

    users.delete(socket.id);
    io.to(user.room).emit('room-users', getRoomUsers(user.room));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
