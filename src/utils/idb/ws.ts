import { SocketIOLikeClient } from "ws-socketio-adapter/client";
const ws = new SocketIOLikeClient("ws://localhost:3000/ws");
ws.connect();

export {ws};
export default ws;