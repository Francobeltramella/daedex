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

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
container.appendChild(renderer.domElement);

// (opcional, rinde mejor en mobile)
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

// ... (luces, controls, etc. igual)

let model = null;
let modelBaseScale = 1;
let modelSize = new THREE.Vector3();

// ===== util para encuadrar el modelo al wrapper (auto-fit por scale) =====
function fitObjectToView(obj, margin = 0.9) {
  if (!obj) return;

  // distancia desde la cámara al centro (tu modelo quedó centrado en el origen)
  const distance = camera.position.length();

  // tamaño visible del frustum a esa distancia
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const visibleHeight = 2 * Math.tan(vFOV / 2) * distance;
  const visibleWidth  = visibleHeight * camera.aspect;

  // escala que hace entrar el modelo en ancho y alto, con margen
  const sx = (visibleWidth  * margin) / modelSize.x;
  const sy = (visibleHeight * margin) / modelSize.y;

  const scale = Math.min(sx, sy);

  // aplicamos sobre una escala base (por si normalizaste el tamaño)
  obj.scale.setScalar(modelBaseScale * scale);
}

// Load GLB
const loader = new GLTFLoader();
loader.load(
  "https://daedex.netlify.app/d1.glb",
  (gltf) => {
    const obj = gltf.scene;
    scene.add(obj);
    model = obj;
    obj.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x7777e7,     // violeta metálico (cambiá a gusto)
          metalness: 1.0,      // 1 = totalmente metálico
          roughness: 0.2,      // 0 = espejo, 1 = mate
          envMapIntensity: 1.0 // cuánto refleja el entorno
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

     // Buscar el mesh "white dentor"
     const whiteDentor = obj.getObjectByName("white dentor");
     if (whiteDentor && whiteDentor.isMesh) {
       console.log("Material antes:", whiteDentor.material);
 
       // Ajustar propiedades del material
       whiteDentor.material.metalness = 1.0;   // más metálico
       whiteDentor.material.roughness = 0.1;   // más pulido
       whiteDentor.material.color.set(0xffffff); // blanco puro
       whiteDentor.material.needsUpdate = true;
     }
    // centrar al origen para que el fit sea correcto
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    obj.position.sub(center);

    // guardamos tamaño original para cálculos posteriores
    modelSize.copy(size);

    // (opcional) normalizar tamaño base para que no sea gigantesco
    // deja el modelo con su mayor dimensión ~1
    modelBaseScale = 1 / Math.max(size.x, size.y, size.z);
    obj.scale.setScalar(modelBaseScale);

    // === ajuste inicial al wrapper ===
    fitObjectToView(obj, 0.9);

    // tu animación tal cual
    const degToRad = (deg) => deg * Math.PI / 180;
    gsap.set(obj.position, { x: 0, y: -7 });
    gsap.defaults({ overwrite: "auto" });

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "[step-1]",
        start: "top top",
        end: "center top",
        scrub: true,
        // markers: true,
      }
    });

    tl.to(obj.position, {
      keyframes: [
        { x: 0,   y: 0,  duration: 0.4, ease: "power2.in" },
        { x: -6,  y: -2, duration: 0.6, ease: "power3.inOut" }
      ]
    }, 0)
    .addLabel("pose", 0.2)
    .to(dirLight.position, { x: -5, y: 12, z: 8, ease: "power2.inOut" }, 0)
    .to(dirLight.target.position, { x: 0, y: 0, z: 0, ease: "power2.inOut" }, 0)
    .to(obj.rotation, {
      x: degToRad(70),
      y: degToRad(10),
      z: degToRad(-30),
      duration: 0.6,
      ease: "power3.inOut",
      overwrite: false
    }, "pose")
    .to(obj.scale, {
      // TIP: si querés que el fit “gane siempre”, quitá este tween de escala.
      x: "+=0.3", y: "+=0.3", z: "+=0.3",
      duration: 0.6,
      ease: "power3.inOut",
      overwrite: false
    }, "pose");
  },
  (xhr) => console.log((xhr.loaded / xhr.total) * 100 + "% loaded"),
  (error) => console.error("An error happened", error)
);

// Responsive
window.addEventListener("resize", () => {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);

  // === re-encuadrar al nuevo tamaño del wrapper ===
  fitObjectToView(model, 0.9);
});

// Animation loop igual
const animate = () => {
  requestAnimationFrame(animate);
 // controls.update();
  renderer.render(scene, camera);
};
animate();