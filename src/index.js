import express from 'express';
import "dotenv/config";
import authRoutes from "./routes/authRoutes.js";
import playdateRoutes from "./routes/playdateRoutes.js";
import { connect } from 'mongoose';
import { connectDB } from './lib/db.js';
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api/playdates", playdateRoutes);
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  connectDB();

});