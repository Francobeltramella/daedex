import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let globalGridSizeMin = 0.20;
let globalGridSizeMax = 0.50;
// Selecciona todos los contenedores de imágenes
const imageContainers = document.querySelectorAll('[image-container]');
const imageElements = document.querySelectorAll('[img-scroll]');

if (imageContainers.length !== imageElements.length) {
  console.warn('El número de contenedores no coincide con el número de imágenes. Verifica tu HTML.');
}

const images = Array.from(imageElements).map((image, index) => {
  return {
    container: imageContainers[index],
    image: image,
    gridSize: 100.0,
    strengthMin: 0.3,
    strengthMax: 1.5,
    colorOffset: 0.05
  };
});

console.log("Total de imágenes detectadas:", images.length);
console.log(images);

images.forEach(imageData => initializeScene(imageData));

function initializeScene(imageData) {
  const imageContainer = imageData.container;
  const imageElement = imageData.image;

  let scene = new THREE.Scene();
  let width = imageContainer.clientWidth;
  let height = imageContainer.clientHeight;
  let aspectRatio = width / height;
  let camera = new THREE.OrthographicCamera(
      -aspectRatio, aspectRatio, // Left, Right
      1, -1, // Top, Bottom
      0.1, 10 // Near, Far
  );
  camera.position.z = 1;


  const vertexShader = `
    varying vec2 vUv;
    uniform vec2 u_mouse;
    uniform float u_aberrationIntensity;
    uniform float u_time;
    uniform float u_amplitude;
    uniform float u_frequency;
    uniform float u_speed;
    uniform float u_scrollProgress;
    uniform float u_waveStrength;

    void main() {
      vUv = uv;
  
      // 🔹 Reducir la distorsión del scroll al final
      float scrollDistortion = sin(vUv.y * 4.0) * (1.0 - u_scrollProgress) *0.5;
  
      // 🔹 Suavizar la distorsión de wave al final del scroll
      float waveFactor = u_waveStrength * (1.0 - pow(u_scrollProgress, 5.0)); // 🔥 Se apaga más rápido
  
      float wave = sin(position.x * u_frequency + u_time * u_speed) * u_amplitude * waveFactor;
      float waveZ = cos(position.y * u_frequency + u_time * u_speed) * u_amplitude * 2.3 * waveFactor;
  
      vec3 displacedPosition = position + vec3(scrollDistortion, wave, waveZ);
  
      gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 01.0);
  }
  `;

  const fragmentShader = `
  varying vec2 vUv;
  uniform sampler2D u_texture;
  uniform float u_scrollProgress;
  uniform float u_time;
  uniform float u_gridSizeMin;
uniform float u_gridSizeMax;
  
  void main() {
      vec2 uv = vUv;
  
      // 🔹 Definir el tamaño de los cuadrados
      float gridSize = mix(u_gridSizeMin, u_gridSizeMax, u_scrollProgress);
  
      // 🔹 Obtener las coordenadas de los cuadrados
      vec2 gridUV = fract((uv + 0.0001) / gridSize); // 🔥 Pequeño offset para evitar bordes finos
  
      // 🔹 Revelado progresivo de la imagen
      float edgeSmooth = 0.000; // 🔥 Controla qué tan suaves son los bordes

float revealX = smoothstep(gridUV.x - edgeSmooth, gridUV.x + edgeSmooth, u_scrollProgress);
float revealY = smoothstep(gridUV.y - edgeSmooth, gridUV.y + edgeSmooth, u_scrollProgress);

float reveal = revealX * revealY;
      // 🔹 Obtener el color original de la textura
      vec4 color = texture2D(u_texture, uv);
  
      // 🔹 Convertir la imagen a blanco y negro (Escala de grises)
      float grayscale = dot(color.rgb, vec3(0.299, 0.587, 0.114)) * 0.7; // 🔥 Multiplica por 0.7 para hacerlo más oscuro
  
      // 🔹 Aplicar efecto de escala de grises antes del revelado
      vec3 bwColor = vec3(grayscale); // Blanco y negro puro
  
      // 🔹 Controlar la progresión de blanco y negro a color
      float progress = pow(clamp(u_scrollProgress, 0.0, 1.0), 5.8); // Hace que el color aparezca más lento
  
      // 🔹 Mezclar entre blanco y negro y color con progresión más suave
      vec3 finalColor = mix(bwColor, color.rgb, progress);
  
      // 🔹 Aplicar la máscara de revelado para que aparezca en cuadrados
      finalColor *= reveal;
  
      gl_FragColor = vec4(finalColor, color.a);
      
  }

  
  

  
  `;

  let shaderUniforms = {
    u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
    u_aberrationIntensity: { value: 0.0 },
    u_scrollProgress: { value: 0.0 },
    u_time: { value: 0.0 },
    u_amplitude: { value: 0.2 },
    u_frequency: { value: 2.0 },
    u_speed: { value: 3.0 },
    u_waveStrength: { value: 0.0 },
    u_texture: { value: new THREE.TextureLoader().load(imageElement.src) },
    u_hoverTexture: { value: new THREE.TextureLoader().load(imageElement.src) }, // Nueva textura para el hover
    u_hoverEffect: { value: 0.0 }, // Controlará la transición entre texturas
    u_gridSizeMin: { value: 0.20 }, 
    u_gridSizeMax: { value: 0.50 }
  };



  let planeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: shaderUniforms,
      vertexShader,
      fragmentShader,
      transparent: true
    })
  );






  scene.add(planeMesh);
  let renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setSize(imageContainer.clientWidth, imageContainer.clientHeight);
  renderer.domElement.style.width = `${imageContainer.clientWidth}px`;
  renderer.domElement.style.height = `${imageContainer.clientHeight}px`;  renderer.setClearColor(0x000000, 0);
  imageContainer.appendChild(renderer.domElement);

  function animateScene() {
    shaderUniforms.u_time.value += 0.02;
    requestAnimationFrame(animateScene);
    shaderUniforms.u_gridSizeMin.value = globalGridSizeMin;
    shaderUniforms.u_gridSizeMax.value = globalGridSizeMax;
    renderer.render(scene, camera);
  }
  animateScene();

  
  shaderUniforms.u_scrollProgress.value = 0.0;
 
  gsap.to(shaderUniforms.u_scrollProgress, {
    value: 1.0,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: imageContainer,
      start: "top 70%",
      end: "top 50%",
      scrub: 3
    }
  });
}
const gui = new GUI();
const controls = {
    gridSizeMin: globalGridSizeMin,
    gridSizeMax: globalGridSizeMax
};

// 🔥 Solo un `dat.GUI` para todas las imágenes
gui.add(controls, 'gridSizeMin', 0.05, 1.0).name("Grid Size Min").onChange(value => {
    globalGridSizeMin = value;
});
gui.add(controls, 'gridSizeMax', 0.05, 1.0).name("Grid Size Max").onChange(value => {
    globalGridSizeMax = value;
});

// Animación de carga

gsap.timeline()
  .to("[text-loading]", { opacity: 1,delay:0.3, y: -20, duration: 1, ease: "power2.out" })
  .to("[text-loading]", { opacity: 0, y: 0, duration: 1, ease: "power2.in" })
  .to(".courtain", { height: 0, stagger: 0.5, duration: 1, ease: "power2.inOut" })
  .to(".loading-wrapper", { display: "none", duration: 0 });



const lenis = new Lenis({
  duration: 1.2,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // https://www.desmos.com/calculator/brs54l4xou
  direction: 'vertical', // vertical, horizontal
  gestureDirection: 'vertical', // vertical, horizontal, both
  smooth: true,
  mouseMultiplier: 1,
  smoothTouch: false,
  touchMultiplier: 2,
  infinite: false,
})

//get scroll value
lenis.on('scroll', ({ scroll, limit, velocity, direction, progress }) => {
  console.log({ scroll, limit, velocity, direction, progress })
})

function raf(time) {
  lenis.raf(time)
  requestAnimationFrame(raf)
}

requestAnimationFrame(raf)