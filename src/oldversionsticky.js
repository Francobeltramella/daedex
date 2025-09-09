
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
      const camera = new THREE.PerspectiveCamera(65, 0, 0.1, 200);
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
        const h = Math.max(1, container.clientHeight || 500);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
      resize();
      window.addEventListener("resize", resize);
  
      const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/'); // Ruta CDN oficial
// O si tenés los archivos localmente:
// dracoLoader.setDecoderPath('/path/to/draco/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

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