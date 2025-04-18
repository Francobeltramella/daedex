import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import gsap from 'gsap';
import { GUI } from 'dat.gui';

const images = [...document.querySelectorAll('.img-item')];
const section3D = document.querySelector('[section-3d]');
const imageHeight = 500;
const gap = 50;

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2.5,
  window.innerWidth / 2.5,
  window.innerHeight / 2.5,
  -window.innerHeight / 2.5,
  0.1,
  1000
);
camera.position.z = 500;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
section3D.appendChild(renderer.domElement);

const loader = new THREE.TextureLoader();
const fontLoader = new FontLoader();

const planeImages = [];
const textMeshes = [];
const uniformsArray = [];

// === Shaders ===
const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShaders = {
  liquid: `
  uniform sampler2D u_texture;
  uniform float u_time;
  uniform float u_radius;
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv;
    float distToCenter = length(vUv - 0.5);
  
    // Más fuerza al efecto con mayor frecuencia y amplitud
    float strength = pow(smoothstep(1.0, 0.0, u_radius), 1.2);
  
    float freqX = 60.0;
    float freqY = 80.0;
  
    float ampX = 0.06;
    float ampY = 0.06;
  
    // Distorsión tipo líquido animado
    uv.y += sin(uv.x * freqX + u_time * 4.0) * ampY * strength;
    uv.x += cos(uv.y * freqY + u_time * 3.0) * ampX * strength;
  
    // Extra: rebote loco en forma de onda radial
    uv += 0.03 * vec2(
      sin(uv.y * 50.0 + u_time * 2.0),
      cos(uv.x * 40.0 - u_time * 2.5)
    ) * strength;
  
    // Muestra la textura con UV distorsionadas
    vec4 color = texture2D(u_texture, uv);
  
    // Bordes suaves
    float alpha = smoothstep(u_radius, u_radius - 0.8, distToCenter);
    alpha *= smoothstep(0.5, 0.2, distToCenter);
    gl_FragColor = vec4(color.rgb, alpha);
  }
  
  `,
  ripple: `
  uniform sampler2D u_texture;
  uniform float u_time;
  uniform float u_radius;
  varying vec2 vUv;
  
  void main() {
    vec2 uv = vUv - 0.5;
    float dist = length(uv);
  
    // AUMENTAMOS la frecuencia (más ondas) y la amplitud (más fuerza)
    float frequency = 80.0;       // antes 40.0
    float speed = 6.0;            // antes 4.0
    float amplitude = 0.05;       // antes 0.02
  
    float wave = sin(dist * frequency - u_time * speed) * amplitude;
  
    // También podés intensificar más con un pow o multiplicador
    float intensity = pow(smoothstep(1.0, 0.0, u_radius), 1.2); // más brusco
  
    vec2 distortedUv = vUv + normalize(uv) * wave * intensity;
  
    vec4 color = texture2D(u_texture, distortedUv);
  
    float alpha = smoothstep(u_radius, u_radius - 0.8, dist);
    alpha *= smoothstep(0.5, 0.2, dist);
    gl_FragColor = vec4(color.rgb, alpha);
  }
  
  `,
  glitch: `
    uniform sampler2D u_texture;
    uniform float u_time;
    uniform float u_radius;
    varying vec2 vUv;

    float random(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      float noise = random(vec2(uv.y, u_time)) * 0.09 * smoothstep(1.0, 0.0, u_radius);
      vec2 rUv = uv + vec2(noise, 0.0);
      vec2 gUv = uv + vec2(-noise, 0.0);
      vec2 bUv = uv;

      vec4 color = vec4(
        texture2D(u_texture, rUv).r,
        texture2D(u_texture, gUv).g,
        texture2D(u_texture, bUv).b,
        1.0
      );

      float dist = length(vUv - 0.5);
      float alpha = smoothstep(u_radius, u_radius - 0.8, dist);
      alpha *= smoothstep(0.5, 0.2, dist);
      gl_FragColor = vec4(color.rgb, alpha);
    }
  `,
  grid: `
  uniform sampler2D u_texture;
uniform float u_time;
uniform float u_radius;
varying vec2 vUv;

float random(vec2 p) {
  return fract(sin(dot(p, vec2(23.43, 45.97))) * 38291.34);
}

void main() {
  vec2 uv = vUv;

  // Parámetros del grid
  float gridSize = 10.0;

  // Cálculo de celda
  vec2 gridPos = floor(uv * gridSize);
  vec2 cellUV = fract(uv * gridSize);

  // Caos por celda
  float chaos = random(gridPos);

  // Acá va lo importante: que se ordene al centro
  float disorder = smoothstep(1.0, 0.0, u_radius); // cuando u_radius → 1, disorder → 0

  // Desplazamiento animado, que se apaga al acercarse al centro
  vec2 offset = vec2(
    sin(u_time * 5.0 + chaos * 20.0) * 0.3 * disorder,
    cos(u_time * 5.0 + chaos * 30.0) * 0.3 * disorder
  );

  // Se aplica solo si hay disorder
  cellUV += offset;

  // Reconstrucción del UV
  vec2 finalUv = (gridPos + cellUV) / gridSize;

  vec4 color = texture2D(u_texture, finalUv);

  // Borde difuminado como siempre
  float dist = length(vUv - 0.5);
  float alpha = smoothstep(u_radius, u_radius - 0.8, dist);
  alpha *= smoothstep(0.5, 0.2, dist);

  gl_FragColor = vec4(color.rgb, alpha);
}

  `
};

// === Cambio dinámico de shaders ===
function switchShader(name) {
  planeImages.forEach((plane, i) => {
    plane.material.fragmentShader = fragmentShaders[name];
    plane.material.needsUpdate = true;
  });
}

// === Botones ===
document.querySelectorAll('a[data-shader]').forEach(button => {
  button.addEventListener('click', () => {
    const shaderName = button.dataset.shader;
     // Quitar 'active' de todos los botones
     document.querySelectorAll('a[data-shader]').forEach(btn => btn.classList.remove('active'));

     // Agregar 'active' al botón seleccionado
     button.classList.add('active');
    switchShader(shaderName);
  });
});

// === Crear imágenes y textos ===
fontLoader.load('https://3dlive.netlify.app/Orbitron.json', (font) => {
  images.forEach((img, idx) => {
    const texture = loader.load(img.src);
    const uniforms = {
      u_texture: { value: texture },
      u_time: { value: 0 },
      u_radius: { value: 0.1 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      vertexShader,
      fragmentShader: fragmentShaders.liquid
    });

    const geometry = new THREE.PlaneGeometry(800, 500, 32, 32);
    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = -(imageHeight + gap) * idx;
    scene.add(plane);

    const textos = [
      "SPACE TO THINK",
      "Mind on another planet",
      "The universe within",
      "Cosmic pause.",
      "Dreamer in orbit"
    ];
    
    const textGeometry = new TextGeometry(textos[idx], {
      font,
      size: 25,
      height: 10,
      curveSegments: 20,
      bevelEnabled: true,
      bevelThickness: 10,
      bevelSize: 1,
      bevelSegments: 5
    });
    

    const textMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      metalness: 0.5,
      roughness: 0.6,
      transparent: true,
      opacity: 0
    });

    const textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textMesh.position.set(0, plane.position.y - 400, 10);
    scene.add(textMesh);

    planeImages.push(plane);
    textMeshes.push(textMesh);
    uniformsArray.push(uniforms);

    img.style.display = 'none';
  });
});



let scrollSpeed = 0;
window.addEventListener('wheel', (e) => {
  scrollSpeed = e.deltaY * 0.002;
});

// === Loop de animación ===
function animate(time) {
  requestAnimationFrame(animate);

  planeImages.forEach((plane, idx) => {
    const uniforms = uniformsArray[idx];
    uniforms.u_time.value = time * 0.001;

    plane.position.y += scrollSpeed * 120;

    if (plane.position.y > window.innerHeight / 2 + imageHeight) {
      plane.position.y -= (imageHeight + gap) * images.length;
    } else if (plane.position.y < -window.innerHeight / 2 - imageHeight) {
      plane.position.y += (imageHeight + gap) * images.length;
    }

    const distanceToCenter = Math.abs(plane.position.y);
    const scale = THREE.MathUtils.mapLinear(distanceToCenter, 0, window.innerHeight / 2, 1.1, 0.6);
    const radius = THREE.MathUtils.mapLinear(distanceToCenter, 0, window.innerHeight / 2, 1.0, 0.5);

    plane.scale.setScalar(THREE.MathUtils.clamp(scale, 0.1, 1.6));
    textMeshes[idx].position.y = plane.position.y - 150;
    textMeshes[idx].material.opacity = THREE.MathUtils.mapLinear(scale, 0.9, 1.1, 0, 1);
    uniforms.u_radius.value = THREE.MathUtils.clamp(radius, 0.2, 1.0);
  });

  scrollSpeed *= 0.95;
  renderer.render(scene, camera);
}

animate(0);

// === Responsive ===
window.addEventListener('resize', () => {
  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = -window.innerHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


