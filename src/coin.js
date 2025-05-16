import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

const container = document.querySelector(".coin-3d");
let model = null;
// Scene

const scene = new THREE.Scene();

// Load HDR environment map
new RGBELoader().load('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_03_1k.hdr', function(hdrMap) {
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
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setClearColor(0x000000, 0);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);




// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 0, 0);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.bias = -0.001;
scene.add(light);

const light2 = new THREE.DirectionalLight(0xffffff, 1);
light2.position.set(-10, 10, -10);
light2.castShadow = true;
scene.add(light2);

// const lightHelper = new THREE.DirectionalLightHelper(light, 1);
// scene.add(lightHelper);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
scene.add(hemiLight);

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

          material.metalness = 1;
          material.roughness = 0.2;
          material.envMapIntensity = 1;
        
          // Agregá un ligero tinte blanco para reflejos
          material.color = new THREE.Color(0xffffff);
        
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