import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

// Variables para suavizado del mouse
let targetMousePosition = new THREE.Vector2();
let currentMousePosition = new THREE.Vector2();
let prevPosition = new THREE.Vector2();

// Variables de configuración de imágenes
const images = [
  { container: 'imageContainer', image: 'myImage', gridSize: 10.0, strengthMin: 0.2, strengthMax: 0.2, colorOffset: 0.02 },
  { container: 'imageContainer2', image: 'myImage2', gridSize: 200.0, strengthMin: 0.3, strengthMax: 0.1, colorOffset: 0.12 },
  { container: 'imageContainer3', image: 'myImage3', gridSize: 100.0, strengthMin: 0.1, strengthMax: 1.3, colorOffset: 0.05 }
];

let easeFactor = 0.04;

function initializeScene(imageData) {
  const imageContainer = document.getElementById(imageData.container);
  const imageElement = document.getElementById(imageData.image);

  let scene = new THREE.Scene();
  let camera = new THREE.PerspectiveCamera(
    80,
    imageContainer.offsetWidth / imageContainer.offsetHeight,
    0.01,
    10
  );
  camera.position.z = 1;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D u_texture;
    uniform vec2 u_mouse;
    uniform vec2 u_prevMouse;
    uniform float u_aberrationIntensity;
    
    void main() {
      float gridSize = ${imageData.gridSize}.0;
      vec2 gridUV = floor(vUv * gridSize) / gridSize;
      float angle = atan(gridUV.y - 0.5, gridUV.x - 0.5);
      float radius = length(gridUV - vec2(0.5, 0.5));
      vec2 distortedGridUV = vec2(0.5) + vec2(cos(angle), sin(angle)) * radius;
      vec2 centerOfPixel = distortedGridUV + vec2(1.0 / gridSize, 1.0 / gridSize);
      vec2 mouseDirection = u_mouse - u_prevMouse;
      vec2 pixelToMouseDirection = centerOfPixel - u_mouse;
      float pixelDistanceToMouse = length(pixelToMouseDirection);
      float strength = smoothstep(${imageData.strengthMin}, ${imageData.strengthMax}, pixelDistanceToMouse);
      vec2 uvOffset = strength * -mouseDirection * 0.1;
      vec2 uv = vUv - uvOffset;
      vec4 colorR = texture2D(u_texture, uv + vec2(strength * u_aberrationIntensity * ${imageData.colorOffset}, 0.0));
      vec4 colorG = texture2D(u_texture, uv);
      vec4 colorB = texture2D(u_texture, uv - vec2(strength * u_aberrationIntensity * ${imageData.colorOffset}, 0.0));
      gl_FragColor = vec4(colorR.r, colorG.g, colorB.b, 1.0);
    }
  `;

  let shaderUniforms = {
    u_mouse: { value: new THREE.Vector2() },
    u_prevMouse: { value: new THREE.Vector2() },
    u_aberrationIntensity: { value: 0.0 },
    u_texture: { value: new THREE.TextureLoader().load(imageElement.src) }
  };

  let planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      vertexShader,
      fragmentShader
    })
  );

  scene.add(planeMesh);
  let renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(imageContainer.offsetWidth, imageContainer.offsetHeight);
  renderer.setClearColor(0x000000, 0);
  imageContainer.appendChild(renderer.domElement);

  function animateScene() {
    requestAnimationFrame(animateScene);
    renderer.render(scene, camera);
  }
  animateScene();

  imageContainer.addEventListener('mousemove', (event) => {
    let rect = imageContainer.getBoundingClientRect();
    gsap.to(shaderUniforms.u_mouse.value, {
      x: (event.clientX - rect.left) / rect.width,
      y: 1.0 - (event.clientY - rect.top) / rect.height,
      duration: 0.3,
      ease: "power2.out"
    });
    shaderUniforms.u_aberrationIntensity.value = 1.0;
  });

  imageContainer.addEventListener('mouseleave', () => {
    gsap.to(shaderUniforms.u_aberrationIntensity, { value: 0.0, duration: 0.5, ease: "power2.out" });
  });
}

images.forEach(imageData => initializeScene(imageData));

// Animación de carga

gsap.timeline()
  .to("[text-loading]", { opacity: 1,delay:0.3, y: -20, duration: 1, ease: "power2.out" })
  .to("[text-loading]", { opacity: 0, y: 0, duration: 1, ease: "power2.in" })
  .to(".courtain", { height: 0, stagger: 0.5, duration: 1, ease: "power2.inOut" })
  .to(".loading-wrapper", { display: "none", duration: 0 });
