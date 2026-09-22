import { db, auth } from "./firebase-init.js";
import {
  doc, getDoc, setDoc, onSnapshot
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "firebase/auth";
import { cloudinaryConfig, cloudinaryConfigured } from "./cloudinary-config.js";

export const uid = () => Math.random().toString(36).slice(2, 10);

export function defaultData() {
  return {
    hero: {
      name: 'VEBHAV', Label: '𝚂𝚊𝚖𝚞𝚎𝚕~', profession: 'CODER & VERSATILE',
      description: 'Crafting visual stories through editing, motion, rhythm and creative direction.',
      mediaType: 'none', mediaUrl: '', poster: '', autoplay: true, muted: true, loop: true, visible: true
    },
    info: {
      text: 'Vebhav, professionally known as Aries, is a Video Editor & Creative Artist focused on cinematic editing, visual storytelling and creative content.',
      skills: ['Video Editing', 'Motion Graphics', 'Colour Grading', 'Sound Design', 'Creative Direction', 'Visual Storytelling'],
      photo: ''
    },
    nav: [
      { id: 'info', label: 'Info', visible: true, order: 1 },
      { id: 'work', label: 'Work', visible: true, order: 2 },
      { id: 'collabs', label: 'Collabs', visible: true, order: 3 },
      { id: 'workinfo', label: 'Work Info', visible: true, order: 4 },
      { id: 'launch', label: 'New Launch', visible: true, order: 5 },
      { id: 'current', label: 'Currently Working On', visible: true, order: 6 },
      { id: 'contact', label: 'Contact', visible: true, order: 7 }
    ],
    work: [],
    collabs: [],
    experiences: [],
    launch: {
      enabled: false, projectName: '', launchDate: '', timezone: 'Asia/Kolkata', cover: '', video: '',
      description: '', fireworks: true, sound: false, soundUrl: '', fireworksDuration: 6, buttonText: 'View Project',
      destination: '', launchedFlagShown: false
    },
    currentProject: { name: '', cover: '', video: '', description: '', status: 'IN PROGRESS', progress: 0, expectedLaunch: '', visible: false },
    social: [],
    email: '',
    settings: { title: '𝚂𝚊𝚖𝚞𝚎𝚕~ — Vebhav', favicon: '', animations: true, cursor: true, grain: true, loadingScreen: true },
    music: { enabled: false, url: '', volume: 0.5 },
    media: []
  };
}

const CONTENT_DOC = db ? doc(db, 'site', 'content') : null;

export let DATA = defaultData();

/** One-time fetch of the published content. */
export async function loadData() {
  if (!CONTENT_DOC) {
    console.warn('Firebase is not configured yet (missing .env values) — showing default content.');
    return DATA;
  }
  try {
    const snap = await getDoc(CONTENT_DOC);
    if (snap.exists()) {
      DATA = Object.assign(defaultData(), snap.data());
    }
  } catch (e) {
    console.warn('Could not load Firestore content — showing defaults. Check .env values and firestore.rules.', e);
  }
  return DATA;
}

/** Writes the given data as the new published content. */
export async function saveData(d) {
  if (!CONTENT_DOC) throw new Error('Firebase is not configured — fill in your .env file (see README.md).');
  await setDoc(CONTENT_DOC, d);
  DATA = d;
}

/** Live-subscribes so visitors see published changes without a refresh. Returns an unsubscribe function. */
export function subscribeToLiveData(callback) {
  if (!CONTENT_DOC) return () => {};
  return onSnapshot(CONTENT_DOC, (snap) => {
    if (snap.exists()) {
      DATA = Object.assign(defaultData(), snap.data());
      callback(DATA);
    }
  }, (err) => console.warn('Live content subscription error:', err));
}

/* ---------------- Auth ---------------- */
// The admin account is created once, manually, in the Firebase console
// (Authentication → Users → Add user). There is no public sign-up flow.
export function loginAdmin(email, password) {
  if (!auth) throw new Error('Firebase is not configured — fill in your .env file (see README.md).');
  return signInWithEmailAndPassword(auth, email, password);
}
export function logoutAdmin() {
  if (!auth) return Promise.resolve();
  return signOut(auth);
}
export function watchAuth(cb) {
  if (!auth) { cb(null); return () => {}; }
  return onAuthStateChanged(auth, cb);
}

/* ---------------- Media uploads (Cloudinary) ---------------- */
/** Uploads a file to Cloudinary via an unsigned upload preset and returns its public URL. */
export async function uploadMedia(file) {
  if (!cloudinaryConfigured) {
    throw new Error('Cloudinary is not configured yet — fill in your .env file (see README.md).');
  }
  const isImage = file.type.startsWith('image');
  // Cloudinary doesn't have a separate "audio" upload endpoint — audio
  // files go through the same "video" resource type as video files.
  const resourceType = isImage ? 'image' : 'video';
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/${resourceType}/upload`;
  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', cloudinaryConfig.uploadPreset);

  const res = await fetch(endpoint, { method: 'POST', body: form });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  return json.secure_url;
}
