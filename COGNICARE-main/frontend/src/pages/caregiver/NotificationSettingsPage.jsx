import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  setQuietHours,
  enableDoNotDisturb,
  disableDoNotDisturb,
  getActiveDevices,
  sendTestNotification,
  requestNotificationPermission
} from '../../services/notificationService';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import Spinner from '../../components/common/Spinner';
import Toast from '../../components/common/Toast';

export default function NotificationSettingsPage() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showQuietHoursModal, setShowQuietHoursModal] = useState(false);
  const [showDNDModal, setShowDNDModal] = useState(false);
  const [dndDuration, setDndDuration] = useState(60);
  const [quietHoursForm, setQuietHoursForm] = useState({
    enabled: true,
    startTime: '22:00',
    endTime: '08:00'
  });
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchPreferences();
    fetchDevices();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const result = await getNotificationPreferences();
      if (result.success) {
        setPreferences(result.data);
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const fetchDevices = async () => {
    try {
      const result = await getActiveDevices();
      if (result.success) {
        setDevices(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const handleToggleNotificationType = async (type) => {
    try {
      setSaving(true);
      const updates = {
        [type]: {
          ...preferences[type],
          enabled: !preferences[type]?.enabled
        }
      };
      const result = await updateNotificationPreferences(updates);
      if (result.success) {
        setPreferences(result.data);
        setToast({ type: 'success', message: `${type} notifications ${result.data[type].enabled ? 'enabled' : 'disabled'}` });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to update preferences' });
    } finally {
      setSaving(false);
    }
  };

  const handleQuietHoursSave = async () => {
    try {
      setSaving(true);
      const result = await setQuietHours(
        quietHoursForm.startTime,
        quietHoursForm.endTime,
        'UTC',
        quietHoursForm.enabled
      );
      if (result.success) {
        setPreferences(result.data);
        setShowQuietHoursModal(false);
        setToast({ type: 'success', message: 'Quiet hours updated' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to update quiet hours' });
    } finally {
      setSaving(false);
    }
  };

  const handleDNDEnable = async () => {
    try {
      setSaving(true);
      const result = await enableDoNotDisturb(dndDuration);
      if (result.success) {
        fetchPreferences();
        setShowDNDModal(false);
        setToast({ type: 'success', message: `Do-not-disturb enabled for ${dndDuration} minutes` });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to enable do-not-disturb' });
    } finally {
      setSaving(false);
    }
  };

  const handleDNDDisable = async () => {
    try {
      setSaving(true);
      const result = await disableDoNotDisturb();
      if (result.success) {
        fetchPreferences();
        setToast({ type: 'success', message: 'Do-not-disturb disabled' });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to disable do-not-disturb' });
    } finally {
      setSaving(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setSaving(true);
      const result = await requestNotificationPermission('Web Browser');
      if (result.success) {
        fetchDevices();
        setToast({ type: 'success', message: 'Notifications enabled for this device' });
      } else {
        setToast({ type: 'error', message: result.error });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to enable notifications' });
    } finally {
      setSaving(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setSaving(true);
      const result = await sendTestNotification();
      if (result.success) {
        setToast({ type: 'success', message: 'Test notification sent' });
      } else {
        setToast({ type: 'error', message: result.message });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to send test notification' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (!preferences) return <div className="p-4">Failed to load preferences</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <PageHeader title="Notification Settings" subtitle="Manage your notification preferences and devices" />

      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        {/* SOS Alerts */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-warm-900">🚨 SOS Alerts</h3>
              <p className="text-sm text-warm-700 mt-1">Receive immediate alerts when patient needs help</p>
            </div>
            <button
              onClick={() => handleToggleNotificationType('sosAlert')}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                preferences.sosAlert?.enabled
                  ? 'bg-green-500 text-white'
                  : 'bg-warm-200 text-warm-800'
              }`}
            >
              {preferences.sosAlert?.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {preferences.sosAlert?.enabled && (
            <div className="text-sm text-warm-700">
              <p>📧 Channels: {preferences.sosAlert?.channels?.join(', ') || 'Email, Push'}</p>
            </div>
          )}
        </div>

        {/* Low Engagement Alerts */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-warm-900">⚠️ Low Engagement Alerts</h3>
              <p className="text-sm text-warm-700 mt-1">Get notified if patient isn't playing games</p>
            </div>
            <button
              onClick={() => handleToggleNotificationType('lowEngagement')}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                preferences.lowEngagement?.enabled
                  ? 'bg-green-500 text-white'
                  : 'bg-warm-200 text-warm-800'
              }`}
            >
              {preferences.lowEngagement?.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Game Milestones */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-warm-900">🎉 Game Milestones</h3>
              <p className="text-sm text-warm-700 mt-1">Celebrate achievements and progress</p>
            </div>
            <button
              onClick={() => handleToggleNotificationType('gameMilestone')}
              disabled={saving}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                preferences.gameMilestone?.enabled
                  ? 'bg-green-500 text-white'
                  : 'bg-warm-200 text-warm-800'
              }`}
            >
              {preferences.gameMilestone?.enabled ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-warm-900">🌙 Quiet Hours</h3>
              <p className="text-sm text-warm-700 mt-1">Pause notifications during these hours</p>
            </div>
            <button
              onClick={() => {
                setQuietHoursForm({
                  enabled: preferences.quietHours?.enabled || false,
                  startTime: preferences.quietHours?.startTime || '22:00',
                  endTime: preferences.quietHours?.endTime || '08:00'
                });
                setShowQuietHoursModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
            >
              Configure
            </button>
          </div>
          {preferences.quietHours?.enabled && (
            <p className="text-sm text-warm-700">
              🕐 {preferences.quietHours?.startTime} - {preferences.quietHours?.endTime}
            </p>
          )}
        </div>

        {/* Do Not Disturb */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-warm-900">🔇 Do Not Disturb</h3>
              <p className="text-sm text-warm-700 mt-1">Temporarily pause all notifications</p>
            </div>
            {preferences.doNotDisturb?.enabled ? (
              <button
                onClick={handleDNDDisable}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
              >
                Disable
              </button>
            ) : (
              <button
                onClick={() => setShowDNDModal(true)}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                Enable
              </button>
            )}
          </div>
          {preferences.doNotDisturb?.enabled && preferences.doNotDisturb?.until && (
            <p className="text-sm text-warm-700 mt-2">
              ⏱️ Until {new Date(preferences.doNotDisturb.until).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Active Devices */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-warm-900 mb-4">📱 Active Devices</h3>
          {devices.length > 0 ? (
            <div className="space-y-2">
              {devices.map((device, idx) => (
                <div key={idx} className="p-3 bg-warm-100 rounded border border-gray-200">
                  <p className="font-medium text-warm-900">{device.deviceName}</p>
                  <p className="text-sm text-warm-700">
                    Registered: {new Date(device.registeredAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-warm-700 mb-4">No devices registered yet</p>
              <button
                onClick={handleRequestPermission}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
              >
                Enable Notifications
              </button>
            </div>
          )}
        </div>

        {/* Test Notification */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <button
            onClick={handleSendTest}
            disabled={saving}
            className="w-full px-4 py-3 rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition font-medium"
          >
            {saving ? 'Sending...' : '🔔 Send Test Notification'}
          </button>
        </div>
      </div>

      {/* Quiet Hours Modal */}
      <Modal
        isOpen={showQuietHoursModal}
        onClose={() => setShowQuietHoursModal(false)}
        title="Set Quiet Hours"
      >
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={quietHoursForm.enabled}
              onChange={(e) =>
                setQuietHoursForm({ ...quietHoursForm, enabled: e.target.checked })
              }
              className="w-5 h-5"
            />
            <span className="font-medium">Enable Quiet Hours</span>
          </label>

          <div>
            <label className="block text-sm font-medium text-warm-800 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={quietHoursForm.startTime}
              onChange={(e) =>
                setQuietHoursForm({ ...quietHoursForm, startTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-warm-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-warm-800 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={quietHoursForm.endTime}
              onChange={(e) =>
                setQuietHoursForm({ ...quietHoursForm, endTime: e.target.value })
              }
              className="w-full px-3 py-2 border border-warm-300 rounded-lg"
            />
          </div>

          <button
            onClick={handleQuietHoursSave}
            disabled={saving}
            className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>

      {/* Do Not Disturb Modal */}
      <Modal
        isOpen={showDNDModal}
        onClose={() => setShowDNDModal(false)}
        title="Enable Do Not Disturb"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-warm-800">
            Duration (minutes)
          </label>
          <input
            type="number"
            min="15"
            max="1440"
            value={dndDuration}
            onChange={(e) => setDndDuration(Math.max(15, Math.min(1440, parseInt(e.target.value))))}
            className="w-full px-3 py-2 border border-warm-300 rounded-lg"
          />
          <p className="text-xs text-warm-700">15 minutes to 24 hours</p>

          <button
            onClick={handleDNDEnable}
            disabled={saving}
            className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition"
          >
            {saving ? 'Enabling...' : 'Enable'}
          </button>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}


