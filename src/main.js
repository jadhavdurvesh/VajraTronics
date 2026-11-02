import './scene.js';
import { createIcons, Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame } from 'lucide';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const iconSet = { Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame };
const refreshIcons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.5 } });
refreshIcons();
 
// VAJRA // original slow-burn cinematic score and automatic audio startup.
const soundToggle=document.querySelector('.audio-toggle');
let audioContext=null,masterGain=null,musicBus=null,musicNodes=[],soundEnabled=false,musicTimer=null,barIndex=0,melodyIndex=0;
let audioUnlockPending=true;

function ensureAudio(){
  if(audioContext)return;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C){soundToggle.disabled=true;soundToggle.querySelector('.audio-state').textContent='AUDIO N/A';return;}
  audioContext=new C();
  const compressor=audioContext.createDynamicsCompressor();
  compressor.threshold.value=-22;compressor.knee.value=24;compressor.ratio.value=3;
  compressor.attack.value=.04;compressor.release.value=.5;
  masterGain=audioContext.createGain();masterGain.gain.value=0;
  masterGain.connect(compressor);compressor.connect(audioContext.destination);
  musicBus=audioContext.createGain();musicBus.gain.value=.42;musicBus.connect(masterGain);
}
function addNode(node){musicNodes.push(node);return node;}
function cinematicVoice(freq,duration,{type='sine',volume=.08,cutoff=2400,detune=0,when=null,attack=.8,release=1.5}={}){
  if(!audioContext)return;
  const t=when??audioContext.currentTime;
  const osc=addNode(audioContext.createOscillator()),filter=addNode(audioContext.createBiquadFilter()),amp=addNode(audioContext.createGain());
  osc.type=type;osc.frequency.setValueAtTime(freq,t);osc.detune.value=detune;
  filter.type='lowpass';filter.frequency.setValueAtTime(cutoff,t);filter.Q.value=.45;
  amp.gain.setValueAtTime(.0001,t);
  amp.gain.exponentialRampToValueAtTime(volume,t+attack);
  amp.gain.setValueAtTime(volume,t+Math.max(attack,duration-release));
  amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(filter);filter.connect(amp);amp.connect(musicBus);
  osc.start(t);osc.stop(t+duration+.08);
}
function pianoNote(freq,when){
  if(!audioContext)return;
  const t=when??audioContext.currentTime;
  const osc=audioContext.createOscillator(),amp=audioContext.createGain(),filter=audioContext.createBiquadFilter();
  osc.type='sine';osc.frequency.value=freq;filter.type='lowpass';filter.frequency.value=1900;
  amp.gain.setValueAtTime(.0001,t);amp.gain.exponentialRampToValueAtTime(.035,t+.06);
  amp.gain.exponentialRampToValueAtTime(.0001,t+3.8);
  osc.connect(filter);filter.connect(amp);amp.connect(musicBus);osc.start(t);osc.stop(t+3.9);
  musicNodes.push(osc,amp,filter);
}
function startAmbientMusic(){
  if(!audioContext||musicTimer)return;
  // Spacious, slowly evolving orchestral-synth harmony; original composition, not a soundtrack copy.
  const progressions=[
    {root:65.41,notes:[130.81,155.56,196,233.08],top:392},
    {root:51.91,notes:[103.83,130.81,155.56,207.65],top:311.13},
    {root:77.78,notes:[155.56,196,233.08,311.13],top:466.16},
    {root:58.27,notes:[116.54,146.83,174.61,233.08],top:349.23}
  ];
  const start=audioContext.currentTime;
  const masterPad=addNode(audioContext.createGain());masterPad.gain.value=.24;masterPad.connect(musicBus);
  const lowpass=addNode(audioContext.createBiquadFilter());lowpass.type='lowpass';lowpass.frequency.value=1150;lowpass.Q.value=.5;lowpass.connect(masterPad);
  const voices=[];
  [0,1,2,3,4].forEach(i=>{
    const osc=addNode(audioContext.createOscillator()),amp=addNode(audioContext.createGain());
    osc.type=i===0?'triangle':'sawtooth';amp.gain.value=i===0?.075:.012;
    osc.connect(amp);amp.connect(lowpass);osc.start(start);voices.push(osc);
  });
  const sub=addNode(audioContext.createOscillator()),subGain=addNode(audioContext.createGain());
  sub.type='sine';sub.frequency.value=32.7;subGain.gain.value=.045;sub.connect(subGain);subGain.connect(musicBus);sub.start(start);
  const shimmer=addNode(audioContext.createOscillator()),shimmerGain=addNode(audioContext.createGain()),shimmerFilter=addNode(audioContext.createBiquadFilter());
  shimmer.type='sine';shimmer.frequency.value=.11;shimmerGain.gain.value=85;
  shimmerFilter.type='lowpass';shimmerFilter.frequency.value=1100;
  shimmer.connect(shimmerGain);shimmerGain.connect(shimmerFilter.frequency);shimmerFilter.connect(masterPad);shimmer.start(start);
  function changeChord(index){
    const chord=progressions[index%progressions.length],t=audioContext.currentTime+.04;
    sub.frequency.setTargetAtTime(chord.root/2,t,2.2);
    voices.forEach((osc,i)=>osc.frequency.setTargetAtTime(chord.notes[i%chord.notes.length],t,2.8));
    lowpass.frequency.setTargetAtTime(index%2?900:1450,t,3.5);
  }
  changeChord(0);
  const motifs=[
    [392,523.25,466.16,392,311.13,349.23,392],
    [349.23,466.16,523.25,466.16,392,349.23,311.13],
    [466.16,587.33,523.25,466.16,392,466.16,523.25],
    [349.23,392,466.16,523.25,466.16,392,349.23]
  ];
  let elapsed=0;barIndex=0;melodyIndex=0;
  // Slow chord changes, spacious piano-like notes and long crescendos—no drum groove.
  musicTimer=window.setInterval(()=>{
    if(!soundEnabled||audioContext.state!=='running')return;
    elapsed++;
    if(elapsed%8===0){barIndex=(barIndex+1)%4;changeChord(barIndex);}
    if(elapsed%3===0){
      const motif=motifs[barIndex];
      pianoNote(motif[melodyIndex%motif.length],audioContext.currentTime+.04);
      melodyIndex++;
    }
    if(elapsed%16===0){
      const chord=progressions[barIndex];
      cinematicVoice(chord.root,7,{type:'sine',volume:.055,cutoff:180,attack:2.8,release:3.2});
      cinematicVoice(chord.top*2,6,{type:'sine',volume:.012,cutoff:2600,attack:2.5,release:3});
    }
  },1000);
}
function stopAmbientMusic(){
  if(musicTimer)clearInterval(musicTimer);musicTimer=null;
  musicNodes.forEach(n=>{try{if(n.stop)n.stop();n.disconnect();}catch{}});
  musicNodes=[];
}
function setSoundState(enabled){
  soundEnabled=enabled;if(!audioContext||!masterGain)return;
  if(enabled){
    startAmbientMusic();masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(.32,audioContext.currentTime,1.8);
    soundToggle.classList.add('is-on');soundToggle.setAttribute('aria-label','Disable sound');
    soundToggle.setAttribute('aria-pressed','true');soundToggle.querySelector('.audio-state').textContent='AUDIO ON';
  }else{
    masterGain.gain.setTargetAtTime(0,audioContext.currentTime,.15);stopAmbientMusic();
    soundToggle.classList.remove('is-on');soundToggle.setAttribute('aria-label','Enable sound');
    soundToggle.setAttribute('aria-pressed','false');soundToggle.querySelector('.audio-state').textContent='AUDIO OFF';
  }
}
async function unlockAndStart(){
  if(!audioUnlockPending||soundEnabled)return;
  ensureAudio();if(!audioContext)return;
  try{await audioContext.resume();if(audioContext.state==='running'){audioUnlockPending=false;setSoundState(true);}}
  catch(error){}
}
// Try autoplay on arrival; if the browser blocks it, begin on the first ordinary gesture.
soundToggle.querySelector('.audio-state').textContent='AUDIO STARTING';
ensureAudio();
if(audioContext)audioContext.resume().then(()=>{if(audioContext.state==='running'){audioUnlockPending=false;setSoundState(true);}}).catch(()=>{});
['pointerdown','keydown','touchstart'].forEach(type=>document.addEventListener(type,unlockAndStart,{once:true,passive:true}));
soundToggle?.addEventListener('click',async()=>{
  ensureAudio();if(!audioContext)return;
  try{await audioContext.resume();audioUnlockPending=false;setSoundState(!soundEnabled);}
  catch(error){soundToggle.querySelector('.audio-state').textContent='TAP TO RETRY';}
});
function playUiSound(kind){
  if(!soundEnabled||!audioContext||audioContext.state!=='running')return;
  if(kind==='hover')cinematicVoice(880,.16,{type:'sine',volume:.004,cutoff:3000,attack:.01,release:.14});
  else if(kind==='click')cinematicVoice(130,.22,{type:'triangle',volume:.018,cutoff:500,attack:.01,release:.2});
  else if(kind==='open')cinematicVoice(392,.55,{type:'sine',volume:.014,cutoff:1800,attack:.08,release:.45});
}
document.addEventListener('pointerover',e=>{const t=e.target.closest('a,button,[role="button"]');if(t&&!t.matches('.audio-toggle'))playUiSound('hover');},{passive:true});
document.addEventListener('click',e=>{const t=e.target.closest('a,button,[role="button"]');if(t&&!t.matches('.audio-toggle'))playUiSound(t.matches('.project-open')?'open':'click');});
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
