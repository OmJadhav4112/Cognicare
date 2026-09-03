/**
 * Location Safety Service
 * ========================
 * Firestore structure:
 *   locationSafety/{caregiverId}/{patientId}   -- caregiver sets safe zone config
 *   locationSafety/{patientId}/current         -- patient writes their latest position
 *   locationAlerts/{caregiverId}/alerts/{docId} -- alert records
 *
 * Alert cooldown: minimum 10 minutes between alerts for the same patient.
 */
import {
  getFirestore,
  doc, setDoc, getDoc, onSnapshot,
  collection, addDoc, serverTimestamp, query, orderBy, getDocs,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();

// ── Caregiver: Safe Zone Config ─────────────────────────────────────────────

/** Save / update the safe-zone config for a patient */
export async function saveSafeZone(caregiverId, patientId, { lat, lng, radiusMeters, enabled }) {
  const ref = doc(db, 'locationSafety', caregiverId, 'patients', patientId);
  await setDoc(ref, { lat, lng, radiusMeters, enabled, updatedAt: serverTimestamp() }, { merge: true });
}

/** Get the safe-zone config for a patient */
export async function getSafeZone(caregiverId, patientId) {
  const ref = doc(db, 'locationSafety', caregiverId, 'patients', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to safe-zone config changes in real time */
export function subscribeSafeZone(caregiverId, patientId, callback) {
  const ref = doc(db, 'locationSafety', caregiverId, 'patients', patientId);
  return onSnapshot(ref, snap => callback(snap.exists() ? snap.data() : null));
}

// ── Patient: Location Sharing ───────────────────────────────────────────────

let _watchId  = null;
let _alertCooldowns = {}; // { [caregiverId]: lastAlertTimestamp }

/** Start sharing location. Writes to Firestore on each position update. */
export function startLocationSharing(patientId, onStatus) {
  if (!navigator.geolocation) {
    onStatus?.('unsupported'); return;
  }
  _watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      onStatus?.('sharing');

      // Write current position
      const posRef = doc(db, 'patientLocation', patientId);
      await setDoc(posRef, {
        lat: latitude, lng: longitude, accuracy,
        updatedAt: serverTimestamp(),
      }).catch(() => {});

      // Check all safe zones for this patient
      await checkSafeZones(patientId, latitude, longitude);
    },
    (err) => {
      if (err.code === 1) onStatus?.('denied');
      else onStatus?.('error');
    },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
  );
}

export function stopLocationSharing() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
}

/** Get the patient's last known position */
export async function getPatientLocation(patientId) {
  const ref = doc(db, 'patientLocation', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to patient location updates in real time */
export function subscribePatientLocation(patientId, callback) {
  const ref = doc(db, 'patientLocation', patientId);
  return onSnapshot(ref, snap => callback(snap.exists() ? snap.data() : null));
}

// ── Alert logic ──────────────────────────────────────────────────────────────

const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

/** Haversine distance in metres between two lat/lng points */
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function checkSafeZones(patientId, lat, lng) {
  // Find all caregivers that have a safe zone configured for this patient
  // (In production this would be a Firestore collection group query;
  //  here we query the caregiver's own collection using their UID from the
  //  patient's profile — kept simple to match existing data model)
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    // Patient reads their own safe-zone config (caregiver writes it there)
    // We store a copy at patientLocation/{patientId}/safeZones/{caregiverId}
    const zonesRef = collection(db, 'patientLocation', patientId, 'safeZones');
    const snap = await getDocs(zonesRef);

    for (const zoneDoc of snap.docs) {
      const zone = zoneDoc.data();
      if (!zone.enabled) continue;

      const dist = haversineMeters(lat, lng, zone.lat, zone.lng);
      const isOutside = dist > zone.radiusMeters;

      if (isOutside) {
        const caregiverId = zoneDoc.id;
        const now = Date.now();
        const lastAlert = _alertCooldowns[caregiverId] || 0;

        if (now - lastAlert > ALERT_COOLDOWN_MS) {
          _alertCooldowns[caregiverId] = now;
          // Write alert to caregiver's alert collection
          const alertsRef = collection(db, 'locationAlerts', caregiverId, 'alerts');
          await addDoc(alertsRef, {
            patientId,
            message: `Patient has moved outside the safe zone (${Math.round(dist)}m from center).`,
            dist: Math.round(dist),
            radius: zone.radiusMeters,
            lat, lng,
            status: 'sent',
            createdAt: serverTimestamp(),
          });
        }
      }
    }
  } catch {
    // Non-critical — fail silently
  }
}

/** Copy safe-zone config to patientLocation/{patientId}/safeZones/{caregiverId}
 *  so the patient's device can check it during watchPosition */
export async function publishSafeZoneToPatient(caregiverId, patientId, zoneData) {
  const ref = doc(db, 'patientLocation', patientId, 'safeZones', caregiverId);
  await setDoc(ref, { ...zoneData, caregiverId }, { merge: true });
}

/** Get caregiver's location alerts */
export async function getLocationAlerts(caregiverId) {
  const ref = collection(db, 'locationAlerts', caregiverId, 'alerts');
  const q   = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Subscribe to location alerts in real time */
export function subscribeLocationAlerts(caregiverId, callback) {
  const ref = collection(db, 'locationAlerts', caregiverId, 'alerts');
  const q   = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}
