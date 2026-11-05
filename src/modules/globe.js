// Holographic company globe for /companies/ (Three.js).
// Three levels, each opening out of the one before, like a hologram expanding into nodes:
//   globe:   dotted continents, one node per city, data arcs from the HOPE lab in Chennai
//   city:    the city's companies fan out above it as linked nodes
//   company: that company's students fan out around it; picking one opens their profile
// Zooming in past a threshold opens the city nearest the centre; zooming back out closes it.
// Labels are HTML laid over the canvas and projected from 3D every frame.
import * as THREE from 'three';
import { feature } from 'topojson-client';
import land from 'world-atlas/land-110m.json';
import gsap from 'gsap';

const R = 1;
const FOV = 40;
const DEG = Math.PI / 180;
export const HOME = { name: 'HOPE lab, Chennai', lat: 12.8698, lng: 80.2186 };

export function latLngToVec(lat, lng, r = R) {
  const phi = lat * DEG;
  const th = lng * DEG;
  return new THREE.Vector3(r * Math.cos(phi) * Math.sin(th), r * Math.sin(phi), r * Math.cos(phi) * Math.cos(th));
}
const vecToLatLng = (v) => {
  const n = v.clone().normalize();
  return { lat: Math.asin(n.y) / DEG, lng: Math.atan2(n.x, n.z) / DEG };
};

// ---------- Continents as dots ----------
function landMask() {
  const W = 1024;
  const H = 512;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const geo = feature(land, land.objects.land);
  const polys = geo.features.flatMap((f) => (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates));
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  for (const rings of polys) {
    for (const ring of rings) {
      ring.forEach(([lng, lat], i) => {
        const x = ((lng + 180) / 360) * W;
        const y = ((90 - lat) / 180) * H;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
    }
  }
  ctx.fill('evenodd');
  const data = ctx.getImageData(0, 0, W, H).data;
  return (lat, lng) => {
    const x = Math.min(W - 1, Math.floor(((lng + 180) / 360) * W));
    const y = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
    return data[(y * W + x) * 4 + 3] > 120;
  };
}

function landDots(count) {
  const onLand = landMask();
  const pos = [];
  const rand = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const v = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    const { lat, lng } = vecToLatLng(v);
    if (!onLand(lat, lng)) continue;
    pos.push(v.x * R, v.y * R, v.z * R);
    rand.push(Math.random());
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aRand', new THREE.Float32BufferAttribute(rand, 1));
  return g;
}

const dotMaterial = (pr) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uExpand: { value: 0 }, uSize: { value: 7 }, uPR: { value: pr } },
    vertexShader: /* glsl */ `
      attribute float aRand;
      uniform float uTime, uExpand, uSize, uPR;
      varying float vAlpha;
      void main() {
        // Each dot flies out from the core on its own delay, so the globe assembles itself
        float e = clamp(uExpand * 1.6 - aRand * 0.6, 0.0, 1.0);
        e = 1.0 - pow(1.0 - e, 3.0);
        vec4 mv = modelViewMatrix * vec4(position * e, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(uSize * uPR / -mv.z, 4.5 * uPR);
        float facing = normalize(normalMatrix * position).z;
        vAlpha = e * (0.2 + 0.8 * smoothstep(-0.1, 0.7, facing)) * (0.75 + 0.25 * sin(uTime * 1.4 + aRand * 40.0));
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        gl_FragColor = vec4(vec3(1.0), vAlpha * smoothstep(0.5, 0.15, d));
      }`,
  });

// Soft white rim, the hologram's glow
const glowMaterial = () =>
  new THREE.ShaderMaterial({
    transparent: true,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: { uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      void main() { vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      varying vec3 vN;
      void main() { float i = pow(max(0.0, 0.62 - dot(vN, vec3(0.0, 0.0, 1.0))), 3.0); gl_FragColor = vec4(vec3(1.0), i * uOpacity); }`,
  });

// Arc whose light travels from the lab to the city, over and over
const arcMaterial = (offset) =>
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uDraw: { value: 0 }, uOff: { value: offset }, uMotion: { value: 1 }, uFade: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aT;
      varying float vT;
      void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uDraw, uOff, uMotion, uFade;
      varying float vT;
      void main() {
        if (vT > uDraw) discard;
        float d = fract(vT - uTime * 0.3 + uOff);
        float head = smoothstep(0.78, 1.0, d) * uMotion;
        gl_FragColor = vec4(vec3(1.0), (0.16 + 0.84 * head) * uFade);
      }`,
  });

function arcGeometry(a, b) {
  const va = latLngToVec(a.lat, a.lng).normalize();
  const vb = latLngToVec(b.lat, b.lng).normalize();
  const angle = va.angleTo(vb);
  const pts = [];
  const t = [];
  const N = 64;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const q = new THREE.Quaternion().setFromUnitVectors(va, vb);
    const p = va.clone().applyQuaternion(new THREE.Quaternion().slerp(q, s));
    p.multiplyScalar(R * (1.005 + Math.sin(Math.PI * s) * (0.04 + angle * 0.35)));
    pts.push(p.x, p.y, p.z);
    t.push(s);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(t, 1));
  return g;
}

function circle(radius, segments = 128) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

function gridLines() {
  const pts = [];
  const r = R * 1.002;
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lng = -180; lng < 180; lng += 4) pts.push(latLngToVec(lat, lng, r), latLngToVec(lat, lng + 4, r));
  }
  for (let lng = -180; lng < 180; lng += 30) {
    for (let lat = -84; lat < 84; lat += 4) pts.push(latLngToVec(lat, lng, r), latLngToVec(lat + 4, lng, r));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}

// HUD ring with tick marks, outside the globe; it doesn't turn when the globe is dragged
function hudRing(radius, ticks, tickLen) {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, depthWrite: false });
  group.add(new THREE.Line(circle(radius), mat));
  const pts = [];
  for (let i = 0; i < ticks; i++) {
    const a = (i / ticks) * Math.PI * 2;
    const len = i % 5 === 0 ? tickLen * 2 : tickLen;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0), new THREE.Vector3(Math.cos(a) * (radius + len), Math.sin(a) * (radius + len), 0));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat));
  group.userData.mat = mat;
  return group;
}

// Tangent directions at a point on the globe, for laying nodes out around it
function tangents(n) {
  const east = new THREE.Vector3(0, 1, 0).cross(n);
  if (east.lengthSq() < 1e-6) east.set(1, 0, 0);
  east.normalize();
  return { east, north: n.clone().cross(east).normalize() };
}

/**
 * @param {HTMLElement} stage  element the canvas and labels go into
 * @param {object} opts
 *   cities: [{ key, name, country, lat, lng, companies: [{ id, name, students: [...] }] }]
 *   lite: no intro, no auto-rotation, instant moves
 *   onChange({ level, city, company }) after every level change
 *   onStudent(student) when a student node is picked
 *   label: { home(h), city(c, students), company(c), student(s) } each returns the label's inner element
 */
export function createGlobe(stage, { cities, lite, onChange, onStudent, label }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const pr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(pr);
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.className = 'globe__canvas';
  stage.prepend(renderer.domElement);

  const overlay = document.createElement('div');
  overlay.className = 'globe__labels';
  overlay.setAttribute('aria-hidden', 'true'); // the company list is the accessible way in
  stage.append(overlay);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.01, 50);
  const globe = new THREE.Group();
  scene.add(globe);

  // Core sphere hides the dots on the far side; the glow sits just outside it
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 64, 64), new THREE.MeshBasicMaterial({ color: 0x000000 })));
  const dots = new THREE.Points(landDots(innerWidth < 720 ? 11000 : 17000), dotMaterial(pr));
  globe.add(dots);
  const gridMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  globe.add(new THREE.LineSegments(gridLines(), gridMat));
  const glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.09, 64, 64), glowMaterial());
  scene.add(glow);

  const hud = new THREE.Group();
  const ringA = hudRing(R * 1.32, 120, 0.018);
  const ringB = hudRing(R * 1.48, 72, 0.012);
  ringA.rotation.x = 1.2;
  ringB.rotation.set(1.35, 0.25, 0);
  hud.add(ringA, ringB);
  scene.add(hud);

  // ---------- Labels ----------
  const labels = []; // { el, local: Vector3, kind, visible() }
  const addLabel = (kind, content, local, onPick, priority = 0) => {
    const el = document.createElement(onPick ? 'button' : 'span');
    el.className = `gl gl--${kind}`;
    if (onPick) {
      el.type = 'button';
      el.tabIndex = -1;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        onPick();
      });
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
    }
    el.append(content);
    overlay.append(el);
    const item = { el, local, kind, show: 1, priority, x: 0, y: 0, w: 0, h: 0 };
    labels.push(item);
    return item;
  };
  const dropLabel = (item) => {
    item.el.remove();
    labels.splice(labels.indexOf(item), 1);
  };
  addLabel('home', label.home(HOME), latLngToVec(HOME.lat, HOME.lng, R * 1.01), null, -1);

  // ---------- City nodes and arcs ----------
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1 });
  const spikeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const arcs = [];
  const pulses = [];
  const cityNodes = cities.map((city, i) => {
    const n = latLngToVec(city.lat, city.lng).normalize();
    const students = city.companies.reduce((s, c) => s + c.students.length, 0);
    const height = 0.05 + 0.03 * Math.min(students, 8);
    const spike = new THREE.Line(new THREE.BufferGeometry().setFromPoints([n.clone().multiplyScalar(R), n.clone().multiplyScalar(R + height)]), spikeMat);
    spike.scale.setScalar(1);
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 12), nodeMat);
    node.position.copy(n).multiplyScalar(R + 0.004);
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.014, 0.018, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    );
    pulse.position.copy(n).multiplyScalar(R + 0.003);
    pulse.lookAt(n.clone().multiplyScalar(3));
    pulse.userData.phase = i * 0.37;
    pulses.push(pulse);
    globe.add(spike, node, pulse);
    const dist = latLngToVec(HOME.lat, HOME.lng).normalize().angleTo(n);
    if (dist > 0.008) {
      const arc = new THREE.Line(arcGeometry(HOME, city), arcMaterial(i * 0.23));
      arcs.push(arc);
      globe.add(arc);
    }
    // Busier cities win when labels collide (cities arrive sorted by student count)
    const item = addLabel('city', label.city(city, students), n.clone().multiplyScalar(R + height), () => api.focusCity(city.key), cities.length - i);
    return { city, n, spike, node, pulse, item, top: n.clone().multiplyScalar(R + height) };
  });

  // ---------- Fans: nodes that open out of a city, then out of a company ----------
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  function makeFan(anchor, normal, entries, { radius, lift, kind, onPick }) {
    const group = new THREE.Group();
    globe.add(group);
    const { east, north } = tangents(normal);
    const count = entries.length;
    const items = entries.map((entry, i) => {
      // One ring, or two when there are many, starting at the top and going clockwise
      const ring = count > 12 && i % 2 ? 1.45 : 1;
      const a = (i / count) * Math.PI * 2 - Math.PI / 2;
      const to = anchor
        .clone()
        .add(normal.clone().multiplyScalar(lift))
        .add(east.clone().multiplyScalar(Math.cos(a) * radius * ring))
        .add(north.clone().multiplyScalar(-Math.sin(a) * radius * ring));
      const geo = new THREE.BufferGeometry().setFromPoints([anchor, anchor.clone()]);
      const line = new THREE.Line(geo, lineMat);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(kind === 'student' ? 0.0035 : 0.005, 10, 10), nodeMat);
      dot.position.copy(anchor);
      group.add(line, dot);
      const pos = anchor.clone();
      const lbl = addLabel(kind, label[kind](entry), pos, () => onPick(entry));
      const it = { entry, from: anchor, to, pos, line, dot, lbl, t: 0 };
      gsap.to(it, { t: 1, duration: lite ? 0 : 0.7, delay: lite ? 0 : 0.05 * i, ease: 'power3.out' });
      return it;
    });
    return { group, items, anchor };
  }
  function updateFan(fan) {
    if (!fan) return;
    for (const it of fan.items) {
      it.pos.lerpVectors(it.from, it.to, it.t);
      it.dot.position.copy(it.pos);
      const p = it.line.geometry.attributes.position;
      p.setXYZ(1, it.pos.x, it.pos.y, it.pos.z);
      p.needsUpdate = true;
      it.lbl.show = it.t;
    }
  }
  function dropFan(fan) {
    if (!fan) return;
    for (const it of fan.items) {
      gsap.killTweensOf(it);
      dropLabel(it.lbl);
      it.line.geometry.dispose();
      it.dot.geometry.dispose();
    }
    globe.remove(fan.group);
  }

  // ---------- Camera and rotation ----------
  let width = 1;
  let height = 1;
  let fitZ = 3; // camera distance that fits the whole globe and its rings in this stage
  let halfTan = 0.36; // tan of half the narrower field of view
  // Camera distance that shows `needHalf` world units either side of a point at `surface`
  const zFor = (needHalf, surface = R * 1.07) => surface + needHalf / halfTan;
  let targetZ = 3;
  const rot = { x: 0.25, y: 0 };
  let spin = { x: 0, y: 0 };
  let flight = null;
  const state = { level: 'globe', city: null, company: null };
  let cityFan = null;
  let companyFan = null;

  function resize() {
    const r = stage.getBoundingClientRect();
    width = Math.max(1, r.width);
    height = Math.max(1, r.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const vHalf = Math.tan((FOV / 2) * DEG);
    halfTan = Math.min(vHalf, vHalf * camera.aspect);
    const old = fitZ;
    fitZ = (R * 1.62) / halfTan; // globe plus HUD rings fill the smaller side
    targetZ = state.level === 'globe' ? fitZ : targetZ * (fitZ / old);
    if (!camera.position.z) camera.position.z = fitZ * 1.8;
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  rot.y = -HOME.lng * DEG; // start facing India
  rot.x = HOME.lat * DEG;

  // Turn the globe so a local point faces the camera
  function faceTo(local, z) {
    const { lat, lng } = vecToLatLng(local);
    let ty = -lng * DEG;
    while (ty - rot.y > Math.PI) ty -= Math.PI * 2;
    while (ty - rot.y < -Math.PI) ty += Math.PI * 2;
    flight?.kill();
    spin = { x: 0, y: 0 };
    flight = gsap.to(rot, { x: lat * DEG, y: ty, duration: lite ? 0 : 1.2, ease: 'power3.inOut' });
    if (z) targetZ = z;
  }

  const emit = () => {
    stage.classList.toggle('is-inside', state.level !== 'globe');
    onChange?.({ ...state });
  };

  const api = {
    focusCity(key, { fromZoom = false } = {}) {
      const c = cityNodes.find((x) => x.city.key === key);
      if (!c) return;
      dropFan(companyFan);
      companyFan = null;
      const k = c.city.companies.length;
      const radius = 0.07 + 0.011 * k;
      if (state.city !== key) {
        dropFan(cityFan);
        cityFan = makeFan(c.top, c.n, c.city.companies, {
          radius,
          lift: 0.05,
          kind: 'company',
          onPick: (co) => api.focusCompany(co.id),
        });
      }
      state.level = 'city';
      state.city = key;
      state.company = null;
      faceTo(c.n.clone().multiplyScalar(R + 0.06), fromZoom ? null : zFor(radius * 3.4));
      emit();
      // A city with one company opens straight onto its students
      if (c.city.companies.length === 1 && !fromZoom) api.focusCompany(c.city.companies[0].id);
    },
    focusCompany(id) {
      const c = cityNodes.find((x) => x.city.companies.some((co) => co.id === id));
      if (!c) return;
      if (state.city !== c.city.key) api.focusCity(c.city.key, { fromZoom: true });
      const it = cityFan.items.find((x) => x.entry.id === id);
      gsap.to(it, { t: 1, duration: 0 });
      updateFan(cityFan);
      dropFan(companyFan);
      const students = it.entry.students;
      const radius = 0.035 + 0.0045 * Math.min(students.length, 14);
      companyFan = students.length
        ? makeFan(it.to, c.n, students, { radius, lift: 0.03, kind: 'student', onPick: (s) => onStudent?.(s) })
        : null;
      state.level = 'company';
      state.company = id;
      faceTo(it.to.clone().add(c.n.clone().multiplyScalar(0.03)), zFor(radius * (students.length > 12 ? 4.4 : 3.4), R * 1.13));
      emit();
    },
    back() {
      if (state.level === 'company' && cityNodes.find((x) => x.city.key === state.city)?.city.companies.length > 1) {
        dropFan(companyFan);
        companyFan = null;
        state.level = 'city';
        state.company = null;
        const c = cityNodes.find((x) => x.city.key === state.city);
        faceTo(c.n.clone().multiplyScalar(R + 0.06), zFor((0.07 + 0.011 * c.city.companies.length) * 3.4));
        emit();
        return;
      }
      api.reset();
    },
    reset({ keepZoom = false } = {}) {
      dropFan(companyFan);
      dropFan(cityFan);
      companyFan = cityFan = null;
      state.level = 'globe';
      state.city = state.company = null;
      if (!keepZoom) targetZ = fitZ;
      emit();
    },
    zoomBy(f) {
      targetZ = THREE.MathUtils.clamp(targetZ * f, R * 1.22, fitZ * 1.3);
    },
    intro() {
      if (lite) return api.skipIntro();
      camera.position.z = fitZ * 1.8;
      const tl = gsap.timeline();
      tl.to(dots.material.uniforms.uExpand, { value: 1, duration: 2.2, ease: 'power2.out' }, 0)
        .to(gridMat, { opacity: 0.07, duration: 1.2 }, 0.6)
        .to(glow.material.uniforms.uOpacity, { value: 0.32, duration: 1.4 }, 0.4)
        .from(hud.scale, { x: 0.2, y: 0.2, z: 0.2, duration: 1.6, ease: 'expo.out' }, 0.3)
        .from(ringA.rotation, { z: -2, duration: 2, ease: 'expo.out' }, 0.3)
        .from(ringB.rotation, { z: 2, duration: 2, ease: 'expo.out' }, 0.3)
        .from(cityNodes.map((c) => c.spike.scale), { x: 0.001, y: 0.001, z: 0.001, duration: 0.8, stagger: 0.06, ease: 'back.out(2)' }, 1.4)
        .to(arcs.map((a) => a.material.uniforms.uDraw), { value: 1, duration: 1.4, stagger: 0.08, ease: 'power2.inOut' }, 1.6)
        .fromTo(labels.map((l) => l), { show: 0 }, { show: 1, duration: 0.6, stagger: 0.04 }, 1.9);
      return tl;
    },
    skipIntro() {
      dots.material.uniforms.uExpand.value = 1;
      gridMat.opacity = 0.07;
      glow.material.uniforms.uOpacity.value = 0.32;
      arcs.forEach((a) => {
        a.material.uniforms.uDraw.value = 1;
        a.material.uniforms.uMotion.value = lite ? 0 : 1;
      });
      camera.position.z = fitZ;
    },
    destroy() {
      running = false;
      renderer.dispose();
    },
  };

  // ---------- Input: drag to turn, wheel or pinch to zoom ----------
  const pointers = new Map();
  let pinch = 0;
  let last = null;
  let idleAt = 0;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.globe__ui')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stage.setPointerCapture(e.pointerId);
    last = { x: e.clientX, y: e.clientY };
    flight?.kill();
    stage.classList.add('is-dragging');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) api.zoomBy(pinch / d);
      pinch = d;
      return;
    }
    // Turning speed scales with zoom, so a close view doesn't swing wildly
    const k = (0.005 * (targetZ - R * 0.9)) / (fitZ - R * 0.9);
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    rot.y += dx * k;
    rot.x = THREE.MathUtils.clamp(rot.x + dy * k, -1.3, 1.3);
    spin = { x: dy * k, y: dx * k };
    idleAt = performance.now();
  });
  const release = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = 0;
    if (!pointers.size) stage.classList.remove('is-dragging');
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      api.zoomBy(Math.exp(e.deltaY * 0.0012));
      idleAt = performance.now();
    },
    { passive: false },
  );

  // ---------- Frame loop ----------
  const tmp = new THREE.Vector3();
  const toCam = new THREE.Vector3();
  const centre = new THREE.Vector3();
  const inv = new THREE.Quaternion();
  let running = true;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);
  const clock = new THREE.Clock();
  let readout = null;
  api.onReadout = (fn) => (readout = fn);

  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.elapsedTime;

    // Inertia after a drag, then a slow drift on the globe view when left alone
    if (!pointers.size && !flight?.isActive()) {
      rot.y += spin.y;
      rot.x = THREE.MathUtils.clamp(rot.x + spin.x, -1.3, 1.3);
      spin.x *= 0.92;
      spin.y *= 0.92;
      if (!lite && state.level === 'globe' && performance.now() - idleAt > 2500) rot.y += dt * 0.05;
    }
    globe.rotation.set(rot.x, rot.y, 0, 'XYZ');
    camera.position.z += (targetZ - camera.position.z) * (lite ? 1 : 0.1);

    // Zoom far enough in and the city nearest the centre opens; zoom back out and it closes
    globe.updateMatrixWorld();
    inv.copy(globe.quaternion).invert();
    centre.set(0, 0, 1).applyQuaternion(inv);
    if (state.level === 'globe' && targetZ < fitZ * 0.66 && !flight?.isActive()) {
      let best = null;
      let bestDot = Math.cos(0.42);
      for (const c of cityNodes) {
        const d = c.n.dot(centre);
        if (d > bestDot) [best, bestDot] = [c, d];
      }
      if (best) api.focusCity(best.city.key, { fromZoom: true });
    } else if (state.level !== 'globe' && targetZ > fitZ * 0.82) {
      api.reset({ keepZoom: true });
    }

    dots.material.uniforms.uTime.value = time;
    // Inside a city, the rest of the map steps back so the open nodes stand out
    const inside = state.level !== 'globe';
    spikeMat.opacity += ((inside ? 0.15 : 0.85) - spikeMat.opacity) * 0.15;
    arcs.forEach((a) => {
      a.material.uniforms.uTime.value = time;
      a.material.uniforms.uFade.value += ((inside ? 0.15 : 1) - a.material.uniforms.uFade.value) * 0.15;
    });
    ringA.rotation.z += dt * 0.06;
    ringB.rotation.z -= dt * 0.04;
    // Markers are sized in world units; shrink them as the camera closes in so they stay the same on screen
    const k = THREE.MathUtils.clamp((camera.position.z - R) / (fitZ - R), 0.05, 1);
    for (const p of pulses) {
      const s = lite ? 0 : (time * 0.6 + p.userData.phase) % 1;
      p.scale.setScalar(k * (1 + s * 2.4));
      p.material.opacity = (lite ? 0.6 : 1 - s) * (state.level === 'globe' ? 1 : 0.35);
    }
    for (const c of cityNodes) c.node.scale.setScalar(k);
    for (const fan of [cityFan, companyFan]) for (const it of fan?.items || []) it.dot.scale.setScalar(Math.max(k, 0.15));
    updateFan(cityFan);
    updateFan(companyFan);

    renderer.render(scene, camera);

    // Labels: project, hide when on the far side, dim what isn't in focus
    for (const l of labels) {
      tmp.copy(l.local).applyMatrix4(globe.matrixWorld);
      toCam.copy(camera.position).sub(tmp).normalize();
      const facing = tmp.clone().normalize().dot(toCam);
      tmp.project(camera);
      l.x = ((tmp.x + 1) / 2) * width;
      l.y = ((1 - tmp.y) / 2) * height;
      let show = facing > 0.08 && tmp.z < 1 ? l.show : 0;
      // Inside a city the other cities step aside
      if ((l.kind === 'city' || l.kind === 'home') && state.level !== 'globe') show = 0;
      l.vis = show;
      l.el.style.transform = `translate3d(${l.x.toFixed(1)}px, ${l.y.toFixed(1)}px, 0)`;
      l.el.style.opacity = show.toFixed(2);
      l.el.style.visibility = show < 0.02 ? 'hidden' : 'visible';
    }
    declutter();
    for (const it of cityFan?.items || []) it.lbl.el.classList.toggle('is-dim', state.company != null && it.entry.id !== state.company);
    readout?.(vecToLatLng(centre));
  }
  requestAnimationFrame(frame);

  // When city labels overlap, the busier city keeps its name and the others shrink to a dot
  const placed = [];
  function declutter() {
    placed.length = 0;
    const list = labels.filter((l) => (l.kind === 'city' || l.kind === 'home') && l.vis > 0.02).sort((a, b) => b.priority - a.priority);
    for (const l of list) {
      if (!l.w) {
        l.w = l.el.offsetWidth;
        l.h = l.el.offsetHeight;
      }
      const box = { x: l.x - 8, y: l.y - l.h / 2, w: l.w + 8, h: l.h };
      const hit = placed.some((p) => box.x < p.x + p.w && box.x + box.w > p.x && box.y < p.y + p.h && box.y + box.h > p.y);
      l.el.classList.toggle('is-compact', hit);
      placed.push(hit ? { x: l.x - 8, y: l.y - 8, w: 16, h: 16 } : box);
    }
  }

  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.level !== 'globe' && !document.querySelector('dialog[open]')) api.back();
  });

  return api;
}
