import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector(".element");
if (!container) {
  throw new Error('No se encontró .element');
}

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
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
const isMobile = /Mobi|Android/i.test(navigator.userAgent);
const DPR_CAP = isMobile ? 1 : Math.min(1.5, window.devicePixelRatio || 1);   // ← cap DPR
renderer.setPixelRatio(DPR_CAP);
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace; // colores correctos
container.appendChild(renderer.domElement);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 6);
light.position.set(20, 20, 20);
scene.add(light);

const ambientLight = new THREE.AmbientLight(0x404040, 1);
scene.add(ambientLight);

// Luz direccional violeta
const dirLight = new THREE.DirectionalLight(0x7777e7, 1);
dirLight.position.set(-2, -5, 4);
dirLight.target.position.set(0, 0, 0);
scene.add(dirLight, dirLight.target);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;

// Activar/desactivar por interacción para ahorrar CPU
controls.enabled = false;
renderer.domElement.addEventListener("pointerdown", () => (controls.enabled = true), { passive: true });
window.addEventListener("pointerup", () => (controls.enabled = false), { passive: true });

// (Opcional) registro defensivo GSAP/ScrollTrigger
if (window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });
}

// Load GLB
const loader = new GLTFLoader();
loader.load(
  "https://daedex.netlify.app/d12.glb",
  (gltf) => {
    const obj = gltf.scene;
    scene.add(obj);

    // Centrar al origen para orbitar/escala lindos
    const box = new THREE.Box3().setFromObject(obj);
    const center = new THREE.Vector3();
    box.getCenter(center);
    obj.position.sub(center);

    // —— Escala responsiva basada en ancho del container
    function applyResponsiveScale() {
      const cw = container.clientWidth;
      if (cw < 600) {
        obj.scale.set(0.6, 0.6, 0.6);
      } else if (cw < 1024) {
        obj.scale.set(0.8, 0.8, 0.8);
      } else {
        obj.scale.set(1, 1, 1);
      }
    }

    // Debounce de resize/orientation
    let resizeTO;
    function handleResize() {
      clearTimeout(resizeTO);
      resizeTO = setTimeout(() => {
        const w = container.clientWidth;
        const h = container.clientHeight;

        camera.aspect = w / h;
        camera.updateProjectionMatrix();

        // mantener el mismo cap que al iniciar
        renderer.setPixelRatio(DPR_CAP);
        renderer.setSize(w, h);

        // escala GLB según viewport real del container
        applyResponsiveScale();

        // render inmediato
        renderOnce();

        // si usás ScrollTrigger, refrescar (opcional)
        if (window.ScrollTrigger) ScrollTrigger.refresh();
      }, 120);
    }
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    // Primera pasada
    applyResponsiveScale();
    handleResize();

    // ====== Material tweaks ======
    const whiteDentor = obj.getObjectByName("Plane004_2");
    if (whiteDentor && whiteDentor.isMesh) {
      whiteDentor.material.metalness = 0.4;
      whiteDentor.material.roughness = 1.0;  // clamp 0..1
      whiteDentor.material.color.set(0xffffff);
      whiteDentor.material.needsUpdate = true;
    }

    const grayDentor = obj.getObjectByName("Plane004");
    const airDentor  = obj.getObjectByName("Plane004_3");
    [grayDentor, airDentor].forEach(mesh => {
      if (mesh && mesh.isMesh) {
        mesh.material.metalness = 0.2;
        mesh.material.roughness = 1.0;      // antes 1.5
        mesh.material.color.set(0xe7e7e7);  // corregido
      }
    });

    // ====== Animación con GSAP/ScrollTrigger (si existen) ======
    const degToRad = (deg) => deg * Math.PI / 180;

    if (window.gsap) {
      gsap.set(obj.position, { x: 0, y: -7 });
      gsap.defaults({ overwrite: "auto" });

      const tl = gsap.timeline({
        scrollTrigger: window.ScrollTrigger ? {
          trigger: "[step-1]",
          start: "top top",
          end: "center top",
          scrub: 2,
          // markers: true,
        } : undefined
      });

      tl.to(obj.position, {
        keyframes: [
          { x: 0,   y: 0,  duration: 0.5, ease: "power2.out" },
          { x: -6,  y: -3, duration: 0.4, ease: "power3.in" }
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
      .to(light, { intensity: 4 }, 0)
      .to(obj.scale, {
        x: 1.3, y: 1.3, z: 1.3,
        duration: 0.6,
        ease: "power3.inOut",
        overwrite: false
      }, "pose");
    }
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
  },
  (error) => {
    console.error("An error happened", error);
  }
);

// Render loop ligero (cap ~45fps) + render on demand
let last = 0;
function renderOnce() {
  renderer.render(scene, camera);
}

function animate(ts = 0) {
  requestAnimationFrame(animate);

  // limitar a ~45 fps (22ms)
  if (ts - last < 22) return;
  last = ts;

  if (controls.enabled) controls.update(); // sólo si el usuario está interactuando
  renderOnce();
}
animate();

// Si hay GSAP, render inmediato cuando cambian timelines
if (window.gsap) {
  gsap.ticker.add(renderOnce);
}

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
      const camera = new THREE.PerspectiveCamera(65, 0, 0.1, 100);
      camera.position.set(0, -1, 15);
  
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
        container.__glb = objs;
        objs.rotation.y = Math.PI / -6; 


        const wireframeMesh = objs.getObjectByName("A_Unit_Wireframe");  
        const ObjMesh       = objs.getObjectByName("A_Unit");

        if (wireframeMesh?.isMesh && ObjMesh) {
          // Wireframe arranca invisible
          wireframeMesh.material.transparent = true;
          wireframeMesh.material.opacity = 0;
        
          // Prepara todos los materiales del ObjMesh para soportar transparencia
          ObjMesh.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = 1; // arranca visible
            }
          });
        
          // Animación con timeline sincronizado
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: "[section-wireframe]",
              start: "bottom bottom",
              toggleActions: "play none none reverse"
            }
          });
        
          // Wireframe entra
          tl.to(wireframeMesh.material, {
            opacity: 1,
            duration: 2,
            ease: "power2.inOut"
          }, 0);
        
          // ObjMesh se desvanece
          ObjMesh.traverse(child => {
            if (child.isMesh && child.material) {
              tl.to(child.material, {
                opacity: 0,
                duration: 2,
                ease: "power2.inOut"
              }, 0); // mismo tiempo, crossfade
            }
          });
        }




      });
  
      // loop
      (function animate(){
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
      })();
    });
  
    const movements = {
      "glb1": [
        { rx: 0,    ry: -6,   x: 0, duration: 1.2 },  
        { rx: -90,   ry: 0,   x: 0, z:1, duration: 1.5 },  
        { rx: 8,   ry: -12,  x: 0, duration: 1.5 },   
        { rx: 70,    ry: 25,   x: 0, duration: 1.4 },  
        { rx: 0,  ry: 0,    x: 0, duration: 1.6 } 
      ],
      "glb2": [
        { rx: 0,    ry: -6,   x: 0, duration: 1.2 },  
        { rx: 10,   ry: 15,   x: 0, duration: 1.5 },  
        { rx: 8,   ry: -12,  x: 0, duration: 1.5 },   
        { rx: 0,    ry: 0,   x: 0, duration: 1.4 }      
    ],
    "glb3": [
        { rx: 0,    ry: -6,   x: 0,  duration: 1.2 },  
        { rx: 90,  ry: 0,   x: 0,y: -1,  duration: 1.5 },
        { rx: 60,   ry: 25,  x: 0, duration: 1.5 },   
        { rx: 0,    ry: 0,   x: 0, duration: 1.2 }          
    ],
    "glb4": [
        { rx: 0,    ry: -6,   x: 0, duration: 1.2 },  
        { rx: -90,  ry: 0,   x: 0,y: -1, z:1, duration: 1.5 },
        { rx: 60,   ry: 25,  x: 0, duration: 1.5 },   
        { rx: 0,    ry: 0,   x: 0, duration: 1.2 }      
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