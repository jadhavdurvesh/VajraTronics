import './scene.js';
import { createIcons, Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame } from 'lucide';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const iconSet = { Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame };
const refreshIcons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.5 } });
refreshIcons();
 
// VAJRA // original procedural ambience + interface sound design.
// Audio starts only after an explicit user gesture (browser autoplay policy).
const soundToggle = document.querySelector('.audio-toggle');
let audioContext = null;
let masterGain = null;
let musicBus = null;
let musicNodes = [];
let soundEnabled = false;
let musicStepTimer = null;
let musicStep = 0;

function ensureAudio() {
  if (audioContext) return;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    soundToggle.disabled = true;
    soundToggle.querySelector('.audio-state').textContent = 'AUDIO UNAVAILABLE';
    return;
  }
  audioContext = new AudioContextClass();
  masterGain = audioContext.createGain();
  masterGain.gain.value = 0;
  masterGain.connect(audioContext.destination);
  musicBus = audioContext.createGain();
  musicBus.gain.value = 0.22;
  musicBus.connect(masterGain);
}

function tone({frequency=440, duration=.12, type='sine', volume=.035, endFrequency=null, destination=masterGain}={}) {
  if (!audioContext || !destination) return;
  const now = audioContext.currentTime;
  const oscillator = audioContext.createOscillator();
  const envelope = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency), now+duration);
  envelope.gain.setValueAtTime(.0001, now);
  envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume), now+.012);
  envelope.gain.exponentialRampToValueAtTime(.0001, now+duration);
  oscillator.connect(envelope); envelope.connect(destination);
  oscillator.start(now); oscillator.stop(now+duration+.025);
}

function startAmbientMusic() {
  if (!audioContext || musicNodes.length) return;
  const now = audioContext.currentTime;
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 520; filter.Q.value = .7;
  const padGain = audioContext.createGain(); padGain.gain.value = .24;
  filter.connect(padGain); padGain.connect(musicBus);
  // Original, slow-moving minor-key pad; no external music or copyrighted samples.
  [55, 82.41, 110, 164.81].forEach((frequency, index) => {
    const osc = audioContext.createOscillator();
    const voice = audioContext.createGain();
    osc.type = index === 0 ? 'triangle' : 'sine';
    osc.frequency.value = frequency;
    voice.gain.value = index === 0 ? .24 : .075;
    osc.connect(voice); voice.connect(filter); osc.start();
    musicNodes.push(osc, voice);
  });
  const pulse = audioContext.createOscillator();
  const pulseGain = audioContext.createGain();
  pulse.type = 'sine'; pulse.frequency.value = .075;
  pulseGain.gain.value = 115;
  pulse.connect(pulseGain); pulseGain.connect(filter.frequency); pulse.start();
  musicNodes.push(pulse,pulseGain,filter,padGain);
  const notes = [110,130.81,146.83,98,110,164.81,146.83,130.81];
  musicStep = 0;
  musicStepTimer = window.setInterval(() => {
    if (!soundEnabled || !audioContext) return;
    const note = notes[musicStep++ % notes.length];
    tone({frequency:note*2,duration:1.8,type:'sine',volume:.012,endFrequency:note*2.015,destination:musicBus});
  }, 2200);
}

function stopAmbientMusic() {
  if (musicStepTimer) window.clearInterval(musicStepTimer);
  musicStepTimer = null;
  musicNodes.forEach(node => { try { if (node.stop) node.stop(); node.disconnect(); } catch {} });
  musicNodes = [];
}

function playUiSound(kind) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  if (kind === 'hover') {
    tone({frequency:720,duration:.045,type:'sine',volume:.012,endFrequency:880});
  } else if (kind === 'click') {
    tone({frequency:185,duration:.085,type:'triangle',volume:.035,endFrequency:92});
    tone({frequency:980,duration:.045,type:'sine',volume:.012,endFrequency:620});
  } else if (kind === 'open') {
    tone({frequency:260,duration:.18,type:'sine',volume:.025,endFrequency:520});
    window.setTimeout(() => tone({frequency:520,duration:.22,type:'sine',volume:.018,endFrequency:780}), 75);
  }
}

soundToggle?.addEventListener('click', async () => {
  ensureAudio();
  if (!audioContext) return;
  await audioContext.resume();
  soundEnabled = !soundEnabled;
  if (soundEnabled) {
    startAmbientMusic();
    masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(.72, audioContext.currentTime, .18);
    soundToggle.classList.add('is-on');
    soundToggle.setAttribute('aria-label','Disable sound');
    soundToggle.setAttribute('aria-pressed','true');
    soundToggle.querySelector('.audio-state').textContent = 'SOUND ON';
    playUiSound('open');
  } else {
    masterGain.gain.setTargetAtTime(0, audioContext.currentTime, .12);
    stopAmbientMusic();
    soundToggle.classList.remove('is-on');
    soundToggle.setAttribute('aria-label','Enable sound');
    soundToggle.setAttribute('aria-pressed','false');
    soundToggle.querySelector('.audio-state').textContent = 'SOUND OFF';
  }
});

document.addEventListener('pointerover', event => {
  const target = event.target.closest('a,button,[role="button"]');
  if (target && !target.matches('.audio-toggle')) playUiSound('hover');
}, {passive:true});
document.addEventListener('click', event => {
  const target = event.target.closest('a,button,[role="button"]');
  if (target && !target.matches('.audio-toggle')) playUiSound(target.matches('.project-open') ? 'open' : 'click');
});


const captureMode = new URLSearchParams(location.search).has('t');
const boot = document.querySelector('.boot');
if (captureMode) boot.classList.add('done');
window.addEventListener('load', () => setTimeout(() => boot.classList.add('done'), 850));
setTimeout(() => boot.classList.add('done'), 1400);

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
addEventListener('vajra:seek', () => {
  gsap.globalTimeline.pause();
  gsap.set('.hero-title > span, .hero-top, .hero-bottom, .manifesto-lead, .projects-intro h2, .team-heading h2, .project-copy > *, .project-ticker', { clearProps: 'transform,opacity' });
});
if (!reduceMotion && !captureMode) {
  gsap.from('.hero-title > span', { yPercent: 45, duration: 1.15, stagger: .12, ease: 'power4.out', delay: .75 });
  gsap.from('.hero-top, .hero-bottom', { y: 18, duration: .8, stagger: .12, ease: 'power2.out', delay: 1.05 });
  gsap.utils.toArray('.manifesto-lead, .projects-intro h2, .team-heading h2').forEach(el => {
    gsap.from(el, { y: 70, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  gsap.utils.toArray('.project-copy').forEach(el => {
    gsap.from(el.children, { y: 35, duration: .75, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 75%', once: true } });
  });
  gsap.to('.project-ticker', { xPercent: -12, ease: 'none', scrollTrigger: { trigger: '.projects-intro', start: 'top bottom', end: 'bottom top', scrub: 1 } });
}

const sceneSections = [...document.querySelectorAll('[data-scene]')];
const sceneLabel = document.querySelector('.scene-label');
const sceneName = document.getElementById('scene-name');
const railProgress = document.querySelector('.rail-line i');
const railCount = document.querySelector('.rail-count');
let ticking = false;
function updateScrollState() {
  const y = scrollY;
  const max = document.documentElement.scrollHeight - innerHeight;
  railProgress.style.transform = `scaleY(${Math.max(.04, y / Math.max(max, 1))})`;
  window.setVajraScroll?.(y / innerHeight);
  const midpoint = innerHeight * .48;
  let current = sceneSections[0];
  sceneSections.forEach(section => { const rect = section.getBoundingClientRect(); if (rect.top <= midpoint && rect.bottom > 0) current = section; });
  if (current) { window.setVajraScene?.(current.dataset.scene); sceneName.textContent = current.dataset.label; }
  const light = [...document.querySelectorAll('.light-section')].some(section => { const r = section.getBoundingClientRect(); return r.top < 145 && r.bottom > 100; });
  sceneLabel.style.opacity = light ? '0' : '1';
  const sectionIndex = Math.min(5, Math.floor(y / Math.max(innerHeight, 1)) + 1);
  railCount.textContent = `0${sectionIndex} — 05`;
  ticking = false;
}
addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateScrollState); ticking = true; } }, { passive: true });
updateScrollState();

const menu = document.querySelector('.mobile-menu');
const menuToggle = document.querySelector('.menu-toggle');
function setMenu(open) {
  menu.classList.toggle('open', open); menu.setAttribute('aria-hidden', String(!open));
  menuToggle.setAttribute('aria-expanded', String(open)); document.body.classList.toggle('menu-open', open);
  if (open) menu.querySelector('.menu-close').focus(); else menuToggle.focus();
}
menuToggle.addEventListener('click', () => setMenu(true));
menu.querySelector('.menu-close').addEventListener('click', () => setMenu(false));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', event => { if (event.key === 'Escape' && menu.classList.contains('open')) setMenu(false); });

const projects = {
  yantra: {
    index: 'PROJECT P—01', status: 'PREDICTIVE MAINTENANCE / INDUSTRIAL IoT', title: 'Yantrachikitsa',
    summary: 'Yantrachikitsa is MAINTAIN AI’s machine-health and predictive-maintenance platform. It is designed to bring live equipment telemetry and condition insights together so teams can spot unusual behaviour earlier, make better-informed maintenance decisions, and reduce reliance on reactive repairs.',
    url: 'https://maintain-ai-3.vercel.app/',
    note: 'OPEN THE MAINTAIN AI PLATFORM TO EXPLORE THE PROJECT',
    systems: [
      { icon: 'radio', title: 'Live telemetry', text: 'Connect machine signals such as temperature, vibration and current for visibility into operating conditions.' },
      { icon: 'activity', title: 'Machine health', text: 'Organize sensor readings and changing patterns into useful condition-monitoring context.' },
      { icon: 'chart-no-axes-combined', title: 'Predictive maintenance', text: 'Use trends and early warning signs to support timely inspection and maintenance planning.' },
    ],
  },
  rudra: {
    index: 'PROJECT P—02', status: 'IN DEVELOPMENT / AUTONOMOUS ROBOTICS', title: 'Rudra',
    summary: 'An autonomous fire-fighting robot concept that brings mobility, sensing and suppression into a single response system — designed with hazardous environments in mind.',
    url: 'https://rudra-beryl.vercel.app/',
    linkText: 'EXPERIENCE RUDRA',
    systems: [
      { icon: 'scan-line', title: 'Detect', text: 'Sensing and fire-detection logic guide the response mission.' },
      { icon: 'route', title: 'Navigate', text: 'Autonomous robotic mobility for moving through the response area.' },
      { icon: 'flame', title: 'Suppress', text: 'A robotic suppression direction focused on reaching the source.' },
    ],
  },
};
const dialog = document.querySelector('.project-dialog');
let dialogTrigger;
document.querySelectorAll('.project-open').forEach(button => button.addEventListener('click', () => {
  const project = projects[button.dataset.project]; dialogTrigger = button;
  dialog.querySelector('.dialog-index').textContent = project.index;
  dialog.querySelector('.dialog-status').textContent = project.status;
  dialog.querySelector('#dialog-title').textContent = project.title;
  dialog.querySelector('.dialog-summary').textContent = project.summary;
  dialog.querySelector('.dialog-note').textContent = project.note || 'PROJECT IN PROGRESS — SYSTEM DETAILS REPRESENT THE CURRENT DESIGN DIRECTION.';
  const projectLink = dialog.querySelector('.dialog-project-link');
  projectLink.hidden = !project.url;
  if (project.url) projectLink.href = project.url;
  if (projectLink.firstChild) projectLink.firstChild.textContent = (project.linkText || 'OPEN MAINTAIN AI PLATFORM') + ' ';
  dialog.querySelector('.dialog-systems').innerHTML = project.systems.map(system => `<article class="dialog-system"><i data-lucide="${system.icon}"></i><h3>${system.title}</h3><p>${system.text}</p></article>`).join('');
  refreshIcons(); dialog.showModal(); document.body.classList.add('dialog-open');
  dialog.querySelector('.dialog-close').focus();
}));
function closeDialog() { dialog.close(); }
dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); dialogTrigger?.focus(); });

if (matchMedia('(hover:hover) and (pointer:fine)').matches && !reduceMotion) {
  const cursor = document.querySelector('.cursor');
  const cursorLabel = cursor?.querySelector('.cursor-label');
  // Two lightweight trail points are enough to retain the tracking effect.
  const trail = Array.from({ length: 2 }, (_, index) => {
    const dot = document.createElement('i');
    dot.className = 'cursor-trail';
    dot.dataset.trail = String(index + 1);
    document.body.append(dot);
    return dot;
  });

  let pointerX = innerWidth / 2;
  let pointerY = innerHeight / 2;
  let frameRequested = false;

  const renderCursor = () => {
    const position = `translate3d(${pointerX}px, ${pointerY}px, 0) translate(-50%, -50%)`;
    cursor.style.transform = position;
    trail.forEach(dot => { dot.style.transform = position; });
    frameRequested = false;
  };

  const moveCursor = event => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!frameRequested) {
      frameRequested = true;
      requestAnimationFrame(renderCursor);
    }
  };
  addEventListener('pointermove', moveCursor, { passive: true });

  const getTargetLabel = target => {
    const explicit = target.getAttribute('data-cursor-label');
    if (explicit) return explicit;
    if (target.matches('.project-open')) return 'ACCESS SYSTEM';
    if (target.matches('.menu-toggle,.menu-close,.dialog-close')) return 'CONTROL';
    if (target.matches('.rudra-download-link')) return 'DOWNLOAD';
    if (target.matches('a[href^="#"]')) return 'NAVIGATE';
    if (target.matches('a[target="_blank"]')) return 'OPEN EXTERNAL';
    return 'INTERACT';
  };

  document.addEventListener('pointerover', event => {
    const target = event.target.closest('a,button,[role="button"]');
    if (!target) return;
    cursor.classList.add('active', 'target-locked');
    if (cursorLabel) cursorLabel.dataset.label = getTargetLabel(target);
  });
  document.addEventListener('pointerout', event => {
    const target = event.target.closest('a,button,[role="button"]');
    if (!target || target.contains(event.relatedTarget)) return;
    cursor.classList.remove('active', 'target-locked');
    if (cursorLabel) cursorLabel.dataset.label = '';
  });

  document.addEventListener('pointerdown', () => {
    cursor.classList.remove('impact');
    void cursor.offsetWidth;
    cursor.classList.add('impact');
  });
  cursor.addEventListener('animationend', event => {
    if (event.animationName === 'cursor-impact') cursor.classList.remove('impact');
  });
  document.addEventListener('pointerleave', () => cursor.classList.add('cursor-hidden'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('cursor-hidden'));
}
