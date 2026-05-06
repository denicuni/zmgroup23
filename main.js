// ════════════════════════════════════════════
// THREE.JS SETUP
// ════════════════════════════════════════════
const canvas = document.getElementById('three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const geometry = new THREE.PlaneGeometry(2, 2);

const textures = FRAMES.map(src => {
  const t = new THREE.TextureLoader().load(src);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
});

const material = new THREE.ShaderMaterial({
  uniforms: {
    uTexA:   { value: textures[0] },
    uTexB:   { value: textures[1] },
    uMix:    { value: 0.0 },
    uAspect: { value: 1.0 },
    uSize:   { value: 0.74 },
  },
  transparent: true,
  blending: THREE.NormalBlending,
  depthWrite: false,
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position,1.0); }
  `,
  fragmentShader: `
    uniform sampler2D uTexA;
    uniform sampler2D uTexB;
    uniform float uMix;
    uniform float uAspect;
    uniform float uSize;
    varying vec2 vUv;

    vec4 sampleContain(sampler2D tex, vec2 uv) {
      vec2 scale;
      if (uAspect >= 1.0) scale = vec2(1.0 / uAspect, 1.0);
      else                 scale = vec2(1.0, uAspect);
      scale *= uSize;
      vec2 c = (uv - 0.5) / scale + 0.5;
      if (c.x < 0.0 || c.x > 1.0 || c.y < 0.0 || c.y > 1.0) return vec4(0.0);
      return texture2D(tex, c);
    }

    float extractAlpha(vec3 col) {
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      return smoothstep(0.025, 0.32, lum);
    }

    void main() {
      vec4 a = sampleContain(uTexA, vUv);
      vec4 b = sampleContain(uTexB, vUv);
      vec4 col = mix(a, b, uMix);
      float alpha = extractAlpha(col.rgb);
      gl_FragColor = vec4(col.rgb, alpha);
    }
  `,
});

scene.add(new THREE.Mesh(geometry, material));

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  material.uniforms.uAspect.value = w / h;
}
resize();
window.addEventListener('resize', resize);

// ════════════════════════════════════════════
// SCROLL ANIMATION
// ════════════════════════════════════════════
const totalFrames = FRAMES.length - 1;
const progressBar = document.getElementById('progress');
const counter     = document.getElementById('frame-counter');
const arc         = document.querySelector('.progress-arc');
const animSection = document.getElementById('sezione-animazione');
const SPEED = 1.4;

let targetFrame = 0, smoothFrame = 0;

function onScroll() {
  const sy = window.scrollY;
  const scrollable = animSection.offsetHeight - window.innerHeight;
  const rawFrac    = Math.max(0, Math.min(1, sy / scrollable));
  const animFrac   = Math.min(1, rawFrac * SPEED);
  targetFrame = animFrac * totalFrames;
  const maxScroll = document.body.scrollHeight - window.innerHeight;
  progressBar.style.width = ((sy / maxScroll) * 100) + '%';
  arc.style.strokeDashoffset = 100 - animFrac * 100;
}
window.addEventListener('scroll', onScroll, { passive: true });

function renderLoop() {
  requestAnimationFrame(renderLoop);
  smoothFrame += (targetFrame - smoothFrame) * 0.14;
  const fi = Math.max(0, Math.min(totalFrames - 1, Math.floor(smoothFrame)));
  const ff = smoothFrame - fi;
  material.uniforms.uTexA.value = textures[fi];
  material.uniforms.uTexB.value = textures[Math.min(totalFrames, fi + 1)];
  material.uniforms.uMix.value  = ff;
  counter.textContent = String(Math.round(smoothFrame) + 1).padStart(2,'0') + ' / ' + (totalFrames + 1);
  renderer.render(scene, camera);
}
renderLoop();

// ════════════════════════════════════════════
// COUNTDOWN
// ════════════════════════════════════════════
const TARGET = new Date();
TARGET.setMonth(TARGET.getMonth() + 3);
TARGET.setHours(0, 0, 0, 0);

function updateCountdown() {
  const diff = Math.max(0, TARGET - new Date());
  document.getElementById('cd-days').textContent    = String(Math.floor(diff / 86400000)).padStart(2,'0');
  document.getElementById('cd-hours').textContent   = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
  document.getElementById('cd-minutes').textContent = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
  document.getElementById('cd-seconds').textContent = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ════════════════════════════════════════════
// SLIDER "CHI SIAMO"
// ════════════════════════════════════════════
(function () {
  const track    = document.getElementById('sliderTrack');
  const arrowL   = document.getElementById('arrowLeft');
  const arrowR   = document.getElementById('arrowRight');
  const dotsWrap = document.getElementById('sliderDots');

  if (!track) return;

  const slides = track.querySelectorAll('.slide');
  const total  = slides.length;
  let current  = 0;

  // Crea i dot
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.className = 'dot' + (i === 0 ? ' active' : '');
    d.setAttribute('aria-label', 'Vai alla scheda ' + (i + 1));
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
  });

  function updateUI() {
    // Sposta il track
    track.style.transform = `translateX(-${current * 100}%)`;

    // Freccia sinistra: nascosta sulla prima scheda
    arrowL.classList.toggle('hidden', current === 0);

    // Freccia destra: nascosta sull'ultima scheda
    arrowR.classList.toggle('hidden', current === total - 1);

    // Lampeggio solo sulla prima scheda
    arrowR.classList.toggle('blink', current === 0);

    // Dots
    dotsWrap.querySelectorAll('.dot').forEach((d, i) =>
      d.classList.toggle('active', i === current)
    );
  }

  function goTo(index) {
    current = Math.max(0, Math.min(total - 1, index));
    updateUI();
  }

  arrowR.addEventListener('click', () => goTo(current + 1));
  arrowL.addEventListener('click', () => goTo(current - 1));

  // Supporto swipe touch
  let touchStartX = 0;
  track.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goTo(diff > 0 ? current + 1 : current - 1);
  });

  // Stato iniziale
  updateUI();
})();

// ════════════════════════════════════════════
// CARD REVEAL
// ════════════════════════════════════════════
const cardObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      cardObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.card').forEach(c => cardObserver.observe(c));

// ════════════════════════════════════════════
// REVEAL GENERICO
// ════════════════════════════════════════════
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));