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
const terrain=[],rocks=[],ores=[];
for(let i=0;i<115;i++){const r=1+rand()*4.8;terrain.push({x:(rand()-.5)*170,z:(rand()-.5)*170,r,y:.12+rand()*.5,rot:rand()*6,color:[.31+rand()*.13,.30+rand()*.13,.29+rand()*.12]});}
for(let i=0;i<170;i++){const s=.2+rand()*1.0;rocks.push({x:(rand()-.5)*160,z:(rand()-.5)*160,s,color:[.42+rand()*.12,.4+rand()*.12,.38+rand()*.12],rot:rand()*6});}
for(let i=0;i<22;i++){let x=(rand()-.5)*100,z=(rand()-.5)*100;if(Math.hypot(x,z)<10)x+=18;ores.push({x,z,available:true,phase:rand()*6});}
const state={running:false,paused:false,energy:100,ore:0,yaw:0,velocity:0,maxSpeed:12,sensitivity:.5,camYaw:0};
const rover={x:0,z:0};
// === Base construction system: static-client only, persisted in localStorage ===
const moduleCatalog={
 habitat:{label:"Жилой модуль",color:[.72,.76,.72],size:[1.45,1.05,1.45]},
 solar:{label:"Солнечная панель",color:[.2,.42,.72],size:[1.55,.12,1.25]},
 storage:{label:"Склад ресурсов",color:[.68,.48,.28],size:[1.25,.85,1.25]},
 lab:{label:"Лаборатория",color:[.58,.68,.76],size:[1.35,1,1.35]}
};
let selectedModule="habitat",moduleRotation=0;
let baseModules=[];
try{const saved=JSON.parse(localStorage.getItem("lunar-base-modules-v1")||"[]");if(Array.isArray(saved))baseModules=saved.filter(m=>moduleCatalog[m.type]&&Number.isFinite(m.x)&&Number.isFinite(m.z));}catch(_){baseModules=[];}
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
function drawBaseModule(m){const def=moduleCatalog[m.type],r=m.rotation||0;
draw(model(m.x,.12,m.z,1.65,.12,1.65,r),[.38,.38,.37]);
if(m.type==="habitat"){
 draw(model(m.x,.95,m.z,def.size[0],def.size[1],def.size[2],r),def.color);
 draw(model(m.x,1.15,m.z-1.48,.62,.45,.12,r),[.12,.25,.34]);
 draw(model(m.x,2.12,m.z,.18,.16,.18,r),[.75,.64,.38]);
}else if(m.type==="solar"){
 draw(model(m.x,.5,m.z,1.35,.12,.9,r),def.color);
 draw(model(m.x,.32,m.z,1.55,.08,1.2,r),[.22,.25,.28]);
 draw(model(m.x,.25,m.z, .12,.22,.12,r),[.68,.65,.58]);
}else if(m.type==="storage"){
 draw(model(m.x,.82,m.z,def.size[0],def.size[1],def.size[2],r),def.color);
 draw(model(m.x,.86,m.z-1.27,.42,.52,.1,r),[.28,.22,.14]);
 draw(model(m.x,1.75,m.z,.12,.12,.12,r),[.78,.7,.42]);
}else if(m.type==="lab"){
 draw(model(m.x,.9,m.z,def.size[0],def.size[1],def.size[2],r),def.color);
 draw(model(m.x,1.35,m.z-1.37,.6,.28,.12,r),[.2,.75,.68]);
 draw(model(m.x,1.95,m.z,.12,.18,.12,r),[.68,.8,.9]);
}
}
updateBuildCount();

const keys=new Set();addEventListener("keydown",e=>{keys.add(e.code);if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault();if(e.code==="Escape")togglePause();if(e.code==="KeyE"&&state.running&&!state.paused)mine();});addEventListener("keyup",e=>keys.delete(e.code));
canvas.addEventListener("click",()=>{if(state.running&&!state.paused)canvas.requestPointerLock?.();});addEventListener("mousemove",e=>{if(document.pointerLockElement===canvas&&state.running&&!state.paused)state.camYaw-=e.movementX*.002*state.sensitivity;});
const menu=document.querySelector("#menu"),pause=document.querySelector("#pause"),settings=document.querySelector("#settings"),toast=document.querySelector("#toast");let toastTimer;
function showToast(s){toast.textContent=s;toast.style.opacity="1";clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.style.opacity="0",1700);}
function start(){state.running=true;state.paused=false;menu.classList.add("hidden");pause.classList.add("hidden");settings.classList.add("hidden");canvas.requestPointerLock?.();document.querySelector("#objective").textContent="Найдите залежи минералов и добудьте ресурсы";}
function togglePause(){if(!state.running)return;state.paused=!state.paused;pause.classList.toggle("hidden",!state.paused);if(state.paused)document.exitPointerLock?.();else canvas.requestPointerLock?.();}
function quit(){state.running=false;state.paused=false;pause.classList.add("hidden");menu.classList.remove("hidden");document.exitPointerLock?.();}
function mine(){let nearest=null,distance=4.8;ores.forEach(n=>{const d=Math.hypot(n.x-rover.x,n.z-rover.z);if(n.available&&d<distance){nearest=n;distance=d;}});if(!nearest){showToast("Нет залежей поблизости");return;}nearest.available=false;state.ore+=12;state.energy=Math.max(0,state.energy-3);document.querySelector("#ore").textContent=state.ore;document.querySelector("#energy").textContent=Math.round(state.energy);showToast("+12 кг минералов");document.querySelector("#objective").textContent=state.ore>=60?"Цель выполнена: ресурсы собраны":"Продолжайте сбор минералов";}
document.querySelector("#start-btn").onclick=start;document.querySelector("#resume-btn").onclick=togglePause;document.querySelector("#quit-btn").onclick=quit;
document.querySelector("#settings-btn").onclick=()=>{menu.classList.add("hidden");settings.classList.remove("hidden");};document.querySelector("#settings-back").onclick=()=>{settings.classList.add("hidden");menu.classList.remove("hidden");};
document.querySelector("#sensitivity").oninput=e=>{state.sensitivity=+e.target.value;document.querySelector("#sens-value").value=e.target.value;};
document.querySelector("#max-speed").oninput=e=>{state.maxSpeed=+e.target.value;document.querySelector("#speed-value").value=e.target.value;};
document.querySelector("#sound").onchange=()=>showToast("Звук будет добавлен позднее");
function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);canvas.style.width="100%";canvas.style.height="100%";gl.viewport(0,0,canvas.width,canvas.height);}addEventListener("resize",resize);resize();
gl.enable(gl.DEPTH_TEST);gl.clearColor(.035,.05,.085,1);
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
if(state.running&&!state.paused){const forward=(keys.has("KeyW")||keys.has("ArrowUp")?1:0)-(keys.has("KeyS")||keys.has("ArrowDown")?1:0),turn=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);state.yaw+=turn*dt*(Math.abs(state.velocity)>.1?1.55:1.1);const target=forward*state.maxSpeed;state.velocity+=(target-state.velocity)*(1-Math.exp(-(forward?2.2:3.3)*dt));rover.x-=Math.sin(state.yaw)*state.velocity*dt*.42;rover.z-=Math.cos(state.yaw)*state.velocity*dt*.42;document.querySelector("#speed").textContent=Math.round(Math.abs(state.velocity)*3.6);if(Math.abs(state.velocity)>.1)state.energy=Math.max(0,state.energy-dt*.035);document.querySelector("#energy").textContent=Math.round(state.energy);}
const cy=state.yaw+state.camYaw,eye=[rover.x+Math.sin(cy)*9,5.4,rover.z+Math.cos(cy)*9],center=[rover.x,1.1,rover.z];viewProjection=mul(perspective(Math.PI/3.1,canvas.width/canvas.height,.1,220),lookAt(eye,center));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
draw(model(0,-.65,0,130,.3,130),[.39,.37,.35]);
terrain.forEach(t=>draw(model(t.x,t.y,t.z,t.r,t.r*.25,t.r,t.rot),t.color,oct));
rocks.forEach(r=>draw(model(r.x,r.s*.5,r.z,r.s,r.s*.8,r.s,r.rot),r.color,oct));
ores.forEach(n=>{if(n.available)draw(model(n.x,.85+Math.sin(now*.001+n.phase)*.12,n.z,.65,.85,.65,now*.0004+n.phase),[.25,.82,.69],oct);});
baseModules.forEach(drawBaseModule);\nconst ry=state.yaw;draw(model(rover.x,1.0,rover.z,1.15,.28,1.55,ry),[.72,.74,.7]);draw(model(rover.x,1.55,rover.z-.2,.65,.36,.55,ry),[.12,.17,.22]);draw(model(rover.x,1.68,rover.z+1.05,1.9,.06,.65,ry),[.68,.48,.22]);
for(const side of [-1,1])for(const front of [-1,1])draw(model(rover.x+side*1.18,.48,rover.z+front*1.05,.2,.48,.48,ry),[.12,.15,.18]);
}
requestAnimationFrame(frame);
})();