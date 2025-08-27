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
  "https://daedex.netlify.app/d12.glb", 
  (gltf) => {
    const obj = gltf.scene;               
    scene.add(obj);
 
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
          scrub: 2,          
          // markers: true,
          // pin: true,
        }
      });
  
      // Posición en 2 etapas
      tl.to(obj.position, {
        keyframes: [
          { x: 0,   y: 0,  duration: 0.5, ease: "power2.out" },
          { x: -6, y: -3,  duration: 0.4, ease: "power3.in" }
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
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
      camera.position.set(0, 0, 15);
  
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
        const h = Math.max(1, container.clientHeight || 400);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
      resize();
      window.addEventListener("resize", resize);
  
      // cargar GLB
      const loader = new GLTFLoader();
      loader.load(url, (gltf) => {
        const objs = gltf.scene;
        scene.add(gltf.scene);
        objs.rotation.y = Math.PI / -6; // 45 grados en eje Y
        //objs.rotation.x = Math.PI / 6;
      });
  
      // loop
      (function animate(){
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      })();
    });


    const movements = {
        "glb1": [
          { rx: 0,   ry: -6, x: 0, duration: 1.2 },
          { rx: 10,   ry: 10, x: 0, duration: 1.2 }
        ],
        "glb2": [
          { rx: 90,  ry: 0,   y: 5, duration: 1.5 },
          { rx: 0,   ry: 360, z: -5, duration: 1 }
        ]
      };
    
      function animateGLB(container, idx){
        
        if (!container || !container.__glb) {
          console.warn("GLB todavía no cargado para", container);
          return;
        }
      
        const obj = container.__glb; 
        if (!obj) return;
    
        const id = container.getAttribute("id"); // ej: "glb1"
        const movs = movements[id] || [];
        const m = movs[idx];
        if (!m) return;
    
        gsap.to(obj.rotation, {
          x: THREE.MathUtils.degToRad(m.rx || 0),
          y: THREE.MathUtils.degToRad(m.ry || 0),
          z: THREE.MathUtils.degToRad(m.rz || 0),
          duration: m.duration || 1,
          ease: "power2.out"
        });
    
        gsap.to(obj.position, {
          x: m.x || 0,
          y: m.y || 0,
          z: m.z || 0,
          duration: m.duration || 1,
          ease: "power2.out"
        });
      }
    
      gsap.utils.toArray("[steps-section]").forEach(section => {
        const items = section.querySelectorAll("[item-step]");
        const n = items.length;
    
        let prev = 0;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: "top top",
            end: "+=" + (n * window.innerHeight),
            scrub: 0.5,
            onUpdate(self){
              const idx = Math.min(n-1, Math.floor(self.progress * n));
              if (idx !== prev) {
                const glb = section.querySelector(".element-3d-steps");
                animateGLB(glb, idx); // anima según el step
                prev = idx;
              }
            }
          }
        });
        tl.to({}, { duration: n });
      });



  });