import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// --------------------------------------------------
// Config general
// --------------------------------------------------
const container = document.querySelector('.element');
if (!container) throw new Error('Falta el contenedor .element');

const ENV_URL = 'https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/zawiszy_czarnego_1k.hdr';
const GLB_URL = 'https://daedex.netlify.app/elm.glb'; // cámbialo si hace falta

// --------------------------------------------------
// Scene / Camera / Renderer
// --------------------------------------------------
const scene = new THREE.Scene();
scene.background = null;

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(5, 4, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
container.appendChild(renderer.domElement);

// --------------------------------------------------
// Controls
// --------------------------------------------------
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// --------------------------------------------------
// Luces
// --------------------------------------------------
const lights = (() => {
  const group = new THREE.Group();

  // Direccional principal
  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(20, 10, 100);
  group.add(key);

  // Spot
  const spot = new THREE.SpotLight(0xffffff, 5);
  spot.position.set(-10, 50, -10);
  spot.angle = Math.PI / 6;
  spot.penumbra = 0.3;
  spot.decay = 2;
  spot.distance = 40;
  group.add(spot, spot.target);

  // Ambient
  const amb = new THREE.AmbientLight(0xffffff, 6);
  group.add(amb);

  // Direccional violeta
  const dir = new THREE.DirectionalLight(0x7777e7, 2);
  dir.position.set(0, 0, 0);
  group.add(dir, dir.target);

  scene.add(group);

  // Helpers (descomenta si los querés ver)
  // const keyHelper = new THREE.DirectionalLightHelper(key, 5, 0xff0000);
  // const spotHelper = new THREE.SpotLightHelper(spot);
  // const axes = new THREE.AxesHelper(1);
  // const grid = new THREE.GridHelper(10, 10);
  // scene.add(keyHelper, spotHelper, axes, grid);

  return { key, spot, amb, dir /*, keyHelper, spotHelper*/ };
})();

// --------------------------------------------------
// HDRI (promesa)
// --------------------------------------------------
function loadEnvMap(renderer, url) {
  return new Promise((resolve, reject) => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader()
      .setDataType(THREE.FloatType)
      .load(
        url,
        (hdr) => {
          const envTex = pmrem.fromEquirectangular(hdr).texture;
          hdr.dispose();
          pmrem.dispose();
          resolve(envTex);
        },
        undefined,
        reject
      );
  });
}

// --------------------------------------------------
// Loader GLB + Draco
// --------------------------------------------------
function buildGLTFLoader() {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  return loader;
}

// --------------------------------------------------
// Utilidades
// --------------------------------------------------
const degToRad = (deg) => (deg * Math.PI) / 180;

function centerObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = new THREE.Vector3();
  box.getCenter(center);
  obj.position.sub(center);
}

function responsiveScale(obj) {
  if (!obj) return;
  if (window.innerWidth < 600) obj.scale.set(0.6, 0.6, 0.6);
  else if (window.innerWidth < 1024) obj.scale.set(0.8, 0.8, 0.8);
  else obj.scale.set(1, 1, 1);
}

function onResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}
window.addEventListener('resize', onResize);

// --------------------------------------------------
// Main
// --------------------------------------------------
(async function init() {
  try {
    // 1) Cargar HDRI y asignar al entorno
    const envMap = await loadEnvMap(renderer, ENV_URL);
    scene.environment = envMap;
    // Si querés de fondo:
    // scene.background = envMap;

    // 2) Cargar modelo
    const loader = buildGLTFLoader();
    loader.load(
      GLB_URL,
      (gltf) => {
        const obj = gltf.scene;
        scene.add(obj);

        // Centrar y escalar
        centerObject(obj);
        responsiveScale(obj);

        // Apuntar el spotlight al modelo
        // (mover el target al centro del objeto)
        lights.spot.target.position.copy(obj.position);

        // Material tweaks
        // Con scene.environment, los MeshStandardMaterial ya reflejan el HDRI.
        // Si igual querés intensificar por-mesh, lo podés hacer acá:
        obj.traverse((child) => {
          if (child.isMesh && child.material && 'envMapIntensity' in child.material) {
            child.material.envMapIntensity = 1.0;
            child.material.needsUpdate = true;
          }
        });

        // White dentor
        const whiteDentor = obj.getObjectByName('Bake.004');
        if (whiteDentor && whiteDentor.isMesh && whiteDentor.material) {
          whiteDentor.material.metalness = 0.8;
          whiteDentor.material.roughness = 0.5;
          whiteDentor.material.color.set(0xffffff);
          whiteDentor.material.envMapIntensity = 1.2; // refuerzo
          whiteDentor.material.needsUpdate = true;
        }

        // Otros dentor
        const grayDentor = obj.getObjectByName('Bake_02.004');
        const airDentor = obj.getObjectByName('Bake_03.004');
        [grayDentor, airDentor].forEach((mesh) => {
          if (mesh && mesh.isMesh && mesh.material) {
            mesh.material.metalness = 0.4;
            mesh.material.roughness = 0.7;
            mesh.material.color.set(0xe7e7e7); // (corregido: era inválido)
            mesh.material.needsUpdate = true;
          }
        });

        // Log limpio (si querés ver jerarquía)
        // obj.traverse((child) => {
        //   if (child.isMesh) console.log('Mesh:', child.name, child.material);
        //   else console.log('Node:', child.name);
        // });

        // Estado inicial
        if (window.gsap) {
          let mm = gsap.matchMedia();

          mm.add("(max-width: 768px)", () => {
            // 📱 Mobile
            gsap.set(obj.position, { x: 0, y: -5 });
          });
          
          mm.add("(min-width: 769px)", () => {
            // 💻 Desktop
            gsap.set(obj.position, { x: 0, y: -7 });
          });
          gsap.defaults({ overwrite: 'auto' });

          // Timeline con ScrollTrigger (requiere gsap + ScrollTrigger ya cargados)
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: '[step-1]',
              start: 'top top',
              end: 'center top',
              scrub: 2,
              invalidateOnRefresh: true,
              // markers: true,
            },
          });

          tl.to(
            obj.position,
            {
              keyframes: [
                { x: 0, y: 0, duration: 0.5, ease: 'power2.out' },
                { x: -6, y: -3, duration: 0.4, ease: 'power3.in' },
              ],
            },
            0
          )
            .addLabel('pose', 0.2)
            .to(
              lights.dir.position,
              { x: -5, y: 82, z: 200, ease: 'power2.inOut' },
              0
            )
            .to(
              lights.dir.target.position,
              { x: 0, y: 0, z: 300, ease: 'power2.inOut' },
              0
            )
            .to(lights.dir, { intensity: 0.3 }, 0)
            .to(
              obj.rotation,
              {
                x: degToRad(70),
                y: degToRad(10),
                z: degToRad(-30),
                duration: 0.6,
                ease: 'power3.inOut',
                overwrite: false,
              },
              'pose'
            )
            .to(lights.key, { intensity: 0.4 }, 0)
            .to(
              obj.scale,
              {
                x: 1.3,
                y: 1.3,
                z: 1.3,
                duration: 0.6,
                ease: 'power3.inOut',
                overwrite: false,
              },
              'pose'
            );
        }

        // Re-escala una sola vez post-resize (mejor UX)
        const once = () => {
          responsiveScale(obj);
          window.removeEventListener('resize', once);
        };
        window.addEventListener('resize', once);
      },
      (xhr) => console.log(`${((xhr.loaded / xhr.total) * 100).toFixed(1)}% loaded`),
      (err) => console.error('Error GLB:', err)
    );
  } catch (e) {
    console.error('Error cargando HDRI:', e);
  }
})();

// --------------------------------------------------
// Loop
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  // Si usás SpotLightHelper, actualizalo así:
  // if (lights.spotHelper) lights.spotHelper.update();
  renderer.render(scene, camera);
}
animate();




document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".element-3d-steps[data-3d-src]").forEach((container) => {
      if (container.__inited) return;
      container.__inited = true;
  
      const url = container.getAttribute("data-3d-src");
      if (!url) return;
  
      // limpiar y preparar
      container.innerHTML = "";
      container.style.position = container.style.position || "relative";
  
      // escena / cámara / renderer
      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(65, 0, 0.1, 180);
      camera.position.set(0, 0, 11);
  
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      container.appendChild(renderer.domElement);
  
      // luces
      scene.add(new THREE.AmbientLight(0x404040));
      const key = new THREE.DirectionalLight(0xffffff, 6);
      key.position.set(-7, -7, 10);
      scene.add(key);
  
      // resize simple
      function resize(){
        const w = Math.max(1, container.clientWidth);
        const h = Math.max(1, container.clientHeight || 500);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
      resize();
      window.addEventListener("resize", resize);
  
      // loader con draco
      const dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(dracoLoader);
  
      // movimientos definidos
      const movements = {
        glb1: [
          { rotation: [0, -6, 0], position: [0, 0, 0], duration: 1.2 },
          { rotation: [-90, 0, 0], position: [0, 0, 0], duration: 1.5 },
        ],
        glb2: [
          { rotation: [0, -6, 0], position: [0, 0, 0], duration: 1.2 },
          { rotation: [10, 15, 0], position: [0, 0, 0], duration: 1.5 }
        ],
        glb3: [
          { rotation: [0, -6, 0], position: [0, 0, 0], duration: 1.2 },
          { rotation: [90, 0, 0], position: [0, -1, 0], duration: 1.5 }
        ],
        glb4: [
          { rotation: [0, 10, 0], position: [0, 0, 0], duration: 1.2 },
          { rotation: [0, -8, 0], position: [0, 0, 0], duration: 1.5 }
        ]
      };
  
      // cargar el modelo
      loader.load(url, (gltf) => {
        const objs = gltf.scene;
        scene.add(objs);
        container.__glb = objs;
        objs.rotation.y = Math.PI / -6;
  
  // 👇 escala inicial especial para glb3
if (container.getAttribute("id") === "glb3") {
    objs.scale.set(0.8, 0.8, 0.8); // más chico que los demás
  } else {
    objs.scale.set(0.9, 0.9, 0.9); // normal
  }
  
  
        // wireframe
        const wireframeMesh = objs.getObjectByName("A_Unit_Wireframe");  
        const ObjMesh       = objs.getObjectByName("A_Unit");
  
        if (wireframeMesh?.isMesh && ObjMesh) {
          wireframeMesh.material.transparent = true;
          wireframeMesh.material.opacity = 0;
        
          ObjMesh.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = 1;
            }
          });
        
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: "[section-wireframe]",
              start: "top 40%",
              toggleActions: "play none none reverse"
            }
          });
        
          tl.to(wireframeMesh.material, {
            opacity: 1,
            duration: 2,
            ease: "power2.inOut"
          }, 0);
        
          ObjMesh.traverse(child => {
            if (child.isMesh && child.material) {
              tl.to(child.material, {
                opacity: 0,
                duration: 2,
                ease: "power2.inOut"
              }, 0);
            }
          });
        }
  
        // ✅ animación principal con scroll
        const id = container.getAttribute("id");
        const m = movements[id]?.[1]; // usamos paso 1
        if (m) {
          const section = container.closest("[steps-section]");
          gsap.to(objs.rotation, {
            x: THREE.MathUtils.degToRad(m.rotation[0]),
            y: THREE.MathUtils.degToRad(m.rotation[1]),
            z: THREE.MathUtils.degToRad(m.rotation[2] || 0),
            scrollTrigger: {
              trigger: section,
              start: "top 20%",
              end: "bottom 80%",
              scrub: 1,
              markers: true,
            },
            ease: "none"
          });
  
          gsap.to(objs.position, {
            x: m.position[0],
            y: m.position[1],
            z: m.position[2] || 0,
            scrollTrigger: {
              trigger: section,
              start: "top top",
              //end: "bottom 20%",
              scrub: true,
              markers: true,
            },
            ease: "none"
          });
        }
      });
  
      // loop render
      (function animate(){
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      })();
    });
  });
  