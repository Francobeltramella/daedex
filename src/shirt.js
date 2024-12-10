import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import gsap from 'gsap';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({antialias: true});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); 

document.querySelector(".element-3d").appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 25);
light.position.set(55, 50, 30);
scene.add(light);


window.addEventListener('resize', () => {
  const container = document.querySelector(".element-3d");
  if (container) {
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
  } else {
    console.error("El contenedor .element-3d no está disponible.");
  }
});

const haloGeometry = new THREE.TorusGeometry(1.8, 0.02, 508, 3000); 

const haloShaderMaterial = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0xffa500) }, // Color base
    intensity: { value: 0.5 }, // Intensidad del efecto Fresnel
    emissive: { value: new THREE.Color(0xffa500) }, // Luz cálida adicional
  },
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform vec3 emissive;
    uniform float intensity;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      float fresnel = pow(1.0 - dot(vNormal, viewDir), intensity);
      fresnel = clamp(fresnel, 0.2, 1.0); // Limitar valores para suavizar bordes
      gl_FragColor = vec4(color * fresnel + emissive, 1.0);
    }
  `,
  transparent: false, 
  side: THREE.DoubleSide, 
});
const halo = new THREE.Mesh(haloGeometry, haloShaderMaterial);
halo.position.set(0, 0.1, 0); // Colocar encima del skull
halo.rotation.x = Math.PI / -1; // Rotar en el eje X para alinear como un aro horizontal
//scene.add(halo);


const metalMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff, // Base blanca
  metalness: 1,
  roughness: 0.2,
});



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
  opacity: 0.8, // Translucidez
  side: THREE.DoubleSide, // Renderizar ambas caras
});
const cursorRing = new THREE.Mesh(cursorRingGeometry, cursorRingMaterial);
//scene.add(cursorRing);

// Luz naranja para acompañar al cursor
const cursorLight = new THREE.PointLight(0xffa500, 3, 5); // Luz cálida con alcance limitado
cursorLight.castShadow = true; // No proyecta sombras
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

  const dir = vector.sub(camera.position).normalize();
  const distance = 2; // Distancia fija del cursor al usuario
  targetPosition = camera.position.clone().add(dir.multiplyScalar(distance)); // Objetivo del cursor
});

// Animación con retraso en el movimiento
function animateCursor() {
  requestAnimationFrame(animateCursor);

  currentPosition.lerp(targetPosition, 0.1); // El valor 0.1 ajusta la suavidad del retraso

  cursorRing.position.copy(currentPosition);
  cursorLight.position.copy(currentPosition);

  // Rotar el aro suavemente
  cursorRing.rotation.z += 0.01;

  renderer.render(scene, camera);
}

animateCursor();




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
  "https://animation-3d-poc.netlify.app/robot_skull.glb",
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


    let floatingAnimation;



    function addFloatingEffect(object, amplitude = 0.1, duration = 2) {
      floatingAnimation = gsap.to(object.position, {
        y: `+=${amplitude}`, // Mover hacia arriba
        repeat: -1, // Repetir indefinidamente
        yoyo: true, // Volver al estado original
        ease: "power1.inOut", // Suavidad de movimiento
        duration: duration, // Duración del ciclo completo
       // delay:7
      });
    }
    
    if (skull && scrollActive == false) {
      addFloatingEffect(skull);
    }
    gsap.set("[finish]",{opacity:0})

   // Definir acciones específicas para cada sección
const sectionActions = [
  {
    trigger: "[section-1]",
    onEnter: () => {
      scrollActive = true;
      gsap.to(skull.position, { z:0.5, x: 2, y: 0, duration: 1, ease: "power2.out" });
      gsap.to(skull.rotation, { y: Math.PI / -3, duration: 1, ease: "power2.out" });
      if (floatingAnimation) floatingAnimation.pause(); // Pausar flotación

   
    },
    onLeave: () => {
      scrollActive = false;
      gsap.to(skull.position, { z:0, x: 0, y: 0, duration: 1, ease: "power2.inOut" });
      gsap.to(skull.rotation, { y: 0, duration: 1, ease: "power2.inOut" });
      if (floatingAnimation) floatingAnimation.resume(); // Pausar flotación

    },
  },
  {
    trigger: "[section-2]",
    onEnter: () => {
      scrollActive = true;
      gsap.to(skull.position, {z:0, y:0, x:-2 , duration: 1, ease: "power2.out" });
      gsap.to(skull.rotation, { y: Math.PI / 2, duration: 1, ease: "power2.out" });
      if (floatingAnimation) floatingAnimation.pause(); // Pausar flotación

    },
    onLeave: () => {
      gsap.to(skull.position, { z: 0,y:0, x:-2, duration: 1, ease: "power2.inOut" });
      gsap.to(light, { intensity: 6, duration: 1, ease: "power2.inOut" });
      if (floatingAnimation) floatingAnimation.resume(); // Pausar flotación
      
    },
  },
  {
    trigger: "[section-3]",
    onEnter: () => {
      gsap.to(skull.rotation, { y: Math.PI / 2, duration: 1, ease: "power2.out" });
      gsap.to(skull.position, { z: 0,y:0,x:-2, duration: 1, ease: "power2.inOut" });

      if (floatingAnimation) floatingAnimation.pause(); // Pausar flotación

    },
    onLeave: () => {
      gsap.to(skull.position, { z: 0,y:0.3,x:-2, duration: 1, ease: "power2.inOut" });
      gsap.to(skull.rotation, { x: 0, duration: 1, ease: "power2.inOut" });
      if (floatingAnimation) floatingAnimation.resume(); // Pausar flotación

    },
  },
  {
    trigger: "[section-4]",
    onEnter: () => {
      gsap.to(skull.rotation, { x: 0, y: 0, duration: 1, ease: "power2.out" });
      gsap.to(skull.position, { x: 0,y:0.3,z:0.3,  duration: 1, ease: "power2.out" });
      if (floatingAnimation) floatingAnimation.pause(); // Pausar flotación

    },
    onLeave: () => {
      gsap.to(skull.rotation, { x: 0,y:0, duration: 1, ease: "power2.inOut" });
      gsap.to(skull.position, { x: 0,y:0.3, z:0.3, duration: 1, ease: "power2.out" });
      if (floatingAnimation) floatingAnimation.resume(); // Pausar flotación

    },
  },
  {
    trigger: "[section-5]",
    onEnter: () => {
      gsap.to(jaw.rotation, {
        x: Math.PI / 6,
        duration: 0.5,
        ease: "power2.out",
      });
  
      gsap.to(lowTeeth.rotation, {
        x: Math.PI / 6,
        duration: 0.5,
        ease: "power2.out",
      });
      gsap.to(skull.rotation, {x: 0,y:0,x: Math.PI / -6,  duration: 1, ease: "power2.out" });
      gsap.to(skull.position, {delay:0.5, z:5,x: 0,y:0.3,  duration: 1, ease: "power2.out" });
      if (floatingAnimation) floatingAnimation.pause(); // Pausar flotación
      gsap.to("[finish]",{opacity:1, delay:0.9})
      gsap.to(".video-bg",{opacity:0,duration:0.3,delay:0.5})
      gsap.to(skull, {opacity:0,duration:0.3,delay:0.5});


    },
    onLeave: () => {
      gsap.to(jaw.rotation, {
        x: 0,
        duration: 0.5,
        ease: "power2.out",
      });
  
      gsap.to(lowTeeth.rotation, {
        x: 0,
        duration: 0.5,
        ease: "power2.out",
      });
      gsap.to("[finish]",{opacity:0, delay:0.9})
      gsap.to(".video-bg",{opacity:0.44,duration:0.3})
      gsap.to(skull, {opacity:1,duration:0.3,delay:0.5});
      gsap.to(skull.rotation, {x: 0,y:0,x:0,  duration: 1, ease: "power2.out" });
      gsap.to(skull.position, { z:0,x: 0,y:0,  duration: 1, ease: "power2.out" });
      if (floatingAnimation) floatingAnimation.resume(); // Pausar flotación

    },
  },
  
];

ScrollTrigger.addEventListener("refresh", () => {
  ScrollTrigger.getAll().forEach(trigger => {
    const distance = trigger.end - trigger.start;
    const animationDuration = trigger.animation.duration() * 1000; // ms
    if (distance < animationDuration) {
      trigger.end = trigger.start + animationDuration / 1000; // Ajusta la duración
    }
  });
});

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



if (floatingAnimation) {
  floatingAnimation.pause();
}


    // Animación inicial de rebote
    gsap.fromTo(model.position,{
      y: -10,
    }, {
      y: 0.3,
      delay:5.5,
      duration: 2,
     //ease: "bounce",
     onComplete: () => {
      if (floatingAnimation) floatingAnimation.resume();
    }
    });

    gsap.fromTo(skull.rotation, {
      y: Math.PI * 1,
      duration: 3,
      delay:5.5,
    },{
      y: 0,
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

  currentEyeX = lerp(currentEyeY, targetMouseY * 0.1, 0.01); 
  currentEyeY = lerp(currentEyeX, targetMouseX * 0.1, 0.01);


  if (skull && scrollActive == false) {
    gsap.to(skull.rotation, {
      x: currentHeadX,
      y: currentHeadY,
      duration: 0.2, 
      ease: "power2.out",
    });
    gsap.to(halo.rotation, {
      x: currentEyeX,
      y: currentEyeY,
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





var lenis = new Lenis({
  duration: 5,
  easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)), // https://easings.net
  direction: "vertical",
  smooth: true,
  smoothTouch: false,
  touchMultiplier: 1.5,
});

document.querySelector(".page-wrapper");
lenis.start();

function raf(time) {
lenis.raf(time);
requestAnimationFrame(raf);
}

requestAnimationFrame(raf);