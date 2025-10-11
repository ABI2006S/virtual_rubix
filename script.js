// === Scene setup ===
const canvas = document.getElementById('rubikCanvas');
const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(5, 5, 6);
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.setClearColor(0x000000);
renderer.shadowMap.enabled = true;

// Lighting
const ambient = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambient);
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);

// === Colors ===
const colors = {
  front: 0x00ff00,   // green
  back: 0x0000ff,    // blue
  right: 0xff0000,   // red
  left: 0xffa500,    // orange
  top: 0xffffff,     // white
  bottom: 0xffff00,  // yellow
};

// === Create Cubelet ===
function createCubelet(x, y, z) {
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.98, 0.98, 0.98),
    new THREE.MeshStandardMaterial({ color: 0x000000 })
  );

  // Create colored faces
  const faceSize = 0.9;
  const offset = 0.5;
  const faceGeo = new THREE.PlaneGeometry(faceSize, faceSize);

  const addFace = (color, pos, rot) => {
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.1 });
    const face = new THREE.Mesh(faceGeo, mat);
    face.position.copy(pos);
    face.rotation.copy(rot);
    base.add(face);
  };

  addFace(colors.front, new THREE.Vector3(0, 0, offset), new THREE.Euler(0, 0, 0));
  addFace(colors.back, new THREE.Vector3(0, 0, -offset), new THREE.Euler(0, Math.PI, 0));
  addFace(colors.right, new THREE.Vector3(offset, 0, 0), new THREE.Euler(0, Math.PI / 2, 0));
  addFace(colors.left, new THREE.Vector3(-offset, 0, 0), new THREE.Euler(0, -Math.PI / 2, 0));
  addFace(colors.top, new THREE.Vector3(0, offset, 0), new THREE.Euler(-Math.PI / 2, 0, 0));
  addFace(colors.bottom, new THREE.Vector3(0, -offset, 0), new THREE.Euler(Math.PI / 2, 0, 0));

  base.position.set(x, y, z);
  base.castShadow = true;
  return base;
}

// === Build 3x3x3 Cube ===
const rubiksCube = new THREE.Group();
for (let x = -1; x <= 1; x++) {
  for (let y = -1; y <= 1; y++) {
    for (let z = -1; z <= 1; z++) {
      rubiksCube.add(createCubelet(x, y, z));
    }
  }
}
scene.add(rubiksCube);

// === Smooth mouse rotation of the whole cube ===
let targetX = 0, targetY = 0;
window.addEventListener("mousemove", (e) => {
  const normalizedX = (e.clientX / innerWidth - 0.5) * 2;
  const normalizedY = (e.clientY / innerHeight - 0.5) * 2;
  targetY = normalizedX * Math.PI;
  targetX = normalizedY * Math.PI;
});

// === Click + drag to rotate a face ===
let isDragging = false;
let dragStart, dragEnd;
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let rotating = false;

window.addEventListener("mousedown", (e) => {
  if (rotating) return;
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY };
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(rubiksCube.children, true);
  if (intersects.length > 0) {
    const face = intersects[0].object;
    const parentCube = face.parent;
    dragStart.cube = parentCube;
  }
});

window.addEventListener("mouseup", (e) => {
  if (!isDragging || rotating) return;
  isDragging = false;
  dragEnd = { x: e.clientX, y: e.clientY };

  const dx = dragEnd.x - dragStart.x;
  const dy = dragEnd.y - dragStart.y;

  if (Math.abs(dx) + Math.abs(dy) < 10) return; // ignore tiny drags

  const axis = Math.abs(dx) > Math.abs(dy) ? "y" : "x";
  const direction = (axis === "y" ? dx : dy) > 0 ? 1 : -1;

  // Pick one layer (for simplicity, rotate all cubes with same Y or X as clicked cube)
  const clicked = dragStart.cube;
  if (!clicked) return;

  const layer = rubiksCube.children.filter(c =>
    Math.abs(c.position[axis] - clicked.position[axis]) < 0.5
  );

  const rotationAxis = axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const group = new THREE.Group();
  layer.forEach(c => group.add(c));
  rubiksCube.add(group);

  rotating = true;
  gsap.to(group.rotation, {
    [axis === "y" ? "y" : "x"]: group.rotation[axis === "y" ? "y" : "x"] + (Math.PI / 2) * direction,
    duration: 0.4,
    ease: "power2.inOut",
    onComplete: () => {
      group.updateMatrixWorld();
      while (group.children.length) {
        const child = group.children[0];
        child.applyMatrix4(group.matrix);
        rubiksCube.add(child);
      }
      rubiksCube.remove(group);
      rotating = false;
    },
  });
});

// === Animation loop ===
function animate() {
  requestAnimationFrame(animate);
  if (!rotating) {
    rubiksCube.rotation.y += (targetY - rubiksCube.rotation.y) * 0.05;
    rubiksCube.rotation.x += (targetX - rubiksCube.rotation.x) * 0.05;
  }
  renderer.render(scene, camera);
}
animate();

// === Resize ===
window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
