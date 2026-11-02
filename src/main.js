/* Self-contained WebGL renderer. No imports, frameworks, CDN, or server-side code. */
(() => {
"use strict";
const canvas=document.createElement("canvas");canvas.id="game-canvas";document.querySelector("#game-root").prepend(canvas);
const gl=canvas.getContext("webgl",{antialias:true,alpha:false});
if(!gl){document.querySelector("#objective").textContent="WebGL не поддерживается этим браузером";return;}
const vs=`attribute vec3 aPosition; uniform mat4 uMvp; uniform mat4 uModel; varying vec3 vNormal; void main(){vec3 p=aPosition; vNormal=normalize(mat3(uModel)*p); gl_Position=uMvp*vec4(p,1.0);}`;
const fs=`precision mediump float; uniform vec3 uColor; varying vec3 vNormal; void main(){vec3 n=normalize(vNormal);float light=.38+.62*max(dot(n,normalize(vec3(-.4,.85,.3))),0.0);gl_FragColor=vec4(uColor*light,1.0);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const posLoc=gl.getAttribLocation(program,"aPosition"),mvpLoc=gl.getUniformLocation(program,"uMvp"),modelLoc=gl.getUniformLocation(program,"uModel"),colorLoc=gl.getUniformLocation(program,"uColor");
function mesh(data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {buffer:b,count:data.length/3};}
const cubeData=[];const faces=[[-1,-1,1,1,-1,1,1,1,1,-1,1,1],[1,-1,-1,-1,-1,-1,-1,1,-1,1,1,-1],[-1,1,1,1,1,1,1,1,-1,-1,1,-1],[-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1],[1,-1,1,1,-1,-1,1,1,-1,1,1,1],[-1,-1,-1,-1,-1,1,-1,1,1,-1,1,-1]];
faces.forEach(f=>{const v=[[f[0],f[1],f[2]],[f[3],f[4],f[5]],[f[6],f[7],f[8]],[f[9],f[10],f[11]]];[0,1,2,0,2,3].forEach(i=>cubeData.push(...v[i]));});
const cube=mesh(cubeData);
const octData=[];const o=[[0,1,0],[1,0,0],[0,0,1],[-1,0,0],[0,0,-1],[0,-1,0]];[[0,1,2],[0,2,3],[0,3,4],[0,4,1],[5,2,1],[5,3,2],[5,4,3],[5,1,4]].forEach(t=>t.forEach(i=>octData.push(...o[i])));const oct=mesh(octData);
function matIdentity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
function model(x,y,z,sx,sy,sz,rot=0){const c=Math.cos(rot),s=Math.sin(rot);return [c*sx,0,-s*sx,0,0,sy,0,0,s*sz,0,c*sz,0,x,y,z,1];}
function mul(a,b){const o=new Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];return o;}
function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return [f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0];}
function lookAt(eye,center){const z=norm(sub(eye,center)),x=norm(cross([0,1,0],z)),y=cross(z,x);return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1];}
const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};
function draw(m,color,geometry=cube){gl.bindBuffer(gl.ARRAY_BUFFER,geometry.buffer);gl.enableVertexAttribArray(posLoc);gl.vertexAttribPointer(posLoc,3,gl.FLOAT,false,0,0);gl.uniformMatrix4fv(modelLoc,false,new Float32Array(m));gl.uniformMatrix4fv(mvpLoc,false,new Float32Array(mul(viewProjection,m)));gl.uniform3fv(colorLoc,new Float32Array(color));gl.drawArrays(gl.TRIANGLES,0,geometry.count);}
let viewProjection=matIdentity();
let seed=92751;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const terrain=[],rocks=[],ores=[],voxelGround=[];
for(let i=0;i<115;i++){const a=rand()*Math.PI*2,d=8+rand()*20,r=1+rand()*2.8;terrain.push({x:Math.cos(a)*d,z:Math.sin(a)*d,r,y:.12+rand()*.5,rot:rand()*6,color:[.31+rand()*.13,.30+rand()*.13,.29+rand()*.12]});}
for(let i=0;i<170;i++){const a=rand()*Math.PI*2,d=12+rand()*22,s=.2+rand()*.8;rocks.push({x:Math.cos(a)*d,z:Math.sin(a)*d,s,color:[.42+rand()*.12,.4+rand()*.12,.38+rand()*.12],rot:rand()*6});}
for(let i=0;i<22;i++){const a=rand()*Math.PI*2,d=12+rand()*15;ores.push({x:Math.cos(a)*d,z:Math.sin(a)*d,available:true,phase:rand()*6});}
// Hand-built voxel asteroid surface: stepped shelves, a flatter starter-base plateau and a rocky perimeter.
for(let gx=-10;gx<=10;gx++)for(let gz=-10;gz<=10;gz++){const x=gx*3,z=gz*3,r=Math.hypot(x,z);if(r>30)continue;const n=Math.sin(gx*1.71+gz*.63)*.22+Math.cos(gz*1.27-gx*.42)*.18;const h=r<17?.42:Math.max(.55,1.05+(r-17)*.045+n);const shade=.31+((gx*7+gz*11+210)%5)*.018;voxelGround.push({x,y:-.35+h/2,z,h,color:[shade,shade*.98,shade*.94]});}
const state={running:false,paused:false,energy:100,ore:0,yaw:0,velocity:0,maxSpeed:12,};
const cameraFollow={x:0,z:0};
const rover={x:0,z:10};
// === Base construction system: static-client only, persisted in localStorage ===
const moduleCatalog={
 habitat:{label:"Жилой модуль",color:[.72,.76,.72],size:[1.45,1.05,1.45]},
 solar:{label:"Солнечная панель",color:[.2,.42,.72],size:[1.55,.12,1.25]},
 storage:{label:"Склад ресурсов",color:[.68,.48,.28],size:[1.25,.85,1.25]},
 lab:{label:"Лаборатория",color:[.58,.68,.76],size:[1.35,1,1.35]}
};
let selectedModule="habitat",moduleRotation=0;
let baseModules=[];
try{const saved=JSON.parse(localStorage.getItem("lunar-base-modules-v1")||"null");if(Array.isArray(saved)&&saved.length>0)baseModules=saved.filter(m=>moduleCatalog[m.type]&&Number.isFinite(m.x)&&Number.isFinite(m.z));else baseModules=[{id:"starter-habitat",type:"habitat",x:0,z:0,rotation:0},{id:"starter-solar-a",type:"solar",x:-5,z:0,rotation:0},{id:"starter-storage",type:"storage",x:4,z:0,rotation:0},{id:"starter-lab",type:"lab",x:0,z:-5,rotation:0}];}catch(_){baseModules=[{id:"starter-habitat",type:"habitat",x:0,z:0,rotation:0},{id:"starter-solar-a",type:"solar",x:-5,z:0,rotation:0},{id:"starter-storage",type:"storage",x:4,z:0,rotation:0},{id:"starter-lab",type:"lab",x:0,z:-5,rotation:0}];}
function persistBase(){try{localStorage.setItem("lunar-base-modules-v1",JSON.stringify(baseModules));}catch(_){showToast("Не удалось сохранить базу (storage unavailable)");}}
function updateBuildCount(){const el=document.querySelector("#build-count");if(el)el.textContent="Построек: "+baseModules.length;}
function selectModule(type){if(!moduleCatalog[type])return;selectedModule=type;document.querySelectorAll(".module-choice").forEach(b=>b.classList.toggle("active",b.dataset.module===type));}
document.querySelectorAll(".module-choice").forEach(b=>b.addEventListener("click",()=>selectModule(b.dataset.module)));
function targetBuildPosition(){const gx=-Math.sin(state.yaw),gz=-Math.cos(state.yaw);return {x:Math.round((rover.x+gx*5)/3.5)*3.5,z:Math.round((rover.z+gz*5)/3.5)*3.5};}
function placeModule(){if(!state.running||state.paused){showToast("Начните экспедицию для строительства");return;}const p=targetBuildPosition();if(Math.hypot(p.x-rover.x,p.z-rover.z)<2.5){showToast("Слишком близко к роверу");return;}if(baseModules.some(m=>Math.hypot(m.x-p.x,m.z-p.z)<2.8)){showToast("Клетка занята другой постройкой");return;}baseModules.push({id:Date.now()+"-"+Math.floor(Math.random()*10000),type:selectedModule,x:p.x,z:p.z,rotation:moduleRotation});persistBase();updateBuildCount();showToast(moduleCatalog[selectedModule].label+" установлен");}
function removeNearestModule(){let index=-1,best=8;for(let i=0;i<baseModules.length;i++){const d=Math.hypot(baseModules[i].x-rover.x,baseModules[i].z-rover.z);if(d<best){best=d;index=i;}}if(index<0){showToast("Нет построек в радиусе 8 м");return;}const removed=baseModules.splice(index,1)[0];persistBase();updateBuildCount();showToast(moduleCatalog[removed.type].label+" демонтирован");}
document.querySelector("#place-module").addEventListener("click",placeModule);
document.querySelector("#rotate-module").addEventListener("click",()=>{moduleRotation=(moduleRotation+Math.PI/2)%(Math.PI*2);showToast("Поворот: "+Math.round(moduleRotation*180/Math.PI)+"°");});
document.querySelector("#remove-module").addEventListener("click",removeNearestModule);
addEventListener("keydown",e=>{if(e.code==="KeyR"&&state.running&&!state.paused){moduleRotation=(moduleRotation+Math.PI/2)%(Math.PI*2);showToast("Поворот модуля");}if(e.code==="Digit1")selectModule("habitat");if(e.code==="Digit2")selectModule("solar");if(e.code==="Digit3")selectModule("storage");if(e.code==="Digit4")selectModule("lab");});
function drawBaseModule(m){
 const def=moduleCatalog[m.type],r=m.rotation||0,box=(x,y,z,sx,sy,sz,c,rot=r)=>draw(model(x,y,z,sx,sy,sz,rot),c);
 const metal=[.27,.31,.34],light=[.78,.79,.72],dark=[.12,.17,.21],orange=[.82,.48,.22],glass=[.12,.39,.48];
 box(m.x,.12,m.z,1.72,.12,1.72,[.34,.35,.34]);
 // Raised foundation rim and corner feet.
 for(const sx of [-1,1])for(const sz of [-1,1])box(m.x+sx*1.35,.32,m.z+sz*1.35,.16,.22,.16,metal);
 if(m.type==="habitat"){
  box(m.x,.98,m.z,1.42,1.05,1.42,def.color);
  box(m.x,2.08,m.z,.92,.18,.92,[.62,.67,.64]);
  box(m.x,1.15,m.z-1.445,.62,.48,.055,glass);
  box(m.x,1.15,m.z+1.445,.62,.48,.055,glass);
  box(m.x-1.445,1.12,m.z,.055,.42,.62,glass);
  box(m.x+1.445,1.12,m.z,.055,.42,.62,glass);
  box(m.x,1.82,m.z-1.51,.72,.08,.12,orange);
  // Roof life-support equipment, hatch and vents.
  box(m.x-.72,2.34,m.z+.45,.35,.18,.42,metal);
  box(m.x+.68,2.3,m.z-.35,.28,.14,.32,orange);
  for(let i=0;i<4;i++)box(m.x-.75+i*.5,2.3,m.z-.92,.12,.12,.3,light);
  box(m.x,2.42,m.z,.22,.12,.22,orange);
 }else if(m.type==="solar"){
  box(m.x,.5,m.z,1.52,.12,1.12,[.16,.2,.24]);
  box(m.x,.65,m.z,1.42,.06,1.02,[.12,.27,.53]);
  for(let i=-2;i<=2;i++)box(m.x+i*.48,.69,m.z, .025,.025,.98,[.47,.67,.86]);
  for(let i=-1;i<=1;i++)box(m.x,.7,m.z+i*.31,1.36,.025,.025,[.47,.67,.86]);
  box(m.x,.3,m.z,.14,.32,.14,metal);
  box(m.x-1.15,.32,m.z,.12,.28,.12,orange);
 }else if(m.type==="storage"){
  box(m.x,.9,m.z,1.28,.9,1.28,def.color);
  box(m.x,1.85,m.z,.95,.12,.95,light);
  box(m.x,.94,m.z-1.3,.58,.62,.08,dark);
  box(m.x,.94,m.z-1.36,.42,.48,.035,orange);
  for(let i=-1;i<=1;i++)box(m.x+i*.35,.94,m.z+1.3,.12,.46,.08,light);
  box(m.x-.9,1.25,m.z,.18,.16,.18,orange);
 }else if(m.type==="lab"){
  box(m.x,.96,m.z,1.35,1,1.35,def.color);
  box(m.x,1.2,m.z-1.37,.82,.34,.07,[.12,.62,.67]);
  box(m.x,1.92,m.z,.72,.14,.72,light);
  box(m.x,2.15,m.z,.28,.18,.28,orange);
  for(let i=-1;i<=1;i++)box(m.x+i*.48,1.08,m.z+1.37,.16,.56,.06,glass);
  box(m.x+1.4,.55,m.z,.18,.48,.18,metal);
 }
}
// Small utility structures turn the starter cluster into a believable working outpost.
function drawOutpost(){
 const b=(x,y,z,sx,sy,sz,c,r=0)=>draw(model(x,y,z,sx,sy,sz,r),c);
 const steel=[.31,.36,.39],pale=[.72,.72,.65],amber=[.9,.57,.23],cyan=[.12,.65,.72],rubber=[.12,.14,.16];
 // Landing apron and painted guidance markings.
 b(9,.1,8,4.35,.12,4.35,[.22,.25,.27]);
 b(9,.19,8,3.72,.035,3.72,[.36,.39,.39]);
 for(let i=0;i<12;i++){const a=i*Math.PI/6;b(9+Math.cos(a)*3.35,.24,8+Math.sin(a)*3.35,.34,.045,.12,amber,a);}
 b(9,.27,8,.18,.04,.18,pale);
 // Landing lights.
 for(let i=0;i<8;i++){const a=i*Math.PI/4;b(9+Math.cos(a)*4.1,.34,8+Math.sin(a)*4.1,.12,.12,.12,cyan);}
 // Fuel / oxygen tanks with supports and end caps.
 for(let i=0;i<2;i++){const x=6+i*1.25;b(x,.72,1.8,.42,.62,.42,[.62,.67,.65]);b(x,1.38,1.8,.3,.08,.3,amber);b(x,.12,1.8,.55,.12,.55,steel);}
 // Raised pipes linking habitat to service area.
 b(2,.52,1.8,2.5,.12,.12,amber);b(3.15,.52,1.8,.12,.48,.12,amber);
 b(2.9,.24,2.8,.12,.18,1.9,steel);
 // Communication mast with crossbars, dish and signal beacon.
 b(-7,.8,-7,.16,1.25,.16,steel);b(-7,2.08,-7,.78,.1,.1,pale);b(-7,2.38,-7,.1,.38,.1,amber);
 b(-7.55,1.55,-7,.38,.12,.12,cyan);b(-6.45,1.55,-7,.38,.12,.12,cyan);
 b(-7,2.75,-7,.18,.18,.18,amber);
 // A small service gantry and equipment crates.
 b(-3,.38,2.2,1.5,.16,.8,steel);b(-3,.95,2.2,.12,.65,.12,amber);b(-4.35,1.15,2.2,.12,.9,.12,amber);
 for(let i=0;i<3;i++){b(-4.9+i*.62,.55,3.8,.48,.48,.48,i===1?amber:[.48,.51,.48]);}
 // Short voxel walkway links the habitat to the landing apron.
 for(let i=0;i<6;i++)b(1.4+i*.72,.14,5.0,.31,.08,.72,[.43,.46,.43]);
 // Work lights on short poles.
 for(const p of [[-2,-1],[5,-2],[5,5],[-5,5]]){b(p[0],.78,p[1],.09,.72,.09,steel);b(p[0],1.52,p[1],.28,.1,.28,amber);}
 // Rover parking bay beside the landing pad.
 b(14,.16,3.4,2.6,.12,3.8,steel);b(14,.25,3.4,2.2,.035,3.3,[.28,.32,.33]);
 for(let i=0;i<4;i++)b(12.9+i*.72,.31,1.9,.08,.035,.3,amber);
}
// A broken, stepped rim gives the playable plateau a readable asteroid silhouette.
const asteroidRim=[];
for(let i=0;i<52;i++){const a=i*Math.PI*2/52,r=31+(i%4)*.55,h=1.1+(i%5)*.34;asteroidRim.push({x:Math.cos(a)*r,z:Math.sin(a)*r,h,rot:-a,color:[.27+(i%3)*.025,.26+(i%3)*.025,.25+(i%3)*.025]});}

updateBuildCount();

const keys=new Set();addEventListener("keydown",e=>{keys.add(e.code);if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();if(e.code==="Escape")togglePause();if(e.code==="KeyE"&&state.running&&!state.paused)mine();});addEventListener("keyup",e=>keys.delete(e.code));
// Fixed isometric camera: no mouse look and no pointer lock.
const menu=document.querySelector("#menu"),pause=document.querySelector("#pause"),settings=document.querySelector("#settings"),toast=document.querySelector("#toast");let toastTimer;
function showToast(s){toast.textContent=s;toast.style.opacity="1";clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.style.opacity="0",1700);}
function start(){state.running=true;state.paused=false;menu.classList.add("hidden");pause.classList.add("hidden");settings.classList.add("hidden");document.querySelector("#objective").textContent="Найдите залежи минералов и добудьте ресурсы";}
function togglePause(){if(!state.running)return;state.paused=!state.paused;pause.classList.toggle("hidden",!state.paused);}
function quit(){state.running=false;state.paused=false;pause.classList.add("hidden");menu.classList.remove("hidden");}
function mine(){let nearest=null,distance=4.8;ores.forEach(n=>{const d=Math.hypot(n.x-rover.x,n.z-rover.z);if(n.available&&d<distance){nearest=n;distance=d;}});if(!nearest){showToast("Нет залежей поблизости");return;}nearest.available=false;state.ore+=12;state.energy=Math.max(0,state.energy-3);document.querySelector("#ore").textContent=state.ore;document.querySelector("#energy").textContent=Math.round(state.energy);showToast("+12 кг минералов");document.querySelector("#objective").textContent=state.ore>=60?"Цель выполнена: ресурсы собраны":"Продолжайте сбор минералов";}
document.querySelector("#start-btn").onclick=start;document.querySelector("#resume-btn").onclick=togglePause;document.querySelector("#quit-btn").onclick=quit;
document.querySelector("#settings-btn").onclick=()=>{menu.classList.add("hidden");settings.classList.remove("hidden");};document.querySelector("#settings-back").onclick=()=>{settings.classList.add("hidden");menu.classList.remove("hidden");};

document.querySelector("#max-speed").oninput=e=>{state.maxSpeed=+e.target.value;document.querySelector("#speed-value").value=e.target.value;};
document.querySelector("#sound").onchange=()=>showToast("Звук будет добавлен позднее");
function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);canvas.style.width="100%";canvas.style.height="100%";gl.viewport(0,0,canvas.width,canvas.height);}addEventListener("resize",resize);resize();
gl.enable(gl.DEPTH_TEST);gl.clearColor(.035,.05,.085,1);
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
if(state.running&&!state.paused){const forward=(keys.has("KeyW")||keys.has("ArrowUp")?1:0)-(keys.has("KeyS")||keys.has("ArrowDown")?1:0),turn=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);state.yaw+=turn*dt*(Math.abs(state.velocity)>.1?1.55:1.1);const target=forward*state.maxSpeed;state.velocity+=(target-state.velocity)*(1-Math.exp(-(forward?2.2:3.3)*dt));rover.x-=Math.sin(state.yaw)*state.velocity*dt*.42;rover.z-=Math.cos(state.yaw)*state.velocity*dt*.42;document.querySelector("#speed").textContent=Math.round(Math.abs(state.velocity)*3.6);if(Math.abs(state.velocity)>.1)state.energy=Math.max(0,state.energy-dt*.035);document.querySelector("#energy").textContent=Math.round(state.energy);}
cameraFollow.x+=(rover.x-cameraFollow.x)*Math.min(1,dt*5);cameraFollow.z+=(rover.z-cameraFollow.z)*Math.min(1,dt*5);const eye=[cameraFollow.x+15,20,cameraFollow.z+17],center=[cameraFollow.x,0.8,cameraFollow.z];viewProjection=mul(perspective(Math.PI/4.2,canvas.width/canvas.height,.1,260),lookAt(eye,center));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
// The playable ground is assembled from voxel tiles; no infinite flat plane.
voxelGround.forEach(b=>draw(model(b.x,b.y,b.z,1.5,b.h/2,1.5),b.color));
asteroidRim.forEach(r=>draw(model(r.x,r.h*.38,r.z,1.55,r.h,r.h*.92,r.rot),r.color));
drawOutpost();
terrain.forEach(t=>draw(model(t.x,t.y,t.z,t.r,t.r*.25,t.r,t.rot),t.color,oct));
rocks.forEach(r=>draw(model(r.x,r.s*.5,r.z,r.s,r.s*.8,r.s,r.rot),r.color,oct));
ores.forEach(n=>{if(n.available)draw(model(n.x,.85+Math.sin(now*.001+n.phase)*.12,n.z,.65,.85,.65,now*.0004+n.phase),[.25,.82,.69],oct);});
baseModules.forEach(drawBaseModule);
const ry=state.yaw;
draw(model(rover.x,1.0,rover.z,1.15,.28,1.55,ry),[.72,.74,.7]);
draw(model(rover.x,1.34,rover.z-.18,.72,.34,.72,ry),[.14,.2,.24]);
draw(model(rover.x,1.48,rover.z-.18,.48,.19,.5,ry),[.12,.42,.5]);
draw(model(rover.x,1.68,rover.z+1.05,1.9,.06,.65,ry),[.68,.48,.22]);
for(const side of [-1,1])for(const front of [-1,1]){draw(model(rover.x+side*1.18,.48,rover.z+front*1.05,.23,.48,.48,ry),[.12,.15,.18]);draw(model(rover.x+side*1.18,.48,rover.z+front*1.05,.13,.3,.3,ry),[.38,.42,.42]);}
draw(model(rover.x-.85,1.7,rover.z-.5,.12,.35,.12,ry),[.25,.28,.3]);draw(model(rover.x-.85,2.05,rover.z-.5,.18,.18,.18,ry),[.86,.62,.24]);
}
requestAnimationFrame(frame);
})();