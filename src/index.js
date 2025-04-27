import express from 'express';
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import playdateRoutes from "./routes/playdateRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import SocketService from './services/socketService.js';
import { connectDB } from './lib/db.js';
import cors from "cors";
import job from './lib/cron.js';
import http from 'http';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
job.start();
const server = http.createServer(app);
const socketService = new SocketService(server);
app.use("/api/auth", authRoutes);
app.use("/api/playdates", playdateRoutes);
app.use("/api/pets", playdateRoutes);
app.use('/api/chat', chatRoutes);
app.get("/test", (req, res) => {
  res.send("Hello World");
})
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();

});