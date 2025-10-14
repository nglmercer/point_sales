import { SocketIOLikeClient } from "ws-socketio-adapter/client";
const wsURL = import.meta.env.DEV ? "ws://localhost:3000/ws" : window.location.origin.replace("http", "ws") + "/ws";
const ws = new SocketIOLikeClient(wsURL);
if (!ws.connected) {
  console.log("✅ WebSocket conectado");
  ws.connect();
}
export {ws};
export default ws;