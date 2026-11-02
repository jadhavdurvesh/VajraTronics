import './scene.js';
import { createIcons, Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame } from 'lucide';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const iconSet = { Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame };
const refreshIcons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.5 } });
refreshIcons();
 
// VAJRA // cinematic score and automatic audio startup.
const soundToggle=document.querySelector('.audio-toggle');
let audioContext=null,masterGain=null,musicBus=null,musicNodes=[],soundEnabled=false,musicTimer=null,musicStep=0;
let audioUnlockPending=true;

function ensureAudio(){
  if(audioContext)return;
  const C=window.AudioContext||window.webkitAudioContext;
  if(!C){soundToggle.disabled=true;soundToggle.querySelector('.audio-state').textContent='AUDIO N/A';return;}
  audioContext=new C();
  const compressor=audioContext.createDynamicsCompressor();
  compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=4;
  compressor.attack.value=.012;compressor.release.value=.22;
  masterGain=audioContext.createGain();masterGain.gain.value=0;
  masterGain.connect(compressor);compressor.connect(audioContext.destination);
  musicBus=audioContext.createGain();musicBus.gain.value=1;
  musicBus.connect(masterGain);
}
function voice(freq,duration,opts={}){
  if(!audioContext)return;
  const t=opts.when??audioContext.currentTime;
  const osc=audioContext.createOscillator(),amp=audioContext.createGain(),filter=audioContext.createBiquadFilter();
  osc.type=opts.type||'sine';osc.frequency.setValueAtTime(freq,t);
  if(opts.end)osc.frequency.exponentialRampToValueAtTime(Math.max(1,opts.end),t+duration);
  filter.type=opts.filter||'lowpass';filter.frequency.value=opts.cutoff||5000;
  amp.gain.setValueAtTime(.0001,t);
  amp.gain.exponentialRampToValueAtTime(opts.volume??.1,t+.012);
  amp.gain.exponentialRampToValueAtTime(.0001,t+duration);
  osc.connect(filter);filter.connect(amp);amp.connect(opts.bus||musicBus);
  osc.start(t);osc.stop(t+duration+.03);
}
function noiseHit(duration,volume,cutoff,when){
  if(!audioContext)return;
  const length=Math.max(1,Math.floor(audioContext.sampleRate*duration));
  const buffer=audioContext.createBuffer(1,length,audioContext.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<length;i++)data[i]=Math.random()*2-1;
  const source=audioContext.createBufferSource(),filter=audioContext.createBiquadFilter(),gain=audioContext.createGain();
  source.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;
  gain.gain.setValueAtTime(volume,when);gain.gain.exponentialRampToValueAtTime(.0001,when+duration);
  source.connect(filter);filter.connect(gain);gain.connect(musicBus);source.start(when);source.stop(when+duration);
  musicNodes.push(source);
}
function startAmbientMusic(){
  if(!audioContext||musicTimer)return;
  // Broad cinematic chord progression: Cm - Ab - Eb - Bb, with evolving upper voices.
  const chords=[
    [130.81,155.56,196,233.08,261.63],
    [103.83,130.81,155.56,207.65,261.63],
    [155.56,196,233.08,311.13,392],
    [116.54,146.83,174.61,233.08,293.66]
  ];
  const bass=[65.41,51.91,77.78,58.27];
  const melody=[523.25,466.16,392,349.23,392,466.16,587.33,523.25,466.16,392,311.13,349.23,392,466.16,523.25,698.46];
  const arp=[261.63,392,523.25,466.16,311.13,466.16,622.25,523.25,311.13,466.16,622.25,587.33,233.08,349.23,466.16,523.25];
  const stepMs=300;musicStep=0;
  musicTimer=window.setInterval(()=>{
    if(!soundEnabled||audioContext.state!=='running')return;
    const step=musicStep++,bar=Math.floor(step/16)%4,beat=step%16,t=audioContext.currentTime+.025;
    if(beat===0){
      chords[bar].forEach((f,i)=>voice(f,4.65,{type:i===0?'triangle':'sawtooth',volume:i===0?.11:.045,cutoff:bar===2?2600:1900,when:t}));
      voice(bass[bar],4.7,{type:'sine',volume:.25,cutoff:180,when:t});
    }
    // Deep trailer-style kick on each beat and restrained snare on beats 2 and 4.
    if(beat%4===0)voice(90,.42,{type:'sine',volume:.38,end:38,cutoff:130,when:t});
    if(beat===4||beat===12)noiseHit(.19,.11,1700,t);
    if(beat%2===0)voice(arp[beat],.24,{type:'triangle',volume:.075,cutoff:3200,when:t});
    if(beat===3||beat===7||beat===11||beat===15)voice(melody[beat],.48,{type:'sine',volume:.09,cutoff:4200,when:t});
    if(beat===14)noiseHit(.32,.045,7000,t);
  },stepMs);
}
function stopAmbientMusic(){if(musicTimer)clearInterval(musicTimer);musicTimer=null;musicNodes.forEach(n=>{try{n.stop();n.disconnect()}catch{}});musicNodes=[];}
function setSoundState(enabled){
  soundEnabled=enabled;if(!audioContext||!masterGain)return;
  if(enabled){
    startAmbientMusic();masterGain.gain.cancelScheduledValues(audioContext.currentTime);
    masterGain.gain.setTargetAtTime(.92,audioContext.currentTime,.16);
    soundToggle.classList.add('is-on');soundToggle.setAttribute('aria-label','Disable sound');
    soundToggle.setAttribute('aria-pressed','true');soundToggle.querySelector('.audio-state').textContent='AUDIO ON';
  }else{
    masterGain.gain.setTargetAtTime(0,audioContext.currentTime,.08);stopAmbientMusic();
    soundToggle.classList.remove('is-on');soundToggle.setAttribute('aria-label','Enable sound');
    soundToggle.setAttribute('aria-pressed','false');soundToggle.querySelector('.audio-state').textContent='AUDIO OFF';
  }
}
async function unlockAndStart(){
  if(!audioUnlockPending||soundEnabled)return;
  ensureAudio();if(!audioContext)return;
  try{await audioContext.resume();if(audioContext.state==='running'){audioUnlockPending=false;setSoundState(true);}}
  catch(error){/* Browser will retry on the next user gesture. */}
}
// Attempt immediately on page load. If autoplay is blocked, start automatically
// on the first ordinary interaction—no separate AUDIO button click is needed.
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
  const bus=musicBus;
  if(kind==='hover')voice(780,.055,{type:'sine',volume:.018,end:1050,bus});
  else if(kind==='click'){voice(155,.12,{type:'triangle',volume:.075,end:65,bus});voice(1180,.055,{type:'sine',volume:.025,end:620,bus});}
  else if(kind==='open'){voice(220,.2,{type:'triangle',volume:.055,end:440,bus});setTimeout(()=>voice(440,.25,{type:'sine',volume:.04,end:880,bus}),90);}
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
