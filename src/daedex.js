import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector(".element");

// Scene
const scene = new THREE.Scene();
scene.background = null;


// Camera
const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(5, 4 , 9);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// Light
const light = new THREE.DirectionalLight(0xffffff, 6);
light.position.set(-7, -7, 10);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040); // Soft light
scene.add(ambientLight);


// // Axes y grid para orientarte
// scene.add(new THREE.AxesHelper(1));      // 1 unidad = 1 metro aprox (tu escala puede variar)
// scene.add(new THREE.GridHelper(10, 10)); // grilla 10x10

// Luz puntual violeta con alcance infinito
const dirLight = new THREE.DirectionalLight(0x7777e7, 2);
dirLight.position.set(-2, 1, 4);
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight, dirLight.target);

// helper
// const dirHelper = new THREE.DirectionalLightHelper(dirLight, 1);
// scene.add(dirHelper);


// (Opcional) un AxesHelper para orientarte
//scene.add(new THREE.AxesHelper(1));

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
// 6) OrbitControls un poco más “pesado” = menos frame-churn
controls.enableDamping = true;
controls.dampingFactor = 0.08; // si tiembla, subí a 0.12
controls.enableDamping = true;

// Load GLB
const loader = new GLTFLoader();
loader.load(
  "https://daedex.netlify.app/d12.glb", // Ruta a tu archivo GLB
  (gltf) => {
    const obj = gltf.scene;               // o: gltf.scene.getObjectByName("NombreDelNodo")
    scene.add(obj);
    // obj.traverse((child) => {
    //     if (child.isMesh) {
    //       child.material = new THREE.MeshStandardMaterial({
    //         color: 0x7777e7,     // violeta metálico (cambiá a gusto)
    //         metalness: 1.0,      // 1 = totalmente metálico
    //         roughness: 0.2,      // 0 = espejo, 1 = mate
    //         envMapIntensity: 1.0 // cuánto refleja el entorno
    //       });
    //       child.castShadow = true;
    //       child.receiveShadow = true;
    //     }
    //   });

    // --- Responsive simple ---
function applyResponsiveScale() {
    if (window.innerWidth < 600) {
      obj.scale.set(0.6, 0.6, 0.6);   // mobile
    } else if (window.innerWidth < 1024) {
      obj.scale.set(0.8, 0.8, 0.8);   // tablet
    } else {
      obj.scale.set(1, 1, 1);         // desktop
    }
  }
  
  // primera pasada
  applyResponsiveScale();
  
  // al cambiar tamaño
  window.addEventListener("resize", applyResponsiveScale);
  
       // Buscar el mesh "white dentor"
       const whiteDentor = obj.getObjectByName("Plane004_2");
       if (whiteDentor && whiteDentor.isMesh) {
         console.log("Material antes:", whiteDentor.material);
   
         // Ajustar propiedades del material
         whiteDentor.material.metalness = 0.4;   // más metálico
         whiteDentor.material.roughness = 1.0;   // más pulido
         whiteDentor.material.color.set(0xffffff); // blanco puro
         whiteDentor.material.needsUpdate = true;
       }
       obj.traverse((child) => {
        if (child.isMesh) {
          console.log("Mesh:", child.name, child.material);
        } else {
          console.log("Node:", child.name);
        }
      });

       const grayDentor = obj.getObjectByName("Plane004");
       const airDentor = obj.getObjectByName("Plane004_3");
       [grayDentor, airDentor].forEach(mesh => {
        if (mesh && mesh.isMesh) {
          mesh.material.metalness = 1;
          mesh.material.roughness = 0.6;
          mesh.material.color.set(0xe7e7e7e);
        }
      });
    
    // (Opcional) centrar el modelo al origen para que orbite/escale lindo
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.sub(center);

      // Helper deg->rad
      const degToRad = (deg) => deg * Math.PI / 180;

      // Estado inicial equivalente al tuyo
      gsap.set(obj.position, { x: 0, y: -7 }); // estado inicial
      gsap.defaults({ overwrite: "auto" });
  
      // Un único timeline con ScrollTrigger
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "[step-1]",
          start: "top top",
          end: "center top",
          scrub: 2,           // o 3 si querés más inercia
          // markers: true,
          // pin: true,
        }
      });
  
      // Posición en 2 etapas
      tl.to(obj.position, {
        keyframes: [
          { x: 0,   y: 0,  duration: 0.3, ease: "power2.out" },
          { x: -6, y: -2,  duration: 0.4, ease: "power3.in" }
        ]
      }, 0)
  
      // Label para sincronizar rotación y escala
      .addLabel("pose", 0.2)
      .to(dirLight.position, {
        x: -5,
        y: 12,
        z: 8,
        ease: "power2.inOut"
      }, 0)

      .to(dirLight.target.position, {
        x: 0,
        y: 0,
        z: 0,
        ease: "power2.inOut"
      }, 0)
      // Rotación y escala (mismo inicio/duración/ease)
      .to(obj.rotation, {
        x: degToRad(70),
        y: degToRad(10),
        z: degToRad(-30),
        duration: 0.6,
        ease: "power3.inOut",
        overwrite: false
      }, "pose")
      .to(light, { intensity: 4 }, 0)
      .to(obj.scale, {
        x: 1.5, y: 1.5, z: 1.5,      // ojo: 30 es MUY grande si tu GLB ya viene grande
        duration: 0.6,
        ease: "power3.inOut",
        overwrite: false
      }, "pose");



  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.error("An error happened", error);
  }
);

// Responsive
window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
  
    renderer.setPixelRatio(
      window.innerWidth < 600 ? 1 : Math.min(2, window.devicePixelRatio)
    );
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

// Animation loop
const animate = () => {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
};

animate();



const deg = d => d * Math.PI / 180;
const Viewers = new Map(); // hostEl -> { host, renderer, scene, camera, model, modelSize, zoom, raf, ro }

// Centra el pivote del modelo para que rote sobre su centro
function centerPivot(object3d){
  const box = new THREE.Box3().setFromObject(object3d);
  const center = box.getCenter(new THREE.Vector3());
  const size   = box.getSize(new THREE.Vector3());
  const pivot  = new THREE.Group();
  object3d.position.sub(center);   // deja el modelo en origen
  pivot.add(object3d);
  return { pivot, size };
}

// Encuadre mirando al origen (0,0,0), manteniendo el modelo centrado en pantalla
function frameAtOrigin(camera, sizeVec3, zoom=1){
  const maxDim = Math.max(sizeVec3.x, sizeVec3.y, sizeVec3.z);
  let dist = (maxDim/2) / Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
  dist *= zoom;
  camera.position.set(0, 0, dist);
  camera.near = Math.max(0.01, dist/100);
  camera.far  = dist*100;
  camera.updateProjectionMatrix();
  camera.lookAt(0,0,0);
}

function initViewer(host){
  if (Viewers.has(host)) return Viewers.get(host);
  host.style.position = host.style.position || "relative";

  const r = host.getBoundingClientRect();
  const renderer = new THREE.WebGLRenderer({ alpha:true, antialias:false, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1, 1.75));
  renderer.setSize(Math.max(1, r.width||600), Math.max(1, r.height||400), false);
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(25, Math.max(1, r.width)/Math.max(1, r.height), 0.01, 1000);
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  const dir = new THREE.DirectionalLight(0xffffff, 1); dir.position.set(3,5,7); scene.add(dir);

  const viewer = { host, renderer, scene, camera, model:null, modelSize:null, zoom:1, raf:0, ro:null, io:null };

  // ResizeObserver: hacer responsive el canvas y re-encuadrar
  viewer.ro = new ResizeObserver(()=>{
    const b = host.getBoundingClientRect();
    const W = Math.max(1, b.width), H = Math.max(1, b.height);
    renderer.setSize(W, H, false);
    camera.aspect = W/H;
    camera.updateProjectionMatrix();
    if (viewer.modelSize) frameAtOrigin(camera, viewer.modelSize, viewer.zoom);
  });
  viewer.ro.observe(host);

  // (Opcional) render solo cuando es visible
  viewer.io = new IntersectionObserver((entries)=>{
    for (const e of entries){
      if (e.isIntersecting){
        loop();
      } else {
        cancelAnimationFrame(viewer.raf);
      }
    }
  }, { threshold: 0.01 });
  viewer.io.observe(host);

  function loop(){
    viewer.raf = requestAnimationFrame(loop);
    renderer.render(scene, camera);
  }
  loop();

  Viewers.set(host, viewer);
  return viewer;
}

async function mountGLBInHost(host, url, zoom=1){
  const viewer = initViewer(host);
  viewer.zoom = zoom;

  if (viewer.model){
    viewer.scene.remove(viewer.model);
    viewer.model = null;
    viewer.modelSize = null;
  }

  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);

  // Centrar pivote para rotaciones perfectas
  const { pivot, size } = centerPivot(gltf.scene);
  viewer.scene.add(pivot);
  viewer.model = pivot;
  viewer.modelSize = size;

  // Estado inicial
  viewer.model.position.set(0,0,0);
  viewer.model.rotation.set(0,0,0);
  viewer.model.scale.set(1,1,1);

  // Encuadre y a renderizar
  frameAtOrigin(viewer.camera, size, zoom);
  return viewer;
}

// Auto-montaje: <div data-3d-src="..." data-3d-zoom="1.2">
async function mountAllGLB(){
  const hosts = document.querySelectorAll("[data-3d-src]");
  for (const host of hosts){
    const url  = host.getAttribute("data-3d-src");
    const zoom = parseFloat(host.getAttribute("data-3d-zoom") ?? "1") || 1;
    if (url) await mountGLBInHost(host, url, zoom);
  }
}

// Tween de pose (absoluta o por delta)
function tweenPose(viewer, pose, {duration=0.8, ease="power2.inOut"}={}){
  if (!viewer?.model) return;
  const m = viewer.model;
  const to = {};
  if (pose.x  != null) to.x  = pose.x;
  if (pose.y  != null) to.y  = pose.y;
  if (pose.z  != null) to.z  = pose.z;
  if (pose.rx != null) to.rx = pose.rx;
  if (pose.ry != null) to.ry = pose.ry;
  if (pose.rz != null) to.rz = pose.rz;

  const tl = gsap.timeline();
  if (Object.keys(to).length){
    tl.to(m.position, { x: to.x ?? m.position.x, y: to.y ?? m.position.y, z: to.z ?? m.position.z, duration, ease }, 0)
      .to(m.rotation, { x: to.rx ?? m.rotation.x, y: to.ry ?? m.rotation.y, z: to.rz ?? m.rotation.z, duration, ease }, 0);
  }
  if (pose.dx!=null || pose.dy!=null || pose.dz!=null || pose.dRx!=null || pose.dRy!=null || pose.dRz!=null){
    tl.to(m.position, { 
      x: m.position.x + (pose.dx||0),
      y: m.position.y + (pose.dy||0),
      z: m.position.z + (pose.dz||0),
      duration, ease
    }, 0)
    .to(m.rotation, {
      x: m.rotation.x + (pose.dRx||0),
      y: m.rotation.y + (pose.dRy||0),
      z: m.rotation.z + (pose.dRz||0),
      duration, ease
    }, 0);
  }
  return tl;
}

// ===== Plan de movimientos por paso (editá a gusto) =====
// Tip: si querés que gire y NO se mueva del centro, no toques x/y/z: solo rx/ry/rz o dRx/dRy/dRz
const MOVES = {
  default: {
    0: [
      { target: "#element-3d-1", type:"to", rx: 0,        ry: 0,         rz: 0,        duration: 0.6 },
      { target: "#element-3d-2", type:"to", rx: deg(10),  ry: deg(25),   rz: 0,        duration: 0.6 }
    ],
    1: [
      { target: "#element-3d-1", type:"by", dRy: deg(35),                         duration: 0.8 },
      { target: "#element-3d-2", type:"by", dRx: deg(-15), dRy: deg(10),          duration: 0.8 }
    ],
    2: [
      { target: "#element-3d-1", type:"to", rx: 0,        ry: deg(90),  rz: 0,    duration: 0.7, ease:"power3.inOut" },
      { target: "#element-3d-2", type:"to", rx: 0,        ry: 0,        rz: 0,    duration: 0.7 }
    ]
  }
};

// ===== Hook que llama tu ScrollTrigger =====
function move3D(section, idx){
  const key = section.getAttribute("data-moves") || "default";
  const steps = MOVES[key];
  if (!steps) return;
  const actions = steps[idx];
  if (!actions) return;

  actions.forEach(act => {
    const host =
      document.querySelector(act.target) ||
      (section.matches(act.target) ? section : null);
    if (!host) return;

    const viewer = Viewers.get(host);
    if (!viewer || !viewer.model) return;

    if (act.type === "to"){
      tweenPose(viewer, {
        x: act.x, y: act.y, z: act.z,
        rx: act.rx, ry: act.ry, rz: act.rz
      }, { duration: act.duration ?? 0.8, ease: act.ease ?? "power2.inOut" });
    } else if (act.type === "by"){
      tweenPose(viewer, {
        dx: act.dx, dy: act.dy, dz: act.dz,
        dRx: act.dRx, dRy: act.dRy, dRz: act.dRz
      }, { duration: act.duration ?? 0.8, ease: act.ease ?? "power2.inOut" });
    }
  });
}

// ===== Tu lógica de secciones/steps (con integración 3D) =====
document.addEventListener("DOMContentLoaded", async () => {
  // 1) Montar todos los GLB declarados en el HTML
  await mountAllGLB();

  // 2) Inicializar secciones con pasos
  gsap.utils.toArray("[steps-section]").forEach(setupStepsSection);

  function setupStepsSection(section){
    const items = Array.from(section.querySelectorAll("[item-step]"));
    const n = items.length;
    if (!n) return;

    const stepVh = parseFloat(section.getAttribute("data-stepvh")) || 100;
    const useSnap = (section.getAttribute("data-snap") ?? "true") !== "false";
    const stepHeight = () => (stepVh / 100) * window.innerHeight;
    const totalDist  = () => n * stepHeight();

    const parts = items.map(it => ({
      dot:  it.querySelector("[step-dot]"),
      line: it.querySelector("[step-line]")
    }));

    gsap.set(parts.map(p => p.dot),  { scale: 0, autoAlpha: 0, transformOrigin: "center" });
    gsap.set(parts.map(p => p.line), { scaleX: 0, autoAlpha: 0, transformOrigin: "left center" });
    items.forEach((el, i) => el.style.opacity = i === 0 ? 1 : 0.4);

    const stepTL = parts.map((p) => {
      const tl = gsap.timeline({ paused: true });
      tl.fromTo(p.dot,  { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.36, ease: "back.out(1.7)" })
        .fromTo(p.line, { scaleX: 0, autoAlpha: 0 }, { scaleX: 1, autoAlpha: 1, duration: 0.48, ease: "power2.out" }, ">-0.06");
      return tl;
    });
    if (stepTL[0]) stepTL[0].progress(1).pause();

    const quickOpacity = items.map(el => gsap.quickTo(el, "opacity", { duration: 0.25, ease: "power2.out" }));
    const setNeighborhoodOpacity = (idx) => {
      const map = [1, 0.8, 0.6, 0.4];
      items.forEach((_, i) => {
        const dist = Math.abs(i - idx);
        quickOpacity[i](map[Math.min(dist, map.length - 1)]);
      });
    };

    let prevIdx = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const setActive = (idx) => {
      if (idx === prevIdx) return;
      stepTL[prevIdx]?.timeScale(1).reverse();
      stepTL[idx]?.timeScale(1).play(0);
      move3D(section, idx);                 // <<< integración 3D
      setNeighborhoodOpacity(idx);
      prevIdx = idx;
    };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => "+=" + totalDist(),
        scrub: 0.5,
        snap: useSnap ? {
          snapTo: (v) => {
            const step = 1 / Math.max(n - 1, 1);
            return Math.round(v / step) * step;
          },
          duration: 0.2,
          ease: "power2.out"
        } : false,
        onUpdate(self){
          const idx = clamp(Math.floor(self.progress * n), 0, n - 1);
          setActive(idx);
        },
        invalidateOnRefresh: true
        // , markers:true
      }
    });
    tl.to({}, { duration: n });

    const onResize = () => ScrollTrigger.refresh();
    window.addEventListener("resize", onResize);

    const observer = new MutationObserver(() => {
      if (!document.body.contains(section)) {
        window.removeEventListener("resize", onResize);
        tl.scrollTrigger?.kill(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
});