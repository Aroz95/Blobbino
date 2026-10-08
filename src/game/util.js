import { SAVE_KEY } from '../config.js';

/* ================= costanti e piccole funzioni usate ovunque ================= */

const HOUR = 3600e3, MIN = 60e3, KEY = SAVE_KEY;
const APP_VERSION = 31;
const $ = id => document.getElementById(id);
const clamp = v => Math.max(0, Math.min(100, v));
const lim = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const rf = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EMO = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const STAR = '<svg class="st" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5l2.8 6.1 6.7.7-5 4.5 1.4 6.6L12 17l-5.9 3.4 1.4-6.6-5-4.5 6.7-.7z"/></svg>';

export { $, APP_VERSION, EMO, HOUR, KEY, MIN, STAR, clamp, esc, lim, pick, reduced, rf, rnd };
