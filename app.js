const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

server.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});

let users = [];

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const id = 123456;

  if (!token) {
    console.log("Unauthorized");
  } else if (token != id) {
    console.log("Invalid token");
  } else {
    next();
  }
});

const chatNameSpace = io.of("/chat");

chatNameSpace.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    const index = users.findIndex((s) => s.id == socket.id);
    if (index !== -1) users.splice(index, 1);
    chatNameSpace.emit("online", users);
    console.log("User Disconnected");
  });

  socket.on("chat message", (data) => {
    const date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    data.date = `${hours}:${minutes}`;
    chatNameSpace.to(data.roomNumber).emit("chat message", data);
  });

  socket.on("typing", (data) => {
    socket.broadcast
      .in(data.roomNumber)
      .emit("typing", `${data.name} is typing...`);
  });

  socket.on("login", (data) => {
    users.push({
      id: socket.id,
      name: data.nickname,
      roomNumber: data.roomNumber,
    });
    socket.join(data.roomNumber);
    chatNameSpace.emit("online", users);
    console.log(`${data.nickname} connected`);
  });

  socket.on("pvChat", (data) => {
    chatNameSpace.to(data.to).emit("pvChat", data);
  });
});
