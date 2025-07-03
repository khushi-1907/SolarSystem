/* ======== GLOBAL SCALE SETTINGS ======== */
const distanceFactor = 1.5;   // tweak this up/down to shrink or enlarge entire system
const speedFactor    = 3;   // 3 keeps inner planets visible; raise for faster system

/* ======== INITIAL THREE.JS SETUP ======= */
const canvas   = document.getElementById("solarCanvas");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(devicePixelRatio);
renderer.setClearColor(0x000000);

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 16, 42);               
camera.lookAt(0, 0, 0);

scene.add(new THREE.AmbientLight(0x888888));
const dir = new THREE.DirectionalLight(0xffffff, 1);
dir.position.set(30, 40, 30);
scene.add(dir);

/* ======== TEXTURE LOADER ========== */
const loader = new THREE.TextureLoader();

/* ======== SUN ========= */
scene.add(
  new THREE.Mesh(
    new THREE.SphereGeometry(4, 64, 64),
    new THREE.MeshBasicMaterial({
      map: loader.load("textures/sun.jpg"),
      emissive: 0xffffff,
      emissiveMap: loader.load("textures/sun.jpg"),
      emissiveIntensity: 1
    })
  )
);

/* ======= PLANET DATA (compact distances & realistic speeds) ======= */ // shrink universe compactly
const planetsData = [
  { name: "Mercury", texture: "mercury.jpg", radius: 0.7, distance: 3  * distanceFactor, period: 88,    speedAdjust: 0.7 },
  { name: "Venus",   texture: "venus.jpg",   radius: 1.0, distance: 4.5* distanceFactor, period: 225 },
  { name: "Earth",   texture: "earth.jpg",   radius: 1.1, distance: 6  * distanceFactor, period: 365 },
  { name: "Mars",    texture: "mars.jpg",    radius: 0.9, distance: 7.5* distanceFactor, period: 687 },
  { name: "Jupiter", texture: "jupiter.jpg", radius: 2.2, distance: 10 * distanceFactor, period: 4331 },
  { name: "Saturn",  texture: "saturn.jpg",  radius: 2.0, distance: 12 * distanceFactor, period: 10747 },
  { name: "Uranus",  texture: "uranus.jpg",  radius: 1.8, distance: 14 * distanceFactor, period: 30589 },
  { name: "Neptune", texture: "neptune.jpg", radius: 1.7, distance: 16 * distanceFactor, period: 59800 }
];


/* ======= BUILD PLANETS + UI ======= */
const planets   = [];
const controls  = document.getElementById("controls");

planetsData.forEach(data => {
  // speed = (speedFactor · 2π) / period
  const angularSpeed = ((speedFactor * 2 * Math.PI) / data.period) *
    (data.speedAdjust || 1);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius, 64, 64),
    new THREE.MeshStandardMaterial({ map: loader.load(`textures/${data.texture}`) })
  );
  planet.userData = {
    name: data.name,
    distance: data.distance,
    angle: 0,
    speed: angularSpeed,
    mult: 1
  };
  scene.add(planet);
  planets.push(planet);

  // orbit ring
  const pts = new THREE.EllipseCurve(0, 0, data.distance, data.distance, 0, 2 * Math.PI)
                .getPoints(80)
                .map(p => new THREE.Vector3(p.x, 0, p.y));
  const ring = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.LineBasicMaterial({ color: 0x444444 })
  );
  scene.add(ring);

  // UI slider
  const label  = document.createElement("label"); label.textContent = data.name;
  const slider = document.createElement("input");
  slider.type = "range"; slider.min = "0"; slider.max = "3"; slider.step = "0.01"; slider.value = "1";
  slider.oninput = e => (planet.userData.mult = parseFloat(e.target.value));
  controls.append(label, slider, document.createElement("br"));
});

let starFieldMesh; // 👈 define this outside your function (global)

(function addStars(count = 3000) {
  const positions = [], colors = [], sizes = [];
  const color = new THREE.Color();
  const loader = new THREE.TextureLoader();

  loader.load('star.png', (starTexture) => {
    for (let i = 0; i < count; i++) {
      positions.push(
        THREE.MathUtils.randFloatSpread(600),
        THREE.MathUtils.randFloatSpread(600),
        THREE.MathUtils.randFloatSpread(600)
      );

      color.setHSL(0.55 + (Math.random() - 0.5) * 0.1, 1.0, 0.9);
      colors.push(color.r, color.g, color.b);
      sizes.push(Math.random() * 0.8 + 0.4);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      map: starTexture,
      color: 0xffffff,
      vertexColors: true,
      size: 1,
      sizeAttenuation: true,
      transparent: true,
      alphaTest: 0.5,
      depthWrite: false,
      opacity: 1, // we'll animate this later
    });

    starFieldMesh = new THREE.Points(geom, mat); // 👈 store mesh globally
    scene.add(starFieldMesh);
  });
})();

function animate() {
  requestAnimationFrame(animate);

  const elapsed = clock.getElapsedTime();

  // 🌠 Drift stars slowly on Z-axis
  if (starFieldMesh) {
    starFieldMesh.position.z = Math.sin(elapsed * 0.02) * 10; // gentle drift
  }

  // 🌟 Twinkle: gently change opacity over time
  if (starFieldMesh?.material) {
    starFieldMesh.material.opacity = 0.85 + Math.sin(elapsed * 1.5) * 0.1;
  }

  // Planet motion...
  // controls.update(); (if using OrbitControls)
  renderer.render(scene, camera);
}




/* ======= TOOLTIP ======= */
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();
const tooltip   = document.getElementById("tooltip");

addEventListener("mousemove", e => {
  mouse.x =  (e.clientX / innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(planets);
  if (hit.length) {
    tooltip.style.display = "block";
    tooltip.textContent   = hit[0].object.userData.name;
    tooltip.style.top     = e.clientY + 12 + "px";
    tooltip.style.left    = e.clientX + 12 + "px";
  } else tooltip.style.display = "none";
});

/* ======= CLICK‑TO‑ZOOM (closer) ======= */
addEventListener("click", () => {
  raycaster.setFromCamera(mouse, camera);
  const hit = raycaster.intersectObjects(planets);
  if (hit.length) {
    const target = hit[0].object.position.clone();
    camera.position.copy(target.clone().add(new THREE.Vector3(0, 4, 8)));
    camera.lookAt(target);
  }
});

/* ======= THEME TOGGLE ======= */
const themeBtn = document.getElementById("themeToggle");
let dark = true;
function applyTheme() {
  document.body.className = dark ? "dark" : "light";
  renderer.setClearColor(dark ? 0x000000 : 0xffffff);
  themeBtn.textContent    = dark ? "🌞 Light" : "🌙 Dark";
}
themeBtn.onclick = () => { dark = !dark; applyTheme(); };
applyTheme();

/* ======= PAUSE / RESUME ======= */
const pauseBtn = document.getElementById("pauseToggle");
let paused = false;
pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "▶ Resume" : "⏸ Pause";
};

/* ======= RESIZE ======= */
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* ======= MAIN LOOP ======= */
function animate() {
  requestAnimationFrame(animate);
  if (!paused) {
    planets.forEach(p => {
      p.userData.angle += p.userData.speed * p.userData.mult;
      p.position.set(
        p.userData.distance * Math.cos(p.userData.angle),
        0,
        p.userData.distance * Math.sin(p.userData.angle)
      );
      p.rotation.y += 0.004;
    });
  }
  renderer.render(scene, camera);
}
animate();
