/**
 * Mouse-tracking 3D model.
 * Loads the GLB set in data-src on [data-model-3d] (e.g. a model exported from Meshy)
 * and turns it toward the cursor. With no data-src (or if loading fails) a simple
 * mushroom placeholder is drawn instead.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const container = document.querySelector('[data-model-3d]');

if (container) init(container);

function init(container) {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // renderer / scene / camera
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.1, 3.2);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a3a, 1.6));
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
  keyLight.position.set(2, 3, 4);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xe08cff, 1.6);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);

  // pivot is what rotates toward the cursor; the model sits centered inside it
  const pivot = new THREE.Group();
  scene.add(pivot);

  const src = container.dataset.src;
  if (src) {
    new GLTFLoader().load(
      src,
      function (gltf) { addModel(gltf.scene); },
      undefined,
      function (err) { console.warn('3D model failed to load, using placeholder.', err); addModel(makePlaceholder()); }
    );
  } else {
    addModel(makePlaceholder());
  }

  // center the model and scale it to fit a ~1.6 unit box, whatever size Meshy exported
  function addModel(object) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const scale = 1.6 / Math.max(size.x, size.y, size.z);
    object.scale.setScalar(scale);
    object.position.copy(center).multiplyScalar(-scale);
    pivot.add(object);
    container.classList.add('loaded');
  }

  // cursor tracking: -1..1 relative to the canvas center, clamped
  const target = { x: 0, y: 0 };

  window.addEventListener('pointermove', function (e) {
    const rect = container.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    target.x = THREE.MathUtils.clamp((e.clientX - cx) / (window.innerWidth / 2), -1, 1);
    target.y = THREE.MathUtils.clamp((e.clientY - cy) / (window.innerHeight / 2), -1, 1);
  });

  // ease back to facing forward when the cursor leaves the window
  document.addEventListener('pointerleave', function () { target.x = 0; target.y = 0; });

  // size the canvas to its container
  const resize = function () {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // only animate while the canvas is on screen (the About tab is hidden on other pages)
  let visible = true;
  new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(container);

  const clock = new THREE.Clock();

  renderer.setAnimationLoop(function () {
    if (!visible) return;

    const t = clock.getElapsedTime();
    const ease = reduceMotion ? 1 : 0.08;

    pivot.rotation.y += (target.x * 0.7 - pivot.rotation.y) * ease;
    pivot.rotation.x += (target.y * 0.35 - pivot.rotation.x) * ease;
    pivot.position.y = reduceMotion ? 0 : Math.sin(t * 1.5) * 0.04;

    renderer.render(scene, camera);
  });
}

// a small mushroom built from primitives, shown until a Meshy model is added
function makePlaceholder() {
  const group = new THREE.Group();

  const stemMat = new THREE.MeshStandardMaterial({ color: 0xf3e6cf, roughness: 0.8 });
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.7, 32), stemMat);
  stem.position.y = -0.25;
  group.add(stem);

  const capMat = new THREE.MeshStandardMaterial({ color: 0xa66bff, roughness: 0.45 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.7, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
  cap.scale.y = 0.75;
  cap.position.y = 0.05;
  group.add(cap);

  const dotMat = new THREE.MeshStandardMaterial({ color: 0xfff6e5, roughness: 0.6 });
  // [angle around, angle down from the top] in radians, placed on the cap's surface
  const dots = [[1.6, 0.35], [0.7, 0.95], [2.5, 1.0], [4.2, 0.8], [5.4, 1.1], [3.3, 0.45]];
  dots.forEach(function (d) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), dotMat);
    dot.position.set(
      0.7 * Math.sin(d[1]) * Math.cos(d[0]),
      0.05 + 0.525 * Math.cos(d[1]),
      0.7 * Math.sin(d[1]) * Math.sin(d[0])
    );
    dot.scale.z = 0.4;
    dot.lookAt(dot.position.clone().multiplyScalar(2).setY(dot.position.y * 2 - 0.05));
    group.add(dot);
  });

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1e1e1f, roughness: 0.3 });
  [-0.11, 0.11].forEach(function (x) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), eyeMat);
    eye.position.set(x, -0.18, 0.31);
    group.add(eye);
  });

  return group;
}
