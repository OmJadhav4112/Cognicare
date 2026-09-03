/**
 * LocationWatcher
 * ================
 * Invisible component mounted inside PatientLayout.
 * Starts watchPosition when the patient is authenticated and
 * stops cleanly on unmount.  Respects user consent — if
 * permission is denied, it silently stops.
 *
 * Only shares location when at least one caregiver has enabled
 * a safe zone (this is a battery-usage consideration).
 */
import { useEffect, useState } from 'react';
import { useAuth }   from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { startLocationSharing, stopLocationSharing } from '../../services/locationService';

export default function LocationWatcher() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sharingStatus, setSharingStatus] = useState(null);

  useEffect(() => {
    if (!user?.id && !user?._id) return;
    const userId = user.id || user._id;

    startLocationSharing(userId, (info) => {
      if (typeof info === 'object' && info.status === 'sharing') {
        setSharingStatus('sharing');
      } else if (typeof info === 'string') {
        setSharingStatus(info);
      }
    });

    return () => stopLocationSharing();
  }, [user]);

  if (sharingStatus !== 'sharing') return null;

  return (
    <div
      className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto z-40 bg-teal-800 text-white text-xs px-3 py-2 rounded-full shadow-lg flex items-center justify-between animate-fade-in opacity-90 hover:opacity-100 transition-opacity"
      role="status"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>📍 {t('location_sharing_on')}</span>
      </div>
      <span className="text-[10px] text-teal-200">{t('location_safety')}</span>
    </div>
  );
}

