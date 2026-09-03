import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  saveSafeZone, getSafeZone, subscribePatientLocation,
  getLocationAlerts, publishSafeZoneToPatient, haversineMeters,
} from '../../services/locationService';
import PageHeader from '../../components/common/PageHeader';
import Spinner    from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset paths in bundler environment
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const RADIUS_OPTIONS = [
  { label: '100 m',  value: 100   },
  { label: '250 m',  value: 250   },
  { label: '500 m',  value: 500   },
  { label: '1 km',   value: 1000  },
  { label: '2 km',   value: 2000  },
];

export default function LocationSafetyPage() {
  const { patientId } = useParams();
  const { user }      = useAuth();
  const { t }         = useLanguage();
  const toast         = useToast();

  const caregiverId = user?.id || user?._id;

  // ── State ─────────────────────────────────────────────────────────────────
  const [zone,         setZone]         = useState(null);    // saved config
  const [formLat,      setFormLat]      = useState('26.1445'); // Default Guwahati center
  const [formLng,      setFormLng]      = useState('91.7362');
  const [formRadius,   setFormRadius]   = useState(500);
  const [isCustomRadius, setIsCustomRadius] = useState(false);
  const [enabled,      setEnabled]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [gettingLoc,   setGettingLoc]   = useState(false);
  const [patientPos,   setPatientPos]   = useState(null);    // {lat, lng, updatedAt, isStale}
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);

  // ── Map refs ─────────────────────────────────────────────────────────────
  const mapContainerRef = useRef(null);
  const mapInstanceRef  = useRef(null);
  const circleRef       = useRef(null);
  const centerMarkerRef = useRef(null);
  const patientMarkerRef = useRef(null);

  // ── Load current config ───────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    if (!caregiverId || !patientId) return;
    try {
      const saved = await getSafeZone(caregiverId, patientId);
      if (saved) {
        setZone(saved);
        if (saved.lat) setFormLat(String(saved.lat));
        if (saved.lng) setFormLng(String(saved.lng));
        if (saved.radiusMeters) setFormRadius(saved.radiusMeters);
        setEnabled(!!saved.enabled);
      }
      const alertList = await getLocationAlerts(caregiverId);
      setAlerts(alertList.filter(a => a.patientId === patientId).slice(0, 10));
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [caregiverId, patientId]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ── Subscribe to real-time patient location ───────────────────────────────
  useEffect(() => {
    if (!patientId) return;
    const unsub = subscribePatientLocation(patientId, pos => {
      setPatientPos(pos);
      if (pos?.lat && pos?.lng && (!formLat || formLat === '26.1445')) {
        // Default to patient's current position if safe zone center is unset
        setFormLat(pos.lat.toFixed(6));
        setFormLng(pos.lng.toFixed(6));
      }
    });
    return unsub;
  }, [patientId, formLat]);

  // ── Leaflet Map Initialization & Updates ─────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialLat = parseFloat(formLat) || 26.1445;
    const initialLng = parseFloat(formLng) || 91.7362;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 14,
      zoomControl: true,
    });

    // OpenStreetMap tiles with attribution
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    mapInstanceRef.current = map;

    // Trigger map container size recalculation after render
    const timers = [100, 300, 700].map(delay =>
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, delay)
    );

    return () => {
      timers.forEach(t => clearTimeout(t));
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []); // eslint-disable-line

  // Update map view, safe zone circle, and markers when coordinates or radius change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);

    if (isNaN(lat) || isNaN(lng)) return;

    map.invalidateSize();
    map.setView([lat, lng]);

    // Update safe-zone center marker
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLatLng([lat, lng]);
    } else {
      centerMarkerRef.current = L.marker([lat, lng], {
        title: 'Safe Zone Center',
      }).addTo(map).bindPopup('📍 Safe Zone Center');
    }

    // Update safe-zone circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
      circleRef.current.setRadius(formRadius);
      circleRef.current.setStyle({
        color: enabled ? '#0d9488' : '#9ca3af',
        fillColor: enabled ? '#0d9488' : '#9ca3af',
        fillOpacity: enabled ? 0.15 : 0.05,
      });
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: formRadius,
        color: enabled ? '#0d9488' : '#9ca3af',
        fillColor: enabled ? '#0d9488' : '#9ca3af',
        fillOpacity: enabled ? 0.15 : 0.05,
      }).addTo(map);
    }

    // Update patient marker if position available
    if (patientPos?.lat && patientPos?.lng) {
      const pLat = patientPos.lat;
      const pLng = patientPos.lng;

      const pIcon = L.divIcon({
        className: 'custom-patient-marker',
        html: `<div style="background-color: #ef4444; border: 3px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); font-size: 14px;">🧍</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      if (patientMarkerRef.current) {
        patientMarkerRef.current.setLatLng([pLat, pLng]);
        patientMarkerRef.current.setIcon(pIcon);
      } else {
        patientMarkerRef.current = L.marker([pLat, pLng], { icon: pIcon })
          .addTo(map)
          .bindPopup('🧍 Patient Current Location');
      }
    }
  }, [formLat, formLng, formRadius, enabled, patientPos]);

  // ── Set Safe Zone Center from Patient Location ────────────────────────────
  const handleUsePatientLoc = () => {
    if (!patientPos?.lat || !patientPos?.lng) {
      toast(t('location_not_sharing'), 'warning');
      return;
    }
    setFormLat(patientPos.lat.toFixed(6));
    setFormLng(patientPos.lng.toFixed(6));

    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([patientPos.lat, patientPos.lng], 15);
    }
    toast(t('location_set'), 'success');
  };

  // ── Set Safe Zone Center from Caregiver Browser Location ─────────────────
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) { toast(t('no_location_perm'), 'error'); return; }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setFormLat(lat);
        setFormLng(lng);
        setGettingLoc(false);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 15);
        }
        toast(t('location_set'), 'success');
      },
      (err) => {
        setGettingLoc(false);
        if (err.code === 1) toast(t('no_location_perm'), 'error');
        else toast(t('location_error'), 'error');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Save config ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    const lat = parseFloat(formLat);
    const lng = parseFloat(formLng);
    if (isNaN(lat) || isNaN(lng)) {
      toast(t('location_error'), 'warning'); return;
    }
    setSaving(true);
    try {
      const config = { lat, lng, radiusMeters: Number(formRadius), enabled };
      await saveSafeZone(caregiverId, patientId, config);
      await publishSafeZoneToPatient(caregiverId, patientId, config);
      setZone(config);
      toast(enabled ? t('safety_enabled') : t('safety_disabled'), 'success');
    } catch (err) {
      toast(err.message || 'Could not save safe zone.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Distance calculation ──────────────────────────────────────────────────
  const getCalculatedDistance = () => {
    const centerLat = parseFloat(formLat);
    const centerLng = parseFloat(formLng);
    if (isNaN(centerLat) || isNaN(centerLng) || !patientPos?.lat || !patientPos?.lng) {
      return null;
    }
    return haversineMeters(patientPos.lat, patientPos.lng, centerLat, centerLng);
  };

  const dist = getCalculatedDistance();
  const inside = dist !== null ? dist <= formRadius : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader
        title={t('location_safety')}
        emoji="📍"
        backTo={`/caregiver/patient/${patientId}`}
        subtitle={t('location_safety_sub')}
      />

      {/* Patient location status card */}
      {patientPos ? (
        <div
          className="card mb-5 flex items-center justify-between gap-4 border-2"
          style={{
            borderColor: inside === false
              ? 'var(--c-danger-500)'
              : inside === true
              ? 'var(--c-primary-500)'
              : 'var(--c-warm-200)',
          }}
        >
          <div className="flex items-center gap-4">
            <span className="text-4xl shrink-0">{inside === false ? '⚠️' : inside === true ? '✅' : '📍'}</span>
            <div>
              <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                {t('patient_location')}
              </div>
              {dist !== null ? (
                <div
                  className="text-base font-semibold"
                  style={{ color: inside ? 'var(--c-primary-600)' : 'var(--c-danger-500)' }}
                >
                  {inside ? t('inside_zone') : t('outside_zone')} — {dist}m {t('radius').toLowerCase()}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }}>{t('sharing_location')}</div>
              )}
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Lat: {patientPos.lat?.toFixed(4)}, Lng: {patientPos.lng?.toFixed(4)}
                {patientPos.isStale && <span className="ml-2 text-danger-500 font-semibold">(Stale Location &gt; 5m)</span>}
              </div>
            </div>
          </div>
          <button onClick={handleUsePatientLoc} className="btn-outline btn-sm shrink-0">
            📍 {t('set_location')}
          </button>
        </div>
      ) : (
        <div className="alert alert-warning mb-5">
          ⚠️ {t('location_not_sharing')}
        </div>
      )}

      {/* Leaflet Interactive Map Container */}
      <div className="card mb-6 p-2">
        <div
          ref={mapContainerRef}
          className="w-full h-80 rounded-xl z-0"
          style={{ minHeight: '320px', background: '#e5e7eb' }}
        />
        <div className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>
          🗺️ OpenStreetMap tiles powered by Leaflet.js (No paid API)
        </div>
      </div>

      {/* Safe zone config form */}
      <div className="card mb-5">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          📍 {t('safe_zone')}
        </h3>

        <div className="flex gap-2 mb-4">
          <button
            onClick={handleGetMyLocation}
            disabled={gettingLoc}
            className="btn-outline btn-sm flex-1"
          >
            {gettingLoc ? <Spinner size="sm" /> : `🎯 My Location`}
          </button>
          <button
            onClick={handleUsePatientLoc}
            disabled={!patientPos}
            className="btn-outline btn-sm flex-1"
          >
            📍 Patient Location
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="field-label text-sm">Latitude</label>
            <input
              type="number" step="any" value={formLat}
              onChange={e => setFormLat(e.target.value)}
              className="field-input text-sm" placeholder="e.g. 26.1445"
            />
          </div>
          <div>
            <label className="field-label text-sm">Longitude</label>
            <input
              type="number" step="any" value={formLng}
              onChange={e => setFormLng(e.target.value)}
              className="field-input text-sm" placeholder="e.g. 91.7362"
            />
          </div>
        </div>

        {/* Radius picker */}
        <div className="mb-4">
          <label className="field-label">{t('radius')}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setFormRadius(opt.value); setIsCustomRadius(false); }}
                className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all
                  ${formRadius === opt.value && !isCustomRadius
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-warm-200 text-warm-600 hover:border-primary-300'}`}
              >
                {opt.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomRadius(true)}
              className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all
                ${isCustomRadius ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-warm-200 text-warm-600'}`}
            >
              Custom
            </button>
          </div>

          {isCustomRadius && (
            <div className="mt-2">
              <input
                type="number"
                min="50"
                max="50000"
                value={formRadius}
                onChange={e => setFormRadius(Number(e.target.value))}
                className="field-input text-sm"
                placeholder="Enter custom radius in meters (e.g. 350)"
              />
            </div>
          )}
        </div>

        {/* Enable toggle */}
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <div
            onClick={() => setEnabled(e => !e)}
            className="relative w-14 h-7 rounded-full transition-colors cursor-pointer"
            style={{ backgroundColor: enabled ? 'var(--c-primary-500)' : 'var(--c-warm-300)' }}
          >
            <div
              className="absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ left: enabled ? '1.75rem' : '0.25rem' }}
            />
          </div>
          <span className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {enabled ? t('enable_safety') : t('disable_safety')}
          </span>
        </label>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
          {saving ? <Spinner size="sm" /> : `💾 ${t('save')}`}
        </button>
      </div>

      {/* Alert history */}
      {alerts.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            🚨 {t('needs_attention')}
          </h3>
          <div className="flex flex-col gap-2">
            {alerts.map(a => (
              <div
                key={a.id}
                className="rounded-2xl p-3"
                style={{
                  backgroundColor: 'var(--c-danger-50)',
                  border: '1px solid var(--c-danger-100)',
                }}
              >
                <div className="font-semibold text-base" style={{ color: 'var(--c-danger-600)' }}>
                  ⚠️ {a.message}
                </div>
                {a.createdAt && (
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {a.createdAt?.toDate
                      ? a.createdAt.toDate().toLocaleString('en-IN')
                      : new Date(a.createdAt).toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

