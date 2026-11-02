/* Self-contained WebGL renderer. No imports, frameworks, CDN, or server-side code. */
(() => {
"use strict";
const canvas=document.createElement("canvas");canvas.id="game-canvas";document.querySelector("#game-root").prepend(canvas);
const gl=canvas.getContext("webgl",{antialias:true,alpha:false});
if(!gl){document.querySelector("#objective").textContent="WebGL не поддерживается этим браузером";return;}
const vs=`attribute vec3 aPosition; uniform mat4 uMvp; uniform mat4 uModel; varying vec3 vNormal; void main(){vec3 p=aPosition; vNormal=normalize(mat3(uModel)*p); gl_Position=uMvp*vec4(p,1.0);}`;
const fs=`precision mediump float; uniform vec3 uColor; void main(){gl_FragColor=vec4(uColor,1.0);}`;
function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
const posLoc=gl.getAttribLocation(program,"aPosition"),mvpLoc=gl.getUniformLocation(program,"uMvp"),modelLoc=gl.getUniformLocation(program,"uModel"),colorLoc=gl.getUniformLocation(program,"uColor");
function mesh(data){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(data),gl.STATIC_DRAW);return {buffer:b,count:data.length/3};}
const cubeData=[];const faces=[[-1,-1,1,1,-1,1,1,1,1,-1,1,1],[1,-1,-1,-1,-1,-1,-1,1,-1,1,1,-1],[-1,1,1,1,1,1,1,1,-1,-1,1,-1],[-1,-1,-1,1,-1,-1,1,-1,1,-1,-1,1],[1,-1,1,1,-1,-1,1,1,-1,1,1,1],[-1,-1,-1,-1,-1,1,-1,1,1,-1,1,-1]];
faces.forEach(f=>{const v=[[f[0],f[1],f[2]],[f[3],f[4],f[5]],[f[6],f[7],f[8]],[f[9],f[10],f[11]]];[0,1,2,0,2,3].forEach(i=>cubeData.push(...v[i]));});
const cube=mesh(cubeData);
function makeWheelGeometry(segments=12){const data=[];for(let i=0;i<segments;i++){const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments,y1=Math.cos(a),z1=Math.sin(a),y2=Math.cos(b),z2=Math.sin(b);data.push(-1,y1,z1,1,y1,z1,1,y2,z2,-1,y1,z1,1,y2,z2,-1,y2,z2, -1,0,0,-1,y2,z2,-1,y1,z1, 1,0,0,1,y1,z1,1,y2,z2);}return mesh(data);}
const wheelGeometry=makeWheelGeometry();
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
// Compact voxel terrain shaped into a broad, shallow impact crater.
const VOX=.85, TERRAIN_BOTTOM=-3.4, CRATER={x:0,z:-15,radius:13.4,depth:3.05};
function terrainTop(x,z){
 const d=Math.hypot(x-CRATER.x,z-CRATER.z),q=Math.min(1,d/CRATER.radius);
 const bowl=-CRATER.depth*(1-q*q),rim=1.05*Math.exp(-Math.pow((d-CRATER.radius)/1.15,2));
 const n=Math.sin(x*1.71+z*.63)*.055+Math.cos(z*1.27-x*.42)*.045;
 return .78+bowl+rim+n;
}
for(let gx=-36;gx<=36;gx++)for(let gz=-36;gz<=36;gz++){
 const x=gx*VOX,z=gz*VOX,r=Math.hypot(x,z);if(r>30)continue;
 const top=terrainTop(x,z),h=top-TERRAIN_BOTTOM,shade=.30+((gx*7+gz*11+210)%5)*.012;
 voxelGround.push({x,y:(top+TERRAIN_BOTTOM)/2,z,h,color:[shade,shade*.98,shade*.94]});
}
for(let i=0;i<230;i++){const a=rand()*Math.PI*2,d=10+rand()*19,v=.18+rand()*.42;rocks.push({x:Math.round(Math.cos(a)*d/VOX)*VOX,z:Math.round(Math.sin(a)*d/VOX)*VOX,s:v,color:[.34+rand()*.08,.33+rand()*.08,.32+rand()*.08]});}
const resourceTypes=[
 {id:"iron",label:"Железо",color:[.72,.43,.28]},
 {id:"titanium",label:"Титан",color:[.58,.68,.76]},
 {id:"silicon",label:"Кремний",color:[.82,.72,.36]}
];
for(let i=0;i<24;i++){const a=i*2.399963,d=6.2+(i%4)*1.55,cx=Math.round(Math.cos(a)*d/VOX)*VOX,cz=Math.round((-15+Math.sin(a)*d)/VOX)*VOX,cells=[],count=2+(i%3),resource=resourceTypes[i%resourceTypes.length];for(let j=0;j<count;j++)cells.push({x:cx+(j%2)*VOX,z:cz+Math.floor(j/2)*VOX,y:.62});ores.push({x:cx,z:cz,cells,resource,available:true,phase:rand()*6});}
// The crater replaces the former mountain and underground hangar.
// Batch terrain and mountain voxels by flat material to avoid thousands of WebGL draw calls.
const voxelBatchMap=new Map();
for(const b of voxelGround){const c=b.color,k=c.join(",");if(!voxelBatchMap.has(k))voxelBatchMap.set(k,{color:c,data:[]});const d=voxelBatchMap.get(k).data;for(let i=0;i<cubeData.length;i+=3)d.push(b.x+cubeData[i]*VOX/2,b.y+cubeData[i+1]*b.h/2,b.z+cubeData[i+2]*VOX/2);}
const voxelBatches=[...voxelBatchMap.values()].map(b=>({color:b.color,geometry:mesh(b.data)}));
const state={running:false,paused:false,energy:100,ore:0,inventory:{iron:0,titanium:0,silicon:0},cargoCapacity:120,yaw:Math.PI,targetYaw:Math.PI,velocity:0,maxSpeed:12,direction:2};
const departure={active:false,elapsed:0,door:0};
const cameraFollow={x:0,z:-.7};
const rover={x:0,z:-.7};let wheelTravel=0;const roverParts={bucketAngle:-.18};
// === Base construction system: static-client only, persisted in localStorage ===
const moduleCatalog={
 habitat:{label:"Жилой модуль",color:[.72,.76,.72],size:[1.45,1.05,1.45]},
 solar:{label:"Солнечная панель",color:[.2,.42,.72],size:[1.55,.12,1.25]},
 storage:{label:"Склад ресурсов",color:[.68,.48,.28],size:[1.25,.85,1.25]},
 lab:{label:"Лаборатория",color:[.58,.68,.76],size:[1.35,1,1.35]},\n comms:{label:"Коммуникационный узел",color:[.24,.66,.72],size:[1.35,1.35,1.35]},\n landing:{label:"Посадочная площадка",color:[.68,.72,.68],size:[2.5,.12,2.5]},\n factory:{label:"Производственный модуль",color:[.72,.48,.28],size:[1.75,1.15,1.75]}
};
let selectedModule="habitat",moduleRotation=0;
let baseModules=[];
try{const saved=JSON.parse(localStorage.getItem("lunar-base-modules-v3")||"null");if(Array.isArray(saved)&&saved.length>0)baseModules=saved.filter(m=>moduleCatalog[m.type]&&Number.isFinite(m.x)&&Number.isFinite(m.z));else baseModules=[{id:"starter-habitat",type:"habitat",x:-3.4,z:-14.5,rotation:0},{id:"starter-solar-a",type:"solar",x:-3.4,z:-18.2,rotation:0},{id:"starter-storage",type:"storage",x:0,z:-14.5,rotation:0},{id:"starter-lab",type:"lab",x:0,z:-18.2,rotation:0}];}catch(_){baseModules=[{id:"starter-habitat",type:"habitat",x:-3.4,z:-14.5,rotation:0},{id:"starter-solar-a",type:"solar",x:-3.4,z:-18.2,rotation:0},{id:"starter-storage",type:"storage",x:0,z:-14.5,rotation:0},{id:"starter-lab",type:"lab",x:0,z:-18.2,rotation:0}];}
function persistBase(){try{localStorage.setItem("lunar-base-modules-v3",JSON.stringify(baseModules));}catch(_){showToast("Не удалось сохранить базу (storage unavailable)");}}
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

let pendingPlacement=false,selectedBuildingId=null,dragBuild=null;
const buildSizes={solar:"3.1 × 2.5 м",storage:"2.5 × 2.5 м",lab:"2.7 × 2.7 м",habitat:"2.9 × 2.9 м",comms:"3 × 3 м",landing:"5 × 5 м",factory:"3.5 × 3.5 м"};
function refreshBuilder(){const m=baseModules.find(v=>v.id===selectedBuildingId),a=document.querySelector("#selected-name"),b=document.querySelector("#selected-size"),c=document.querySelector("#build-count"),d=document.querySelector("#placement-status");if(a)a.textContent=m?moduleCatalog[m.type].label:moduleCatalog[selectedModule].label;if(b)b.textContent=m?buildSizes[m.type]:buildSizes[selectedModule];if(c)c.textContent=baseModules.length;if(d)d.textContent=m?"Выбрана постройка — перетащите её":pendingPlacement?"Кликните по карте, чтобы построить":"Выберите модуль слева";}
function builderSelect(type){if(!moduleCatalog[type])return;selectedModule=type;pendingPlacement=true;selectedBuildingId=null;document.querySelectorAll(".module-choice").forEach(b=>b.classList.toggle("active",b.dataset.module===type));refreshBuilder();}
document.querySelectorAll(".module-choice").forEach(b=>b.addEventListener("click",()=>builderSelect(b.dataset.module)));
document.querySelector("#open-build-modal").onclick=()=>{document.querySelector("#build-modal").classList.remove("hidden");refreshBuilder();};
document.querySelector("#close-build-modal").onclick=()=>document.querySelector("#build-modal").classList.add("hidden");
document.querySelector("#cancel-placement").onclick=()=>{pendingPlacement=false;selectedBuildingId=null;refreshBuilder();};
document.querySelector("#rotate-module").onclick=()=>{moduleRotation=(moduleRotation+Math.PI/2)%(Math.PI*2);const m=baseModules.find(v=>v.id===selectedBuildingId);if(m)m.rotation=moduleRotation;persistBase();};
document.querySelector("#remove-module").onclick=()=>{const i=baseModules.findIndex(v=>v.id===selectedBuildingId);if(i<0){showToast("Выберите объект на карте");return;}baseModules.splice(i,1);selectedBuildingId=null;persistBase();refreshBuilder();};
function pointerWorld(e){const r=canvas.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2);return {x:cameraFollow.x+(dx+dy*.55)/24,z:cameraFollow.z+(dy*.55-dx)/24};}
function pickBuild(e){let found=null,best=42;for(const m of baseModules){const r=canvas.getBoundingClientRect(),sx=r.left+r.width/2+(m.x-cameraFollow.x-(m.z-cameraFollow.z))*.48*24,sy=r.top+r.height/2+((m.x-cameraFollow.x)+(m.z-cameraFollow.z))*.25*24,d=Math.hypot(e.clientX-sx,e.clientY-sy);if(d<best){best=d;found=m;}}return found;}
canvas.addEventListener("pointerdown",e=>{if(document.querySelector("#build-modal").classList.contains("hidden"))return;const hit=pickBuild(e);if(hit){selectedBuildingId=hit.id;pendingPlacement=false;dragBuild={id:hit.id,ox:hit.x,oz:hit.z};canvas.setPointerCapture(e.pointerId);refreshBuilder();}else if(pendingPlacement){const p=pointerWorld(e),def=moduleCatalog[selectedModule],valid=Math.hypot(p.x,p.z)<26&&!baseModules.some(m=>Math.hypot(m.x-p.x,m.z-p.z)<Math.max(def.size[0],def.size[2])+1.5);if(!valid){showToast("Место занято или вне зоны строительства");return;}baseModules.push({id:"build-"+Date.now(),type:selectedModule,x:Math.round(p.x*2)/2,z:Math.round(p.z*2)/2,rotation:moduleRotation});selectedBuildingId=baseModules[baseModules.length-1].id;pendingPlacement=false;persistBase();refreshBuilder();showToast("Модуль установлен");}});
canvas.addEventListener("pointermove",e=>{if(!dragBuild)return;const m=baseModules.find(v=>v.id===dragBuild.id);if(m){const p=pointerWorld(e);m.x=Math.round(p.x*2)/2;m.z=Math.round(p.z*2)/2;}});
canvas.addEventListener("pointerup",()=>{if(!dragBuild)return;const m=baseModules.find(v=>v.id===dragBuild.id);if(m){const def=moduleCatalog[m.type],bad=Math.hypot(m.x,m.z)>26||baseModules.some(v=>v.id!==m.id&&Math.hypot(v.x-m.x,v.z-m.z)<Math.max(def.size[0],def.size[2])+1.5);if(bad){m.x=dragBuild.ox;m.z=dragBuild.oz;showToast("Перемещение отменено");}else{persistBase();showToast("Положение обновлено");}}dragBuild=null;refreshBuilder();});
canvas.addEventListener("pointercancel",()=>{if(dragBuild){const m=baseModules.find(v=>v.id===dragBuild.id);if(m){m.x=dragBuild.ox;m.z=dragBuild.oz;}dragBuild=null;}});
if(new URLSearchParams(location.search).has("builder")||document.body.dataset.builder==="true"){document.querySelector("#menu").classList.add("hidden");document.querySelector("#build-modal").classList.remove("hidden");state.running=true;}
function drawBaseModule(m){
 const def=moduleCatalog[m.type],r=m.rotation||0,ground=terrainTop(m.x,m.z),box=(x,y,z,sx,sy,sz,c,rot=r)=>draw(model(x,y+ground,z,sx,sy,sz,rot),c);
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
 }else if(m.type==="comms"){\n  box(m.x,.8,m.z,1.1,.8,1.1,def.color);box(m.x,2,m.z,.12,1.1,.12,metal);box(m.x,3.1,m.z,.7,.08,.08,light);box(m.x,3.1,m.z,.08,.7,.08,light);\n }else if(m.type==="landing"){\n  box(m.x,.2,m.z,2.45,.12,2.45,[.34,.39,.4]);for(let q=-1;q<=1;q+=2){box(m.x+q*1.9,.3,m.z,.08,.2,2.05,[.9,.62,.25]);box(m.x,.3,m.z+q*1.9,2.05,.2,.08,[.9,.62,.25]);}\n }else if(m.type==="factory"){\n  box(m.x,.95,m.z,1.72,.95,1.72,def.color);box(m.x,2.05,m.z,.9,.18,.9,metal);for(let q=-1;q<=1;q++)box(m.x+q*.58,2.42,m.z,.16,.5,.16,orange);\n }else if(m.type==="lab"){
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
 const ground=terrainTop(0,0),b=(x,y,z,sx,sy,sz,c,r=0)=>draw(model(x,y+ground,z,sx,sy,sz,r),c);
 const steel=[.31,.36,.39],pale=[.72,.72,.65],amber=[.9,.57,.23],cyan=[.12,.65,.72];
 // Surface garage beside the crater: a compact open-front voxel shelter.
 b(0,.10,.35,4.2,.12,4.0,[.24,.27,.29]);
 b(-2.05,1.75,-.55,.18,1.65,.18,steel);b(2.05,1.75,-.55,.18,1.65,.18,steel);
 b(-2.05,3.35,-.55,.18,.18,.18,steel);b(2.05,3.35,-.55,.18,.18,.18,steel);
 b(0,3.35,-.55,2.15,.18,.18,steel);
 b(-2.05,1.15,1.35,.18,1.15,.18,steel);b(2.05,1.15,1.35,.18,1.15,.18,steel);
 b(0,2.15,1.35,1.95,.12,.14,amber);
 b(0,2.05+departure.door*1.9,1.38,1.78,.12,.12,amber);
 for(let x=-1;x<=1;x+=2){b(x*1.65,.22,1.55,.12,.12,.12,cyan);b(x*1.65,.22,-1.35,.12,.12,.12,cyan);}
 // Short departure apron and painted guide strips.
 for(let i=0;i<12;i++){const z=2.2+i*.72;b(0,.08,z,2.55,.08,.34,[.38,.4,.39]);b(-1.48,.16,z,.07,.12,.07,amber);b(1.48,.16,z,.07,.12,.07,amber);}
 // Service pad, fuel tanks, communication mast and crates.
 b(8,.1,7,3.8,.12,3.8,[.22,.25,.27]);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;b(8+Math.cos(a)*3,.22,7+Math.sin(a)*3,.12,.12,.12,cyan);}
 b(8,.18,7,2.8,.035,2.8,[.36,.39,.39]);
 for(let i=0;i<2;i++){const x=4.8+i*1.15;b(x,.72,1,.36,.62,.36,[.62,.67,.65]);b(x,1.38,1,.28,.08,.28,amber);b(x,.12,1,.48,.12,.48,steel);}
 b(-5,.8,1.2,.14,1.25,.14,steel);b(-5,2.08,1.2,.68,.1,.1,pale);b(-5,2.38,1.2,.1,.34,.1,amber);b(-5,2.7,1.2,.16,.16,.16,cyan);
 for(const p of [[-3,-1],[3,-1],[-4,4],[4,4]]){b(p[0],.72,p[1],.08,.68,.08,steel);b(p[0],1.42,p[1],.24,.1,.24,amber);}
 for(let i=0;i<3;i++)b(-4.5+i*.62,.52,4.1,.46,.46,.46,i===1?amber:[.48,.51,.48]);
}
// A broken, stepped rim gives the playable plateau a readable asteroid silhouette.
const asteroidRim=[];
for(let i=0;i<52;i++){const a=i*Math.PI*2/52,r=31+(i%4)*.55,h=1.1+(i%5)*.34;asteroidRim.push({x:Math.cos(a)*r,z:Math.sin(a)*r,h,rot:-a,color:[.27+(i%3)*.025,.26+(i%3)*.025,.25+(i%3)*.025]});}

updateBuildCount();updateInventoryUI();

const keys=new Set();
function turnRover(dir){state.direction=(state.direction+dir+4)%4;state.targetYaw=state.direction*Math.PI/2;}
function localPoint(lx,ly,lz,yaw){const c=Math.cos(yaw),sn=Math.sin(yaw);return {x:rover.x+lx*c+lz*sn,y:terrainTop(rover.x,rover.z)+ly,z:rover.z-lx*sn+lz*c};}
function modelAxle(x,y,z,sx,sy,sz,yaw,roll=0){const c=Math.cos(yaw),sn=Math.sin(yaw),cr=Math.cos(roll),sr=Math.sin(roll);return [c*sx,0,-sn*sx,0,sn*sr*sy,cr*sy,c*sr*sy,0,-sn*cr*sz,-sr*sz,c*cr*sz,0,x,y,z,1];}
function roverBlocked(x,z){
 const radius=1.02;if(Math.hypot(x,z)>29.2)return true;
 for(const p of [[-2.05,-.55],[2.05,-.55],[-2.05,1.35],[2.05,1.35]])if(Math.hypot(x-p[0],z-p[1])<radius+.34)return true;
 for(const m of baseModules){const def=moduleCatalog[m.type],r=Math.max(def.size[0],def.size[2])*.72+radius;if(Math.hypot(x-m.x,z-m.z)<r)return true;}
 for(const rock of rocks)if(Math.hypot(x-rock.x,z-rock.z)<radius+rock.s*.72)return true;
 return false;
}
addEventListener("keydown",e=>{if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.code))e.preventDefault();if(e.code==="Escape"){if(!document.querySelector("#build-modal").classList.contains("hidden"))document.querySelector("#build-modal").classList.add("hidden");else togglePause();}if(e.code==="KeyE"&&state.running&&!state.paused&&!departure.active)mine();if(!state.running||state.paused||departure.active)return;if(!e.repeat&&(e.code==="KeyA"||e.code==="ArrowLeft"))turnRover(-1);if(!e.repeat&&(e.code==="KeyD"||e.code==="ArrowRight"))turnRover(1);if(["KeyW","ArrowUp","KeyS","ArrowDown"].includes(e.code))keys.add(e.code);});addEventListener("keyup",e=>keys.delete(e.code));
// Fixed isometric camera: no mouse look and no pointer lock.
const menu=document.querySelector("#menu"),pause=document.querySelector("#pause"),settings=document.querySelector("#settings"),toast=document.querySelector("#toast");let toastTimer;
function showToast(s){toast.textContent=s;toast.style.opacity="1";clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.style.opacity="0",1700);}
function start(){state.running=true;state.paused=false;keys.clear();rover.x=0;rover.z=-.7;cameraFollow.x=rover.x;cameraFollow.z=rover.z;state.yaw=Math.PI;state.targetYaw=Math.PI;state.direction=2;state.velocity=0;departure.active=true;departure.elapsed=0;departure.door=0;menu.classList.add("hidden");pause.classList.add("hidden");settings.classList.add("hidden");document.querySelector("#objective").textContent="Выезд из ангара: автоматическая последовательность";showToast("Открывается гараж. Подготовка к выезду…");}
function togglePause(){if(!state.running)return;state.paused=!state.paused;pause.classList.toggle("hidden",!state.paused);}
function quit(){state.running=false;state.paused=false;departure.active=false;keys.clear();pause.classList.add("hidden");menu.classList.remove("hidden");}
function updateOreRadar(){
 const c=document.querySelector("#radar-canvas");if(!c)return;const ctx=c.getContext("2d"),w=c.width,h=c.height,cx=w/2,cy=h/2,range=32,scale=w/(range*2);
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#101a28";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#ffffff18";ctx.lineWidth=1;
 for(let r=16;r<=32;r+=16){ctx.beginPath();ctx.arc(cx,cy,r*scale,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();
 let count=0;
 for(const n of ores){if(!n.available)continue;count++;const x=cx+(n.x-rover.x)*scale,y=cy+(n.z-rover.z)*scale;if(x<4||x>w-4||y<4||y>h-4)continue;ctx.fillStyle=n.resource.id==="iron"?"#b86e49":n.resource.id==="titanium"?"#94aebe":"#d1b75b";ctx.beginPath();ctx.arc(x,y,4.2,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ffffff99";ctx.stroke();}
 for(const m of baseModules){const x=cx+(m.x-rover.x)*scale,y=cy+(m.z-rover.z)*scale;ctx.fillStyle="#b7f36b";ctx.fillRect(x-2,y-2,4,4);}
 ctx.fillStyle="#ffffff";ctx.beginPath();ctx.moveTo(cx,cy-7);ctx.lineTo(cx-5,cy+5);ctx.lineTo(cx+5,cy+5);ctx.closePath();ctx.fill();
 const label=document.querySelector("#radar-count");if(label)label.textContent=count;
}
function updateInventoryUI(){
 const total=state.inventory.iron+state.inventory.titanium+state.inventory.silicon;
 document.querySelector("#ore").textContent=total;
 document.querySelector("#cargo-total").textContent=total+" / "+state.cargoCapacity+" кг";
 document.querySelector("#cargo-fill").style.width=(total/state.cargoCapacity*100)+"%";
 for(const id of Object.keys(state.inventory))document.querySelector("#"+id+"-amount").textContent=state.inventory[id]+" кг";
}
function mine(){
 let nearest=null,distance=2.4;
 ores.forEach(n=>{const d=Math.hypot(n.x-rover.x,n.z-rover.z);if(n.available&&d<distance){nearest=n;distance=d;}});
 if(!nearest){showToast("Нет залежей поблизости");return;}
 if(state.energy<3){showToast("Недостаточно энергии для бурения");return;}
 const total=state.inventory.iron+state.inventory.titanium+state.inventory.silicon;
 const amount=nearest.cells.length*6;
 if(total+amount>state.cargoCapacity){showToast("Контейнер заполнен. Освободите место на базе.");return;}
 nearest.available=false;state.inventory[nearest.resource.id]+=amount;state.ore+=amount;
 state.energy=Math.max(0,state.energy-3);
 updateInventoryUI();document.querySelector("#energy").textContent=Math.round(state.energy);
 showToast(nearest.resource.label+": добыто "+amount+" кг");
 document.querySelector("#objective").textContent=state.ore>=60?"Цель выполнена: собрано 60 кг ресурсов":"Соберите не менее 60 кг минералов";
}

document.querySelector("#start-btn").onclick=start;document.querySelector("#resume-btn").onclick=togglePause;document.querySelector("#quit-btn").onclick=quit;
document.querySelector("#settings-btn").onclick=()=>{menu.classList.add("hidden");settings.classList.remove("hidden");};document.querySelector("#settings-back").onclick=()=>{settings.classList.add("hidden");menu.classList.remove("hidden");};

document.querySelector("#max-speed").oninput=e=>{state.maxSpeed=+e.target.value;document.querySelector("#speed-value").value=e.target.value;};
document.querySelector("#sound").onchange=()=>showToast("Звук будет добавлен позднее");
function resize(){const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.floor(innerWidth*dpr);canvas.height=Math.floor(innerHeight*dpr);canvas.style.width="100%";canvas.style.height="100%";gl.viewport(0,0,canvas.width,canvas.height);}addEventListener("resize",resize);resize();
gl.enable(gl.DEPTH_TEST);gl.clearColor(.035,.05,.085,1);
let previous=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-previous)/1000,.05);previous=now;
if(state.running&&!state.paused){
 if(departure.active){
  departure.elapsed+=dt;
  departure.door=Math.min(1,departure.elapsed/1.25);
  const t=Math.max(0,Math.min(1,(departure.elapsed-1.25)/4.1)),ease=t*t*(3-2*t);
  rover.x=0;rover.z=-.7+6.1*ease;state.yaw=Math.PI;state.targetYaw=Math.PI;state.velocity=t<1?state.maxSpeed/3.6:0;
  document.querySelector("#speed").textContent=Math.round(Math.abs(state.velocity)*3.6);
  if(departure.elapsed>=5.35){departure.active=false;departure.door=1;rover.z=5.4;state.velocity=0;keys.clear();document.querySelector("#speed").textContent="0";document.querySelector("#objective").textContent="Выезд завершён. Исследуйте поверхность и добывайте ресурсы";showToast("Луноход у подножья горы. Управление доступно.");}
 }else{
  const forward=(keys.has("KeyW")||keys.has("ArrowUp")?1:0)-(keys.has("KeyS")||keys.has("ArrowDown")?1:0);
  const targetVelocity=forward*state.maxSpeed/3.6;
  state.velocity+=(targetVelocity-state.velocity)*Math.min(1,dt*4.5);
  let angleDelta=((state.targetYaw-state.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  const turnStep=3.6*dt;state.yaw+=Math.max(-turnStep,Math.min(turnStep,angleDelta));
  const dx=-Math.sin(state.yaw)*state.velocity*dt,dz=-Math.cos(state.yaw)*state.velocity*dt;
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18)),sx=dx/steps,sz=dz/steps;
  for(let step=0;step<steps;step++){const nx=rover.x+sx,nz=rover.z+sz;if(roverBlocked(nx,nz)){state.velocity=0;break;}rover.x=nx;rover.z=nz;wheelTravel+=Math.hypot(sx,sz)/.4;}
  roverParts.bucketAngle=-.18+Math.sin(now*.0018)*.025;
  document.querySelector("#speed").textContent=Math.round(Math.abs(state.velocity)*3.6);if(forward!==0)state.energy=Math.max(0,state.energy-dt*.035);document.querySelector("#energy").textContent=Math.round(state.energy);
 }
}
updateOreRadar();cameraFollow.x+=(rover.x-cameraFollow.x)*Math.min(1,dt*5);cameraFollow.z+=(rover.z-cameraFollow.z)*Math.min(1,dt*5);const eye=[cameraFollow.x+15,20,cameraFollow.z+17],center=[cameraFollow.x,0.8,cameraFollow.z];viewProjection=mul(perspective(Math.PI/4.2,canvas.width/canvas.height,.1,260),lookAt(eye,center));gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
// The playable ground is assembled from voxel tiles; no infinite flat plane.
voxelBatches.forEach(b=>draw(matIdentity(),b.color,b.geometry));
asteroidRim.forEach(r=>draw(model(r.x,r.h*.38,r.z,1.55,r.h,r.h*.92,r.rot),r.color));
drawOutpost();
rocks.forEach(r=>draw(model(r.x,terrainTop(r.x,r.z)+r.s*.5,r.z,r.s,r.s,r.s),r.color));
ores.forEach(n=>{if(n.available){n.cells.forEach(c=>draw(model(c.x,terrainTop(c.x,c.z)+.62+Math.sin(now*.001+n.phase)*.035,c.z,VOX*.48,VOX*.48,VOX*.48),n.resource.color));const gy=terrainTop(n.x,n.z),pulse=.12+Math.sin(now*.002+n.phase)*.035;draw(model(n.x,gy+1.35,n.z,.09,.72,.09),n.resource.color);draw(model(n.x,gy+2.08,n.z,.3+pulse,.3+pulse,.3+pulse),n.resource.color,oct);draw(model(n.x,gy+2.48,n.z,.12,.12,.12),[.92,.94,.82],oct);}});
baseModules.forEach(drawBaseModule);\nconst chosen=baseModules.find(m=>m.id===selectedBuildingId);if(chosen)draw(model(chosen.x,terrainTop(chosen.x,chosen.z)+.18,chosen.z,moduleCatalog[chosen.type].size[0]*1.18,.035,moduleCatalog[chosen.type].size[2]*1.18,chosen.rotation||0),[.22,.9,1]);
const ry=state.yaw;
const chassis=(lx,ly,lz,sx,sy,sz,color)=>{const p=localPoint(lx,ly,lz,ry);draw(model(p.x,p.y,p.z,sx,sy,sz,ry),color);};
chassis(0,1.0,0,1.0,.28,1.25,[.72,.74,.7]);chassis(0,1.34,-.18,.58,.34,.58,[.14,.2,.24]);chassis(0,1.48,-.18,.42,.19,.42,[.12,.42,.5]);
for(const side of [-1,1])for(const front of [-1,1]){const p=localPoint(side*.92,.48,front*.82,ry);draw(modelAxle(p.x,p.y,p.z,.19,.4,.4,ry,wheelTravel),[.075,.09,.11],wheelGeometry);draw(modelAxle(p.x,p.y,p.z,.195,.27,.27,ry,wheelTravel),[.42,.46,.47],wheelGeometry);}
const ba=roverParts.bucketAngle;
for(const side of [-1,1]){const arm=localPoint(side*.42,1.08,-1.28,ry);draw(modelAxle(arm.x,arm.y,arm.z,.105,.13,.72,ry,ba),[.78,.53,.22]);}
const bucket=localPoint(0,.83,-1.75,ry);draw(modelAxle(bucket.x,bucket.y,bucket.z,.52,.18,.38,ry,ba),[.82,.57,.24]);
const lip=localPoint(0,.73,-1.98,ry);draw(model(lip.x,lip.y,lip.z,.48,.06,.08,ry),[.42,.31,.19]);
chassis(-.85,1.7,-.5,.12,.35,.12,[.25,.28,.3]);chassis(-.85,2.05,-.5,.18,.18,.18,[.86,.62,.24]);
}
requestAnimationFrame(frame);
})();