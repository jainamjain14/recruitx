// server/src/socket.ts
import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "./models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || 'recruitx_secure_jwt_secret_key_2026_super_secret_987654321';

/**
 * Initialize Socket.io on the given HTTP server.
 * - JWT token is passed in the connection `auth` field.
 * - Each socket joins a private room `user:{userId}`.
 * - Export `emitToUser(userId, event, payload)` for services to push real-time updates.
 */
export const initSocket = (httpServer: HttpServer) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: [
        process.env.CLIENT_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
      ],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // JWT authentication middleware for socket connections
  io.use(async (socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("Authentication token missing"));
    try {
      const payload = jwt.verify(token, JWT_SECRET) as any;
      (socket as any).userId = payload.id;
      const user = await User.findById(payload.id).select("role");
      if (!user) return next(new Error("User not found"));
      (socket as any).userRole = user.role;
      // Join a private room for this user – enables one-to-one pushes
      socket.join(`user:${payload.id}`);
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    console.log(`⚡️ Socket connected: ${socket.id} (user ${(socket as any).userId})`);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  // Helper for emitting events to a specific user
  const emitToUser = (userId: string, event: string, payload: any) => {
    io.to(`user:${userId}`).emit(event, payload);
  };

  return { io, emitToUser };
};
