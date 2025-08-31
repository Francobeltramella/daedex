import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js"; // si usás Draco
// import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"; // opcional

// ---------- Setup básico ----------
const container = document.querySelector(".element");
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  45,
  container.clientWidth / container.clientHeight,
  0.1,
  100
);
camera.position.set(5, 4, 9);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(container.clientWidth, container.clientHeight, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// Luces
const light = new THREE.DirectionalLight(0xffffff, 4);
light.position.set(-7, -7, 10);
scene.add(light);
const ambientLight = new THREE.AmbientLight(0x404040);
scene.add(ambientLight);

// ---------- Render on-demand ----------
let needsRender = true;
const markNeedsRender = () => { needsRender = true; };
const renderIfNeeded = () => {
  if (!needsRender) return;
  renderer.render(scene, camera);
  needsRender = false;
};

// Redibuja cuando el browser está libre
const scheduleRender = () => {
  markNeedsRender();
  // Podés usar requestIdleCallback si querés aún más suave:
  // requestIdleCallback(renderIfNeeded, { timeout: 100 });
  // pero con setTimeout(0) + rAF ya alcanza:
  setTimeout(() => requestAnimationFrame(renderIfNeeded), 0);
};

// Resize (throttle con rAF)
let resizeRAF = 0;
const onResize = () => {
  cancelAnimationFrame(resizeRAF);
  resizeRAF = requestAnimationFrame(() => {
    const { clientWidth: w, clientHeight: h } = container;
    renderer.setSize(w, h, false);
    camera.aspect = Math.max(1, w) / Math.max(1, h);
    camera.updateProjectionMatrix();
    scheduleRender();
  });
};
window.addEventListener("resize", onResize);

// ---------- Loader con Draco/Meshopt ----------
const loader = new GLTFLoader();
loader.setCrossOrigin("anonymous");

const draco = new DRACOLoader();
draco.setDecoderPath("/draco/"); // coloca los decoders estáticos en /draco/
loader.setDRACOLoader(draco);
// loader.setMeshoptDecoder(MeshoptDecoder);

// ---------- Carga diferida (solo si entra en viewport) ----------
const src = "https://daedex.netlify.app/d12.glb";

let glbLoaded = false;
let obj;

const loadModel = () => {
  if (glbLoaded) return;
  glbLoaded = true;

  loader.load(
    src,
    (gltf) => {
      obj = gltf.scene;
      scene.add(obj);

      // Centrar al origen 1 sola vez (Box3 es costoso, hacerlo una vez)
      const box = new THREE.Box3().setFromObject(obj);
      const center = box.getCenter(new THREE.Vector3());
      obj.position.sub(center);

      // Escala responsive
      const applyResponsiveScale = () => {
        const w = window.innerWidth;
        if (w < 600)       obj.scale.set(0.6, 0.6, 0.6);
        else if (w < 1024) obj.scale.set(0.8, 0.8, 0.8);
        else               obj.scale.set(1, 1, 1);
        scheduleRender();
      };
      applyResponsiveScale();
      window.addEventListener("resize", applyResponsiveScale);

      // Material tweaks (clamp y color fix)
      const whiteDentor = obj.getObjectByName("Plane004_2");
      if (whiteDentor && whiteDentor.isMesh) {
        const m = whiteDentor.material;
        m.metalness = Math.min(1, Math.max(0, 0.4));
        m.roughness = 1.0; // max 1.0
        m.color.set(0xffffff);
        m.needsUpdate = true;
      }

      const grayDentor = obj.getObjectByName("Plane004");
      const airDentor  = obj.getObjectByName("Plane004_3");
      [grayDentor, airDentor].forEach(mesh => {
        if (mesh && mesh.isMesh) {
          const m = mesh.material;
          m.metalness = Math.min(1, Math.max(0, 0.2));
          m.roughness = 1.0;  // en tu código estaba 1.5 (inválido)
          m.color.set(0xe7e7e7); // tu número tenía una 'e' de más
          m.needsUpdate = true;
        }
      });

      // Estado inicial
      const degToRad = (deg) => deg * Math.PI / 180;
      gsap.set(obj.position, { x: 0, y: -7 });
      gsap.defaults({ overwrite: "auto" });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: "[step-1]",
          start: "top top",
          end: "center top",
          scrub: 2,
          // markers: true,
          onUpdate: scheduleRender, // 🔑 render on-demand
        }
      });

      tl.to(obj.position, {
        keyframes: [
          { x: 0,  y: 0,  duration: 0.5, ease: "power2.out" },
          { x: -6, y: -3, duration: 0.4, ease: "power3.in" }
        ],
        onUpdate: scheduleRender
      }, 0)
      .addLabel("pose", 0.2)
      .to(light.position, { x: -5, y: 12, z: 8, ease: "power2.inOut", onUpdate: scheduleRender }, 0)
      .to(obj.rotation,  { x: degToRad(70), y: degToRad(10), z: degToRad(-30), duration: 0.6, ease: "power3.inOut", overwrite: false, onUpdate: scheduleRender }, "pose")
      .to(obj.scale,     { x: 1.3, y: 1.3, z: 1.3, duration: 0.6, ease: "power3.inOut", overwrite: false, onUpdate: scheduleRender }, "pose");

      // Primer render
      scheduleRender();
    },
    (xhr) => {
      // Podés mostrar progreso si querés, pero evitá logs en producción
      // console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    (error) => {
      console.error("GLB load error:", error);
    }
  );
};

// Observa el contenedor (carga al entrar al viewport)
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      loadModel();
      io.disconnect();
    }
  });
}, { rootMargin: "200px" }); // pre-carga ~200px antes
io.observe(container);

// Render inicial vacío
scheduleRender();

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