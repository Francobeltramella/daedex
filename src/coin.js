import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const container = document.querySelector(".coin-3d");
let model = null;
// Scene

const scene = new THREE.Scene();

// Load HDR environment map
new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_04_1k.hdr', function(hdrMap) {
  hdrMap.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = hdrMap;
});

// Camera
const camera = new THREE.PerspectiveCamera(
  30,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(4, -2, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({
  antialias: true,   // Bordes suaves
  alpha: true,       // Transparencia de fondo
  powerPreference: "high-performance", // GPU prioritaria
  precision: "highp" // Precisión alta
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // limitás para no reventar GPUs
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputEncoding = THREE.sRGBEncoding; // colores realistasrenderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
rimLight.position.set(-5, 3, -2);
scene.add(rimLight);

function handleResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;
  
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
  
    updateModelScale(); // ✅ Escala correcta al redimensionar
  }
  window.addEventListener("resize", handleResize);
  handleResize();


  function updateModelScale() {
    if (!model) return;
    const isMobile = window.innerWidth < 768;
    model.scale.setScalar(isMobile ? 0.5 : 1);
  }

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enableZoom = false;
controls.enablePan = false;

// GLB Loader
const loader = new GLTFLoader();


loader.load(
  "https://coin3d.netlify.app/coin.glb",
  (gltf) => {
    model = gltf.scene;

    // Mejora de materiales y sombras
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        //child.receiveShadow = true;

        if (child.material) {
          const material = child.material;

          material.color = new THREE.Color(0xcccccc);
          material.metalness = 1;
          material.roughness = 0.4;
          material.envMapIntensity = 1; // No HDR
        
          material.needsUpdate = true;
        }
      }
    });

    scene.add(model);
    updateModelScale(); // ✅ Escala correcta al cargar

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
  renderer.setSize(container.clientWidth, container.clientHeight);
});

// Animate
const animate = () => {
  requestAnimationFrame(animate);

  if (model) {
    model.rotation.y += 0.005; // Rotación suave
  }

  controls.update();
  renderer.render(scene, camera);
};

animate();