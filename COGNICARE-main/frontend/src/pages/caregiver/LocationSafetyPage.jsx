import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  saveSafeZone, getSafeZone, subscribePatientLocation,
  getLocationAlerts, publishSafeZoneToPatient,
} from '../../services/locationService';
import PageHeader from '../../components/common/PageHeader';
import Spinner    from '../../components/common/Spinner';
import { useToast } from '../../components/common/Toast';

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
  const [formLat,      setFormLat]      = useState('');
  const [formLng,      setFormLng]      = useState('');
  const [formRadius,   setFormRadius]   = useState(500);
  const [enabled,      setEnabled]      = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [gettingLoc,   setGettingLoc]   = useState(false);
  const [patientPos,   setPatientPos]   = useState(null);    // {lat, lng, updatedAt}
  const [alerts,       setAlerts]       = useState([]);
  const [loading,      setLoading]      = useState(true);

  // ── Load current config ───────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    if (!caregiverId) return;
    try {
      const saved = await getSafeZone(caregiverId, patientId);
      if (saved) {
        setZone(saved);
        setFormLat(String(saved.lat ?? ''));
        setFormLng(String(saved.lng ?? ''));
        setFormRadius(saved.radiusMeters ?? 500);
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

  // ── Subscribe to patient location ─────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribePatientLocation(patientId, pos => setPatientPos(pos));
    return unsub;
  }, [patientId]);

  // ── Use My Current Location as center ────────────────────────────────────
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) { toast(t('no_location_perm'), 'error'); return; }
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFormLat(pos.coords.latitude.toFixed(6));
        setFormLng(pos.coords.longitude.toFixed(6));
        setGettingLoc(false);
        toast(t('location_set'), 'success');
      },
      () => {
        setGettingLoc(false);
        toast(t('location_error'), 'error');
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
      const config = { lat, lng, radiusMeters: formRadius, enabled };
      await saveSafeZone(caregiverId, patientId, config);
      // Publish a copy the patient's device can read
      await publishSafeZoneToPatient(caregiverId, patientId, config);
      setZone(config);
      toast(enabled ? t('safety_enabled') : t('safety_disabled'), 'success');
    } catch (err) {
      toast(err.message || 'Could not save safe zone.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Distance from safe zone center ───────────────────────────────────────
  const distanceFromZone = () => {
    if (!zone || !patientPos) return null;
    const R = 6371000;
    const toRad = d => (d * Math.PI) / 180;
    const dLat = toRad(patientPos.lat - zone.lat);
    const dLng = toRad(patientPos.lng - zone.lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(zone.lat)) * Math.cos(toRad(patientPos.lat)) *
      Math.sin(dLng / 2) ** 2;
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const dist   = distanceFromZone();
  const inside = dist !== null && zone ? dist <= zone.radiusMeters : null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pb-28 pt-6 animate-fade-in">
      <PageHeader
        title={t('location_safety')}
        emoji="📍"
        backTo={`/caregiver/patient/${patientId}`}
        subtitle={t('location_safety_sub')}
      />

      {/* Patient location status */}
      {patientPos && (
        <div
          className="card mb-5 flex items-center gap-4"
          style={inside === false
            ? { borderColor: 'var(--c-danger-500)', borderWidth: 2 }
            : inside === true
            ? { borderColor: 'var(--c-primary-500)', borderWidth: 2 }
            : {}}
        >
          <span className="text-4xl shrink-0">{inside === false ? '⚠️' : inside === true ? '✅' : '📍'}</span>
          <div>
            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
              {t('patient_location')}
            </div>
            {dist !== null && zone ? (
              <div
                className="text-base font-semibold"
                style={{ color: inside ? 'var(--c-primary-600)' : 'var(--c-danger-500)' }}
              >
                {inside ? t('inside_zone') : t('outside_zone')} — {dist}m
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>{t('sharing_location')}</div>
            )}
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {patientPos.lat?.toFixed(4)}, {patientPos.lng?.toFixed(4)}
            </div>
          </div>
        </div>
      )}

      {!patientPos && (
        <div className="alert alert-warning mb-5">{t('location_not_sharing')}</div>
      )}

      {/* Safe zone config */}
      <div className="card mb-5">
        <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          📍 {t('safe_zone')}
        </h3>

        {/* Get current location button */}
        <button
          onClick={handleGetMyLocation}
          disabled={gettingLoc}
          className="btn-outline btn-sm w-full mb-4"
        >
          {gettingLoc ? <Spinner size="sm" /> : `📍 ${t('set_location')}`}
        </button>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="field-label text-sm">Latitude</label>
            <input
              type="number" step="any" value={formLat}
              onChange={e => setFormLat(e.target.value)}
              className="field-input" placeholder="e.g. 26.1445"
            />
          </div>
          <div>
            <label className="field-label text-sm">Longitude</label>
            <input
              type="number" step="any" value={formLng}
              onChange={e => setFormLng(e.target.value)}
              className="field-input" placeholder="e.g. 91.7362"
            />
          </div>
        </div>

        {/* Radius picker */}
        <div className="mb-4">
          <label className="field-label">{t('radius')}</label>
          <div className="flex flex-wrap gap-2">
            {RADIUS_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormRadius(opt.value)}
                className={`px-4 py-2 rounded-xl border-2 text-base font-semibold transition-all
                  ${formRadius === opt.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-warm-200 text-warm-600 hover:border-primary-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
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
                  <div className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
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
