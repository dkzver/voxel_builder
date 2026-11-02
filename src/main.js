import * as THREE from "three";

const root = document.querySelector("#game-root");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090d18);
scene.fog = new THREE.Fog(0x090d18, 45, 145);
const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 250);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
root.prepend(renderer.domElement);

scene.add(new THREE.HemisphereLight(0x9eb8df, 0x4b382b, 2.0));
const sun = new THREE.DirectionalLight(0xffe2b0, 3.1);
sun.position.set(-35, 55, 20); sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -45; sun.shadow.camera.right = 45; sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
scene.add(sun);

const terrainMat = new THREE.MeshStandardMaterial({ color: 0x77716b, roughness: 1 });
const terrain = new THREE.Mesh(new THREE.PlaneGeometry(260, 260, 1, 1), terrainMat);
terrain.rotation.x = -Math.PI / 2; terrain.position.y = -0.3; terrain.receiveShadow = true; scene.add(terrain);

// A procedural field of low-poly lunar mounds and scattered rock blocks.
let seed = 92751;
function random(){ seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
const moundMat = new THREE.MeshStandardMaterial({ color: 0x5e5b58, roughness: 1, flatShading: true });
for(let i=0;i<110;i++){
  const radius=1.4+random()*5.2, height=.25+random()*1.5;
  const mound=new THREE.Mesh(new THREE.IcosahedronGeometry(radius,1),moundMat);
  mound.scale.y=height/radius; mound.position.set((random()-.5)*180,-.25+height*.25,(random()-.5)*180);
  mound.rotation.set(random()*.2,random()*Math.PI,random()*.2); mound.receiveShadow=true; mound.castShadow=true; scene.add(mound);
}
const rockMat=new THREE.MeshStandardMaterial({color:0x88817a,roughness:1,flatShading:true});
for(let i=0;i<170;i++){
  const s=.25+random()*1.25;
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(s,0),rockMat);
  rock.position.set((random()-.5)*170,s*.5,(random()-.5)*170);
  rock.rotation.set(random()*3,random()*3,random()*3); rock.castShadow=true; rock.receiveShadow=true; scene.add(rock);
}

// Rover blockout: chassis, cabin, wheels, mast. Replaceable by a detailed model in a later stage.
const rover = new THREE.Group(); scene.add(rover);
const darkMat=new THREE.MeshStandardMaterial({color:0x202a35,metalness:.55,roughness:.5});
const bodyMat=new THREE.MeshStandardMaterial({color:0xc6c7bd,metalness:.35,roughness:.65});
const goldMat=new THREE.MeshStandardMaterial({color:0xb88b42,metalness:.65,roughness:.35});
const chassis=new THREE.Mesh(new THREE.BoxGeometry(2.25,.55,3.1),bodyMat); chassis.position.y=1.05; chassis.castShadow=true; rover.add(chassis);
const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.25,.65,1.05),darkMat); cabin.position.set(0,1.62,-.25); cabin.castShadow=true; rover.add(cabin);
const solar=new THREE.Mesh(new THREE.BoxGeometry(3.8,.08,1.35),goldMat); solar.position.set(0,1.7,1.05); solar.castShadow=true; rover.add(solar);
const wheelGeo=new THREE.CylinderGeometry(.48,.48,.34,12);
const wheels=[];
for(const x of [-1.18,1.18]) for(const z of [-1.05,1.05]){
  const w=new THREE.Mesh(wheelGeo,darkMat); w.rotation.z=Math.PI/2; w.position.set(x,.55,z); w.castShadow=true; rover.add(w); wheels.push(w);
}
rover.position.set(0,0,0);

const oreNodes=[];
const oreMat=new THREE.MeshStandardMaterial({color:0x78e8cb,emissive:0x12483b,metalness:.7,roughness:.25});
for(let i=0;i<22;i++){
  const node=new THREE.Mesh(new THREE.OctahedronGeometry(.7+random()*.45,0),oreMat);
  node.position.set((random()-.5)*105,.65,(random()-.5)*105);
  if(node.position.length()<12) node.position.x+=20;
  node.userData.available=true; node.castShadow=true; scene.add(node); oreNodes.push(node);
}

const state={running:false,paused:false,energy:100,ore:0,speed:0,maxSpeed:12,sensitivity:.5,yaw:0,velocity:0};
const keys=new Set();
addEventListener("keydown",e=>{keys.add(e.code); if(["Space","ArrowUp","ArrowDown"].includes(e.code))e.preventDefault(); if(e.code==="Escape")togglePause(); if(e.code==="KeyE"&&state.running&&!state.paused)mine();});
addEventListener("keyup",e=>keys.delete(e.code));
renderer.domElement.addEventListener("click",()=>{if(state.running&&!state.paused)renderer.domElement.requestPointerLock?.();});
addEventListener("mousemove",e=>{if(document.pointerLockElement===renderer.domElement&&state.running&&!state.paused)state.yaw-=e.movementX*.002*state.sensitivity;});
const cameraOffset=new THREE.Vector3(0,5.4,9.2);
const clock=new THREE.Clock();
const speedEl=document.querySelector("#speed"),energyEl=document.querySelector("#energy"),oreEl=document.querySelector("#ore"),objectiveEl=document.querySelector("#objective");
const menu=document.querySelector("#menu"),pause=document.querySelector("#pause"),settings=document.querySelector("#settings"),toast=document.querySelector("#toast");
let toastTimer;
function showToast(message){toast.textContent=message;toast.style.opacity="1";clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.style.opacity="0",1800);}
function start(){state.running=true;state.paused=false;menu.classList.add("hidden");pause.classList.add("hidden");settings.classList.add("hidden");renderer.domElement.requestPointerLock?.();objectiveEl.textContent="Найдите залежи минералов и добудьте ресурсы";}
function togglePause(){if(!state.running)return;state.paused=!state.paused;pause.classList.toggle("hidden",!state.paused);if(state.paused)document.exitPointerLock?.();else renderer.domElement.requestPointerLock?.();}
function quit(){state.running=false;state.paused=false;pause.classList.add("hidden");menu.classList.remove("hidden");document.exitPointerLock?.();}
function mine(){
  let nearest=null,dist=4.8;
  for(const n of oreNodes){if(!n.userData.available)continue;const d=n.position.distanceTo(rover.position);if(d<dist){nearest=n;dist=d;}}
  if(!nearest){showToast("Нет залежей поблизости");return;}
  nearest.userData.available=false;nearest.visible=false;state.ore+=12;state.energy=Math.max(0,state.energy-3);
  oreEl.textContent=state.ore;energyEl.textContent=Math.round(state.energy);showToast("+12 кг минералов");objectiveEl.textContent=state.ore>=60?"Цель выполнена: ресурсы собраны":"Продолжайте сбор минералов";
}
document.querySelector("#start-btn").addEventListener("click",start);
document.querySelector("#resume-btn").addEventListener("click",togglePause);
document.querySelector("#quit-btn").addEventListener("click",quit);
document.querySelector("#settings-btn").addEventListener("click",()=>{menu.classList.add("hidden");settings.classList.remove("hidden");});
document.querySelector("#settings-back").addEventListener("click",()=>{settings.classList.add("hidden");menu.classList.remove("hidden");});
document.querySelector("#sensitivity").addEventListener("input",e=>{state.sensitivity=Number(e.target.value);document.querySelector("#sens-value").value=e.target.value;});
document.querySelector("#max-speed").addEventListener("input",e=>{state.maxSpeed=Number(e.target.value);document.querySelector("#speed-value").value=e.target.value;});
document.querySelector("#sound").addEventListener("change",()=>showToast("Звуковая система будет добавлена на следующем этапе"));

function update(dt){
  if(state.running&&!state.paused){
    const forward=(keys.has("KeyW")||keys.has("ArrowUp")?1:0)-(keys.has("KeyS")||keys.has("ArrowDown")?1:0);
    const turn=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);
    state.yaw-=turn*dt*(Math.abs(state.velocity)>.1?1.55:1.1);
    const target=forward*state.maxSpeed;
    state.velocity=THREE.MathUtils.damp(state.velocity,target,forward?2.2:3.3,dt);
    const direction=new THREE.Vector3(Math.sin(state.yaw),0,Math.cos(state.yaw));
    rover.position.addScaledVector(direction,-state.velocity*dt*.42);
    rover.rotation.y=state.yaw;
    wheels.forEach(w=>w.rotation.x+=state.velocity*dt);
    state.speed=Math.round(Math.abs(state.velocity)*3.6);
    speedEl.textContent=state.speed;
    if(Math.abs(state.velocity)>.1)state.energy=Math.max(0,state.energy-dt*.035);
    energyEl.textContent=Math.round(state.energy);
  }
  const desired=rover.position.clone().add(cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),state.yaw));
  camera.position.lerp(desired,.09);
  camera.lookAt(rover.position.x,rover.position.y+1.15,rover.position.z);
  oreNodes.forEach(n=>{if(n.userData.available)n.rotation.y+=dt*.25;});
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera);}
animate();
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));});
