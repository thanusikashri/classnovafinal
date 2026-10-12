import React, { useState } from 'react';
import { BookOpen, ExternalLink, Download, X } from 'lucide-react';
import api from '../services/api';

const MaterialModal = ({ material, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewing, setIsViewing] = useState(false);

  if (!material) return null;

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const classId = typeof material.classId === 'object' ? material.classId._id : material.classId;
      const res = await api.get(`/classes/${classId}/materials/${material._id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      
      let filename = material.fileName || material.title || 'download';
      const disposition = res.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
        var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        var matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) { 
          filename = matches[1].replace(/['"]/g, '');
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download error:', err);
      alert('Error downloading material. Ensure you have permission.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleView = async () => {
    try {
      setIsViewing(true);
      const classId = typeof material.classId === 'object' ? material.classId._id : material.classId;
      const res = await api.get(`/classes/${classId}/materials/${material._id}/download?action=view`, {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: res.headers['content-type'] });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error('View error:', err);
      alert('Error viewing material. Ensure you have permission.');
    } finally {
      setIsViewing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card-surface w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-base">
          <h3 className="text-lg font-medium text-content flex items-center gap-2">
            <BookOpen size={20} className="text-teal-600" />
            Material Details
          </h3>
          <button onClick={onClose} className="text-muted hover:text-content">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h4 className="text-xl font-medium text-content">{material.title}</h4>
            <p className="text-sm text-muted mt-1">
              Uploaded {new Date(material.createdAt).toLocaleDateString()}
            </p>
          </div>
          
          <div className="flex flex-col gap-1 text-sm text-content">
            <p><span className="font-medium text-muted">Class:</span> {typeof material.classId === 'object' ? material.classId.name : 'View from class'}</p>
            {material.teacher && (
              <p><span className="font-medium text-muted">Teacher:</span> {material.teacher.name || material.teacher}</p>
            )}
            {material.fileName && (
              <p><span className="font-medium text-muted">File:</span> {material.fileName}</p>
            )}
          </div>

          {material.description && (
            <div className="mt-4 p-4 bg-base rounded-md border border-border">
              <p className="text-sm text-content whitespace-pre-wrap">{material.description}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border bg-base flex justify-end gap-3">
          {material.fileUrl && (
            <>
              <button 
                onClick={handleView}
                disabled={isViewing}
                className="btn-secondary flex items-center gap-2"
              >
                <ExternalLink size={16} />
                {isViewing ? 'Opening...' : 'View Material'}
              </button>
              <button 
                onClick={handleDownload}
                disabled={isDownloading}
                className="btn-primary flex items-center gap-2"
              >
                <Download size={16} />
                {isDownloading ? 'Downloading...' : 'Download Material'}
              </button>
            </>
          )}
          {!material.fileUrl && (
            <button onClick={onClose} className="btn-secondary">Close</button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaterialModal;
