const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins (update if needed)
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

// ✅ Route Fix: Ensure correct path for rendering chat.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/index.html");
});

app.get("/chat", (req, res) => {
  res.sendFile(__dirname + "/public/chat.html");
});

server.listen(PORT, () => {
  console.log(`✅ Server started on port ${PORT}`);
});

let users = [];

// ✅ Authentication Middleware Fix
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  const id = 123456; // Hardcoded token for now

  if (!token) {
    console.log("⛔ Unauthorized: No token provided");
    return next(new Error("Unauthorized"));
  } else if (token != id) {
    console.log("⛔ Invalid Token");
    return next(new Error("Invalid token"));
  } else {
    next();
  }
});

const chatNameSpace = io.of("/chat");

chatNameSpace.on("connection", (socket) => {
  console.log(`✅ User Connected: ${socket.id}`);

  socket.on("disconnect", () => {
    const index = users.findIndex((s) => s.id === socket.id);
    if (index !== -1) users.splice(index, 1);
    chatNameSpace.emit("online", users);
    console.log(`❌ User Disconnected: ${socket.id}`);
  });

  // ✅ Ensure user joins a room before sending messages
  socket.on("login", (data) => {
    users.push({
      id: socket.id,
      name: data.nickname,
      roomNumber: data.roomNumber,
    });

    socket.join(data.roomNumber);
    chatNameSpace.emit("online", users);
    console.log(`✅ ${data.nickname} joined room ${data.roomNumber}`);
  });

  socket.on("chat message", (data) => {
    if (!socket.rooms.has(data.roomNumber)) {
      console.log(`⛔ User ${socket.id} has not joined room ${data.roomNumber}`);
      return;
    }

    const date = new Date();
    let hours = date.getHours();
    let minutes = date.getMinutes();
    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    data.date = `${hours}:${minutes}`;

    chatNameSpace.to(data.roomNumber).emit("chat message", data);
    console.log(`💬 Message sent to room ${data.roomNumber}:`, data);
  });

  socket.on("typing", (data) => {
    socket.broadcast.in(data.roomNumber).emit("typing", `${data.name} is typing...`);
  });

  socket.on("pvChat", (data) => {
    chatNameSpace.to(data.to).emit("pvChat", data);
  });
});
