const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db.json');
const db = low(adapter);

// Set some defaults (required if your JSON file is empty)
db.defaults({ messages: [] }).write();

// Serve static files from the "public" directory
app.use(express.static('public'));

// Store the connected users
const users = {};

io.on('connection', (socket) => {
  let userName;

  socket.on('join', (name) => {
    if (userName) {
      // User changing username
      const prevUserName = userName;
      userName = name;
      users[socket.id] = userName;
      socket.broadcast.emit('userChange', { prevUserName, newUserName: userName });
    } else {
      // User joining for the first time
      userName = name;
      users[socket.id] = userName;
      socket.broadcast.emit('userJoin', userName);
    }
  });

  socket.on('leave', () => {
    socket.broadcast.emit('userLeave', userName);
    delete users[socket.id];
  });

  socket.on('message', (message) => {
    const userData = { user: users[socket.id], message: message };
    io.emit('message', userData);
    db.get('messages').push(userData).write();
  });

  socket.on('disconnect', () => {
    if (userName) {
      socket.broadcast.emit('userLeave', userName);
      delete users[socket.id];
    }
  });
});

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});