import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import jwt, { JwtPayload } from "jsonwebtoken";
import { resolveRestaurantForActor } from "./helpers/actor";

let io: SocketIOServer | null = null;

const roomFor = (restaurantId: string) => `restaurant:${restaurantId}`;

export function initSocket(httpServer: HttpServer) {
    io = new SocketIOServer(httpServer, { cors: { origin: "*" } });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token as string | undefined;
            if (!token) return next(new Error("Unauthorized"));

            const decoded = jwt.verify(token, process.env.JWT!) as JwtPayload;
            if (!["OWNER", "CHEF", "PAYMENTAGENT"].includes(decoded.role)) {
                return next(new Error("Unauthorized"));
            }

            const restaurant = await resolveRestaurantForActor(decoded.id, decoded.role);
            if (!restaurant) return next(new Error("Unauthorized"));

            socket.data.restaurantId = restaurant.id;
            next();
        } catch {
            next(new Error("Unauthorized"));
        }
    });

    io.on("connection", (socket) => {
        socket.join(roomFor(socket.data.restaurantId));
    });

    return io;
}

export function emitNewOrder(restaurantId: string, order: unknown) {
    io?.to(roomFor(restaurantId)).emit("order:new", order);
}

export function emitOrderUpdated(restaurantId: string, order: unknown) {
    io?.to(roomFor(restaurantId)).emit("order:updated", order);
}
