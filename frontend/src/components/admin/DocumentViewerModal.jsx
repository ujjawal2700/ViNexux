import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ExternalLink, FileText, Download } from 'lucide-react';

const DocumentViewerModal = ({ isOpen, onClose, title, documentUrl, documentType }) => {
  if (!documentUrl) return null;

  const isPdf = documentUrl.toLowerCase().endsWith('.pdf') || documentType === 'application/pdf';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title || 'Document Inspection Viewer'} maxWidth="max-w-4xl">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-muted p-3 rounded-lg border border-border text-xs text-foreground">
          <span className="font-semibold text-primary uppercase">{documentType || 'KYC Document'}</span>
          <a
            href={documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open Original File
          </a>
        </div>

        <div className="bg-background rounded-xl border border-border overflow-hidden min-h-[400px] max-h-[600px] flex items-center justify-center relative">
          {isPdf ? (
            <iframe
              src={documentUrl}
              title="PDF Document Viewer"
              className="w-full h-[500px] border-none"
            />
          ) : (
            <img
              src={documentUrl}
              alt="KYC Document Preview"
              className="max-w-full max-h-[550px] object-contain mx-auto"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <a href={documentUrl} download target="_blank" rel="noopener noreferrer">
            <Button variant="primary" size="sm">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download File
            </Button>
          </a>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentViewerModal;
