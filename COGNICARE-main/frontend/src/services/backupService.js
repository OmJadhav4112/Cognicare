import api from './api';

/**
 * Export all patient data as JSON
 */
export const exportPatientDataJSON = async () => {
  try {
    const response = await api.get('/backup/export-data', {
      responseType: 'blob'
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `patient-data-${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Data exported successfully' };
  } catch (error) {
    console.error('Error exporting data:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Export game performance as CSV
 */
export const exportPerformanceCSV = async () => {
  try {
    const response = await api.get('/backup/export-performance-csv', {
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'game-performance.csv');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'CSV exported successfully' };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Generate and download patient report PDF
 */
export const generatePatientReportPDF = async (patientId = null) => {
  try {
    const params = patientId ? { patientId } : {};
    const response = await api.get('/backup/generate-report-pdf', {
      params,
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'patient-report.pdf');
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

    return { success: true, message: 'Report generated successfully' };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Create backup snapshot
 */
export const createBackupSnapshot = async () => {
  try {
    const result = await api.post('/backup/create-snapshot');
    return result.data;
  } catch (error) {
    console.error('Error creating snapshot:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};

/**
 * Request account deletion (GDPR - right to be forgotten)
 */
export const requestAccountDeletion = async (confirmationText) => {
  try {
    const result = await api.delete('/backup/delete-account', {
      data: { confirmPassword: confirmationText }
    });
    return result.data;
  } catch (error) {
    console.error('Error requesting account deletion:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message
    };
  }
};
