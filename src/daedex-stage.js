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
const GLB_URL = 'https://daedex.netlify.app/elmreduce.glb'; // GLB prioritario

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

  const key = new THREE.DirectionalLight(0xffffff, 3);
  key.position.set(20, 10, 100);
  group.add(key);

  const spot = new THREE.SpotLight(0xffffff, 5);
  spot.position.set(-10, 50, -10);
  spot.angle = Math.PI / 6;
  spot.penumbra = 0.3;
  spot.decay = 2;
  spot.distance = 40;
  group.add(spot, spot.target);

  const amb = new THREE.AmbientLight(0xffffff, 6);
  group.add(amb);

  const dir = new THREE.DirectionalLight(0x7777e7, 2);
  dir.position.set(0, 0, 0);
  group.add(dir, dir.target);

  scene.add(group);
  return { key, spot, amb, dir };
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
// Loader GLB + Draco (promesa)
// --------------------------------------------------
function loadGLB(url) {
  return new Promise((resolve, reject) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      (xhr) => console.log(`${((xhr.loaded / xhr.total) * 100).toFixed(1)}% loaded`),
      reject
    );
  });
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
    // 👉 Primero cargar GLB prioritario
    const obj = await loadGLB(GLB_URL);
    scene.add(obj);
    centerObject(obj);
    responsiveScale(obj);
    lights.spot.target.position.copy(obj.position);

    obj.traverse((child) => {
      if (child.isMesh && child.material && 'envMapIntensity' in child.material) {
        child.material.envMapIntensity = 1.0;
        child.material.needsUpdate = true;
      }
    });

    const whiteDentor = obj.getObjectByName('Bake.004');
    if (whiteDentor && whiteDentor.isMesh && whiteDentor.material) {
      whiteDentor.material.metalness = 0.8;
      whiteDentor.material.roughness = 0.5;
      whiteDentor.material.color.set(0xffffff);
      whiteDentor.material.envMapIntensity = 1.2;
      whiteDentor.material.needsUpdate = true;
    }

    const grayDentor = obj.getObjectByName('Bake_02.004');
    const airDentor = obj.getObjectByName('Bake_03.004');
    [grayDentor, airDentor].forEach((mesh) => {
      if (mesh && mesh.isMesh && mesh.material) {
        mesh.material.metalness = 0.4;
        mesh.material.roughness = 0.7;
        mesh.material.color.set(0xe7e7e7);
        mesh.material.needsUpdate = true;
      }
    });

    // 👉 Después cargar HDRI
    const envMap = await loadEnvMap(renderer, ENV_URL);
    scene.environment = envMap;

    // Estado inicial con gsap
    if (window.gsap) {
      let mm = gsap.matchMedia();

      mm.add("(max-width: 768px)", () => {
        gsap.set(obj.position, { x: 0, y: -5 });
      });
      mm.add("(min-width: 769px)", () => {
        gsap.set(obj.position, { x: 0, y: -7 });
      });
      gsap.defaults({ overwrite: 'auto' });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: '[step-1]',
          start: 'top top',
          end: 'center top',
          scrub: 2,
          invalidateOnRefresh: true,
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

    if (window.endLoaderAnimation) {
      window.endLoaderAnimation(); // ✅ loader se cierra cuando GLB + HDRI están
    }

    const once = () => {
      responsiveScale(obj);
      window.removeEventListener('resize', once);
    };
    window.addEventListener('resize', once);

  } catch (e) {
    console.error('Error cargando HDRI o GLB:', e);
    if (window.endLoaderAnimation) window.endLoaderAnimation();
  }
})();

// --------------------------------------------------
// Loop
// --------------------------------------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// --------------------------------------------------
// Loader
// --------------------------------------------------
let endLoaderAnimation;

(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.add('no-scroll');
  document.body.classList.add('no-scroll');

  const loader    = document.querySelector('[loader]');
  const logoEl    = document.querySelector('[logo]');
  const logoText  = document.querySelector('[logo-text]');
  const logoWrap  = document.querySelector('[logo-wrap]');
  const navEl     = document.querySelector('[nav]');

  const revealTargets = [
    document.querySelector('[title]'),
    document.querySelector('[subtitle]'),
    document.querySelector('[btn]'),
    document.querySelector('[element-3d]')
  ].filter(Boolean);

  if (!loader || !logoEl || !logoText) {
    document.documentElement.classList.remove('no-scroll');
    document.body.classList.remove('no-scroll');
    loader?.remove();
    return;
  }

  gsap.set(logoEl,   { rotation: 0 });
  gsap.set(logoText, { width: '0%' });
  gsap.set(revealTargets, { y: 40, opacity: 0 });
  if (navEl) gsap.set(navEl, { y: '-100%', opacity: 0 });

  endLoaderAnimation = function() {
    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete() {
        gsap.set(loader, { display: 'none' });
      }
    });
    tl.timeScale(0.4);

    tl.to(logoEl, {
      rotation: prefersReduced ? 0 : 360,
      delay: 0.35,
      duration: prefersReduced ? 0.25 : 1.4,
      ease: 'expo.out'
    }, 0);

    tl.to(logoText, {
      width: '100%',
      duration: prefersReduced ? 0.25 : 0.8,
      ease: 'power3.out'
    }, 0.38);

    tl.to(logoWrap, {
      opacity: 0,
      duration: prefersReduced ? 0.2 : 0.55,
      ease: 'sine.out'
    }, '>-0.05');

    gsap.set(loader, { clipPath: 'inset(0% 0% 0% 0%)' });
    tl.to(loader, {
      clipPath: 'inset(0% 0% 100% 0%)',
      autoAlpha: 0.999,
      duration: prefersReduced ? 0.25 : 0.65,
      ease: 'power4.inOut'
    }, '>-0.05');

    tl.add('unlock', '>-0.25').add(() => {
      document.documentElement.classList.remove('no-scroll');
      document.body.classList.remove('no-scroll');
    }, 'unlock');

    if (revealTargets.length) {
      tl.add('reveal', '>-0.05');
      tl.to(revealTargets.slice(0, 3), {
        y: 0,
        opacity: 1,
        duration: prefersReduced ? 0.25 : 0.7,
        stagger: prefersReduced ? 0.03 : 0.12,
        ease: 'power3.out'
      }, 'reveal');
      const el3d = revealTargets[3];
      if (el3d) {
        tl.to(el3d, {
          y: 0,
          opacity: 1,
          duration: prefersReduced ? 0.3 : 0.85,
          ease: 'back.out(1.3)'
        }, 'reveal+=0.18');
      }
    }
    if (navEl) {
      tl.to(navEl, {
        y: '0%',
        opacity: 1,
        duration: prefersReduced ? 0.25 : 0.6,
        ease: 'power3.out'
      }, 'reveal+=0.18');
    }
  };

  window.endLoaderAnimation = endLoaderAnimation;
})();
