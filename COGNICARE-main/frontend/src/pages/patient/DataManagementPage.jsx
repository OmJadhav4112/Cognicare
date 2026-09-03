import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  exportPatientDataJSON,
  exportPerformanceCSV,
  generatePatientReportPDF,
  createBackupSnapshot,
  requestAccountDeletion
} from '../../services/backupService';
import PageHeader from '../../components/common/PageHeader';
import Modal from '../../components/common/Modal';
import Toast from '../../components/common/Toast';
import Spinner from '../../components/common/Spinner';

export default function DataManagementPage() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [lastBackupTime, setLastBackupTime] = useState(null);

  const handleExportJSON = async () => {
    try {
      setLoading(true);
      const result = await exportPatientDataJSON();
      setToast({ type: result.success ? 'success' : 'error', message: result.message });
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to export data' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const result = await exportPerformanceCSV();
      setToast({ type: result.success ? 'success' : 'error', message: result.message });
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to export CSV' });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setLoading(true);
      const result = await generatePatientReportPDF();
      setToast({ type: result.success ? 'success' : 'error', message: result.message });
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to generate PDF' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    try {
      setLoading(true);
      const result = await createBackupSnapshot();

      if (result.success) {
        setLastBackupTime(new Date());
        setToast({ type: 'success', message: result.message });
      } else {
        setToast({ type: 'error', message: result.message });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to create backup' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE_MY_ACCOUNT') {
      setToast({ type: 'error', message: 'Invalid confirmation text' });
      return;
    }

    try {
      setLoading(true);
      const result = await requestAccountDeletion(deleteConfirmation);

      if (result.success) {
        setToast({ type: 'success', message: 'Account deletion requested' });
        
        // Wait 3 seconds then logout
        setTimeout(() => {
          logout();
        }, 3000);
      } else {
        setToast({ type: 'error', message: result.message });
      }
    } catch (error) {
      setToast({ type: 'error', message: 'Failed to delete account' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <PageHeader
        title="Data Management"
        subtitle="Export, backup, and manage your personal data"
      />

      <div className="max-w-2xl mx-auto space-y-6 mt-8">
        {/* Export Data Section */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-warm-900 mb-4">📥 Export Your Data</h3>
          <p className="text-sm text-warm-700 mb-4">
            Download all your personal data in various formats for your records or to use elsewhere.
          </p>

          <div className="space-y-3">
            <button
              onClick={handleExportJSON}
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
            >
              📄 Export as JSON (Complete Data)
            </button>

            <button
              onClick={handleExportCSV}
              disabled={loading}
              className="w-full px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >
              📊 Export Game Performance (CSV)
            </button>

            <button
              onClick={handleGeneratePDF}
              disabled={loading}
              className="w-full px-4 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition font-medium"
            >
              📋 Generate Patient Report (PDF)
            </button>
          </div>
        </div>

        {/* Backup Section */}
        <div className="card-sm rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-warm-900 mb-4">💾 Backup Your Data</h3>
          <p className="text-sm text-warm-700 mb-4">
            Create manual snapshots of your data. Snapshots expire after 90 days.
          </p>

          <button
            onClick={handleCreateSnapshot}
            disabled={loading}
            className="w-full px-4 py-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition font-medium"
          >
            🔄 Create Backup Snapshot
          </button>

          {lastBackupTime && (
            <p className="text-sm text-warm-700 mt-3">
              ✓ Last backup: {lastBackupTime.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* GDPR Section */}
        <div className="card-sm rounded-lg shadow-md p-6 border-l-4 border-red-500">
          <h3 className="text-lg font-semibold text-warm-900 mb-4">🚨 GDPR & Account Deletion</h3>
          <p className="text-sm text-warm-700 mb-4">
            Request permanent deletion of your account and all associated data.
            This action is irreversible.
          </p>

          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
          >
            🗑️ Request Account Deletion
          </button>
        </div>

        {/* Data Privacy Section */}
        <div className="bg-warm-100 rounded-lg p-6 border border-gray-200">
          <h4 className="font-semibold text-warm-900 mb-3">📋 Your Data Rights</h4>
          <ul className="text-sm text-warm-800 space-y-2">
            <li>✓ Right to access: Export your data anytime</li>
            <li>✓ Right to portability: Data in standard formats (JSON, CSV, PDF)</li>
            <li>✓ Right to erasure: Delete your account and all data</li>
            <li>✓ Right to rectification: Update your information</li>
            <li>✓ Data retention: We keep inactive data for 90 days then archive</li>
          </ul>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteConfirmation('');
        }}
        title="Delete Your Account"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 font-medium">⚠️ Warning</p>
            <p className="text-red-700 text-sm mt-2">
              Deleting your account will permanently remove all your data including games, reminders, memories, and notes. This action cannot be undone.
            </p>
          </div>

          <p className="text-sm text-warm-800">
            To confirm, type: <strong>DELETE_MY_ACCOUNT</strong>
          </p>

          <input
            type="text"
            value={deleteConfirmation}
            onChange={(e) => setDeleteConfirmation(e.target.value)}
            placeholder="Type confirmation text here"
            className="w-full px-3 py-2 border border-warm-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmation('');
              }}
              className="flex-1 px-4 py-2 border border-warm-300 text-warm-800 rounded-lg hover:bg-warm-100 transition"
            >
              Cancel
            </button>

            <button
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'DELETE_MY_ACCOUNT' || loading}
              className={`flex-1 px-4 py-2 rounded-lg text-white transition ${
                deleteConfirmation === 'DELETE_MY_ACCOUNT'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-red-300 cursor-not-allowed'
              }`}
            >
              {loading ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}


