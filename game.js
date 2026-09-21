const $=id=>document.getElementById(id);
const socket=io(); let mode="menu", room="", slot=1, hp=[100,100], x=[170,630], vel=0, attacking=false, blocking=false, last=0, time=60;
const canvas=$("arena"), ctx=canvas.getContext("2d");

function setStatus(t){$("status").textContent=t}
function show(id){["menu","lobby","game"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden")}
function name(){return $("name").value.trim()||"Fighter"}

$("create").onclick=()=>socket.emit("createRoom",{name:name()});
$("join").onclick=()=>socket.emit("joinRoom",{code:$("code").value,name:name()});
$("ai").onclick=()=>startAI();
$("copy").onclick=async()=>{await navigator.clipboard?.writeText(room);$("copy").textContent="Copied!"};
$("back").onclick=()=>location.reload();
$("exit").onclick=()=>location.reload();

socket.on("connect",()=>setStatus("Online"));
socket.on("roomCreated",d=>{room=d.code;slot=d.slot;$("roomCode").textContent=room;$("lobbyText").textContent="Waiting for opponent…";show("lobby")});
socket.on("roomJoined",d=>{room=d.code;slot=d.slot;show("game");initGame()});
socket.on("players",p=>{if(p.length===2){$("p1name").textContent=p.find(x=>x.slot===1)?.name||"P1";$("p2name").textContent=p.find(x=>x.slot===2)?.name||"P2";$("lobbyText").textContent="Opponent connected!";setTimeout(()=>{show("game");initGame()},300)}});
socket.on("roomError",m=>alert(m));
socket.on("remoteState",d=>{if(d.slot!==slot){x[d.slot-1]=d.x;hp[d.slot-1]=d.hp}});
socket.on("remoteAction",d=>{if(d.slot!==slot){if(d.type==="hit") hp[d.target-1]=Math.max(0,hp[d.target-1]-d.damage)}})
socket.on("opponentLeft",()=>alert("Opponent disconnected."));

function startAI(){slot=1;show("game");initGame(true)}
function initGame(ai=false){mode=ai?"ai":"online";canvas.width=innerWidth*devicePixelRatio;canvas.height=canvas.clientHeight*devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);x=[canvas.clientWidth*.25,canvas.clientWidth*.75];hp=[100,100];time=60;last=performance.now();requestAnimationFrame(loop)}
function attack(type){if(attacking||blocking)return;attacking=true;const target=slot===1?2:1;const dist=Math.abs(x[0]-x[1]);if(dist<115){const dmg=type==="kick"?16:10;hp[target-1]=Math.max(0,hp[target-1]-dmg);if(mode==="online")socket.emit("action",{slot,type:"hit",target,damage:dmg})}setTimeout(()=>attacking=false,type==="kick"?380:260)}
document.querySelectorAll("[data-act]").forEach(b=>b.addEventListener("pointerdown",()=>{if(b.dataset.act==="block"){blocking=true}else attack(b.dataset.act)}));
document.querySelector('[data-act="block"]').addEventListener("pointerup",()=>blocking=false);
document.querySelectorAll("[data-key]").forEach(b=>{b.onpointerdown=()=>vel=b.dataset.key==="left"?-4:4;b.onpointerup=()=>vel=0});
addEventListener("keydown",e=>{if(e.key==="ArrowLeft")vel=-4;if(e.key==="ArrowRight")vel=4;if(e.key==="z")attack("punch");if(e.key==="x")attack("kick");if(e.key==="c")blocking=true});
addEventListener("keyup",e=>{if(["ArrowLeft","ArrowRight"].includes(e.key))vel=0;if(e.key==="c")blocking=false});

function loop(now){
 const dt=Math.min(40,now-last);last=now;
 const me=slot-1; x[me]+=vel*dt/16; x[me]=Math.max(45,Math.min(canvas.clientWidth-45,x[me]));
 if(mode==="ai"){const dir=x[0]<x[1]?-1:1;if(Math.abs(x[0]-x[1])>100)x[1]+=dir*2.2;else if(Math.random()<.035)attackAI()}
 else socket.emit("state",{slot,x:x[me],hp:hp[me]});
 time=Math.max(0,time-dt/1000); $("timer").textContent=Math.ceil(time); $("hp1").style.width=hp[0]+"%";$("hp2").style.width=hp[1]+"%";
 draw(); if(time>0&&hp[0]>0&&hp[1]>0)requestAnimationFrame(loop);else finish();
}
function attackAI(){const target=1;if(Math.abs(x[0]-x[1])<115)hp[target-1]=Math.max(0,hp[target-1]-10)}
function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
 ctx.fillStyle="#202a40";ctx.fillRect(0,h-95,w,95);ctx.fillStyle="#303b58";for(let i=0;i<w;i+=70)ctx.fillRect(i,h-95,2,95);
 fighter(x[0],h-125,"#ffca3a",slot===1);fighter(x[1],h-125,"#5cb7ff",slot===2);
}
function fighter(px,py,c,local){ctx.save();ctx.translate(px,py);ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,-55,22,0,7);ctx.fill();ctx.fillRect(-20,-33,40,55);ctx.fillRect(-26,20,12,45);ctx.fillRect(14,20,12,45);ctx.fillRect(-37,-27,17,10);ctx.fillRect(20,-27,17,10);if(local&&blocking){ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.strokeRect(-31,-38,62,67)}ctx.restore()}
function finish(){let msg=hp[0]===hp[1]?"DRAW":hp[slot-1]>0?"YOU WIN":"YOU LOSE";setTimeout(()=>alert(msg),50)}
