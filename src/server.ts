import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import roomRoutes from './routes/room.route';
import { setupSocket } from './socket/socketHandler';

export const startServer = () => {
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: process.env.FE_URL,
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  app.use(cors());
  app.use(express.json());

  app.use('/api/rooms', roomRoutes);

  setupSocket(io);

  const PORT = process.env.PORT;
  server.listen(PORT, () => {
    console.log(`> Server running at http://localhost:${PORT}`);
  });
};
