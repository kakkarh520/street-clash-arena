import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const rooms = new Map();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "../public")));
app.get("/health", (_req,res)=>res.json({ok:true, game:"Street Clash Arena"}));

function makeCode(){
  let code;
  do code=Math.random().toString(36).slice(2,7).toUpperCase(); while(rooms.has(code));
  return code;
}

io.on("connection", socket=>{
  socket.on("createRoom", ({name="Player 1"}={})=>{
    const code=makeCode();
    rooms.set(code,{players:new Map([[socket.id,{id:socket.id,name,slot:1}]])});
    socket.join(code);
    socket.data.room=code; socket.data.slot=1;
    socket.emit("roomCreated",{code,slot:1});
  });

  socket.on("joinRoom", ({code,name="Player 2"}={})=>{
    code=String(code||"").toUpperCase();
    const room=rooms.get(code);
    if(!room) return socket.emit("roomError","Room not found.");
    if(room.players.size>=2) return socket.emit("roomError","Room is full.");
    room.players.set(socket.id,{id:socket.id,name,slot:2});
    socket.join(code); socket.data.room=code; socket.data.slot=2;
    socket.emit("roomJoined",{code,slot:2});
    io.to(code).emit("players", [...room.players.values()].map(p=>({name:p.name,slot:p.slot})));
  });

  socket.on("state", data=>{
    if(socket.data.room) socket.to(socket.data.room).emit("remoteState", data);
  });

  socket.on("action", data=>{
    if(socket.data.room) socket.to(socket.data.room).emit("remoteAction", data);
  });

  socket.on("disconnect",()=>{
    const code=socket.data.room;
    const room=rooms.get(code);
    if(room){
      room.players.delete(socket.id);
      socket.to(code).emit("opponentLeft");
      if(room.players.size===0) rooms.delete(code);
    }
  });
});

httpServer.listen(PORT,()=>console.log(`Street Clash Arena running on port ${PORT}`));