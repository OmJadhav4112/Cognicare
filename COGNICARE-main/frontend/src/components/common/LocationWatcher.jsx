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
import { useEffect } from 'react';
import { useAuth }   from '../../context/AuthContext';
import { startLocationSharing, stopLocationSharing } from '../../services/locationService';

export default function LocationWatcher() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id && !user?._id) return;
    const userId = user.id || user._id;

    startLocationSharing(userId, (status) => {
      // status: 'sharing' | 'denied' | 'error' | 'unsupported'
      // We swallow all statuses here — UI feedback is in LocationSafetyPage
    });

    return () => stopLocationSharing();
  }, [user]);

  return null; // renders nothing
}
