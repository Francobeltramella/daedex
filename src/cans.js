import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

function createScene(containerSelector, modelPath, position = { x: 0, y: 0, z: 0 }) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Contenedor no encontrado: ${containerSelector}`);
        return;
    }

    // Dimensiones del contenedor
    const dimensions = container.getBoundingClientRect();
    const width = dimensions.width;
    const height = dimensions.height;

    let floatingModel = null; // Variable para almacenar el modelo cargado
    let isfloating = false;
    // Escena
    const scene = new THREE.Scene();

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);
    renderer.setPixelRatio(window.devicePixelRatio);

    scene.background = null;
    renderer.setClearColor(0x000000, 0);


    
    // Cámara
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(5, 4, -5);


   
      gsap.to(camera.rotation, {
        x: Math.PI / 8,   // Leve inclinación en X
        y: Math.PI / 4,   // Rotación en Y
        duration: 3,
        
        ease: "power1.inOut"
      });

      gsap.to(camera.position, {
        x: 0, y: -3, z: 4, // Nueva posición de la cámara
        duration: 3,
        delay:0.5,       // Duración en segundos
        ease: "power1.inOut",
        onUpdate: () => {
          camera.lookAt(0, 0, 0); // La cámara siempre mira al centro
        }
      });
      gsap.to(camera.position, {
        x: 0, y: 0, z: 5, // Nueva posición de la cámara
        duration: 3,  
        delay:3.5,     // Duración en segundos
        ease: "power1.inOut",
        onUpdate: () => {
          camera.lookAt(0, 0, 0); // La cámara siempre mira al centro
        }
      });

      gsap.to(camera.position, {
        x: 0, y: -0.2, z: 3.5, // Nueva posición de la cámara
        duration: 5,  
        delay:7,     // Duración en segundos
        ease: "power4.Out",
        onUpdate: () => {
          camera.lookAt(0, 0, 0); // La cámara siempre mira al centro
        }
      });

    // Controles de cámara
    const controls = new OrbitControls(camera, renderer.domElement);
//     controls.enableZoom = false;
// controls.enableRotate = false;

    // Luces
   
    const ambientLight = new THREE.AmbientLight(0xffffff, 0);
    scene.add(ambientLight);
    ambientLight.castShadow = true;

  // Luz direccional izquierda (frontal)
const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0);
directionalLight1.position.set(-70, -20, 20); 
scene.add(directionalLight1);

// Luz direccional derecha (frontal)
const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0);
directionalLight2.position.set(70, 10, 20); 
scene.add(directionalLight2);

// Luz direccional trasera
const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0);
directionalLight3.position.set(0, -20, 20); 
scene.add(directionalLight3);


// // Helper para luz direccional izquierda (frontal)
// const arrowHelper1 = new THREE.ArrowHelper(
//     directionalLight1.target.position.clone().sub(directionalLight1.position).normalize(), // Dirección
//     directionalLight1.position, // Posición de inicio
//     20, // Longitud del vector
//     0xff0000 // Color del vector
//   );
//   scene.add(arrowHelper1);
  
//   // Helper para luz direccional derecha (frontal)
//   const arrowHelper2 = new THREE.ArrowHelper(
//     directionalLight2.target.position.clone().sub(directionalLight2.position).normalize(),
//     directionalLight2.position,
//     20,
//     0x00ff00
//   );
//   scene.add(arrowHelper2);
  
//   // Helper para luz direccional trasera
//   const arrowHelper3 = new THREE.ArrowHelper(
//     directionalLight3.target.position.clone().sub(directionalLight3.position).normalize(),
//     directionalLight3.position,
//     20,
//     0x0000ff
//   );
//   scene.add(arrowHelper3);

gsap.fromTo(directionalLight2, {
    intensity: 0,      
    ease: "power2.inOut"
},{
    duration: 5,  
    intensity: 1.5,
    delay:6,
}); 
gsap.fromTo(directionalLight1, {
    intensity: 0,   
   
},{
    duration:5,   
    ease: "power4.inOut",
    delay:6.5,
    intensity:1.5,
}); 
gsap.fromTo(directionalLight3, {
    intensity: 0,   
    ease: "power2.inOut"
},{
    duration:3,
    delay:1.2,
    intensity: 1.5,
});

// gsap.fromTo(ambientLight, {
//     intensity: 0,   
//     ease: "power2.inOut"
// },{
//     duration:3,
//     delay:4,
//     intensity: 2,
// }); 


    // Cargar modelo GLB
    const loader = new GLTFLoader();
    loader.load(
        modelPath,
        (gltf) => {
            const model = gltf.scene;
            model.position.set(position.x, position.y, position.z);
            scene.add(model);
            floatingModel = model; // Almacenar referencia al modelo cargado
            const latadorada = model.getObjectByName('lata-dorada');
            const lataazul = model.getObjectByName('lata-azul');
            const lataverde = model.getObjectByName('lata-verde');
            const lataamarilla = model.getObjectByName('lata-amarilla');
            const lataceleste = model.getObjectByName('lata-celeste');

            latadorada.userData.isFloating = false;

            const material =  lataazul.children



            let floatingAnimation;



            function addFloatingEffect(object, amplitude = 0.2, duration = 2) {
              floatingAnimation = gsap.to(object.position, {
                y: `+=${amplitude}`, // Mover hacia arriba
                repeat: -1, // Repetir indefinidamente
                yoyo: true, // Volver al estado original
                ease: "power1.inOut", // Suavidad de movimiento
                duration: duration, // Duración del ciclo completo
                delay:0.3
              });
            }
            console.log(material,'gota')

            

            gsap.fromTo(lataazul.position, {  y: 9, },
                { y:0, duration: 7,delay:1,  ease: "power2.out", onComplete: () => {
                    addFloatingEffect(lataazul);

              } });
              gsap.fromTo(lataverde.position, {  y: 9, },
                { y:1, duration: 7,delay:0.5,  ease: "power4.out", onComplete: () => {
                    addFloatingEffect(lataverde);
              } });
              gsap.fromTo(lataamarilla.position, {  y: 9, },
                { y:0, duration: 7,delay:1.5,  ease: "power4.out", onComplete: () => {
                addFloatingEffect(lataamarilla);
              } });
              gsap.fromTo(lataceleste.position, {  y: 9, },
                { y:0.5, duration: 7,  ease: "power4.out", onComplete: () => {
                //isfloating = true;
                addFloatingEffect(lataceleste);
              } });
            
            gsap.fromTo(latadorada.position, { z:8, y: -10, },
            { z:0.6 ,y:0, duration: 9,delay:0.3, ease: "power4.out", onComplete: () => {
             // isfloating = true;  
             addFloatingEffect(latadorada);
     
            } 
        });
              


          
            gsap.fromTo(latadorada.rotation, { y: THREE.MathUtils.degToRad(720) },
            { y: THREE.MathUtils.degToRad(40), duration: 10, ease: "power4.out" });

            

            floatingModel.children.forEach((child) => {
                if (child.name !== "lata-dorada") { 
                    child.userData.originalPosition = child.position.clone();
                    child.userData.offset = Math.random() * Math.PI * 2; 
                    
                }
            });
            console.log(`Modelo cargado en ${containerSelector}:`, model);
        },
        (xhr) => {
            console.log(`Cargando modelo ${modelPath}: ${(xhr.loaded / xhr.total) * 100}%`);
        },
        (error) => {
            console.error(`Error cargando el modelo ${modelPath}:`, error);
        }
    );

    // Ajustar tamaño en caso de redimensionar ventana
    window.addEventListener('resize', () => {
        const dimensions = container.getBoundingClientRect();
        const width = dimensions.width;
        const height = dimensions.height;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });

    // Animación
    let clock = new THREE.Clock(); // Para calcular el tiempo transcurrido

    function animate() {
        requestAnimationFrame(animate);

        // Aplicar movimiento de flotación
        if (floatingModel && isfloating == true) {
            const elapsedTime = clock.getElapsedTime();
            floatingModel.position.y = position.y + Math.sin(elapsedTime * 1.5) * 0;
    
            floatingModel.children.forEach((child) => {
                const originalY = child.userData.originalPosition?.y || 0; // Usar posición inicial
                const offset = child.userData.offset || 0;
                child.position.y = originalY + Math.sin(elapsedTime * 2 + offset) * 0.025; // Movimiento sinusoidal con desfase
            });
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}

createScene('.element-3d-1', 'https://animation-3d-poc.netlify.app/latav10.glb', { x: 0, y: 0, z: 0 });
