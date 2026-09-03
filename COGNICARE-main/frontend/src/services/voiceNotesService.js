/**
 * Voice Notes Service
 * Uses Firebase Storage to persist recordings.
 * Path pattern: voiceNotes/{userId}/{noteId}.webm
 *
 * Security: only the authenticated user's own path is read/written.
 * Firestore is used to store metadata (name, duration, createdAt).
 */
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from 'firebase/storage';
import {
  getFirestore, collection, addDoc, getDocs,
  deleteDoc, doc, query, orderBy, serverTimestamp,
} from 'firebase/firestore';
import { storage } from '../config/firebaseConfig';
import { getAuth } from 'firebase/auth';

const db = getFirestore();

function getUserId() {
  const user = getAuth().currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}

/** Upload a Blob/File to Firebase Storage and save metadata to Firestore */
export async function saveVoiceNote(audioBlob, name = '') {
  const userId = getUserId();
  const noteId = `note_${Date.now()}`;
  const storePath = `voiceNotes/${userId}/${noteId}.webm`;

  // Upload audio to Firebase Storage
  const storageRef = ref(storage, storePath);
  await uploadBytes(storageRef, audioBlob, { contentType: 'audio/webm' });
  const url = await getDownloadURL(storageRef);

  // Save metadata to Firestore
  const metaRef = collection(db, 'voiceNotes', userId, 'notes');
  const docRef = await addDoc(metaRef, {
    noteId,
    storePath,
    url,
    name: name.trim() || `Note ${new Date().toLocaleTimeString()}`,
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, noteId, url, name, storePath, createdAt: new Date() };
}

/** Fetch all voice note metadata for the current user, newest first */
export async function getVoiceNotes() {
  const userId = getUserId();
  const metaRef = collection(db, 'voiceNotes', userId, 'notes');
  const q = query(metaRef, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Delete a voice note: removes both the Storage file and the Firestore doc */
export async function deleteVoiceNote(noteDocId, storePath) {
  const userId = getUserId();

  // Delete from Storage
  try {
    const storageRef = ref(storage, storePath);
    await deleteObject(storageRef);
  } catch {
    // Ignore if already deleted
  }

  // Delete from Firestore
  const docRef = doc(db, 'voiceNotes', userId, 'notes', noteDocId);
  await deleteDoc(docRef);
}
