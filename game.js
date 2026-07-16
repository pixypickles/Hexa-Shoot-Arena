(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const menu = document.getElementById("menu");
  const gameWrap = document.getElementById("gameWrap");
  const startBtn = document.getElementById("startBtn");
  const playerTeamSelect = document.getElementById("playerTeam");
  const cpuTeamSelect = document.getElementById("cpuTeam");
  const difficultySelect = document.getElementById("difficulty");
  const matchTimeSelect = document.getElementById("matchTime");
  const specialShotSelect = document.getElementById("specialShot");

  const W = canvas.width;
  const H = canvas.height;
  const COURT = {
    cx: W / 2, cy: H / 2,
    top: 84, bottom: 636,
    left: 170, right: 1110,
    shoulder: 170,
    goalWidth: 250,
    curveDepth: 28,
    curveSegments: 8,
    ridgeHalfWidth: 22,
    ridgeVisualHeight: 15
  };

  const teams = [
    { name:"BLIZZARD FOX", primary:"#ffffff", secondary:"#101010", shorts:"#101010", pattern:"vertical", accent:"#6edbff" },
    { name:"SALVIDA A", primary:"#7f1f3b", secondary:"#7f1f3b", shorts:"#ffffff", pattern:"solid" },
    { name:"SALVIDA B", primary:"#20b7ad", secondary:"#20b7ad", shorts:"#ffffff", pattern:"solid" },
    { name:"TAKE-ZO", primary:"#ff5ca8", secondary:"#17284f", shorts:"#ffffff", pattern:"horizontal" },
    { name:"漫チェスターP", primary:"#071a36", secondary:"#071a36", shorts:"#071a36", pattern:"solid" }
  ];

  for (const [i,t] of teams.entries()) {
    const o1 = new Option(t.name, i);
    const o2 = new Option(t.name, i);
    playerTeamSelect.add(o1);
    cpuTeamSelect.add(o2);
  }
  cpuTeamSelect.value = "1";

  const state = {
    running:false,
    last:0,
    remaining:60,
    score:[0,0],
    settings:null,
    controlled:0,
    keys:{},
    keyboardMove:{x:0,y:0},
    touchMove:{x:0,y:0},
    move:{x:0,y:0},
    sixSecond:6,
    possessionTeam:null,
    possessionPlayer:null,
    lastPossessionTeam:null,
    ball:{
      x:W/2,y:H/2,vx:0,vy:0,r:14,visualR:17,
      airborne:false,height:0,vz:0,
      noPickupUntil:0, lastTouch:null,
      curve:0, stealth:0, breakShot:false,
      previousY:H/2, ridgeCooldown:0
    },
    players:[],
    walls:[]
  };

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const len=(x,y)=>Math.hypot(x,y);
  const norm=(x,y)=>{ const l=len(x,y)||1; return {x:x/l,y:y/l}; };
  const dot=(ax,ay,bx,by)=>ax*bx+ay*by;

  function makeWalls(){
    const c={x:COURT.cx,y:COURT.cy};
    const pts=[
      {x:COURT.left+COURT.shoulder,y:COURT.top},
      {x:COURT.left,y:COURT.cy-160},
      {x:COURT.left,y:COURT.cy+160},
      {x:COURT.left+COURT.shoulder,y:COURT.bottom},
      {x:COURT.right-COURT.shoulder,y:COURT.bottom},
      {x:COURT.right,y:COURT.cy+160},
      {x:COURT.right,y:COURT.cy-160},
      {x:COURT.right-COURT.shoulder,y:COURT.top}
    ];
    const walls=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[i], b=pts[(i+1)%pts.length];
      // top/bottom central opening for goals
      if ((i===7 || i===3)) continue;
      walls.push(segment(a,b,c));
    }

    const half=COURT.goalWidth/2;
    function addCurve(top,left){
      const y=top?COURT.top:COURT.bottom;
      const startX=left ? COURT.left+COURT.shoulder : COURT.right-COURT.shoulder;
      const goalX=COURT.cx+(left?-half:half);
      const bendY=y+(top?COURT.curveDepth:-COURT.curveDepth);
      const controlX=startX+(goalX-startX)*0.56;
      let prev={x:startX,y};
      for(let i=1;i<=COURT.curveSegments;i++){
        const t=i/COURT.curveSegments,u=1-t;
        const p={
          x:u*u*startX+2*u*t*controlX+t*t*goalX,
          y:u*u*y+2*u*t*bendY+t*t*y
        };
        walls.push(segment(prev,p,c));
        prev=p;
      }
    }
    addCurve(true,true); addCurve(true,false);
    addCurve(false,true); addCurve(false,false);
    state.walls=walls;
  }

  function segment(a,b,inside){
    const tx=b.x-a.x, ty=b.y-a.y, l=Math.hypot(tx,ty)||1;
    let nx=-ty/l, ny=tx/l;
    const mx=(a.x+b.x)/2,my=(a.y+b.y)/2;
    if(dot(nx,ny,inside.x-mx,inside.y-my)<0){ nx*=-1; ny*=-1; }
    return {a:{...a},b:{...b},nx,ny};
  }

  function newPlayer(team,role,side,x,y){
    return {team,role,side,x,y,vx:0,vy:0,r:25,homeX:x,homeY:y,hasBall:false};
  }

  function resetMatch(){
    const pTeam=+playerTeamSelect.value;
    let cTeam=+cpuTeamSelect.value;
    if(cTeam===pTeam) cTeam=(cTeam+1)%teams.length;
    state.settings={
      pTeam,cTeam,
      difficulty:difficultySelect.value,
      special:specialShotSelect.value
    };
    state.remaining=+matchTimeSelect.value;
    state.score=[0,0];
    state.controlled=0;
    state.sixSecond=6;
    state.possessionTeam=null;
    state.possessionPlayer=null;
    state.lastPossessionTeam=null;
    state.players=[
      newPlayer(pTeam,"field","bottom",W/2,H*0.61),
      newPlayer(pTeam,"keeper","bottom",W/2,H*0.80),
      newPlayer(cTeam,"field","top",W/2,H*0.39),
      newPlayer(cTeam,"keeper","top",W/2,H*0.20)
    ];
    resetBall();
    makeWalls();
  }

  function resetBall(){
    Object.assign(state.ball,{
      x:W/2,y:H/2,vx:0,vy:0,
      airborne:false,height:0,vz:0,
      noPickupUntil:performance.now()+500,
      lastTouch:null,curve:0,stealth:0,breakShot:false,
      previousY:H/2,ridgeCooldown:0
    });
    state.possessionTeam=null;
    state.possessionPlayer=null;
    state.sixSecond=6;
  }

  function teamOfPlayerIndex(i){ return i<2?0:1; }
  function otherMateIndex(i){
    if(i===0)return 1;if(i===1)return 0;if(i===2)return 3;return 2;
  }

  function closestPoint(px,py,a,b){
    const abx=b.x-a.x, aby=b.y-a.y;
    const d=abx*abx+aby*aby||1;
    const t=clamp(((px-a.x)*abx+(py-a.y)*aby)/d,0,1);
    return {x:a.x+abx*t,y:a.y+aby*t};
  }

  function holdBall(i){
    state.possessionPlayer=i;
    state.possessionTeam=teamOfPlayerIndex(i);

    // 自チームが確保したボールは、その選手へ自動で操作を切り替える。
    // キーパーが捕球した直後でも、A/Bでそのままパスできる。
    if(state.possessionTeam===0){
      state.controlled=i;
    }
    if(state.lastPossessionTeam!==state.possessionTeam){
      state.sixSecond=6;
      state.lastPossessionTeam=state.possessionTeam;
    }
    const p=state.players[i], dir=p.side==="bottom"?-1:1;
    state.ball.x=p.x;
    state.ball.y=p.y+dir*34;
    state.ball.vx=state.ball.vy=0;
    state.ball.airborne=false;
    state.ball.height=0;
    state.ball.lastTouch=i;
  }

  function releaseBall(){
    state.possessionPlayer=null;
    state.possessionTeam=null;
  }

  function pass(lob){
    const i=state.controlled;
    if(state.possessionPlayer!==i) return;
    const targetI=otherMateIndex(i);
    const target=state.players[targetI];
    const b=state.ball;
    const d=norm(target.x-b.x,target.y-b.y);
    releaseBall();
    b.vx=d.x*(lob?430:610);
    b.vy=d.y*(lob?430:610);
    b.airborne=lob;
    b.height=lob?18:0;
    b.vz=lob?360:0;
    b.noPickupUntil=performance.now()+260;
    b.lastTouch=i;
    state.controlled=targetI;
  }

  function shoot(curved=false, power=1){
    const i=state.controlled;
    if(state.possessionPlayer!==i) return;
    const p=state.players[i];
    const targetY=p.side==="bottom"?COURT.top-18:COURT.bottom+18;
    const aimX=COURT.cx + state.move.x*140;
    const d=norm(aimX-state.ball.x,targetY-state.ball.y);
    releaseBall();
    state.ball.vx=d.x*(820*power);
    state.ball.vy=d.y*(820*power);
    state.ball.curve=curved ? (state.move.x===0?0.32:Math.sign(state.move.x)*0.32) : 0;
    state.ball.noPickupUntil=performance.now()+180;
    state.ball.lastTouch=i;
  }

  function startGame(){
    resetMatch();
    menu.classList.add("hidden");
    gameWrap.classList.remove("hidden");
    state.running=true;
    state.last=performance.now();
    requestAnimationFrame(loop);
  }

  function loop(now){
    if(!state.running) return;
    const dt=Math.min(0.033,(now-state.last)/1000);
    state.last=now;
    update(dt,now);
    draw();
    requestAnimationFrame(loop);
  }

  let clockAcc=0;
  function update(dt,now){
    clockAcc+=dt;
    if(clockAcc>=1){
      clockAcc-=1;
      state.remaining=Math.max(0,state.remaining-1);
      if(state.possessionTeam!==null){
        state.sixSecond-=1;
        if(state.sixSecond<=0){
          turnover(state.possessionTeam===0?1:0);
        }
      }
      if(state.remaining<=0){ state.running=false; draw(); setTimeout(()=>location.reload(),1600); return; }
    }

    updateHuman(dt);
    updateCPU(dt);
    updateKeepers(dt);
    updateBall(dt,now);
    updatePossession(now);
    constrainPlayers();
    checkGoals();
  }

  function turnover(team){
    const target=team===0?0:2;
    holdBall(target);
    state.sixSecond=6;
  }

  function updateHuman(dt){
    const combinedX=state.keyboardMove.x+state.touchMove.x;
    const combinedY=state.keyboardMove.y+state.touchMove.y;
    const combinedLength=Math.hypot(combinedX,combinedY);
    state.move=combinedLength>1
      ? {x:combinedX/combinedLength,y:combinedY/combinedLength}
      : {x:combinedX,y:combinedY};

    const p=state.players[state.controlled];
    const m=state.move;
    const speed=350;
    p.vx=m.x*speed;p.vy=m.y*speed;
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(state.possessionPlayer===state.controlled) holdBall(state.controlled);
  }

  function updateCPU(dt){
    const f=state.players[2];
    const b=state.ball;
    let tx=b.x,ty=Math.min(b.y,COURT.cy-35);
    if(state.possessionPlayer===2){
      ty=COURT.cy-42;
      tx=COURT.cx + Math.sin(performance.now()/650)*150;
      if(state.sixSecond<=2.2 || Math.random()<dt*0.5){
        const d=norm(COURT.cx-b.x,COURT.bottom+10-b.y);
        releaseBall();
        b.vx=d.x*760;b.vy=d.y*760;b.lastTouch=2;b.noPickupUntil=performance.now()+180;
      }
    }
    const d=norm(tx-f.x,ty-f.y);
    const mult=state.settings.difficulty==="easy"?0.72:state.settings.difficulty==="hard"?1.06:0.88;
    f.x+=d.x*310*mult*dt;f.y+=d.y*310*mult*dt;
    if(state.possessionPlayer===2) holdBall(2);
  }

  function updateKeepers(dt){
    for(const i of [1,3]){
      if(i===state.controlled) continue;
      const p=state.players[i];
      const targetX=clamp(state.ball.x,COURT.cx-90,COURT.cx+90);
      const dx=targetX-p.x,dy=p.homeY-p.y,d=Math.hypot(dx,dy);
      if(d>3){ p.x+=dx/d*410*dt;p.y+=dy/d*410*dt; }
      if(state.possessionPlayer===i) holdBall(i);
    }
  }

  function updateBall(dt,now){
    const b=state.ball;
    if(state.possessionPlayer!==null){
      b.previousY=b.y;
      return;
    }

    b.ridgeCooldown=Math.max(0,b.ridgeCooldown-dt);
    const beforeMoveY=b.y;

    if(b.curve!==0){
      const speed=Math.hypot(b.vx,b.vy);
      if(speed>40){
        const nx=-b.vy/speed, ny=b.vx/speed;
        b.vx+=nx*b.curve*220*dt;
        b.vy+=ny*b.curve*220*dt;
        b.curve*=Math.pow(0.30,dt);
      }
    }

    if(b.airborne){
      b.height+=b.vz*dt;
      b.vz-=760*dt;
      if(b.height<=0){
        b.height=0;b.vz=0;b.airborne=false;
        b.vx*=0.78;b.vy*=0.78;
      }
    }

    b.x+=b.vx*dt;b.y+=b.vy*dt;
    resolveCenterRidge(beforeMoveY);

    const damping=Math.pow(0.31,dt);
    b.vx*=damping;b.vy*=damping;
    if(Math.hypot(b.vx,b.vy)<28){ b.vx=0;b.vy=0; }

    resolveWalls();
    b.stealth=Math.max(0,b.stealth-dt);

    if(now>b.noPickupUntil){
      for(let i=0;i<state.players.length;i++){
        const p=state.players[i];
        const dist=Math.hypot(b.x-p.x,b.y-p.y);
        if(dist<p.r+b.r+8){
          if(b.airborne && b.height>14){
            // 強引なボレー
            const targetY=p.side==="bottom"?COURT.top-18:COURT.bottom+18;
            const d=norm(COURT.cx-b.x,targetY-b.y);
            b.vx=d.x*760;b.vy=d.y*760;b.vz=80;b.height=Math.max(8,b.height*0.35);
            b.lastTouch=i;b.noPickupUntil=now+220;
          }else if(Math.hypot(b.vx,b.vy)<250){
            holdBall(i);
          }else{
            // 人に当たった強い球は横へ弱くこぼれる
            const s=Math.hypot(b.vx,b.vy);
            const n=norm(b.vx,b.vy);
            const side=(Math.random()<.5?-1:1);
            const ang=side*Math.PI/5;
            const rx=n.x*Math.cos(ang)-n.y*Math.sin(ang);
            const ry=n.x*Math.sin(ang)+n.y*Math.cos(ang);
            b.vx=rx*s*0.23;b.vy=ry*s*0.23;
            b.noPickupUntil=now+120;
          }
          break;
        }
      }
    }

    b.previousY=b.y;
  }

  function resolveCenterRidge(previousY){
    const b=state.ball;
    const ridgeTop=COURT.cy-COURT.ridgeHalfWidth;
    const ridgeBottom=COURT.cy+COURT.ridgeHalfWidth;
    const crossedFromBottom=previousY>ridgeBottom && b.y<=ridgeBottom;
    const crossedFromTop=previousY<ridgeTop && b.y>=ridgeTop;
    const insideRidge=b.y>=ridgeTop && b.y<=ridgeBottom;

    if(!insideRidge || b.ridgeCooldown>0) return;

    const speed=Math.hypot(b.vx,b.vy);
    if(speed<18) return;

    // 十分高い浮き球は坂をそのまま越える。
    if(b.airborne && b.height>COURT.ridgeVisualHeight+8) return;

    if(crossedFromBottom || crossedFromTop || (!b.airborne && b.height<4)){
      const travelDirection=Math.sign(b.vy) || (b.y<COURT.cy ? 1 : -1);

      // 低い球は膝ほどの坂に当たり、前へ抜けながら上へ跳ねる。
      b.airborne=true;
      b.height=Math.max(b.height,5);
      b.vz=clamp(150+speed*0.30,190,390);
      b.vx*=0.88;
      b.vy=travelDirection*Math.max(Math.abs(b.vy)*0.78,115);

      // 頂点で止まらないよう進行方向側へ押し出す。
      b.y=COURT.cy+travelDirection*(COURT.ridgeHalfWidth+1);
      b.ridgeCooldown=0.28;
    }
  }

  function resolveWalls(){
    const b=state.ball;
    for(const w of state.walls){
      const q=closestPoint(b.x,b.y,w.a,w.b);
      const dx=b.x-q.x,dy=b.y-q.y,d=Math.hypot(dx,dy);
      if(d>=b.r) continue;
      const toward=b.vx*w.nx+b.vy*w.ny;
      if(toward>=0) continue;
      const pen=b.r-d+0.6;
      b.x+=w.nx*pen;b.y+=w.ny*pen;
      const k=2*toward;
      b.vx=(b.vx-k*w.nx)*0.80;
      b.vy=(b.vy-k*w.ny)*0.80;
      b.curve*=0.35;
    }
  }

  function updatePossession(now){
    if(state.possessionPlayer!==null) return;
    const b=state.ball;
    if(now<b.noPickupUntil) return;
    if(Math.hypot(b.vx,b.vy)>250) return;
    for(let i=0;i<state.players.length;i++){
      const p=state.players[i];
      if(Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r+4){ holdBall(i); break; }
    }
  }

  function constrainPlayers(){
    for(const p of state.players){
      p.x=clamp(p.x,COURT.left+p.r,COURT.right-p.r);
      if(p.side==="bottom") p.y=clamp(p.y,COURT.cy+p.r,COURT.bottom-p.r);
      else p.y=clamp(p.y,COURT.top+p.r,COURT.cy-p.r);
    }
  }

  function checkGoals(){
    const b=state.ball,half=COURT.goalWidth/2;
    if(Math.abs(b.x-COURT.cx)<half-b.r){
      if(b.y<COURT.top-8){ state.score[0]++; resetBall(); }
      else if(b.y>COURT.bottom+8){ state.score[1]++; resetBall(); }
    }
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    const grad=ctx.createRadialGradient(W/2,H/2,30,W/2,H/2,700);
    grad.addColorStop(0,"#123a4d");grad.addColorStop(1,"#06101c");
    ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);

    drawCourt();
    drawPlayers();
    drawBall();
    drawHUD();

    if(!state.running && state.remaining<=0){
      ctx.fillStyle="rgba(3,10,18,.88)";
      ctx.fillRect(W/2-250,H/2-100,500,200);
      ctx.strokeStyle="#75eadc";ctx.lineWidth=4;ctx.strokeRect(W/2-250,H/2-100,500,200);
      const result=state.score[0]===state.score[1]?"DRAW":state.score[0]>state.score[1]?"YOU WIN":"CPU WIN";
      ctx.fillStyle="#fff";ctx.font="900 58px system-ui";ctx.textAlign="center";ctx.fillText(result,W/2,H/2);
      ctx.font="22px system-ui";ctx.fillStyle="#b9e4df";ctx.fillText("再読み込みで再戦",W/2,H/2+55);
    }
  }

  function drawCourt(){
    const g=ctx;
    g.save();
    g.fillStyle="#155044";
    g.strokeStyle="#8ce9dc";
    g.lineWidth=7;
    g.beginPath();
    g.moveTo(COURT.left+COURT.shoulder,COURT.top);
    g.lineTo(COURT.left,COURT.cy-160);
    g.lineTo(COURT.left,COURT.cy+160);
    g.lineTo(COURT.left+COURT.shoulder,COURT.bottom);
    g.lineTo(COURT.right-COURT.shoulder,COURT.bottom);
    g.lineTo(COURT.right,COURT.cy+160);
    g.lineTo(COURT.right,COURT.cy-160);
    g.lineTo(COURT.right-COURT.shoulder,COURT.top);
    g.closePath();g.fill();g.stroke();

    g.strokeStyle="rgba(170,230,223,.65)";g.lineWidth=3;
    g.beginPath();g.moveTo(COURT.left,COURT.cy);g.lineTo(COURT.right,COURT.cy);g.stroke();
    g.beginPath();g.arc(COURT.cx,COURT.cy,70,0,Math.PI*2);g.stroke();


    // センターリッジ：横から見ると頂点を丸めた低い三角形の坂。
    const ridgeGradient=g.createLinearGradient(0,COURT.cy-COURT.ridgeHalfWidth,0,COURT.cy+COURT.ridgeHalfWidth);
    ridgeGradient.addColorStop(0,"rgba(112,235,220,.08)");
    ridgeGradient.addColorStop(.48,"rgba(185,255,242,.48)");
    ridgeGradient.addColorStop(.52,"rgba(185,255,242,.48)");
    ridgeGradient.addColorStop(1,"rgba(112,235,220,.08)");
    g.fillStyle=ridgeGradient;
    g.fillRect(COURT.left,COURT.cy-COURT.ridgeHalfWidth,COURT.right-COURT.left,COURT.ridgeHalfWidth*2);
    g.strokeStyle="rgba(205,255,247,.72)";
    g.lineWidth=2;
    g.beginPath();
    g.moveTo(COURT.left,COURT.cy-COURT.ridgeHalfWidth);
    g.lineTo(COURT.right,COURT.cy-COURT.ridgeHalfWidth);
    g.moveTo(COURT.left,COURT.cy+COURT.ridgeHalfWidth);
    g.lineTo(COURT.right,COURT.cy+COURT.ridgeHalfWidth);
    g.stroke();

    // ゴール横カーブ壁：六角形の肩からゴールポストへつながる、緩い内向きガイド壁
    const half=COURT.goalWidth/2;
    g.strokeStyle="#8ce9dc";g.lineWidth=7;
    for(const top of [true,false]){
      const y=top?COURT.top:COURT.bottom,dir=top?1:-1;
      for(const side of [-1,1]){
        const startX=side<0 ? COURT.left+COURT.shoulder : COURT.right-COURT.shoulder;
        const goalX=COURT.cx+side*half;
        const controlX=startX+(goalX-startX)*0.56;
        g.beginPath();g.moveTo(startX,y);
        g.quadraticCurveTo(controlX,y+dir*COURT.curveDepth,goalX,y);
        g.stroke();
      }
    }

    g.strokeStyle="#fff";g.lineWidth=7;
    for(const top of [true,false]){
      const y=top?COURT.top:COURT.bottom;
      const yd=top?y-36:y+36;
      g.beginPath();
      g.moveTo(COURT.cx-half,y);g.lineTo(COURT.cx-half,yd);
      g.moveTo(COURT.cx+half,y);g.lineTo(COURT.cx+half,yd);
      g.stroke();
    }
    g.restore();
  }

  function drawPlayers(){
    for(let i=0;i<state.players.length;i++){
      const p=state.players[i],t=teams[p.team];
      ctx.save();ctx.translate(p.x,p.y);
      ctx.beginPath();ctx.arc(0,0,p.r,0,Math.PI*2);ctx.fillStyle=t.primary;ctx.fill();
      if(t.pattern!=="solid"){
        ctx.save();ctx.beginPath();ctx.arc(0,0,p.r-2,0,Math.PI*2);ctx.clip();
        ctx.fillStyle=t.secondary;
        if(t.pattern==="vertical"){ for(let x=-20;x<=20;x+=16)ctx.fillRect(x,-30,8,60); }
        else { for(let y=-20;y<=20;y+=16)ctx.fillRect(-30,y,60,8); }
        ctx.restore();
      }
      ctx.lineWidth=i===state.controlled?6:4;
      ctx.strokeStyle=i===state.controlled?"#70ffe9":p.role==="keeper"?"#ffdd6d":"#fff";
      ctx.stroke();
      ctx.fillStyle="#08111d";ctx.font="900 17px system-ui";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(p.role==="keeper"?"K":"F",0,1);
      ctx.restore();
    }
  }

  function drawBall(){
    const b=state.ball;
    if(b.stealth>0){
      ctx.fillStyle="rgba(0,0,0,.35)";
      ctx.beginPath();ctx.ellipse(b.x,b.y+8,b.visualR*1.3,b.visualR*.45,0,0,Math.PI*2);ctx.fill();
      return;
    }
    const y=b.y-b.height*.18;
    ctx.fillStyle="rgba(0,0,0,.32)";
    ctx.beginPath();ctx.ellipse(b.x,b.y+8,b.visualR*1.25,b.visualR*.45,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#fff";ctx.strokeStyle="#111927";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(b.x,y,b.visualR,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle="#111927";
    ctx.beginPath();ctx.arc(b.x-5,y-5,4,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(b.x+6,y+3,3,0,Math.PI*2);ctx.fill();
  }

  function drawHUD(){
    ctx.textAlign="center";ctx.fillStyle="#fff";ctx.font="900 38px system-ui";
    ctx.fillText(`${state.score[0]}  -  ${state.score[1]}`,W/2,40);
    ctx.font="700 20px system-ui";ctx.fillStyle="#b8e6e0";
    ctx.fillText(`${state.remaining} SEC`,W/2,70);

    if(state.possessionTeam!==null){
      ctx.fillStyle=state.sixSecond<=2?"#ff8a8a":"#ffe79a";
      ctx.font="900 21px system-ui";
      ctx.fillText(`6秒ルール: ${Math.max(0,state.sixSecond)}秒`,W/2,101);
    }
  }

  // keyboard
  addEventListener("keydown",e=>{
    state.keys[e.code]=true;
    if(e.code==="KeyL"){
      state.controlled=state.controlled===0?1:0;
    }else if(e.code==="KeyJ"){
      pass(false);
    }else if(e.code==="KeyK"){
      shoot(false,1);
    }
  });
  addEventListener("keyup",e=>state.keys[e.code]=false);

  function updateKeyboardMove(){
    let x=0,y=0;
    if(state.keys.KeyA)x--;if(state.keys.KeyD)x++;
    if(state.keys.KeyW)y--;if(state.keys.KeyS)y++;
    const n=norm(x,y);
    state.keyboardMove=(x||y)?n:{x:0,y:0};
    requestAnimationFrame(updateKeyboardMove);
  }
  updateKeyboardMove();

  // virtual stick
  const stick=document.getElementById("stick"), knob=document.getElementById("stickKnob");
  let stickPointer=null;
  function setStick(e){
    const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;
    let dx=e.clientX-cx,dy=e.clientY-cy;
    const max=r.width*.35,l=Math.hypot(dx,dy);
    if(l>max){dx=dx/l*max;dy=dy/l*max;}
    knob.style.transform=`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
    state.touchMove={x:dx/max,y:dy/max};
  }
  stick.addEventListener("pointerdown",e=>{
    e.preventDefault();
    stickPointer=e.pointerId;
    stick.setPointerCapture(e.pointerId);
    setStick(e);
  });
  stick.addEventListener("pointermove",e=>{
    if(e.pointerId===stickPointer){
      e.preventDefault();
      setStick(e);
    }
  });
  function endStick(e){
    if(e.pointerId!==stickPointer)return;
    stickPointer=null;state.touchMove={x:0,y:0};
    knob.style.transform="translate(-50%,-50%)";
  }
  stick.addEventListener("pointerup",endStick);stick.addEventListener("pointercancel",endStick);

  document.querySelectorAll(".action").forEach(btn=>{
    btn.addEventListener("pointerdown",()=>{
      const a=btn.dataset.action;
      if(a==="passGround")pass(false);
      if(a==="passLob")pass(true);
      if(a==="shootStraight")shoot(false,1);
      if(a==="shootCurve")shoot(true,1);
    });
  });

  startBtn.addEventListener("click",startGame);
})();
