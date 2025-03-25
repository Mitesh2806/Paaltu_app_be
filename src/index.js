import express from 'express';
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import playdateRoutes from "./routes/playdateRoutes.js";

import { connectDB } from './lib/db.js';
import cors from "cors";
import job from './lib/cron.js';


const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
job.start();

app.use("/api/auth", authRoutes);
app.use("/api/playdates", playdateRoutes);
app.get("/test", (req, res) => {
  res.send("Hello World");
})
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();

});