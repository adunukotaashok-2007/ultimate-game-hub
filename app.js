
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const $ = id => document.getElementById(id);
const W = 800, H = 500, MAX_LEVEL = 30;

const games = [
  ["bounce", "🏀", "Bounce Quest", "Jump across platforms and avoid spikes."],
  ["diamond", "💎", "Diamond Rush", "Collect diamonds and find the exit."],
  ["space", "🚀", "Space Impact", "Shoot enemy ships and survive waves."],
  ["maze", "👾", "Maze Chomp", "Collect dots and escape the ghosts."],
  ["brick", "🧱", "Brick Breaker", "Break all the bricks."],
  ["mine", "💣", "Mine Finder", "Reveal safe tiles and avoid mines."],
  ["racer", "🏎️", "Neon Road Racer", "Avoid traffic and survive the road."],
  ["heli", "🚁", "Heli Escape", "Fly through dangerous tunnels."],
  ["bomber", "💥", "Bomber Grid", "Break crates and find the exit."],
  ["tank", "🛡️", "Tank Battle", "Destroy enemy tanks."]
];

let progress = JSON.parse(localStorage.getItem("ughProgress") || "{}");
let current = null;
let level = 1, score = 0, lives = 3;
let running = false, frame = 0;
let keys = {};
let S = {};

function saved(id) {
  return progress[id] || (progress[id] = { best: 0, stars: 0 });
}

function save() {
  localStorage.setItem("ughProgress", JSON.stringify(progress));
  $("stars").textContent =
    Object.values(progress).reduce((a, p) => a + p.stars, 0);
}

function renderGames() {
  const q = $("search").value.toLowerCase();
  $("games").innerHTML = "";

  games.filter(g => g[2].toLowerCase().includes(q)).forEach(g => {
    const p = saved(g[0]);
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="emoji">${g[1]}</div>
      <h3>${g[2]}</h3>
      <p>${g[3]}</p>
      <p>Level ${Math.min(MAX_LEVEL, p.best + 1)} / ${MAX_LEVEL}</p>
      <button>PLAY NOW</button>`;
    card.onclick = () => openGame(g);
    $("games").appendChild(card);
  });
  save();
}

$("search").addEventListener("input", renderGames);

function openGame(g) {
  current = g;
  level = Math.min(MAX_LEVEL, saved(g[0]).best + 1);
  score = 0;
  lives = 3;
  $("gameTitle").textContent = g[2];
  $("instructions").textContent = g[3];
  $("modal").classList.remove("hidden");
  setup();
  overlay("READY!", "Level " + level + " of " + MAX_LEVEL, "START");
}

$("close").onclick = () => {
  running = false;
  cancelAnimationFrame(frame);
  $("modal").classList.add("hidden");
};

function overlay(title, msg, button) {
  $("message").classList.remove("hidden");
  $("messageTitle").textContent = title;
  $("messageText").textContent = msg;
  $("start").textContent = button;
}

function setup() {
  running = false;
  S = { t: 0, bullets: [], enemies: [], objects: [] };

  if (current[0] === "bounce") {
    S.p = { x: 60, y: 400, vy: 0 };
    S.platforms = [
      [0,460,800,40],
      [150,380,120,15],
      [330,300,120,15],
      [510,220,120,15],
      [690,160,90,15]
    ];
    S.goal = [730,110,35,50];
  }

  if (current[0] === "diamond") {
    S.p = { x: 30, y: 30 };
    S.gems = Array.from({length: 3 + Math.floor(level/2)}, (_,i) => ({
      x: 100 + (i*117 + level*23)%620,
      y: 100 + (i*73 + level*31)%300,
      got: false
    }));
    S.exit = [735,430,35,35];
  }

  if (current[0] === "space") {
    S.p = { x: 400, y: 430 };
    S.spawn = 0;
  }

  if (current[0] === "maze") {
    S.p = { x: 1, y: 1 };
    S.grid = Array.from({length:13}, (_,y) =>
      Array.from({length:19}, (_,x) =>
        x===0 || y===0 || x===18 || y===12 ||
        ((x*7+y*11+level*3)%13===0) ? 1 : 0
      )
    );
    S.grid[1][1] = 0;
    S.grid[11][17] = 0;
    S.ghosts = [{x:17,y:1},{x:17,y:11}];
  }

  if (current[0] === "brick") {
    S.paddle = { x: 340, y: 460, w: 120 };
    S.ball = { x: 400, y: 440, vx: 3+level*.1, vy: -4, stuck: true };
    S.bricks = [];
    for (let y=0;y<5+Math.floor(level/6);y++)
      for (let x=0;x<8;x++)
        S.bricks.push({x:55+x*87,y:50+y*27,hp:1+(level>8?1:0)});
  }

  if (current[0] === "mine") {
    S.n = Math.min(12, 6 + Math.floor(level/5));
    S.mines = 4 + level;
    S.cells = Array(S.n*S.n).fill(0).map(() => ({
      mine: false, open: false
    }));
    for(let i=0;i<S.mines;i++) {
      let k;
      do { k=Math.floor(Math.random()*S.cells.length); }
      while(S.cells[k].mine);
      S.cells[k].mine=true;
    }
  }

  if (current[0] === "racer") {
    S.lane = 1;
    S.cars = [];
    S.spawn = 0;
  }

  if (current[0] === "heli") {
    S.p = {x:150,y:250,vy:0};
    S.walls = [];
    S.distance = 0;
    S.spawn = 0;
  }

  if (current[0] === "bomber") {
    S.n=11;
    S.p={x:1,y:1};
    S.grid=Array.from({length:11},(_,y)=>
      Array.from({length:11},(_,x)=>
        x===0||y===0||x===10||y===10||
        (x%2===0&&y%2===0)?1:
        (Math.random()<.35?2:0)
      )
    );
    S.grid[1][1]=0;
    S.grid[1][2]=0;
    S.grid[2][1]=0;
    S.grid[9][9]=0;
    S.bombs=[];
  }

  if (current[0] === "tank") {
    S.p={x:400,y:430};
    S.enemies=Array.from({length:2+Math.floor(level/4)},(_,i)=>({
      x:100+i*100,y:80+(i%2)*60,hp:1+Math.floor(level/10)
    }));
    S.bullets=[];
  }

  updateHUD();
  draw();
}

function updateHUD() {
  $("levelText").textContent = `LEVEL ${level} / ${MAX_LEVEL}`;
  $("score").textContent = "Score: " + score;
  $("lives").textContent = "❤️ " + lives;
}

function start() {
  $("message").classList.add("hidden");
  running = true;
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(loop);
}

$("start").onclick = start;

$("restart").onclick = () => {
  lives = 3;
  setup();
  overlay("READY!", "Level " + level, "START");
};

function loop() {
  if (!running) return;
  update();
  draw();
  frame = requestAnimationFrame(loop);
}

function finishLevel() {
  running = false;
  saved(current[0]).best = Math.max(saved(current[0]).best, level);
  saved(current[0]).stars = Math.max(saved(current[0]).stars, level);
  save();

  if(level >= MAX_LEVEL) {
    overlay("🏆 CHAMPION!", "You completed all 30 levels!", "PLAY AGAIN");
    $("start").onclick = () => {
      level = 1; score = 0; lives = 3;
      $("start").onclick = start;
      setup(); start();
    };
  } else {
    level++;
    setup();
    overlay("LEVEL CLEARED!", "Welcome to level " + level, "NEXT LEVEL");
    $("start").onclick = () => {
      $("start").onclick = start;
      start();
    };
  }
}

function lose(msg) {
  if(!running) return;
  lives--;
  running = false;
  if(lives > 0) {
    setup();
    overlay("TRY AGAIN", msg + " Lives left: " + lives, "CONTINUE");
  } else {
    overlay("GAME OVER", msg, "RETRY LEVEL");
    $("start").onclick = () => {
      lives=3; score=0; setup();
      $("start").onclick=start;
      start();
    };
  }
}

function update() {
  S.t++;
  const speed = 4 + level*.12;
  const left = keys.ArrowLeft, right = keys.ArrowRight;
  const up = keys.ArrowUp, down = keys.ArrowDown;
  const fire = keys.Space;

  switch(current[0]) {
    case "bounce": {
      let p=S.p;
      p.x=Math.max(0,Math.min(770,p.x+(right-left)*5));
      p.vy+=.45;
      p.y+=p.vy;
      p.on=false;
      S.platforms.forEach(a=>{
        if(p.vy>0&&p.x+25>a[0]&&p.x<a[0]+a[2]&&p.y+25>=a[1]&&p.y+25<a[1]+18){
          p.y=a[1]-25;p.vy=0;p.on=true;
        }
      });
      if(fire&&p.on){p.vy=-11;p.on=false;}
      if(p.y>500) return lose("You fell!");
      if(p.x>700&&p.y<160) finishLevel();
      break;
    }

    case "diamond": {
      let p=S.p;
      p.x=Math.max(0,Math.min(775,p.x+(right-left)*speed));
      p.y=Math.max(0,Math.min(475,p.y+(down-up)*speed));
      S.gems.forEach(g=>{
        if(!g.got&&Math.hypot(p.x-g.x,p.y-g.y)<22){
          g.got=true;score+=100;
        }
      });
      if(S.gems.every(g=>g.got)&&p.x>710&&p.y>405)finishLevel();
      break;
    }

    case "space": {
      let p=S.p;
      p.x=Math.max(15,Math.min(785,p.x+(right-left)*6));
      p.y=Math.max(20,Math.min(480,p.y+(down-up)*6));
      if(fire&&S.t%9===0)S.bullets.push({x:p.x,y:p.y,v:9});
      S.bullets.forEach(b=>b.y-=b.v);
      S.spawn++;
      if(S.spawn>Math.max(12,50-level)){
        S.spawn=0;
        S.enemies.push({x:30+Math.random()*740,y:-20,hp:1+Math.floor(level/10)});
      }
      S.enemies.forEach(e=>{
        e.y+=1.5+level*.1;
        S.bullets.forEach(b=>{
          if(!b.dead&&Math.abs(b.x-e.x)<22&&Math.abs(b.y-e.y)<22){
            b.dead=true;e.hp--;score+=20;
          }
        });
        if(Math.hypot(p.x-e.x,p.y-e.y)<25)lose("Enemy collision!");
      });
      S.bullets=S.bullets.filter(b=>!b.dead&&b.y>0);
      S.enemies=S.enemies.filter(e=>e.hp>0&&e.y<510);
      if(score>=level*100+250)finishLevel();
      break;
    }

    case "maze": {
      if(S.t%8===0){
        let p=S.p;
        let dx=right-left,dy=down-up;
        if(S.grid[p.y+dy]?.[p.x+dx]===0){
          p.x+=dx;p.y+=dy;score+=10;
        }
        S.ghosts.forEach(g=>{
          let choices=[[1,0],[-1,0],[0,1],[0,-1]].filter(([x,y])=>S.grid[g.y+y]?.[g.x+x]===0);
          if(choices.length){
            let c=choices[Math.floor(Math.random()*choices.length)];
            g.x+=c[0];g.y+=c[1];
          }
          if(g.x===p.x&&g.y===p.y)lose("A ghost caught you!");
        });
        if(S.grid.flat().every(v=>v!==0))finishLevel();
      }
      break;
    }

    case "brick": {
      let p=S.paddle,b=S.ball;
      p.x=Math.max(0,Math.min(680,p.x+(right-left)*8));
      if(b.stuck){
        b.x=p.x+60;b.y=445;
        if(fire)b.stuck=false;
      } else {
        b.x+=b.vx;b.y+=b.vy;
        if(b.x<8||b.x>792)b.vx*=-1;
        if(b.y<8)b.vy*=-1;
        if(b.y>500)return lose("Ball lost!");
        if(b.y>p.y-12&&b.x>p.x&&b.x<p.x+120&&b.vy>0)b.vy*=-1;
        S.bricks.forEach(br=>{
          if(br.hp>0&&b.x>55+(S.bricks.indexOf(br)%8)*87&&b.x<125+(S.bricks.indexOf(br)%8)*87&&b.y>br.y&&b.y<br.y+20){
            br.hp--;b.vy*=-1;score+=10;
          }
        });
      }
      if(S.bricks.every(b=>b.hp<=0))finishLevel();
      break;
    }

    case "mine": {
      if(S.cells.every(c=>c.open||c.mine))finishLevel();
      break;
    }

    case "racer": {
      if(left&&S.t%7===0)S.lane=Math.max(0,S.lane-1);
      if(right&&S.t%7===0)S.lane=Math.min(2,S.lane+1);
      S.spawn++;
      if(S.spawn>Math.max(14,45-level)){
        S.spawn=0;S.cars.push({lane:Math.floor(Math.random()*3),y:-70});
      }
      S.cars.forEach(c=>c.y+=5+level*.2);
      S.cars.forEach(c=>{
        if(c.lane===S.lane&&c.y>390&&c.y<475)lose("Traffic crash!");
      });
      S.cars=S.cars.filter(c=>c.y<550);
      score++;
      if(S.t>800+level*25)finishLevel();
      break;
    }

    case "heli": {
      let p=S.p;
      p.vy+=(fire||up?-.65:.42);
      p.vy=Math.max(-5,Math.min(6,p.vy));
      p.y+=p.vy;
      S.distance++;
      S.spawn++;
      if(S.spawn>45){
        S.spawn=0;
        S.walls.push({x:800,center:130+Math.random()*240,gap:220-level*2});
      }
      S.walls.forEach(w=>w.x-=4+level*.15);
      S.walls.forEach(w=>{
        if(p.x+15>w.x&&p.x<w.x+60&&(p.y<w.center-w.gap/2||p.y+20>w.center+w.gap/2))
          lose("You hit a wall!");
      });
      S.walls=S.walls.filter(w=>w.x> -70);
      if(p.y<0||p.y>480)lose("You crashed!");
      if(S.distance>500+level*20)finishLevel();
      score=Math.floor(S.distance);
      break;
    }

    case "bomber": {
      if(S.t%8===0){
        let p=S.p,dx=right-left,dy=down-up;
        if(S.grid[p.y+dy]?.[p.x+dx]===0){p.x+=dx;p.y+=dy;}
        if(fire&&!S.bombKey){
          S.bombs.push({x:p.x,y:p.y,t:60});
          S.bombKey=true;
        }
      }
      if(!fire)S.bombKey=false;
      S.bombs.forEach(b=>b.t--);
      S.bombs=S.bombs.filter(b=>{
        if(b.t<=0){
          for(let y=Math.max(1,b.y-2);y<=Math.min(9,b.y+2);y++)
            for(let x=Math.max(1,b.x-2);x<=Math.min(9,b.x+2);x++)
              if(S.grid[y][x]===2){S.grid[y][x]=0;score+=20;}
          return false;
        }
        return true;
      });
      if(S.p.x===9&&S.p.y===9&&S.grid.flat().every(v=>v!==2))finishLevel();
      break;
    }

    case "tank": {
      let p=S.p;
      p.x=Math.max(20,Math.min(780,p.x+(right-left)*4));
      p.y=Math.max(20,Math.min(480,p.y+(down-up)*4));
      if(fire&&S.t%12===0)S.bullets.push({x:p.x,y:p.y,vx:0,vy:-8});
      S.bullets.forEach(b=>b.y+=b.vy);
      S.bullets.forEach(b=>S.enemies.forEach(e=>{
        if(e.hp>0&&Math.hypot(e.x-b.x,e.y-b.y)<23){e.hp--;b.dead=true;score+=30;}
      }));
      S.bullets=S.bullets.filter(b=>!b.dead&&b.y>0);
      S.enemies=S.enemies.filter(e=>e.hp>0);
      if(!S.enemies.length)finishLevel();
      break;
    }
  }
  updateHUD();
}

function box(x,y,w,h,color){
  ctx.fillStyle=color;ctx.fillRect(x,y,w,h);
}
function dot(x,y,r,color){
  ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
}

function draw() {
  ctx.clearRect(0,0,W,H);
  box(0,0,W,H,"#071020");

  switch(current[0]) {
    case "bounce":
      S.platforms.forEach(p=>box(...p,"#43e8dc"));
      box(...S.goal,"#a58aff");
      dot(S.p.x+12,S.p.y+12,13,"#ffe36b");
      break;

    case "diamond":
      S.gems.forEach(g=>{if(!g.got)dot(g.x,g.y,10,"#43e8ed")});
      box(...S.exit,"#a58aff");
      box(S.p.x,S.p.y,25,25,"#ffe36b");
      break;

    case "space":
      S.bullets.forEach(b=>dot(b.x,b.y,5,"#43e8ed"));
      S.enemies.forEach(e=>dot(e.x,e.y,17,"#ff5379"));
      dot(S.p.x,S.p.y,18,"#ffe36b");
      break;

    case "maze": {
      let cw=W/19,ch=H/13;
      S.grid.forEach((row,y)=>row.forEach((v,x)=>{
        if(v===1)box(x*cw,y*ch,cw-2,ch-2,"#344caa");
        else if(v===0)dot(x*cw+cw/2,y*ch+ch/2,2,"white");
      }));
      dot(S.p.x*cw+cw/2,S.p.y*ch+ch/2,10,"#ffe36b");
      S.ghosts.forEach(g=>dot(g.x*cw+cw/2,g.y*ch+ch/2,10,"#ff5379"));
      break;
    }

    case "brick":
      S.bricks.forEach((b,i)=>{if(b.hp>0)box(55+(i%8)*87,b.y,76,18,b.hp>1?"#ff8957":"#917bff")});
      box(S.paddle.x,S.paddle.y,120,14,"#43e8dc");
      dot(S.ball.x,S.ball.y,9,"#ffe36b");
      break;

    case "mine": {
      let size=Math.min(55,400/S.n);
      let ox=(W-size*S.n)/2;
      let oy=(H-size*S.n)/2;
      S.cells.forEach((c,i)=>{
        let x=i%S.n,y=Math.floor(i/S.n);
        box(ox+x*size+2,oy+y*size+2,size-4,size-4,c.open?(c.mine?"#d94c69":"#293a5a"):"#536990");
        if(c.open&&c.mine){
          ctx.fillStyle="white";ctx.fillText("✹",ox+x*size+size/2-5,oy+y*size+size/2+5);
        }
      });
      break;
    }

    case "racer":
      box(220,0,360,H,"#203047");
      for(let y=0;y<H;y+=70)box(395,y,8,35,"white");
      S.cars.forEach(c=>box(285+c.lane*115,c.y,45,65,"#ff5379"));
      box(285+S.lane*115,410,45,70,"#43e8dc");
      break;

    case "heli":
      S.walls.forEach(w=>{
        box(w.x,0,60,w.center-w.gap/2,"#9372ff");
        box(w.x,w.center+w.gap/2,60,H,"#9372ff");
      });
      dot(S.p.x,S.p.y,14,"#ffe36b");
      break;

    case "bomber": {
      let size=H/11;
      S.grid.forEach((row,y)=>row.forEach((v,x)=>{
        if(v===1)box(x*size,y*size,size-2,size-2,"#53617e");
        if(v===2)box(x*size,y*size,size-2,size-2,"#a56b49");
      }));
      box(9*size,9*size,size-2,size-2,"#43e8dc");
      dot(S.p.x*size+size/2,S.p.y*size+size/2,12,"#ffe36b");
      break;
    }

    case "tank":
      S.enemies.forEach(e=>dot(e.x,e.y,18,"#ff5379"));
      S.bullets.forEach(b=>dot(b.x,b.y,6,"#ffe36b"));
      dot(S.p.x,S.p.y,18,"#43e8dc");
      break;
  }
}

canvas.addEventListener("pointerdown",e=>{
  if(!current||current[0]!=="mine")return;
  let r=canvas.getBoundingClientRect();
  let size=Math.min(55,400/S.n);
  let ox=(W-size*S.n)/2,oy=(H-size*S.n)/2;
  let x=Math.floor(((e.clientX-r.left)*W/r.width-ox)/size);
  let y=Math.floor(((e.clientY-r.top)*H/r.height-oy)/size);
  if(x<0||y<0||x>=S.n||y>=S.n)return;
  let c=S.cells[y*S.n+x];
  if(c.open)return;
  c.open=true;
  if(c.mine){
    draw();
    lose("You uncovered a mine!");
    return;
  }
  score+=10;
  if(S.cells.every(c=>c.open||c.mine))finishLevel();
  draw();
});

window.addEventListener("keydown",e=>{
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key))e.preventDefault();
  keys[e.code==="Space"?"Space":e.key]=true;
});
window.addEventListener("keyup",e=>{
  keys[e.code==="Space"?"Space":e.key]=false;
});

document.querySelectorAll(".controls button").forEach(b=>{
  const k=b.dataset.key;
  b.addEventListener("pointerdown",e=>{e.preventDefault();keys[k]=true;});
  ["pointerup","pointerleave","pointercancel"].forEach(ev=>
    b.addEventListener(ev,()=>keys[k]=false)
  );
});

save();
renderGames();
