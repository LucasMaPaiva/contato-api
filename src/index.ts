import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { handleSocketMessage, handleDisconnect } from "./sockets/handlers";
import { loadRoomStates } from "./game/state";

dotenv.config();

const PORT = Number(process.env.PORT) || 3001;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/contato";

async function startServer() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    await loadRoomStates();
    console.log("Room states loaded");

    const app = express();
    const server = createServer(app);
    const wss = new WebSocketServer({ server });

    wss.on("connection", (ws: any, req: any) => {
      const id = Math.random().toString(36).substring(7);
      const ip = req.socket.remoteAddress;
      console.log(`New connection: ${id} from ${ip}`);

      ws.on("message", (message: any) => {
        handleSocketMessage(ws, wss, id, message.toString());
      });

      ws.on("close", () => {
        handleDisconnect(ws as any, id, wss);
      });
    });

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
