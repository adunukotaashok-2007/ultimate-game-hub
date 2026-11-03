
const games=[
 {id:"snake",name:"Snake",icon:"🐍",category:"Classic",desc:"Eat, grow and beat your high score."},
 {id:"memory",name:"Memory Match",icon:"🧠",category:"Puzzle",desc:"Find matching hidden cards."},
 {id:"tictactoe",name:"Tic Tac Toe",icon:"❌",category:"Multiplayer",desc:"Play against a friend on one device."},
 {id:"2048",name:"2048",icon:"🔢",category:"Puzzle",desc:"Combine numbers to reach 2048."},
 {id:"reaction",name:"Reaction Test",icon:"⚡",category:"Arcade",desc:"Test your reaction speed."},
 {id:"clicker",name:"Coin Clicker",icon:"🪙",category:"Arcade",desc:"Collect coins and beat your record."}
];

let category="All",currentGame="",played=0;
let favorites=JSON.parse(localStorage.favorites||"[]");
let scores=JSON.parse(localStorage.scores||"{}");
let cleanup=null;

const $=id=>document.getElementById(id);

function save(){
 localStorage.favorites=JSON.stringify(favorites);
 localStorage.scores=JSON.stringify(scores);
}

function render(){
 const q=$("search").value.toLowerCase();
 const list=games.filter(g=>
  (category==="All"||g.category===category||
   (category==="Favorites"&&favorites.includes(g.id)))&&
  (g.name+" "+g.desc).toLowerCase().includes(q)
 );

 $("games").innerHTML=list.map(g=>`
 <article class="game-card">
  <div class="game-icon">${g.icon}</div>
  <h3>${g.name}</h3>
  <p>${g.desc}</p>
  <p>🏆 Best: ${scores[g.id]||0}</p>
  <div class="card-actions">
   <button onclick="launch('${g.id}')">PLAY ▶</button>
   <button class="fav" onclick="toggleFav('${g.id}')">
    ${favorites.includes(g.id)?"❤️":"♡"}
   </button>
  </div>
 </article>`).join("")||"<p>No games found.</p>";

 $("totalGames").textContent=games.length;
 $("played").textContent=played;
 $("bestScore").textContent=Math.max(0,...Object.values(scores));
}

function showGames(){
 $("games").scrollIntoView({behavior:"smooth"});
}

$("search").addEventListener("input",render);
$("categories").addEventListener("click",e=>{
 if(!e.target.dataset.category)return;
 category=e.target.dataset.category;
 document.querySelectorAll("nav button").forEach(b=>
  b.classList.toggle("active",b===e.target));
 render();
});

function toggleFav(id){
 favorites.includes(id)?
 favorites=favorites.filter(x=>x!==id):favorites.push(id);
 save();render();
}

$("themeBtn").onclick=()=>{
 document.body.classList.toggle("light");
 $("themeBtn").textContent=
 document.body.classList.contains("light")?"🌙":"☀️";
};

function record(score){
 if(score>=(scores[currentGame]||0)){
  scores[currentGame]=score;
  save();
 }
 render();
}

function launch(id){
 currentGame=id;
 played++;
 $("player").classList.remove("hidden");
 $("gameTitle").textContent=games.find(g=>g.id===id).name;
 runGame();
}

function closeGame(){
 if(cleanup)cleanup();
 cleanup=null;
 $("player").classList.add("hidden");
 $("gameArea").innerHTML="";
 render();
}

function restartGame(){runGame();}

function runGame(){
 if(cleanup)cleanup();
 cleanup=null;
 const area=$("gameArea");
 area.innerHTML="";
 if(currentGame==="snake")snake(area);
 if(currentGame==="memory")memory(area);
 if(currentGame==="tictactoe")ticTacToe(area);
 if(currentGame==="2048")game2048(area);
 if(currentGame==="reaction")reaction(area);
 if(currentGame==="clicker")clicker(area);
}

// 1. SNAKE
function snake(area){
 area.innerHTML=`
 <div class="game-ui">Score: <b id="sScore">0</b>
 <p>Use arrow keys or swipe to move.</p></div>
 <canvas id="snakeCanvas" width="360" height="360"></canvas>
 <div class="game-ui"><button id="snakeRestart">RESTART</button></div>`;

 const c=$("snakeCanvas"),ctx=c.getContext("2d");
 const size=18,cols=20;
 let snake=[{x:10,y:10}],dir={x:1,y:0},food={x:5,y:5};
 let score=0,alive=true,timer;
 function place(){
  do{
   food={x:Math.floor(Math.random()*cols),y:Math.floor(Math.random()*cols)};
  }while(snake.some(p=>p.x===food.x&&p.y===food.y));
 }
 function draw(){
  if(!alive)return;
  let h={x:snake[0].x+dir.x,y:snake[0].y+dir.y};
  if(h.x<0||h.y<0||h.x>=cols||h.y>=cols||
    snake.some(p=>p.x===h.x&&p.y===h.y)){
   alive=false;clearInterval(timer);
   ctx.fillStyle="white";ctx.font="24px Arial";
   ctx.fillText("GAME OVER",105,180);
   record(score);return;
  }
  snake.unshift(h);
  if(h.x===food.x&&h.y===food.y){
   score+=10;$("sScore").textContent=score;place();
  }else snake.pop();

  ctx.fillStyle="#111827";ctx.fillRect(0,0,360,360);
  ctx.fillStyle="#ff5353";
  ctx.fillRect(food.x*size,food.y*size,size-2,size-2);
  snake.forEach((p,i)=>{
   ctx.fillStyle=i?"#48d7a0":"#b8ff76";
   ctx.fillRect(p.x*size,p.y*size,size-2,size-2);
  });
 }
 function change(x,y){
  if(x!==-dir.x||y!==-dir.y)dir={x,y};
 }
 const key=e=>{
  const m={
   ArrowUp:[0,-1],ArrowDown:[0,1],
   ArrowLeft:[-1,0],ArrowRight:[1,0],
   w:[0,-1],s:[0,1],a:[-1,0],d:[1,0]
  };
  if(m[e.key]){
   e.preventDefault();change(...m[e.key]);
  }
 };
 window.addEventListener("keydown",key);
 let sx=0,sy=0;
 const start=e=>{sx=e.offsetX;sy=e.offsetY;};
 const end=e=>{
  let dx=e.offsetX-sx,dy=e.offsetY-sy;
  if(Math.abs(dx)>Math.abs(dy))change(dx>0?1:-1,0);
  else change(0,dy>0?1:-1);
 };
 c.addEventListener("pointerdown",start);
 c.addEventListener("pointerup",end);
 $("snakeRestart").onclick=()=>runGame();
 timer=setInterval(draw,115);
 draw();
 cleanup=()=>{clearInterval(timer);window.removeEventListener("keydown",key);};
}

// 2. MEMORY MATCH
function memory(area){
 const symbols=["🍎","🍋","🍇","🍒","🍉","⭐","💎","🚀"];
 let cards=[...symbols,...symbols].sort(()=>Math.random()-.5);
 let first=null,lock=false,matches=0,moves=0;
 area.innerHTML=`
 <div class="game-ui">Matches: <b id="matches">0</b>/8 |
 Moves: <b id="mMoves">0</b></div>
 <div class="memory-grid" id="memoryGrid"></div>
 <button class="action" id="memoryReset">RESTART</button>`;
 const grid=$("memoryGrid");
 cards.forEach((symbol,i)=>{
  const b=document.createElement("button");
  b.className="memory-card";b.textContent="?";
  b.onclick=()=>{
   if(lock||b.dataset.open||b.dataset.done)return;
   b.textContent=symbol;b.dataset.open="1";
   if(first===null){first={b,symbol};return;}
   moves++;$("mMoves").textContent=moves;
   if(first.symbol===symbol){
    first.b.dataset.done="1";b.dataset.done="1";
    first=null;matches++;
    $("matches").textContent=matches;
    if(matches===8){record(Math.max(0,1000-moves*10));}
   }else{
    lock=true;let old=first;first=null;
    setTimeout(()=>{
     old.b.textContent="?";b.textContent="?";
     delete old.b.dataset.open;delete b.dataset.open;
     lock=false;
    },700);
   }
  };
  grid.appendChild(b);
 });
 $("memoryReset").onclick=()=>runGame();
}

// 3. TIC TAC TOE
function ticTacToe(area){
 let cells=Array(9).fill("");
 let turn="X",over=false;
 area.innerHTML=`
 <div class="game-ui"><b id="ttMessage">Player X's turn</b>
 <p>Two players on the same device.</p></div>
 <div class="ttt" id="ttGrid"></div>
 <button class="action" id="ttReset">NEW GAME</button>`;
 const grid=$("ttGrid");
 function check(){
  const lines=[[0,1,2],[3,4,5],[6,7,8],
   [0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return lines.find(l=>cells[l[0]]&&
   cells[l[0]]===cells[l[1]]&&cells[l[1]]===cells[l[2]]);
 }
 function render(){
  grid.innerHTML="";
  cells.forEach((v,i)=>{
   let b=document.createElement("button");
   b.textContent=v;
   b.onclick=()=>{
    if(over||cells[i])return;
    cells[i]=turn;
    const win=check();
    if(win){
     over=true;$("ttMessage").textContent="🎉 Player "+turn+" wins!";
     record(100);
    }else if(cells.every(Boolean)){
     over=true;$("ttMessage").textContent="It's a draw!";
    }else{
     turn=turn==="X"?"O":"X";
     $("ttMessage").textContent="Player "+turn+"'s turn";
    }
    render();
   };
   grid.appendChild(b);
  });
 }
 $("ttReset").onclick=()=>runGame();
 render();
}

// 4. 2048
function game2048(area){
 let board=Array(16).fill(0),score=0,over=false;
 area.innerHTML=`
 <div class="game-ui">Score: <b id="2048Score">0</b>
 <p>Use arrow keys or swipe to combine matching tiles.</p></div>
 <div id="grid2048" style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;max-width:360px;margin:auto"></div>
 <button class="action" id="reset2048">RESTART</button>`;
 const grid=$("grid2048");
 function add(){
  let empty=board.map((v,i)=>v===0?i:-1).filter(i=>i>=0);
  if(empty.length)board[empty[Math.floor(Math.random()*empty.length)]]=Math.random()<.9?2:4;
 }
 function draw(){
  grid.innerHTML="";
  board.forEach(v=>{
   let b=document.createElement("div");
   b.style.cssText="aspect-ratio:1;display:grid;place-items:center;border-radius:9px;background:"+
    (v?"#6652a5":"#29283b")+";font-size:25px;font-weight:bold";
   b.textContent=v||"";
   grid.appendChild(b);
  });
  $("2048Score").textContent=score;
 }
 function slide(line){
  let a=line.filter(v=>v);
  for(let i=0;i<a.length-1;i++){
   if(a[i]===a[i+1]){a[i]*=2;score+=a[i];a.splice(i+1,1);}
  }
  while(a.length<4)a.push(0);
  return a;
 }
 function move(direction){
  if(over)return;
  let old=board.join(",");
  for(let n=0;n<4;n++){
   let ids=Array.from({length:4},(_,i)=>
    direction===0?n*4+i:direction===1?n*4+3-i:
    direction===2?i*4+n:(3-i)*4+n);
   let line=slide(ids.map(i=>board[i]));
   ids.forEach((id,i)=>board[id]=line[i]);
  }
  if(old!==board.join(",")){add();draw();}
  if(board.includes(2048)){
   over=true;record(score+2048);
  }
 }
 const key=e=>{
  let d={ArrowLeft:0,ArrowRight:1,ArrowUp:2,ArrowDown:3};
  if(d[e.key]!==undefined){e.preventDefault();move(d[e.key]);}
 };
 window.addEventListener("keydown",key);
 $("reset2048").onclick=()=>runGame();
 add();add();draw();
 let sx,sy;
 grid.addEventListener("pointerdown",e=>{sx=e.clientX;sy=e.clientY;});
 grid.addEventListener("pointerup",e=>{
  let dx=e.clientX-sx,dy=e.clientY-sy;
  if(Math.max(Math.abs(dx),Math.abs(dy))<20)return;
  move(Math.abs(dx)>Math.abs(dy)?(dx>0?1:0):(dy>0?3:2));
 });
 cleanup=()=>window.removeEventListener("keydown",key);
}

// 5. REACTION TEST
function reaction(area){
 let state="ready",startTime=0,timer;
 area.innerHTML=`
 <div class="game-ui">
 <h2>⚡ Test Your Reflexes</h2>
 <p id="reactionMessage">Press START and wait for green.</p>
 <div id="reactionBox" style="padding:65px 10px;border-radius:15px;background:#b44a4a;font-size:22px">WAIT FOR GREEN</div>
 <button id="reactionStart">START</button>
 </div>`;
 const box=$("reactionBox"),msg=$("reactionMessage");
 $("reactionStart").onclick=()=>{
  clearTimeout(timer);state="waiting";
  box.style.background="#b44a4a";box.textContent="WAIT...";
  msg.textContent="Wait for the green signal!";
  timer=setTimeout(()=>{
   state="go";startTime=performance.now();
   box.style.background="#229a60";box.textContent="CLICK NOW!";
  },1000+Math.random()*3500);
 };
 box.onclick=()=>{
  if(state==="waiting"){
   clearTimeout(timer);state="ready";
   msg.textContent="Too early! Try again.";
  }else if(state==="go"){
   let ms=Math.round(performance.now()-startTime);
   state="ready";box.textContent=ms+" ms";
   box.style.background="#51438e";
   msg.textContent="Your reaction time!";
   record(Math.max(0,1000-ms));
  }
 };
 cleanup=()=>clearTimeout(timer);
}

// 6. COIN CLICKER
function clicker(area){
 let count=0;
 area.innerHTML=`
 <div class="game-ui">
 <h2>🪙 Coin Collector</h2>
 <p>Coins collected: <b id="coinCount">0</b></p>
 <p>Tap the coin as fast as you can!</p>
 <button id="coinButton" style="font-size:75px;background:#51438e">🪙</button>
 <p id="coinTime">Time: 20 seconds</p>
 <button id="coinStart">START</button>
 </div>`;
 let started=false,remaining=20,timer;
 const btn=$("coinButton");
 btn.onclick=()=>{
  if(!started)return;
  count++;$("coinCount").textContent=count;
 };
 $("coinStart").onclick=()=>{
  if(started)return;
  started=true;count=0;remaining=20;
  $("coinCount").textContent=count;
  timer=setInterval(()=>{
   remaining--;$("coinTime").textContent="Time: "+remaining+" seconds";
   if(remaining<=0){
    clearInterval(timer);started=false;
    $("coinTime").textContent="Finished! Coins: "+count;
    record(count);
   }
  },1000);
 };
 cleanup=()=>clearInterval(timer);
}

render();
