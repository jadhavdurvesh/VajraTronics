import './scene.js';
import { createIcons, Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame } from 'lucide';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
const iconSet = { Menu, X, ArrowDownRight, ArrowUpRight, ArrowUp, Plus, Activity, Radio, ChartNoAxesCombined, ScanLine, Route, Flame };
const refreshIcons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.5 } });
refreshIcons();

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
  dialog.querySelector('.dialog-systems').innerHTML = project.systems.map(system => `<article class="dialog-system"><i data-lucide="${system.icon}"></i><h3>${system.title}</h3><p>${system.text}</p></article>`).join('');
  refreshIcons(); dialog.showModal(); document.body.classList.add('dialog-open');
  dialog.querySelector('.dialog-close').focus();
}));
function closeDialog() { dialog.close(); }
dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
dialog.addEventListener('close', () => { document.body.classList.remove('dialog-open'); dialogTrigger?.focus(); });

if (matchMedia('(pointer:fine)').matches && !reduceMotion) {
  const cursor = document.querySelector('.cursor');
  addEventListener('pointermove', event => { cursor.style.left = `${event.clientX}px`; cursor.style.top = `${event.clientY}px`; }, { passive: true });
  document.querySelectorAll('a,button').forEach(el => { el.addEventListener('mouseenter', () => cursor.classList.add('active')); el.addEventListener('mouseleave', () => cursor.classList.remove('active')); });
}
