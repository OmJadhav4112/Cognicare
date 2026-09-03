/**
 * Location Safety Service
 * ========================
 * Uses browser native Geolocation API (navigator.geolocation.watchPosition)
 * Firestore structure:
 *   locationSafety/{caregiverId}/patients/{patientId}   -- safe zone configuration
 *   patientLocation/{patientId}                         -- patient's latest location
 *   locationAlerts/{caregiverId}/alerts/{docId}         -- alert records
 */
import {
  getFirestore,
  doc, setDoc, getDoc, onSnapshot,
  collection, addDoc, serverTimestamp, query, orderBy, getDocs,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const db = getFirestore();

// ── Haversine Formula ────────────────────────────────────────────────────────
/**
 * Calculates the great-circle distance in meters between two lat/lng points.
 */
export function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// ── Caregiver: Safe Zone Configuration ─────────────────────────────────────

/** Save or update the safe-zone config for a patient */
export async function saveSafeZone(caregiverId, patientId, { lat, lng, radiusMeters, enabled }) {
  if (!caregiverId || !patientId) throw new Error('Missing caregiverId or patientId');
  const ref = doc(db, 'locationSafety', caregiverId, 'patients', patientId);
  const config = {
    lat: Number(lat),
    lng: Number(lng),
    radiusMeters: Number(radiusMeters),
    enabled: Boolean(enabled),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, config, { merge: true });

  // Mirror copy so patient device can inspect zone during watchPosition
  const mirrorRef = doc(db, 'patientLocation', patientId, 'safeZones', caregiverId);
  await setDoc(mirrorRef, { ...config, caregiverId }, { merge: true });

  return config;
}

/** Get the safe-zone config for a patient */
export async function getSafeZone(caregiverId, patientId) {
  if (!caregiverId || !patientId) return null;
  const ref = doc(db, 'locationSafety', caregiverId, 'patients', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to real-time safe-zone config changes */
export function subscribeSafeZone(caregiverId, patientId, callback) {
  if (!caregiverId || !patientId) return () => {};
  const ref = doc(db, 'locationSafety', caregiverId, 'patients', patientId);
  return onSnapshot(ref, snap => callback(snap.exists() ? snap.data() : null));
}

// ── Patient: Location Sharing ───────────────────────────────────────────────

let _watchId = null;
const _alertCooldowns = {}; // { [caregiverId]: lastAlertTimestamp }
const ALERT_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes debouncing

/** Start sharing location via navigator.geolocation.watchPosition */
export function startLocationSharing(patientId, onStatus) {
  if (!navigator.geolocation) {
    onStatus?.('unsupported');
    return;
  }

  stopLocationSharing();

  _watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      onStatus?.({ status: 'sharing', lat: latitude, lng: longitude, accuracy, timestamp: Date.now() });

      // Update patient's latest location in Firestore
      try {
        const posRef = doc(db, 'patientLocation', patientId);
        await setDoc(posRef, {
          lat: latitude,
          lng: longitude,
          accuracy: accuracy || 0,
          updatedAt: serverTimestamp(),
          clientTime: Date.now(),
        }, { merge: true });

        // Check configured safe zones
        await checkSafeZones(patientId, latitude, longitude);
      } catch (e) {
        // Network/permission error on write
      }
    },
    (err) => {
      if (err.code === 1) {
        onStatus?.('denied');
      } else if (err.code === 2) {
        onStatus?.('unavailable');
      } else if (err.code === 3) {
        onStatus?.('timeout');
      } else {
        onStatus?.('error');
      }
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    }
  );
}

/** Stop active watchPosition process */
export function stopLocationSharing() {
  if (_watchId !== null) {
    navigator.geolocation.clearWatch(_watchId);
    _watchId = null;
  }
}

/** Get patient's latest position */
export async function getPatientLocation(patientId) {
  if (!patientId) return null;
  const ref = doc(db, 'patientLocation', patientId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/** Subscribe to real-time updates for a patient's location */
export function subscribePatientLocation(patientId, callback) {
  if (!patientId) return () => {};
  const ref = doc(db, 'patientLocation', patientId);
  return onSnapshot(ref, snap => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    // Check for stale location (> 5 minutes old)
    const updatedMs = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : data.clientTime || 0;
    const isStale = updatedMs > 0 && (Date.now() - updatedMs > 5 * 60 * 1000);

    callback({
      ...data,
      isStale,
    });
  });
}

// ── Alert Check Logic ────────────────────────────────────────────────────────

async function checkSafeZones(patientId, lat, lng) {
  try {
    const zonesRef = collection(db, 'patientLocation', patientId, 'safeZones');
    const snap = await getDocs(zonesRef);

    for (const zoneDoc of snap.docs) {
      const zone = zoneDoc.data();
      if (!zone.enabled || !zone.lat || !zone.lng || !zone.radiusMeters) continue;

      const dist = haversineMeters(lat, lng, zone.lat, zone.lng);
      const isOutside = dist > zone.radiusMeters;

      if (isOutside) {
        const caregiverId = zoneDoc.id;
        const now = Date.now();
        const lastAlert = _alertCooldowns[caregiverId] || 0;

        // Apply notification cooldown/debouncing
        if (now - lastAlert > ALERT_COOLDOWN_MS) {
          _alertCooldowns[caregiverId] = now;
          const alertsRef = collection(db, 'locationAlerts', caregiverId, 'alerts');
          await addDoc(alertsRef, {
            patientId,
            message: `Patient is outside safe zone (${dist}m from center, max ${zone.radiusMeters}m).`,
            dist,
            radius: zone.radiusMeters,
            lat,
            lng,
            status: 'unacknowledged',
            createdAt: serverTimestamp(),
          });
        }
      }
    }
  } catch (err) {
    // Non-blocking catch
  }
}

/** Get location alerts for caregiver */
export async function getLocationAlerts(caregiverId) {
  if (!caregiverId) return [];
  const ref = collection(db, 'locationAlerts', caregiverId, 'alerts');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Real-time subscription for location alerts */
export function subscribeLocationAlerts(caregiverId, callback) {
  if (!caregiverId) return () => {};
  const ref = collection(db, 'locationAlerts', caregiverId, 'alerts');
  const q = query(ref, orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

/** Mirror function maintained for backwards compatibility */
export async function publishSafeZoneToPatient(caregiverId, patientId, zoneData) {
  const ref = doc(db, 'patientLocation', patientId, 'safeZones', caregiverId);
  await setDoc(ref, { ...zoneData, caregiverId }, { merge: true });
}

