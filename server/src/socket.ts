// server/src/socket.ts
import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "./models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || 'recruitx_secure_jwt_secret_key_2026_super_secret_987654321';

let ioInstance: SocketIOServer | null = null;

/**
 * Initialize Socket.io on the given HTTP server.
 * - JWT token is passed in the connection `auth` field.
 * - Each socket joins:
 *    - private room `user:{userId}` for direct notifications
 *    - role room `role:{userRole}` for targeted announcements
 *    - global room `all` for platform-wide alerts
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

      // Join private user room, role room, and broadcast room
      socket.join(`user:${payload.id}`);
      if (user.role) {
        socket.join(`role:${user.role}`);
      }
      socket.join('all');
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId;
    const role = (socket as any).userRole;
    console.log(`⚡️ Socket connected: ${socket.id} (user ${userId}, role ${role})`);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  ioInstance = io;
  return { io, emitToUser, emitToRole, broadcastEvent };
};

export const getIO = (): SocketIOServer | null => {
  return ioInstance;
};

/**
 * Helper for emitting events to a specific user
 */
export const emitToUser = (userId: string, event: string, payload: any) => {
  if (!ioInstance) return;
  const uid = typeof userId === 'object' && (userId as any)?._id ? (userId as any)._id.toString() : userId.toString();
  ioInstance.to(`user:${uid}`).emit(event, payload);
};

/**
 * Helper for emitting events to all users with a specific role
 */
export const emitToRole = (role: string, event: string, payload: any) => {
  if (!ioInstance) return;
  ioInstance.to(`role:${role}`).emit(event, payload);
};

/**
 * Helper for broadcasting events to all connected users
 */
export const broadcastEvent = (event: string, payload: any) => {
  if (!ioInstance) return;
  ioInstance.to('all').emit(event, payload);
};
