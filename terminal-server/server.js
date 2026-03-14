const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const apiRoutes = require('./routes/api');
const setupSockets = require('./sockets/socketManager');

// ── APP SETUP ───────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// ── REST API ROUTES ─────────────────────────────────────────────────────
// Mount all modularized endpoints directly at root for compatibility 
// with the existing frontend URLs since they aren't grouped under /api
app.use('/', apiRoutes);

// ── SERVER & SOCKET INSTANTIATION ───────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

// ── SOCKET.IO HANDLERS ──────────────────────────────────────────────────
setupSockets(io);

// ── LANGUAGE SERVER PROTOCOL (LSP) ──────────────────────────────────────
const setupLsp = require('./services/lspService');
setupLsp(server);

// ── START SERVER ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8082;
server.listen(PORT, () => {
    console.log(`[Server] StackFlow IDE Terminal Service running on port ${PORT}`);
    console.log(`[Server] Architecture: Modular + LSP Ready`);
});
