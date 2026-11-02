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
// === Player construction: catalog modal -> world placement -> owned buildings dock ===
const moduleCatalog={
 habitat:{label:"Жилой модуль",color:[.72,.76,.72],size:[1.45,1.05,1.45]},
 solar:{label:"Солнечная панель",color:[.2,.42,.72],size:[1.55,.12,1.25]},
 storage:{label:"Склад ресурсов",color:[.68,.48,.28],size:[1.25,.85,1.25]},
 lab:{label:"Лаборатория",color:[.58,.68,.76],size:[1.35,1,1.35]},
 comms:{label:"Станция связи",color:[.24,.66,.72],size:[1.35,1.35,1.35]},
 landing:{label:"Посадочная площадка",color:[.68,.72,.68],size:[2.5,.12,2.5]},
 factory:{label:"Завод",color:[.72,.48,.28],size:[1.75,1.15,1.75]}
};
const buildSizes={solar:"3.1 × 2.5 м",storage:"2.5 × 2.5 м",lab:"2.7 × 2.7 м",habitat:"2.9 × 2.9 м",comms:"3 × 3 м",landing:"5 × 5 м",factory:"3.5 × 3.5 м"};
let selectedModule="solar",moduleRotation=0,pendingPlacement=false,selectedBuildingId=null,previewWorld=null,previewValid=false;
let baseModules=[];
try{
 const saved=JSON.parse(localStorage.getItem("lunar-base-modules-v3")||"null");
 if(Array.isArray(saved))baseModules=saved.filter(m=>moduleCatalog[m.type]&&Number.isFinite(m.x)&&Number.isFinite(m.z));
}catch(_){baseModules=[];}
function persistBase(){try{localStorage.setItem("lunar-base-modules-v3",JSON.stringify(baseModules));}catch(_){showToast("Не удалось сохранить базу в браузере");}}
function updateBuildCount(){const el=document.querySelector("#build-count");if(el)el.textContent=String(baseModules.length);}
function refreshBuildingDock(){
 const list=document.querySelector("#player-building-list");if(!list)return;
 list.replaceChildren();
 if(!baseModules.length){const empty=document.createElement("span");empty.className="empty-buildings";empty.textContent="Построек пока нет";list.append(empty);}
 baseModules.forEach((m,index)=>{
  const item=document.createElement("button");item.type="button";item.className="owned-building"+(m.id===selectedBuildingId?" selected":"");
  item.dataset.buildingId=m.id;
  const title=document.createElement("b");title.textContent=moduleCatalog[m.type].label;
  const meta=document.createElement("small");meta.textContent="Модуль "+(index+1)+" · "+buildSizes[m.type];
  item.append(title,meta);item.addEventListener("click",()=>{selectedBuildingId=m.id;pendingPlacement=false;refreshBuildingDock();showToast(moduleCatalog[m.type].label+" выбрана");});
  list.append(item);
 });
 updateBuildCount();
}
function setPlacementMessage(message,valid){
 const el=document.querySelector("#placement-message"),hint=document.querySelector("#placement-hint"),dot=document.querySelector(".placement-dot");
 if(el)el.textContent=message;
 if(hint)hint.classList.toggle("invalid",valid===false);
 if(dot)dot.style.background=valid===false?"#ff5364":"#8bea65";
}
function openBuildCatalog(){pendingPlacement=false;document.querySelector("#build-modal").classList.remove("hidden");}
function closeBuildCatalog(){const modal=document.querySelector("#build-modal");if(modal)modal.classList.add("hidden");}
function showPlacementHint(show){const hint=document.querySelector("#placement-hint");if(hint)hint.classList.toggle("hidden",!show);}
function beginPlacement(type){
 if(!moduleCatalog[type])return;
 selectedModule=type;moduleRotation=0;selectedBuildingId=null;pendingPlacement=true;previewWorld=null;
 closeBuildCatalog();showPlacementHint(true);
 setPlacementMessage("Переместите курсор по поверхности",true);
 refreshBuildingDock();
}
document.querySelector("#open-build-modal").addEventListener("click",openBuildCatalog);
document.querySelector("#close-build-modal").addEventListener("click",closeBuildCatalog);
document.querySelectorAll(".module-choice").forEach(button=>button.addEventListener("click",()=>beginPlacement(button.dataset.module)));
function rotatePlacement(){moduleRotation=(moduleRotation+Math.PI/2)%(Math.PI*2);if(pendingPlacement)setPlacementMessage("Поворот: "+Math.round(moduleRotation*180/Math.PI)+"°",previewValid);}
function cancelPlacement(){pendingPlacement=false;previewWorld=null;showPlacementHint(false);refreshBuildingDock();}
function inverseMatrix(a){
 const out=new Array(16),a00=a[0],a01=a[1],a02=a[2],a03=a[3],a10=a[4],a11=a[5],a12=a[6],a13=a[7],a20=a[8],a21=a[9],a22=a[10],a23=a[11],a30=a[12],a31=a[13],a32=a[14],a33=a[15];
 const b00=a00*a11-a01*a10,b01=a00*a12-a02*a10,b02=a00*a13-a03*a10,b03=a01*a12-a02*a11,b04=a01*a13-a03*a11,b05=a02*a13-a03*a12,b06=a20*a31-a21*a30,b07=a20*a32-a22*a30,b08=a20*a33-a23*a30,b09=a21*a32-a22*a31,b10=a21*a33-a23*a31,b11=a22*a33-a23*a32;
 let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;if(!det)return null;det=1/det;
 out[0]=(a11*b11-a12*b10+a13*b09)*det;out[1]=(a02*b10-a01*b11-a03*b09)*det;out[2]=(a31*b05-a32*b04+a33*b03)*det;out[3]=(a22*b04-a21*b05-a23*b03)*det;
 out[4]=(a12*b08-a10*b11-a13*b07)*det;out[5]=(a00*b11-a02*b08+a03*b07)*det;out[6]=(a32*b02-a30*b05-a33*b01)*det;out[7]=(a20*b05-a22*b02+a23*b01)*det;
 out[8]=(a10*b10-a11*b08+a13*b06)*det;out[9]=(a01*b08-a00*b10-a03*b06)*det;out[10]=(a30*b04-a31*b02+a33*b00)*det;out[11]=(a21*b02-a20*b04-a23*b00)*det;
 out[12]=(a11*b07-a10*b09-a12*b06)*det;out[13]=(a00*b09-a01*b07+a02*b06)*det;out[14]=(a31*b01-a30*b03-a32*b00)*det;out[15]=(a20*b03-a21*b01+a22*b00)*det;return out;
}
function unproject(inv,x,y,z){const p=[inv[0]*x+inv[4]*y+inv[8]*z+inv[12],inv[1]*x+inv[5]*y+inv[9]*z+inv[13],inv[2]*x+inv[6]*y+inv[10]*z+inv[14],inv[3]*x+inv[7]*y+inv[11]*z+inv[15]];return [p[0]/p[3],p[1]/p[3],p[2]/p[3]];}
function pointerWorld(e){
 const r=canvas.getBoundingClientRect(),nx=((e.clientX-r.left)/r.width)*2-1,ny=1-((e.clientY-r.top)/r.height)*2,inv=inverseMatrix(viewProjection);if(!inv)return null;
 const near=unproject(inv,nx,ny,-1),far=unproject(inv,nx,ny,1),dir=norm(sub(far,near));if(Math.abs(dir[1])<.0001)return null;
 let t=(terrainTop(near[0],near[2])-near[1])/dir[1],x=near[0]+dir[0]*t,z=near[2]+dir[2]*t;
 for(let i=0;i<3;i++){t=(terrainTop(x,z)-near[1])/dir[1];x=near[0]+dir[0]*t;z=near[2]+dir[2]*t;}
 return {x:Math.round(x*2)/2,z:Math.round(z*2)/2};
}
function footprint(type,rotation){const size=moduleCatalog[type].size;return Math.abs(Math.cos(rotation))>.5?{x:size[0],z:size[2]}:{x:size[2],z:size[0]};}
function validBuildPosition(p,type,rotation,ignoreId=null){
 if(!p||Math.hypot(p.x,p.z)>27)return {ok:false,reason:"За пределами строительной зоны"};
 const f=footprint(type,rotation),hx=f.x+.18,hz=f.z+.18;
 const ground=[[-hx,-hz],[hx,-hz],[-hx,hz],[hx,hz]].map(([x,z])=>terrainTop(p.x+x,p.z+z));
 if(Math.max(...ground)-Math.min(...ground)>.95)return {ok:false,reason:"Слишком неровная поверхность"};
 if(Math.hypot(p.x-rover.x,p.z-rover.z)<Math.max(hx,hz)+1.15)return {ok:false,reason:"Слишком близко к луноходу"};
 for(const m of baseModules){if(m.id===ignoreId)continue;const other=footprint(m.type,m.rotation||0);if(Math.abs(p.x-m.x)<(hx+other.x/2+.2)&&Math.abs(p.z-m.z)<(hz+other.z/2+.2))return {ok:false,reason:"Пересечение с другой постройкой"};}
 for(const rock of rocks){const dx=Math.max(Math.abs(rock.x-p.x)-hx,0),dz=Math.max(Math.abs(rock.z-p.z)-hz,0);if(dx*dx+dz*dz<Math.pow(rock.s*.85+.12,2))return {ok:false,reason:"На этом месте находится камень"};}
 return {ok:true,reason:"Место подходит для строительства"};
}
function placePendingModule(){
 if(!pendingPlacement||!previewWorld)return;
 const check=validBuildPosition(previewWorld,selectedModule,moduleRotation);
 if(!check.ok){setPlacementMessage(check.reason,false);return;}
 const m={id:"build-"+Date.now()+"-"+Math.floor(Math.random()*10000),type:selectedModule,x:previewWorld.x,z:previewWorld.z,rotation:moduleRotation};
 baseModules.push(m);selectedBuildingId=m.id;persistBase();refreshBuildingDock();pendingPlacement=false;previewWorld=null;
 showPlacementHint(false);showToast(moduleCatalog[m.type].label+" построена");
}
function pickBuilding(p){
 if(!p)return null;let best=null,bestScore=Infinity;
 for(const m of baseModules){const f=footprint(m.type,m.rotation||0),dx=Math.abs(p.x-m.x),dz=Math.abs(p.z-m.z);if(dx<=f.x/2+.35&&dz<=f.z/2+.35){const score=dx+dz;if(score<bestScore){best=m;bestScore=score;}}}
 return best;
}
canvas.addEventListener("pointermove",e=>{if(!pendingPlacement)return;previewWorld=pointerWorld(e);const check=validBuildPosition(previewWorld,selectedModule,moduleRotation);previewValid=check.ok;setPlacementMessage(check.reason,check.ok);});
canvas.addEventListener("pointerdown",e=>{
 if(!pendingPlacement){const p=pointerWorld(e),hit=pickBuilding(p);if(hit){selectedBuildingId=hit.id;refreshBuildingDock();showToast(moduleCatalog[hit.type].label+" выбрана");}return;}
 previewWorld=pointerWorld(e);const check=validBuildPosition(previewWorld,selectedModule,moduleRotation);previewValid=check.ok;setPlacementMessage(check.reason,check.ok);if(check.ok)placePendingModule();
});
addEventListener("keydown",e=>{
 if(e.code==="Escape"){if(pendingPlacement)cancelPlacement();else if(!document.querySelector("#build-modal").classList.contains("hidden"))closeBuildCatalog();}
 if(e.code==="KeyR"&&pendingPlacement)rotatePlacement();
});
if(new URLSearchParams(location.search).has("builder")||document.body.dataset.builder==="true"){
 document.querySelector("#menu").classList.add("hidden");closeBuildCatalog();state.running=true;
}
refreshBuildingDock();
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
 }else if(m.type==="comms"){
  box(m.x,.8,m.z,1.1,.8,1.1,def.color);box(m.x,2,m.z,.12,1.1,.12,metal);box(m.x,3.1,m.z,.7,.08,.08,light);box(m.x,3.1,m.z,.08,.7,.08,light);
 }else if(m.type==="landing"){
  box(m.x,.2,m.z,2.45,.12,2.45,[.34,.39,.4]);for(let q=-1;q<=1;q+=2){box(m.x+q*1.9,.3,m.z,.08,.2,2.05,[.9,.62,.25]);box(m.x,.3,m.z+q*1.9,2.05,.2,.08,[.9,.62,.25]);}
 }else if(m.type==="factory"){
  box(m.x,.95,m.z,1.72,.95,1.72,def.color);box(m.x,2.05,m.z,.9,.18,.9,metal);for(let q=-1;q<=1;q++)box(m.x+q*.58,2.42,m.z,.16,.5,.16,orange);
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
baseModules.forEach(drawBaseModule);
if(pendingPlacement&&previewWorld){
 const ground=terrainTop(previewWorld.x,previewWorld.z),f=footprint(selectedModule,moduleRotation),color=previewValid?[.18,.88,.28]:[.95,.12,.18];
 draw(model(previewWorld.x,ground+.22,previewWorld.z,f.x/2,.12,f.z/2,moduleRotation),color);
 draw(model(previewWorld.x,ground+.37,previewWorld.z,.13,.13,.13),color);
}
const chosen=baseModules.find(m=>m.id===selectedBuildingId);if(chosen)draw(model(chosen.x,terrainTop(chosen.x,chosen.z)+.18,chosen.z,moduleCatalog[chosen.type].size[0]*1.18,.035,moduleCatalog[chosen.type].size[2]*1.18,chosen.rotation||0),[.22,.9,1]);
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