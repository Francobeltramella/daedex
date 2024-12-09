import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); 

document.querySelector(".element-3d").appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 9);
light.position.set(55, 50, 30);
scene.add(light);

// Material metálico
const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // Base blanca
  metalness: 1,
  roughness: 0.2,
});

// Cargar la fuente y crear texto
const loaderfont = new FontLoader();
loaderfont.load(
  'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', // Fuente JSON
  (font) => {
    const texts = ["A DESIGN AND", "STRATEGY PARTNER","FOCUSED EXCLUSIVELY"]; // Texto en dos líneas
    const lineHeight = 0.8; // Distancia entre las líneas
    texts.forEach((line, index) => {
      const textGeometry = new TextGeometry(line, {
        font: font,
        size: 0.4,
        height: 0.3,
        curveSegments: 15,
        bevelEnabled: true,
        bevelThickness: 0.03,
        bevelSize: 0.02,
        bevelSegments: 2,
      });

      // Centrar el texto
      textGeometry.center();

      // Crear malla y agregarla a la escena
      const textMesh = new THREE.Mesh(textGeometry, metalMaterial);

      // Posicionar la línea
      textMesh.position.y = -index * lineHeight; // Ajusta la posición en el eje Y
      //scene.add(textMesh);
    });
    
  },
  undefined,
  (err) => {
    console.error('Error al cargar la fuente:', err);
  }
);


const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); 
scene.add(ambientLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enableRotate = false;

camera.position.z = 3;

let model, pCylinder4, skull,jaw,lowTeeth;

let targetMouseX = 0,
  targetMouseY = 0; 
let currentHeadX = 0,
  currentHeadY = 0; 
let currentEyeX = 0,
  currentEyeY = 0; 

let scrollActive
scrollActive = false;




// Crear el aro para el cursor
const cursorRingGeometry = new THREE.RingGeometry(0.02, 0.03, 24); // Aro más pequeño y fino
const cursorRingMaterial = new THREE.MeshBasicMaterial({
  color: 0xffa500, // Color del aro (blanco)
  transparent: true,
  opacity: 1, // Translucidez
  side: THREE.DoubleSide, // Renderizar ambas caras
});
const cursorRing = new THREE.Mesh(cursorRingGeometry, cursorRingMaterial);
scene.add(cursorRing);

// Luz naranja para acompañar al cursor
const cursorLight = new THREE.PointLight(0xffa500, 3, 2); // Luz cálida con alcance limitado
cursorLight.castShadow = false; // No proyecta sombras
scene.add(cursorLight);

// Variables para el movimiento suave (delay)
let targetPosition = new THREE.Vector3(); // La posición hacia donde se dirige el cursor
let currentPosition = new THREE.Vector3(); // La posición actual del cursor (con inercia)

// Evento para capturar el movimiento del ratón
document.addEventListener("mousemove", (event) => {
  // Normalizar las coordenadas del ratón
  const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
  const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;

  // Convertir las coordenadas a espacio 3D
  const vector = new THREE.Vector3(mouseX, mouseY, 0.5);
  vector.unproject(camera);

  // Dirección del rayo desde la cámara
  const dir = vector.sub(camera.position).normalize();
  const distance = 2; // Distancia fija del cursor al usuario
  targetPosition = camera.position.clone().add(dir.multiplyScalar(distance)); // Objetivo del cursor
});

// Animación con retraso en el movimiento
function animateCursor() {
  requestAnimationFrame(animateCursor);

  // Interpolar suavemente entre la posición actual y la objetivo
  currentPosition.lerp(targetPosition, 0.1); // El valor 0.1 ajusta la suavidad del retraso

  // Actualizar posiciones del aro y la luz
  cursorRing.position.copy(currentPosition);
  cursorLight.position.copy(currentPosition);

  // Rotar el aro suavemente
  cursorRing.rotation.z += 0.01;

  renderer.render(scene, camera);
}

animateCursor();


// // Textura de niebla
// const fogTexture = new THREE.TextureLoader().load("http://localhost:5173/src/shaders/bg1.jpg");
// const fogMaterial = new THREE.MeshBasicMaterial({
//   map: fogTexture,
//   transparent: true,
//   opacity: 0.5,
// });

// // Plano grande para la textura de fondo
// const fogPlane = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), fogMaterial);
// fogPlane.position.z = -30; // Alejarlo para que sea un fondo
// scene.add(fogPlane);

// // Animar la textura de la niebla
// function animateFog() {
//   fogMaterial.map.offset.y += 0.0002; // Movimiento lento vertical
//   fogMaterial.map.offset.x += 0.0002; // Movimiento lento horizontal
//   renderer.render(scene, camera);
//   requestAnimationFrame(animateFog);
// }

// animateFog();



function lerp(start, end, alpha) {
  return start + (end - start) * alpha;
}

document.addEventListener("mousemove", (event) => {
  targetMouseX = (event.clientX / window.innerWidth) * 2 - 1; // Normalizado (-1 a 1)
  targetMouseY = (event.clientY / window.innerHeight) * 2 - 1; // Mantén positivo para coherencia
});

// Cargar el modelo
const loader = new GLTFLoader();
loader.load(
  "http://localhost:5173/src/assets/robot_skull.glb",
  (gltf) => {
    model = gltf.scene;
    scene.add(model);

    console.log("Estructura del modelo:", model);



    
    pCylinder4 = model.getObjectByName("pCylinder4");
    skull = model.getObjectByName("Sketchfab_Scene");
    jaw = model.getObjectByName("Jaw"); // Mandíbula
    lowTeeth = model.getObjectByName("LowTeeth"); // Dientes inferiores

    if (!pCylinder4 || !skull) {
      console.error("No se encontraron las partes necesarias en el modelo.");
      return;
    }

   // Definir acciones específicas para cada sección
const sectionActions = [
  {
    trigger: "[section-1]",
    onEnter: () => {
      scrollActive = true;
      gsap.to(skull.position, { x: 2, y: 0, duration: 1, ease: "power2.out" });
      gsap.to(skull.rotation, { y: Math.PI / -3, duration: 1, ease: "power2.out" });
      gsap.to(light.position, { x: 20, z: 10, duration: 1, ease: "power2.out" });

    },
    onLeave: () => {
      scrollActive = false;
      gsap.to(skull.position, { x: 0, y: 0, duration: 1, ease: "power2.inOut" });
      gsap.to(skull.rotation, { y: 0, duration: 1, ease: "power2.inOut" });
      gsap.to(light.position, { x: 95, z: 30, duration: 1, ease: "power2.inOut" });

    },
  },
  {
    trigger: "[section-2]",
    onEnter: () => {
      scrollActive = true;
      gsap.to(skull.position, { z: 1,y:0.5,x:-2, duration: 1, ease: "power2.out" });
      gsap.to(skull.rotation, {y: Math.PI / 2, duration: 1, ease: "power2.out" });
      gsap.to(light, { intensity: 8, duration: 1, ease: "power2.out" });
      gsap.to(light.position, { x: 10, y: 5, z: 20, duration: 1, ease: "power2.out" });
 

    },
    onLeave: () => {
      gsap.to(skull.position, { z: 0,y:0, duration: 1, ease: "power2.inOut" });
      gsap.to(light, { intensity: 6, duration: 1, ease: "power2.inOut" });
      gsap.to(light.position, { x: 15, y: 0, z: 30, duration: 1, ease: "power2.inOut" });
    
      
    },
  },
  {
    trigger: ".section-3",
    onEnter: () => {
      gsap.to(skull.rotation, { x: Math.PI / 2, duration: 1, ease: "power2.out" });
    },
    onLeave: () => {
      gsap.to(skull.rotation, { x: 0, duration: 1, ease: "power2.inOut" });
    },
  },
];

// Crear ScrollTriggers en base al array de acciones
sectionActions.forEach((section) => {
  ScrollTrigger.create({
    trigger: section.trigger, // El selector de la sección
    start: "top center", // Cuando la sección llega al centro de la ventana
    end: "bottom center", // Hasta que salga del centro
    onEnter: section.onEnter, // Acción al entrar
    onLeave: section.onLeave, // Acción al salir
    onEnterBack: section.onEnter, // Acción al volver a entrar desde abajo
    onLeaveBack: section.onLeave, // Acción al volver a salir hacia arriba
  });
});


    // Animación inicial de rebote
    gsap.from(model.position, {
      y: 3,
      duration: 2,
      ease: "bounce",
    });

    gsap.from(model.rotation, {
      y: Math.PI * 2,
      duration: 2,
    });
  },
  (xhr) => {
    console.log((xhr.loaded / xhr.total) * 100 + "% cargado");
  },
  (error) => {
    console.error("Error al cargar el modelo:", error);
  }
);
// Función para abrir y cerrar la boca
function toggleMouth(open) {
  if (jaw && lowTeeth) {
    const targetRotation = open ? Math.PI / 6 : 0; // Abrir 30 grados o cerrar
    gsap.to(jaw.rotation, {
      x: targetRotation,
      duration: 0.5,
      ease: "power2.out",
    });

    gsap.to(lowTeeth.rotation, {
      x: targetRotation,
      duration: 0.5,
      ease: "power2.out",
    });
  }
}

// Escuchar el clic para abrir y cerrar la boca
document.addEventListener("click", () => {
  const mouthOpen = jaw.rotation.x === 0; // Verificar si está cerrada
  toggleMouth(mouthOpen); // Alternar entre abrir y cerrar
});
// Loop de animación
function animate() {
  requestAnimationFrame(animate);

  currentHeadX = lerp(currentHeadX, targetMouseY * 0.1, 0.05); 
  currentHeadY = lerp(currentHeadY, targetMouseX * 0.1, 0.05);

  currentEyeX = lerp(currentEyeY, targetMouseY * 0.2, 0.2); 
  currentEyeY = lerp(currentEyeX, targetMouseX * 0.2, 0.2);


  if (skull && scrollActive == false) {
    gsap.to(skull.rotation, {
      x: currentHeadX,
      y: currentHeadY,
      duration: 0.2, 
      ease: "power2.out",
    });
  }

  if (pCylinder4 && scrollActive == false) {
    gsap.to(pCylinder4.rotation, {
      x: currentEyeX,
      y: currentEyeY,
      duration: 0.1, 
      ease: "power2.out",
    });
  }

  controls.update();
  renderer.render(scene, camera); 
}



animate();
