import * as THREE from 'three';
import { FontLoader } from 'tthree/addons/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/jsm/geometries/TextGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { GUI } from 'dat.gui';

const container = document.querySelector(".3d-element");

// Scene
const scene = new THREE.Scene();

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
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(10, 10, 10);
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

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// GLB Loader
const loader = new GLTFLoader();
let model = null;

loader.load(
  "http://localhost:5174/static/coin.glb",
  (gltf) => {
    model = gltf.scene;

    // Mejora de materiales y sombras
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        //child.receiveShadow = true;

        if (child.material) {
          child.material.metalness = 1;
          child.material.roughness = 0.5;
          child.material.needsUpdate = true;
        }
      }
    });

    scene.add(model);
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
